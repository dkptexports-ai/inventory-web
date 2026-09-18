import { supabase } from './supabase';

// Vendors
export async function getVendors() {
  const { data, error } = await supabase.from('vendors').select('*').order('name');
  if (error) throw error;
  return data;
}

export async function addVendor(name, place = '') {
  if (!name) throw new Error("Vendor name is required");
  const { data, error } = await supabase.from('vendors').insert([{ name, place }]).select().single();
  if (error) throw error;
  return data;
}

// Styles
export async function getStyles(vendorId = null) {
  let query = supabase.from('styles').select('*, vendors(name)');
  if (vendorId) {
    query = query.eq('vendor_id', vendorId);
  }
  const { data, error } = await query.order('name');
  if (error) throw error;
  return data;
}

export async function getStylesWithBalances() {
  const { data: styles, error: stylesError } = await supabase.from('styles').select('*, vendors(name)').order('name');
  if (stylesError) throw stylesError;
  
  const { data: tx, error: txError } = await supabase.from('transactions').select('style_id, inward_qty, outward_qty');
  if (txError) throw txError;
  
  const balances = {};
  for (const t of tx) {
    if (!balances[t.style_id]) balances[t.style_id] = { in: 0, out: 0, bal: 0 };
    balances[t.style_id].in += Number(t.inward_qty) || 0;
    balances[t.style_id].out += Number(t.outward_qty) || 0;
  }
  
  return styles.map(s => {
    const b = balances[s.id] || { in: 0, out: 0, bal: 0 };
    b.bal = b.in - b.out;
    return { ...s, stats: b };
  });
}

export async function addStyle(name, vendor_id, unit = 'PCS') {
  if (!name || !vendor_id) throw new Error("Style name and Vendor are required");
  const { data, error } = await supabase.from('styles').insert([{ name, vendor_id, unit }]).select().single();
  if (error) throw error;
  return data;
}

export async function ensureStyle(styleName, vendorId, unit = 'PCS') {
  if (!styleName || !vendorId) return null;
  // check if style exists
  const { data: existing } = await supabase.from('styles').select('id').eq('name', styleName).single();
  if (existing) return existing.id;
  
  // if not, create it
  const { data: newStyle, error } = await supabase.from('styles').insert([{ name: styleName, vendor_id: vendorId, unit }]).select().single();
  if (error) throw error;
  return newStyle.id;
}

// Transactions
export async function getRecentTransactions(limit = 10) {
  const { data, error } = await supabase.from('transactions')
    .select('*, styles(name, vendors(name))')
    .order('created_at', { ascending: false })
    .limit(limit);
  if (error) throw error;
  return data;
}

export async function addTransaction(payload) {
  // If payload is an array (multi-insert), insert all
  const dataToInsert = Array.isArray(payload) ? payload : [payload];
  const { error } = await supabase.from('transactions').insert(dataToInsert);
  if (error) throw error;
  return true;
}

export async function updateTransaction(id, payload) {
  const { data, error } = await supabase.from('transactions').update(payload).eq('id', id).select().single();
  if (error) throw error;
  return data;
}

export async function deleteTransaction(id) {
  const { error } = await supabase.from('transactions').delete().eq('id', id);
  if (error) throw error;
  return true;
}

export async function getPendingBatchesForStyle(styleId) {
  if (!styleId) return [];
  const { data, error } = await supabase.from('transactions')
    .select('batch_no')
    .eq('style_id', styleId)
    .eq('bill_status', 'Pending')
    .not('batch_no', 'is', null);
    
  if (error) {
    console.error("Error fetching pending batches", error);
    return [];
  }
  
  const batches = [...new Set(data.map(t => t.batch_no).filter(Boolean))];
  return batches;
}

export async function getBatchesByPartialStyle(styleName) {
  if (!styleName || styleName.length < 3) return [];
  
  // Try to find styles that share the first 5 characters
  const prefix = styleName.substring(0, 5);
  const { data: matchingStyles, error: styleErr } = await supabase.from('styles')
    .select('id, name')
    .ilike('name', `${prefix}%`);
    
  if (styleErr || !matchingStyles || matchingStyles.length === 0) return [];
  
  const styleIds = matchingStyles.map(s => s.id);
  
  const { data: tx, error: txErr } = await supabase.from('transactions')
    .select('batch_no, style_id')
    .in('style_id', styleIds)
    .not('batch_no', 'is', null)
    .order('created_at', { ascending: false });
    
  if (txErr) return [];
  
  const batchMap = new Map();
  for (const t of tx) {
    if (t.batch_no && !batchMap.has(t.batch_no)) {
      const sName = matchingStyles.find(s => s.id === t.style_id)?.name;
      batchMap.set(t.batch_no, sName);
    }
  }
  
  return Array.from(batchMap.entries()).map(([batch_no, style_name]) => ({ batch_no, style_name }));
}

export async function getNextBatchNumber(styleName, transactionDateStr = null) {
  if (!styleName) return '';
  
  const d = transactionDateStr ? new Date(transactionDateStr) : new Date();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const yy = String(d.getFullYear()).slice(-2);
  const mmyy = `${mm}${yy}`;
  
  const cleanStyle = styleName.replace(/\s+/g, '').toUpperCase();
  const first4 = cleanStyle.substring(0, 4);
  const last4 = cleanStyle.length > 4 ? cleanStyle.substring(cleanStyle.length - 4) : '';
  const styleCode = `${first4}${last4}`;
  
  const prefix = `${mmyy}-${styleCode}-`;
  
  const { data, error } = await supabase.from('transactions')
    .select('batch_no')
    .like('batch_no', `${prefix}%`);
    
  if (error) {
    console.error("Error fetching batch no", error);
    return `${prefix}1`;
  }
  
  let maxSeq = 0;
  for (const t of data) {
    if (t.batch_no) {
      const parts = t.batch_no.split('-');
      if (parts.length === 3) {
        const num = parseInt(parts[2], 10);
        if (!isNaN(num) && num > maxSeq) {
          maxSeq = num;
        }
      }
    }
  }
  
  return `${prefix}${maxSeq + 1}`;
}

export async function getStyleLedger(styleId) {
  const { data, error } = await supabase.from('transactions')
    .select('*, styles(name, vendors(name))')
    .eq('style_id', styleId)
    .order('created_at', { ascending: true }); // Ascending for running balance calculation
  if (error) throw error;
  return data;
}

export async function getBatchLedger(batchNo) {
  const { data, error } = await supabase.from('transactions')
    .select('*, styles(name, vendors(name))')
    .eq('batch_no', batchNo)
    .order('created_at', { ascending: true });
  if (error) throw error;
  return data;
}

export async function getDashboardStats() {
  const [vendorsRes, stylesRes, pendingBillsRes] = await Promise.all([
    supabase.from('vendors').select('id', { count: 'exact', head: true }),
    supabase.from('styles').select('id', { count: 'exact', head: true }),
    supabase.from('transactions').select('id', { count: 'exact', head: true }).eq('bill_status', 'Pending').gt('outward_qty', 0) // bill based on outward mostly
  ]);
  
  return {
    vendors: vendorsRes.count || 0,
    styles: stylesRes.count || 0,
    pendingBills: pendingBillsRes.count || 0
  };
}

// Billing
export async function getPendingChallans() {
  // get transactions that are not billed
  const { data, error } = await supabase.from('transactions')
    .select('*, styles(name, vendors(name))')
    .eq('bill_status', 'Pending')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data;
}

export async function getPendingBatchesForBilling() {
  const { data, error } = await supabase.from('transactions')
    .select('*, styles(name, vendors(name))')
    .eq('bill_status', 'Pending')
    .not('batch_no', 'is', null)
    .gt('outward_qty', 0);
  if (error) throw error;
  
  const batchesMap = {};
  for (const t of data) {
    if (!batchesMap[t.batch_no]) {
      batchesMap[t.batch_no] = {
        id: t.batch_no, // Use batch_no as id for react keys
        batch_no: t.batch_no,
        styles: t.styles,
        firm: t.firm,
        date: t.date || t.created_at,
        outward_qty: 0,
        transaction_ids: []
      };
    }
    batchesMap[t.batch_no].outward_qty += Number(t.outward_qty) || 0;
    batchesMap[t.batch_no].transaction_ids.push(t.id);
  }
  
  return Object.values(batchesMap).sort((a, b) => new Date(b.date) - new Date(a.date));
}

export async function markAsBilled(transactionIds, invoiceNo, invoiceDate) {
  const dateIso = invoiceDate ? new Date(invoiceDate).toISOString() : new Date().toISOString();
  const ids = Array.isArray(transactionIds) ? transactionIds : [transactionIds];
  
  const { error } = await supabase.from('transactions')
    .update({ bill_status: 'Billed', invoice_no: invoiceNo, invoice_date: dateIso })
    .in('id', ids);
  if (error) throw error;
  return true;
}

// Employees
export async function getEmployees() {
  const { data, error } = await supabase.from('employees').select('*').order('name');
  if (error) throw error;
  return data;
}

export async function addEmployee(payload) {
  if (!payload.name) throw new Error("Employee name is required");
  const { data, error } = await supabase.from('employees').insert([payload]).select().single();
  if (error) throw error;
  return data;
}

export async function updateEmployee(id, payload) {
  const { data, error } = await supabase.from('employees').update(payload).eq('id', id).select().single();
  if (error) throw error;
  return data;
}

export async function deleteEmployee(id) {
  // Check for existing attendance
  const { data: attData, error: attErr } = await supabase.from('attendance').select('id').eq('employee_id', id).limit(1);
  if (attErr) throw attErr;
  if (attData && attData.length > 0) {
    throw new Error("Cannot delete employee: Attendance records exist.");
  }

  // Check for existing salary payments
  const { data: salData, error: salErr } = await supabase.from('salary_payments').select('id').eq('employee_id', id).limit(1);
  if (salErr) throw salErr;
  if (salData && salData.length > 0) {
    throw new Error("Cannot delete employee: Salary payment records exist.");
  }

  const { error } = await supabase.from('employees').delete().eq('id', id);
  if (error) throw error;
  return true;
}

// Companies
export async function getCompanies() {
  const { data, error } = await supabase.from('companies').select('*').order('name');
  if (error) throw error;
  
  if (!data || data.length === 0) {
    await supabase.from('companies').insert([
      { name: 'DKPT' },
      { name: 'Malik' },
      { name: 'Tufting' }
    ]);
    const { data: newData } = await supabase.from('companies').select('*').order('name');
    return newData;
  }

  return data;
}

// Attendance
export async function getAttendance(month, year) {
  const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
  const endDate = `${year}-${String(month).padStart(2, '0')}-${new Date(year, month, 0).getDate()}`;
  const { data, error } = await supabase.from('attendance')
    .select('*')
    .gte('date', startDate)
    .lte('date', endDate);
  if (error) throw error;
  return data;
}

export async function getAttendanceByDate(startDate, endDate) {
  const { data, error } = await supabase.from('attendance')
    .select('*')
    .gte('date', startDate)
    .lte('date', endDate);
  if (error) throw error;
  return data;
}

export async function saveAttendance(records) {
  if (!records || records.length === 0) return true;
  
  // Clean up records: Supabase infers keys from the first object. 
  // If some have 'id' and some don't, it sends null for missing ones.
  // Since we upsert on 'employee_id,date', we can just omit 'id' entirely.
  const cleanedRecords = records.map(r => {
    const copy = { ...r };
    delete copy.id;
    if (copy.company_id === "") {
      copy.company_id = null;
    }
    return copy;
  });

  const { error } = await supabase.from('attendance').upsert(cleanedRecords, { onConflict: 'employee_id,date' });
  if (error) throw error;
  return true;
}

// Salary Payments
export async function saveSalaryPayment(payload) {
  // payload: { employee_id, company_id, payment_date, amount_cash, amount_bank, is_advance, month_year }
  const { error } = await supabase.from('salary_payments').insert([payload]);
  if (error) throw error;
  
  // Update employee balance logic would go here in a real scenario
  return true;
}

export async function getSalaryPayments() {
  const { data, error } = await supabase.from('salary_payments').select('*, companies(name)');
  if (error) throw error;
  return data;
}

// Partner Ledgers
export async function getPartnerLedger(partnerName) {
  const { data, error } = await supabase.from('partner_ledgers')
    .select('*')
    .eq('partner_name', partnerName)
    .order('date', { ascending: true })
    .order('created_at', { ascending: true });
  if (error) throw error;
  return data;
}

export async function getUniquePartners() {
  const { data, error } = await supabase.from('partner_ledgers').select('partner_name');
  if (error) throw error;
  
  const uniqueNames = [...new Set(data.map(item => item.partner_name).filter(Boolean))];
  return uniqueNames.sort();
}

export async function addPartnerLedgerEntry(payload) {
  const dataToInsert = Array.isArray(payload) ? payload : [payload];
  const { error } = await supabase.from('partner_ledgers').insert(dataToInsert);
  if (error) throw error;
  return true;
}

export async function deletePartnerLedgerEntry(id) {
  const { error } = await supabase.from('partner_ledgers').delete().eq('id', id);
  if (error) throw error;
  return true;
}

// Customer Receipts
export async function getCustomerReceipts() {
  const { data, error } = await supabase.from('customer_receipts')
    .select('*')
    .order('date', { ascending: false })
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data;
}

export async function addCustomerReceipt(payload) {
  const { error } = await supabase.from('customer_receipts').insert([payload]);
  if (error) throw error;
  return true;
}

export async function deleteCustomerReceipt(id) {
  const { error } = await supabase.from('customer_receipts').delete().eq('id', id);
  if (error) throw error;
  return true;
}

// Purchase Register
export async function getPurchaseRegister() {
  const { data, error } = await supabase.from('purchase_register')
    .select('*')
    .order('date', { ascending: false })
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data;
}

export async function addPurchaseRegisterEntry(payload) {
  const { error } = await supabase.from('purchase_register').insert([payload]);
  if (error) throw error;
  return true;
}

export async function deletePurchaseRegisterEntry(id) {
  const { error } = await supabase.from('purchase_register').delete().eq('id', id);
  if (error) throw error;
  return true;
}

// P&L Manual Expenses
export async function getPnlManualExpenses() {
  const { data, error } = await supabase.from('pnl_manual_expenses').select('*');
  if (error) throw error;
  return data;
}

export async function updatePnlManualExpense(head_name, amount) {
  const { error } = await supabase.from('pnl_manual_expenses')
    .upsert({ head_name, amount, updated_at: new Date().toISOString() });
  if (error) throw error;
  return true;
}



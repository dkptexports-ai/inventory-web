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

export async function getNextBatchNumber(styleId) {
  if (!styleId) return '';
  
  const now = new Date();
  const monthNames = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"];
  const currentMonthStr = monthNames[now.getMonth()];
  const prefix = `B-${currentMonthStr}-`;
  
  // Get the latest transaction for this style in the current month with a batch number
  const { data, error } = await supabase.from('transactions')
    .select('batch_no')
    .eq('style_id', styleId)
    .like('batch_no', `${prefix}%`)
    .order('created_at', { ascending: false })
    .limit(1);
    
  if (error) {
    console.error("Error fetching batch no", error);
    return `${prefix}01`;
  }
  
  if (data && data.length > 0 && data[0].batch_no) {
    const lastBatch = data[0].batch_no;
    const parts = lastBatch.split('-');
    if (parts.length === 3) {
      const lastNum = parseInt(parts[2], 10);
      if (!isNaN(lastNum)) {
        const nextNum = lastNum + 1;
        return `${prefix}${nextNum.toString().padStart(2, '0')}`;
      }
    }
  }
  
  return `${prefix}01`;
}

export async function getStyleLedger(styleId) {
  const { data, error } = await supabase.from('transactions')
    .select('*, styles(name, vendors(name))')
    .eq('style_id', styleId)
    .order('created_at', { ascending: true }); // Ascending for running balance calculation
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

export async function markAsBilled(transactionId, invoiceNo) {
  const { error } = await supabase.from('transactions')
    .update({ bill_status: 'Billed', invoice_no: invoiceNo, invoice_date: new Date().toISOString() })
    .eq('id', transactionId);
  if (error) throw error;
  return true;
}

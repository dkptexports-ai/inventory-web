import React, { useState, useEffect, useMemo } from 'react';
import { 
  getPartnerLedger, 
  getUniquePartners, 
  getAllPartnerMonthlyAdjustments,
  savePartnerMonthlyAdjustments,
  recordPartnerPayment
} from '../lib/api';
import { 
  IndianRupee, 
  Search, 
  Calendar, 
  CalendarDays, 
  RotateCcw, 
  Download, 
  Printer, 
  Plus, 
  Trash2, 
  User, 
  FileText,
  AlertCircle,
  CheckCircle2,
  Clock,
  Save,
  ArrowLeft,
  ChevronRight,
  TrendingUp,
  Receipt,
  CreditCard,
  Building2,
  Sparkles
} from 'lucide-react';
import * as XLSX from 'xlsx';

// Helper to format dates DD-MM-YYYY
const formatDate = (dateStr) => {
  if (!dateStr) return '-';
  const parts = String(dateStr).split('T')[0].split('-');
  if (parts.length === 3) {
    return `${parts[2]}-${parts[1]}-${parts[0]}`;
  }
  const d = new Date(dateStr);
  return `${String(d.getDate()).padStart(2, '0')}-${String(d.getMonth() + 1).padStart(2, '0')}-${d.getFullYear()}`;
};

// Helper to format Month (YYYY-MM) to string (e.g. October 2026)
const formatMonthName = (mStr) => {
  if (!mStr) return '';
  const [y, m] = mStr.split('-').map(Number);
  const d = new Date(y, m - 1, 1);
  return d.toLocaleString('en-IN', { month: 'long', year: 'numeric' });
};

const PartnerSheet = () => {
  // Partner selection
  const [uniquePartners, setUniquePartners] = useState([]);
  const [selectedPartner, setSelectedPartner] = useState('');
  
  // Data states
  const [rawLedgerEntries, setRawLedgerEntries] = useState([]);
  const [rawAdjustments, setRawAdjustments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // View state: null = Level 1 (Scorecard Overview), "YYYY-MM" = Level 2 (Month Detail)
  const [activeViewMonth, setActiveViewMonth] = useState(null);

  // Month-wise editable fixed rows state for the active month (in-memory)
  const [monthFixedRows, setMonthFixedRows] = useState([]);
  const [fixedRowsSnapshot, setFixedRowsSnapshot] = useState([]);
  const [isFixedDirty, setIsFixedDirty] = useState(false);
  const [savingFixed, setSavingFixed] = useState(false);
  const [fixedSuccessMsg, setFixedSuccessMsg] = useState('');

  // Payment Recording State (for recording new payments)
  const [showAddPaymentForm, setShowAddPaymentForm] = useState(false);
  const [newPaymentDate, setNewPaymentDate] = useState(new Date().toISOString().split('T')[0]);
  const [newPaymentAmount, setNewPaymentAmount] = useState('');
  const [newPaymentMode, setNewPaymentMode] = useState('');
  const [newPaymentTargetMonth, setNewPaymentTargetMonth] = useState('');
  const [savingPayment, setSavingPayment] = useState(false);

  // Receipt to Month Mapping (allows changing target month for ledger receipts)
  const [paymentTargetMap, setPaymentTargetMap] = useState({});

  // Voucher search filter in detail view
  const [voucherSearch, setVoucherSearch] = useState('');

  // Initial load: Fetch partners
  useEffect(() => {
    fetchPartners();
  }, []);

  // Load saved payment-month mappings from localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem('partner_payment_month_targets');
      if (saved) setPaymentTargetMap(JSON.parse(saved));
    } catch (e) {}
  }, []);

  const savePaymentTargetMapping = (id, targetMonth) => {
    const updated = { ...paymentTargetMap, [id]: targetMonth };
    setPaymentTargetMap(updated);
    try {
      localStorage.setItem('partner_payment_month_targets', JSON.stringify(updated));
    } catch (e) {}
  };

  const fetchPartners = async () => {
    try {
      const partners = await getUniquePartners();
      setUniquePartners(partners);
      if (partners.length > 0 && !selectedPartner) {
        setSelectedPartner(partners[0]);
      }
    } catch (err) {
      console.error('Failed to load partners', err);
    }
  };

  // When partner changes: reload all ledger entries & adjustments
  useEffect(() => {
    if (selectedPartner) {
      loadPartnerData(selectedPartner);
    } else {
      setRawLedgerEntries([]);
      setRawAdjustments([]);
    }
  }, [selectedPartner]);

  const loadPartnerData = async (partner) => {
    try {
      setLoading(true);
      setError(null);

      const [ledgerData, adjData] = await Promise.all([
        getPartnerLedger(partner),
        getAllPartnerMonthlyAdjustments(partner)
      ]);

      setRawLedgerEntries(ledgerData || []);
      setRawAdjustments(adjData || []);
    } catch (err) {
      console.error(err);
      setError('Failed to load partner details');
    } finally {
      setLoading(false);
    }
  };

  // Extract all distinct months (YYYY-MM) present in transactions or adjustments
  const availableMonths = useMemo(() => {
    const set = new Set();
    rawLedgerEntries.forEach(r => {
      if (r.date) set.add(r.date.slice(0, 7));
    });
    rawAdjustments.forEach(a => {
      if (a.month_year) set.add(a.month_year);
    });

    // Also include current month and last month if not present
    const now = new Date();
    const currM = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    set.add(currM);

    return Array.from(set).sort().reverse();
  }, [rawLedgerEntries, rawAdjustments]);

  // Compute clean, month-by-month scorecard data (Zero Carry Forward)
  const monthlyScorecards = useMemo(() => {
    if (!selectedPartner) return [];

    return availableMonths.map(month => {
      // 1. Vouchers for this month (out-of-pocket expenses)
      const monthVouchers = rawLedgerEntries.filter(r => {
        return r.date && r.date.startsWith(month) && Number(r.expense) > 0;
      });
      const voucherTotal = monthVouchers.reduce((s, r) => s + (Number(r.expense) || 0), 0);

      // 2. Fixed Entitlements for this month (Salary, EMI) from adjustments
      const monthFixed = rawAdjustments.filter(a => {
        return a.month_year === month && Number(a.payment) > 0;
      });
      const fixedTotal = monthFixed.reduce((s, a) => s + (Number(a.payment) || 0), 0);

      // Total Banta Tha (Payable)
      const totalPayable = voucherTotal + fixedTotal;

      // 3. Payments Paid by Company for this month
      // a) Ledger receipts mapped to this month
      const ledgerReceipts = rawLedgerEntries.filter(r => {
        if (Number(r.receipt) <= 0) return false;
        const targetMonth = paymentTargetMap[r.id] || r.settlement_month || (r.date ? r.date.slice(0, 7) : '');
        return targetMonth === month;
      });
      const ledgerPaidTotal = ledgerReceipts.reduce((s, r) => s + (Number(r.receipt) || 0), 0);

      // b) Direct payments recorded in adjustments for this month
      const adjReceipts = rawAdjustments.filter(a => {
        return a.month_year === month && Number(a.receipt) > 0;
      });
      const adjPaidTotal = adjReceipts.reduce((s, a) => s + (Number(a.receipt) || 0), 0);

      const totalPaid = ledgerPaidTotal + adjPaidTotal;
      const netBalance = totalPayable - totalPaid;

      return {
        month,
        monthName: formatMonthName(month),
        voucherCount: monthVouchers.length,
        voucherTotal,
        fixedTotal,
        totalPayable,
        totalPaid,
        netBalance,
        status: netBalance === 0 ? 'settled' : (netBalance > 0 ? 'pending' : 'advance'),
        vouchers: monthVouchers,
        fixedItems: monthFixed,
        payments: [
          ...ledgerReceipts.map(r => ({
            id: r.id,
            source: 'ledger',
            date: r.date,
            description: r.description || 'Reimbursement / Payment',
            amount: Number(r.receipt) || 0
          })),
          ...adjReceipts.map(a => ({
            id: a.id,
            source: 'adjustment',
            date: a.created_at ? a.created_at.split('T')[0] : '',
            description: a.description || 'Payment',
            amount: Number(a.receipt) || 0
          }))
        ]
      };
    });
  }, [selectedPartner, availableMonths, rawLedgerEntries, rawAdjustments, paymentTargetMap]);

  // Overall totals across all months
  const overallSummary = useMemo(() => {
    let vouchers = 0;
    let fixed = 0;
    let payable = 0;
    let paid = 0;
    let pending = 0;

    monthlyScorecards.forEach(m => {
      vouchers += m.voucherTotal;
      fixed += m.fixedTotal;
      payable += m.totalPayable;
      paid += m.totalPaid;
      if (m.netBalance > 0) pending += m.netBalance;
    });

    return { vouchers, fixed, payable, paid, pending };
  }, [monthlyScorecards]);

  // Active month scorecard item
  const currentMonthData = useMemo(() => {
    if (!activeViewMonth) return null;
    return monthlyScorecards.find(m => m.month === activeViewMonth) || null;
  }, [activeViewMonth, monthlyScorecards]);

  // When activeViewMonth opens, load its fixed items into the editable state
  useEffect(() => {
    if (activeViewMonth && currentMonthData) {
      const existing = currentMonthData.fixedItems.map(f => ({
        id: f.id,
        description: f.description || '',
        payment: Number(f.payment) > 0 ? String(f.payment) : '',
        receipt: Number(f.receipt) > 0 ? String(f.receipt) : ''
      }));

      // If empty, look if there's any previous month with fixed items to suggest auto-fill
      if (existing.length > 0) {
        setMonthFixedRows(existing);
        setFixedRowsSnapshot(JSON.parse(JSON.stringify(existing)));
      } else {
        const defaultRows = [
          { id: `salary_${Date.now()}`, description: 'Monthly Salary', payment: '', receipt: '' },
          { id: `emi_${Date.now()}`, description: 'Car / Vehicle EMI', payment: '', receipt: '' }
        ];
        setMonthFixedRows(defaultRows);
        setFixedRowsSnapshot(JSON.parse(JSON.stringify(defaultRows)));
      }
      setIsFixedDirty(false);
      setFixedSuccessMsg('');
    }
  }, [activeViewMonth, currentMonthData]);

  // Smart feature: Auto-fill fixed items from the closest previous month that has fixed data
  const handleAutoFillFromPrevious = () => {
    // Find the latest month before activeViewMonth that had fixed items
    const prevScorecard = monthlyScorecards.find(m => m.month !== activeViewMonth && m.fixedItems.length > 0);
    if (prevScorecard && prevScorecard.fixedItems.length > 0) {
      const cloned = prevScorecard.fixedItems.map(f => ({
        id: `clone_${Date.now()}_${Math.random()}`,
        description: f.description,
        payment: String(f.payment),
        receipt: ''
      }));
      setMonthFixedRows(cloned);
      setIsFixedDirty(true);
    } else {
      alert('No previous month fixed data found to copy.');
    }
  };

  // Fixed rows handlers
  const handleAddFixedRow = () => {
    setMonthFixedRows([
      ...monthFixedRows,
      { id: `new_${Date.now()}`, description: '', payment: '', receipt: '' }
    ]);
    setIsFixedDirty(true);
  };

  const handleUpdateFixedRow = (id, field, value) => {
    setMonthFixedRows(monthFixedRows.map(r => r.id === id ? { ...r, [field]: value } : r));
    setIsFixedDirty(true);
  };

  const handleRemoveFixedRow = (id) => {
    setMonthFixedRows(monthFixedRows.filter(r => r.id !== id));
    setIsFixedDirty(true);
  };

  const handleDiscardFixedEdits = () => {
    setMonthFixedRows(JSON.parse(JSON.stringify(fixedRowsSnapshot)));
    setIsFixedDirty(false);
  };

  const handleSaveFixedRows = async () => {
    if (!selectedPartner || !activeViewMonth) return;
    try {
      setSavingFixed(true);
      await savePartnerMonthlyAdjustments(selectedPartner, activeViewMonth, monthFixedRows);
      await loadPartnerData(selectedPartner);
      setIsFixedDirty(false);
      setFixedSuccessMsg(`Fixed details for ${formatMonthName(activeViewMonth)} saved successfully!`);
      setTimeout(() => setFixedSuccessMsg(''), 4000);
    } catch (err) {
      console.error(err);
      alert('Failed to save fixed details: ' + (err.message || 'Error'));
    } finally {
      setSavingFixed(false);
    }
  };

  // Payment Recording
  const handleSavePayment = async (e) => {
    e.preventDefault();
    if (!newPaymentAmount || Number(newPaymentAmount) <= 0) {
      alert('Please enter a valid payment amount.');
      return;
    }
    const target = newPaymentTargetMonth || activeViewMonth;
    if (!target) {
      alert('Please select a target settlement month.');
      return;
    }

    try {
      setSavingPayment(true);
      await recordPartnerPayment({
        partnerName: selectedPartner,
        targetMonth: target,
        paymentDate: newPaymentDate,
        amount: newPaymentAmount,
        mode: newPaymentMode
      });

      await loadPartnerData(selectedPartner);
      setShowAddPaymentForm(false);
      setNewPaymentAmount('');
      setNewPaymentMode('');
      alert(`Payment of ₹${Number(newPaymentAmount).toLocaleString('en-IN')} successfully recorded for ${formatMonthName(target)}!`);
    } catch (err) {
      console.error(err);
      alert('Failed to record payment: ' + (err.message || 'Error'));
    } finally {
      setSavingPayment(false);
    }
  };

  // Excel Export for a specific month
  const exportMonthToExcel = (scorecard) => {
    if (!scorecard) return;

    const wsData = [
      ['DKPT TEXTILE & APPARELS'],
      [`Partner Monthly Settlement Statement - ${selectedPartner}`],
      [`Settlement Month: ${scorecard.monthName} (${scorecard.month})`],
      [`Generated On: ${new Date().toLocaleDateString('en-IN')}`],
      [],
      ['1. FIXED MONTHLY ENTITLEMENTS (Salary & EMI)'],
      ['Item Description', 'Amount Payable (₹)']
    ];

    if (scorecard.fixedItems.length === 0) {
      wsData.push(['No fixed entitlements recorded', 0]);
    } else {
      scorecard.fixedItems.forEach(f => {
        wsData.push([f.description, Number(f.payment) || 0]);
      });
    }
    wsData.push(['Subtotal Fixed Entitlements', scorecard.fixedTotal]);
    wsData.push([]);

    wsData.push(['2. OUT-OF-POCKET EXPENSES (VOUCHERS)']);
    wsData.push(['Date', 'Description / Voucher', 'Amount (₹)']);
    if (scorecard.vouchers.length === 0) {
      wsData.push(['-', 'No expense vouchers', 0]);
    } else {
      scorecard.vouchers.forEach(v => {
        wsData.push([formatDate(v.date), v.description || '-', Number(v.expense) || 0]);
      });
    }
    wsData.push(['Subtotal Expense Vouchers', `${scorecard.voucherCount} vouchers`, scorecard.voucherTotal]);
    wsData.push([]);

    wsData.push(['3. PAYMENTS & REIMBURSEMENTS (PAID BY COMPANY)']);
    wsData.push(['Payment Date', 'Details / Mode', 'Amount Paid (₹)']);
    if (scorecard.payments.length === 0) {
      wsData.push(['-', 'No payments recorded for this month', 0]);
    } else {
      scorecard.payments.forEach(p => {
        wsData.push([formatDate(p.date), p.description, p.amount]);
      });
    }
    wsData.push(['Subtotal Payments Made', '-', scorecard.totalPaid]);
    wsData.push([]);

    wsData.push(['=============================================']);
    wsData.push(['TOTAL PAYABLE (Fixed + Vouchers)', scorecard.totalPayable]);
    wsData.push(['TOTAL PAID BY COMPANY', scorecard.totalPaid]);
    wsData.push([
      scorecard.netBalance > 0 ? 'NET PENDING (COMPANY TO PAY)' : (scorecard.netBalance === 0 ? 'STATUS: FULLY SETTLED' : 'EXCESS PAID (ADVANCE)'),
      Math.abs(scorecard.netBalance)
    ]);

    const ws = XLSX.utils.aoa_to_sheet(wsData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Monthly Settlement");
    XLSX.writeFile(wb, `${selectedPartner}_${scorecard.month}_Settlement.xlsx`);
  };

  // Filter vouchers by search
  const filteredMonthVouchers = useMemo(() => {
    if (!currentMonthData) return [];
    if (!voucherSearch.trim()) return currentMonthData.vouchers;
    const q = voucherSearch.toLowerCase();
    return currentMonthData.vouchers.filter(v => 
      (v.description && v.description.toLowerCase().includes(q)) ||
      (v.date && v.date.includes(q)) ||
      String(v.expense).includes(q)
    );
  }, [currentMonthData, voucherSearch]);

  return (
    <div style={{ maxWidth: '1280px', margin: '0 auto', paddingBottom: '3rem' }}>
      
      {/* ========================================================================= */}
      {/* MAIN TOP BAR (PARTNER SELECTOR & REFRESH)                                */}
      {/* ========================================================================= */}
      <div className="glass-card no-print" style={{ marginBottom: '1.25rem', padding: '1rem 1.25rem', background: '#ffffff', border: '1px solid #e2e8f0' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
              <div style={{ width: '38px', height: '38px', borderRadius: '10px', background: 'linear-gradient(135deg, #1e40af 0%, #3b82f6 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff' }}>
                <Building2 size={20} />
              </div>
              <div>
                <h1 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#0f172a', margin: 0, letterSpacing: '-0.02em' }}>
                  Partners Settlement & Ledger Statement
                </h1>
                <p style={{ fontSize: '0.8rem', color: '#64748b', margin: '0.15rem 0 0 0' }}>
                  Month-wise zero-carryforward settlement, expense vouchers & remuneration
                </p>
              </div>
            </div>
          </div>

          {/* Partner Selector */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', background: '#f8fafc', padding: '0.35rem 0.75rem', borderRadius: '0.5rem', border: '1px solid #cbd5e1' }}>
              <User size={16} style={{ color: '#2563eb' }} />
              <label style={{ fontSize: '0.85rem', fontWeight: 600, color: '#334155' }}>Partner:</label>
              <select
                value={selectedPartner}
                onChange={(e) => {
                  setSelectedPartner(e.target.value);
                  setActiveViewMonth(null); // Return to summary when changing partner
                }}
                style={{
                  border: 'none',
                  background: 'transparent',
                  fontWeight: 700,
                  fontSize: '0.95rem',
                  color: '#1e3a8a',
                  cursor: 'pointer',
                  outline: 'none',
                  padding: '0.2rem 0.4rem'
                }}
              >
                {uniquePartners.map(p => (
                  <option key={p} value={p}>{p}</option>
                ))}
              </select>
            </div>

            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => loadPartnerData(selectedPartner)}
              disabled={loading}
              style={{ fontSize: '0.8rem', padding: '0.45rem 0.75rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}
              title="Refresh Data"
            >
              <RotateCcw size={14} className={loading ? 'animate-spin' : ''} />
              <span>{loading ? 'Refreshing...' : 'Refresh'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Loading & Error States */}
      {loading && !rawLedgerEntries.length && (
        <div style={{ textAlign: 'center', padding: '4rem 1rem', color: '#64748b' }}>
          <RotateCcw size={32} className="animate-spin" style={{ margin: '0 auto 1rem auto', color: '#2563eb' }} />
          <p style={{ fontWeight: 600 }}>Loading partner records...</p>
        </div>
      )}

      {error && (
        <div style={{ padding: '1rem', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '0.5rem', color: '#b91c1c', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <AlertCircle size={18} />
          <span>{error}</span>
        </div>
      )}

      {!loading && selectedPartner && (
        <>
          {/* ========================================================================= */}
          {/* LEVEL 1: EXECUTIVE MASTER MONTHLY SCORECARD (WHEN NO MONTH IS EXPANDED)  */}
          {/* ========================================================================= */}
          {activeViewMonth === null ? (
            <div>
              {/* Top Executive Summary Cards */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
                <div className="glass-card" style={{ padding: '1.15rem', background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '0.75rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <span style={{ fontSize: '0.8rem', fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Total Vouchers</span>
                    <Receipt size={18} style={{ color: '#6366f1' }} />
                  </div>
                  <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#1e293b', marginTop: '0.5rem' }}>
                    ₹ {overallSummary.vouchers.toLocaleString('en-IN', { maximumFractionDigits: 2 })}
                  </div>
                  <p style={{ fontSize: '0.75rem', color: '#94a3b8', margin: '0.2rem 0 0 0' }}>All months bills paid by partner</p>
                </div>

                <div className="glass-card" style={{ padding: '1.15rem', background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '0.75rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <span style={{ fontSize: '0.8rem', fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Fixed Remuneration</span>
                    <Calendar size={18} style={{ color: '#0ea5e9' }} />
                  </div>
                  <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#1e293b', marginTop: '0.5rem' }}>
                    ₹ {overallSummary.fixed.toLocaleString('en-IN', { maximumFractionDigits: 2 })}
                  </div>
                  <p style={{ fontSize: '0.75rem', color: '#94a3b8', margin: '0.2rem 0 0 0' }}>Salary & Vehicle EMI entitlements</p>
                </div>

                <div className="glass-card" style={{ padding: '1.15rem', background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '0.75rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <span style={{ fontSize: '0.8rem', fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Total Paid by Company</span>
                    <CheckCircle2 size={18} style={{ color: '#16a34a' }} />
                  </div>
                  <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#16a34a', marginTop: '0.5rem' }}>
                    ₹ {overallSummary.paid.toLocaleString('en-IN', { maximumFractionDigits: 2 })}
                  </div>
                  <p style={{ fontSize: '0.75rem', color: '#94a3b8', margin: '0.2rem 0 0 0' }}>Settlements & reimbursements paid</p>
                </div>

                <div className="glass-card" style={{ padding: '1.15rem', background: overallSummary.pending > 0 ? '#fff1f2' : '#f0fdf4', border: `1px solid ${overallSummary.pending > 0 ? '#fecdd3' : '#bbf7d0'}`, borderRadius: '0.75rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <span style={{ fontSize: '0.8rem', fontWeight: 700, color: overallSummary.pending > 0 ? '#e11d48' : '#166534', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                      {overallSummary.pending > 0 ? 'Net Pending Dena Hai' : 'All Settled'}
                    </span>
                    <AlertCircle size={18} style={{ color: overallSummary.pending > 0 ? '#e11d48' : '#166534' }} />
                  </div>
                  <div style={{ fontSize: '1.5rem', fontWeight: 800, color: overallSummary.pending > 0 ? '#e11d48' : '#166534', marginTop: '0.5rem' }}>
                    ₹ {overallSummary.pending.toLocaleString('en-IN', { maximumFractionDigits: 2 })}
                  </div>
                  <p style={{ fontSize: '0.75rem', color: overallSummary.pending > 0 ? '#fb7185' : '#86efac', margin: '0.2rem 0 0 0' }}>
                    {overallSummary.pending > 0 ? 'Firm owes partner' : 'No outstanding dues'}
                  </p>
                </div>
              </div>

              {/* Master Scorecard Table */}
              <div className="glass-card" style={{ padding: '1.25rem', background: '#ffffff', border: '1px solid #cbd5e1', borderRadius: '0.75rem', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '0.5rem' }}>
                  <div>
                    <h2 style={{ fontSize: '1.1rem', fontWeight: 800, color: '#1e3a8a', display: 'flex', alignItems: 'center', gap: '0.5rem', margin: 0 }}>
                      <TrendingUp size={20} style={{ color: '#2563eb' }} />
                      Month-by-Month Executive Settlement Scorecard
                    </h2>
                    <p style={{ fontSize: '0.8rem', color: '#64748b', margin: '0.2rem 0 0 0' }}>
                      Zero Carry-Forward: Har mahina bilkul alag aur swatantra hai. Click karke detail dekhein.
                    </p>
                  </div>

                  <button
                    type="button"
                    className="btn btn-primary"
                    onClick={() => {
                      setShowAddPaymentForm(true);
                      setNewPaymentTargetMonth(availableMonths[0] || '');
                    }}
                    style={{ fontSize: '0.825rem', padding: '0.4rem 0.85rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}
                  >
                    <Plus size={15} /> Record Payment to Partner
                  </button>
                </div>

                <div className="table-container" style={{ border: '1px solid #e2e8f0', borderRadius: '0.5rem', overflow: 'hidden' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                    <thead>
                      <tr style={{ background: '#1e3a8a', color: '#ffffff' }}>
                        <th style={{ padding: '0.75rem 1rem', fontWeight: 700, fontSize: '0.85rem' }}>Mahina (Month)</th>
                        <th style={{ padding: '0.75rem 1rem', textAlign: 'right', fontWeight: 700, fontSize: '0.85rem' }}>Vouchers (Expenses ₹)</th>
                        <th style={{ padding: '0.75rem 1rem', textAlign: 'right', fontWeight: 700, fontSize: '0.85rem' }}>Fixed (Salary + EMI ₹)</th>
                        <th style={{ padding: '0.75rem 1rem', textAlign: 'right', fontWeight: 700, fontSize: '0.85rem', background: '#172554' }}>Total Banta Tha (Payable ₹)</th>
                        <th style={{ padding: '0.75rem 1rem', textAlign: 'right', fontWeight: 700, fontSize: '0.85rem', color: '#86efac' }}>Company Ne Diya (Paid ₹)</th>
                        <th style={{ padding: '0.75rem 1rem', textAlign: 'center', fontWeight: 700, fontSize: '0.85rem' }}>Status</th>
                        <th style={{ padding: '0.75rem 1rem', textAlign: 'center', fontWeight: 700, fontSize: '0.85rem' }}>Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {monthlyScorecards.map((sc, idx) => {
                        const isEven = idx % 2 === 0;
                        return (
                          <tr
                            key={sc.month}
                            onClick={() => setActiveViewMonth(sc.month)}
                            style={{
                              background: isEven ? '#ffffff' : '#f8fafc',
                              borderBottom: '1px solid #e2e8f0',
                              cursor: 'pointer',
                              transition: 'background 0.15s ease'
                            }}
                            onMouseEnter={(e) => e.currentTarget.style.background = '#f1f5f9'}
                            onMouseLeave={(e) => e.currentTarget.style.background = isEven ? '#ffffff' : '#f8fafc'}
                          >
                            <td style={{ padding: '0.85rem 1rem', fontWeight: 700, color: '#0f172a' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                <CalendarDays size={16} style={{ color: '#2563eb' }} />
                                <span>{sc.monthName}</span>
                              </div>
                            </td>

                            <td style={{ padding: '0.85rem 1rem', textAlign: 'right', fontWeight: 600, color: '#475569' }}>
                              ₹ {sc.voucherTotal.toLocaleString('en-IN', { maximumFractionDigits: 2 })}
                              <div style={{ fontSize: '0.7rem', color: '#94a3b8' }}>{sc.voucherCount} vouchers</div>
                            </td>

                            <td style={{ padding: '0.85rem 1rem', textAlign: 'right', fontWeight: 600, color: '#0284c7' }}>
                              {sc.fixedTotal > 0 ? `₹ ${sc.fixedTotal.toLocaleString('en-IN', { maximumFractionDigits: 2 })}` : '-'}
                            </td>

                            <td style={{ padding: '0.85rem 1rem', textAlign: 'right', fontWeight: 800, color: '#1e3a8a', fontSize: '0.95rem' }}>
                              ₹ {sc.totalPayable.toLocaleString('en-IN', { maximumFractionDigits: 2 })}
                            </td>

                            <td style={{ padding: '0.85rem 1rem', textAlign: 'right', fontWeight: 700, color: '#16a34a', fontSize: '0.95rem' }}>
                              {sc.totalPaid > 0 ? `₹ ${sc.totalPaid.toLocaleString('en-IN', { maximumFractionDigits: 2 })}` : '-'}
                            </td>

                            <td style={{ padding: '0.85rem 1rem', textAlign: 'center' }}>
                              {sc.status === 'settled' && (
                                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem', padding: '0.25rem 0.65rem', borderRadius: '1rem', background: '#dcfce7', color: '#15803d', fontSize: '0.75rem', fontWeight: 700 }}>
                                  <CheckCircle2 size={13} /> Clear (Settled)
                                </span>
                              )}
                              {sc.status === 'pending' && (
                                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem', padding: '0.25rem 0.65rem', borderRadius: '1rem', background: '#fee2e2', color: '#b91c1c', fontSize: '0.75rem', fontWeight: 700 }}>
                                  <Clock size={13} /> ₹ {sc.netBalance.toLocaleString('en-IN', { maximumFractionDigits: 2 })} Dena Hai
                                </span>
                              )}
                              {sc.status === 'advance' && (
                                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem', padding: '0.25rem 0.65rem', borderRadius: '1rem', background: '#e0f2fe', color: '#0369a1', fontSize: '0.75rem', fontWeight: 700 }}>
                                  Advance ₹ {Math.abs(sc.netBalance).toLocaleString('en-IN', { maximumFractionDigits: 2 })}
                                </span>
                              )}
                            </td>

                            <td style={{ padding: '0.85rem 1rem', textAlign: 'center' }}>
                              <button
                                type="button"
                                className="btn btn-secondary"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setActiveViewMonth(sc.month);
                                }}
                                style={{ fontSize: '0.75rem', padding: '0.3rem 0.65rem', display: 'inline-flex', alignItems: 'center', gap: '0.3rem', color: '#2563eb', fontWeight: 600 }}
                              >
                                <span>View & Settle</span>
                                <ChevronRight size={13} />
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          ) : (
            /* ========================================================================= */
            /* LEVEL 2: DETAILED MONTH WORKSTATION (CLEAN & NON-HOCHPOCH)               */
            /* ========================================================================= */
            currentMonthData && (
              <div>
                {/* Official Letterhead Header for Print / PDF */}
                <div className="print-only" style={{ marginBottom: '1.25rem', borderBottom: '2px solid #0f172a', paddingBottom: '0.75rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div>
                      <h1 style={{ fontSize: '1.4rem', fontWeight: 900, color: '#0f172a', margin: 0 }}>DKPT TEXTILE & APPARELS</h1>
                      <h2 style={{ fontSize: '1.05rem', fontWeight: 700, color: '#334155', margin: '0.2rem 0 0 0' }}>
                        Partner Monthly Settlement Statement
                      </h2>
                      <p style={{ fontSize: '0.85rem', color: '#475569', margin: '0.25rem 0 0 0' }}>
                        Partner Name: <strong>{selectedPartner}</strong> | Settlement Month: <strong>{currentMonthData.monthName} ({currentMonthData.month})</strong>
                      </p>
                    </div>
                    <div style={{ textAlign: 'right', fontSize: '0.8rem', color: '#64748b' }}>
                      <p style={{ margin: 0 }}>Date: {new Date().toLocaleDateString('en-IN')}</p>
                      <p style={{ margin: '0.2rem 0 0 0' }}>Time: {new Date().toLocaleTimeString('en-IN')}</p>
                    </div>
                  </div>
                </div>

                {/* Back button & Month Title Bar */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.25rem' }} className="no-print">
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <button
                      type="button"
                      className="btn btn-secondary"
                      onClick={() => setActiveViewMonth(null)}
                      style={{ fontSize: '0.85rem', padding: '0.45rem 0.85rem', display: 'flex', alignItems: 'center', gap: '0.4rem', fontWeight: 600 }}
                    >
                      <ArrowLeft size={16} /> All Months
                    </button>
                    <div>
                      <h2 style={{ fontSize: '1.35rem', fontWeight: 800, color: '#0f172a', margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <span>{currentMonthData.monthName} Settlement</span>
                        <span style={{ fontSize: '0.85rem', fontWeight: 600, color: '#64748b' }}>({selectedPartner})</span>
                      </h2>
                      <p style={{ fontSize: '0.8rem', color: '#64748b', margin: '0.15rem 0 0 0' }}>
                        Zero-carryforward: Is mahine ka hisaab bilkul swatantra hai.
                      </p>
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }} className="no-print">
                    <button
                      type="button"
                      className="btn btn-secondary"
                      onClick={() => exportMonthToExcel(currentMonthData)}
                      style={{ fontSize: '0.8rem', padding: '0.4rem 0.75rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}
                      title="Export Excel for this Month"
                    >
                      <Download size={14} style={{ color: '#16a34a' }} /> Export Excel
                    </button>
                    <button
                      type="button"
                      className="btn btn-secondary"
                      onClick={() => window.print()}
                      style={{ fontSize: '0.8rem', padding: '0.4rem 0.75rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}
                    >
                      <Printer size={14} /> Print
                    </button>
                  </div>
                </div>

                {/* 3 Top Summary Cards for this Month */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
                  <div style={{ padding: '1rem', background: '#f0fdf4', borderRadius: '0.75rem', border: '1px solid #bbf7d0' }}>
                    <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#15803d', textTransform: 'uppercase' }}>Box 1: Fixed Entitlements</span>
                    <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#15803d', marginTop: '0.35rem' }}>
                      ₹ {currentMonthData.fixedTotal.toLocaleString('en-IN', { maximumFractionDigits: 2 })}
                    </div>
                    <div style={{ fontSize: '0.75rem', color: '#166534', marginTop: '0.15rem' }}>Salary, Car EMI etc.</div>
                  </div>

                  <div style={{ padding: '1rem', background: '#f8fafc', borderRadius: '0.75rem', border: '1px solid #cbd5e1' }}>
                    <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#475569', textTransform: 'uppercase' }}>Box 2: Vouchers Reimbursement</span>
                    <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#1e293b', marginTop: '0.35rem' }}>
                      ₹ {currentMonthData.voucherTotal.toLocaleString('en-IN', { maximumFractionDigits: 2 })}
                    </div>
                    <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '0.15rem' }}>{currentMonthData.voucherCount} out-of-pocket bills</div>
                  </div>

                  <div style={{ padding: '1rem', background: currentMonthData.netBalance > 0 ? '#fff1f2' : '#f0fdf4', borderRadius: '0.75rem', border: `1px solid ${currentMonthData.netBalance > 0 ? '#fecdd3' : '#bbf7d0'}` }}>
                    <span style={{ fontSize: '0.75rem', fontWeight: 700, color: currentMonthData.netBalance > 0 ? '#e11d48' : '#15803d', textTransform: 'uppercase' }}>
                      {currentMonthData.netBalance > 0 ? 'Net Pending Dena Hai' : 'Full Month Settled'}
                    </span>
                    <div style={{ fontSize: '1.4rem', fontWeight: 800, color: currentMonthData.netBalance > 0 ? '#e11d48' : '#15803d', marginTop: '0.35rem' }}>
                      ₹ {Math.abs(currentMonthData.netBalance).toLocaleString('en-IN', { maximumFractionDigits: 2 })}
                    </div>
                    <div style={{ fontSize: '0.75rem', color: currentMonthData.netBalance > 0 ? '#be123c' : '#15803d', marginTop: '0.15rem' }}>
                      Paid: ₹{currentMonthData.totalPaid.toLocaleString('en-IN')} of ₹{currentMonthData.totalPayable.toLocaleString('en-IN')}
                    </div>
                  </div>
                </div>

                {/* ============================================================= */}
                {/* BOX 1: FIXED MONTHLY ENTITLEMENTS (SALARY & CAR EMI)         */}
                {/* ============================================================= */}
                <div className="glass-card" style={{ marginBottom: '1.5rem', padding: '1.25rem', background: '#ffffff', border: '1px solid #cbd5e1', borderRadius: '0.75rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem', flexWrap: 'wrap', gap: '0.5rem' }}>
                    <div>
                      <h3 style={{ fontSize: '1rem', fontWeight: 800, color: '#1e40af', margin: 0, display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                        <Calendar size={18} />
                        1. Fixed Monthly Entitlements (Salary & Car EMI)
                      </h3>
                      <p style={{ fontSize: '0.78rem', color: '#64748b', margin: '0.15rem 0 0 0' }}>
                        Har mahine ke fixed kharche jo partner ko company se lene hote hain
                      </p>
                    </div>

                    <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }} className="no-print">
                      {monthFixedRows.length === 0 || monthFixedRows.every(r => !r.payment) ? (
                        <button
                          type="button"
                          className="btn btn-secondary"
                          onClick={handleAutoFillFromPrevious}
                          style={{ fontSize: '0.75rem', padding: '0.35rem 0.65rem', display: 'flex', alignItems: 'center', gap: '0.3rem', color: '#0369a1' }}
                          title="Copy Salary and EMI from last saved month"
                        >
                          <Sparkles size={13} /> Auto-fill from Previous Month
                        </button>
                      ) : null}

                      <button
                        type="button"
                        className="btn btn-primary"
                        onClick={handleAddFixedRow}
                        style={{ fontSize: '0.75rem', padding: '0.35rem 0.65rem', display: 'flex', alignItems: 'center', gap: '0.3rem' }}
                      >
                        <Plus size={13} /> Add Fixed Row
                      </button>

                      {isFixedDirty && (
                        <button
                          type="button"
                          className="btn btn-secondary"
                          onClick={handleDiscardFixedEdits}
                          style={{ fontSize: '0.75rem', padding: '0.35rem 0.65rem', color: '#dc2626', borderColor: '#fca5a5' }}
                        >
                          Discard
                        </button>
                      )}

                      <button
                        type="button"
                        className="btn"
                        onClick={handleSaveFixedRows}
                        disabled={!isFixedDirty || savingFixed}
                        style={{
                          fontSize: '0.75rem',
                          padding: '0.35rem 0.75rem',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.35rem',
                          fontWeight: 700,
                          backgroundColor: isFixedDirty ? '#16a34a' : '#94a3b8',
                          color: '#ffffff',
                          border: 'none',
                          cursor: isFixedDirty && !savingFixed ? 'pointer' : 'not-allowed'
                        }}
                      >
                        <Save size={13} />
                        {savingFixed ? 'Saving...' : (isFixedDirty ? 'Save Fixed Details' : 'Saved')}
                      </button>
                    </div>
                  </div>

                  {isFixedDirty && (
                    <div style={{ padding: '0.4rem 0.75rem', background: '#fef3c7', border: '1px solid #fde047', borderRadius: '0.35rem', marginBottom: '0.75rem', fontSize: '0.8rem', color: '#92400e', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                      <AlertCircle size={14} />
                      <span><strong>Unsaved Changes:</strong> Is mahine ki salary/EMI me badlaav kiya gaya hai. Save karne ke liye <strong>"Save Fixed Details"</strong> dabayein.</span>
                    </div>
                  )}

                  {fixedSuccessMsg && (
                    <div style={{ padding: '0.4rem 0.75rem', background: '#dcfce7', border: '1px solid #86efac', borderRadius: '0.35rem', marginBottom: '0.75rem', fontSize: '0.8rem', color: '#166534', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                      <CheckCircle2 size={14} />
                      <span>{fixedSuccessMsg}</span>
                    </div>
                  )}

                  <div className="table-container" style={{ border: '1px solid #e2e8f0', borderRadius: '0.35rem' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                      <thead>
                        <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                          <th style={{ padding: '0.5rem 0.75rem', fontSize: '0.8rem', width: '50%' }}>Description / Item</th>
                          <th style={{ padding: '0.5rem 0.75rem', fontSize: '0.8rem', textAlign: 'right', width: '35%', color: '#b91c1c' }}>Amount Payable (₹ Company Dena)</th>
                          <th style={{ padding: '0.5rem 0.75rem', fontSize: '0.8rem', textAlign: 'center', width: '15%' }} className="no-print">Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {monthFixedRows.map((row, idx) => (
                          <tr key={row.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                            <td style={{ padding: '0.45rem 0.75rem' }}>
                              <input
                                type="text"
                                className="input-field"
                                placeholder="e.g. Monthly Salary, Car EMI, Rent..."
                                value={row.description}
                                onChange={(e) => handleUpdateFixedRow(row.id, 'description', e.target.value)}
                                style={{ width: '100%', marginBottom: 0, fontSize: '0.85rem', fontWeight: 600 }}
                              />
                            </td>
                            <td style={{ padding: '0.45rem 0.75rem', textAlign: 'right' }}>
                              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '0.25rem' }}>
                                <span style={{ color: '#b91c1c', fontWeight: 600, fontSize: '0.85rem' }}>₹</span>
                                <input
                                  type="number"
                                  className="input-field"
                                  placeholder="0.00"
                                  value={row.payment}
                                  onChange={(e) => handleUpdateFixedRow(row.id, 'payment', e.target.value)}
                                  style={{ width: '130px', textAlign: 'right', marginBottom: 0, fontWeight: 700, color: '#b91c1c', fontSize: '0.85rem' }}
                                />
                              </div>
                            </td>
                            <td style={{ padding: '0.45rem 0.75rem', textAlign: 'center' }} className="no-print">
                              <button
                                type="button"
                                onClick={() => handleRemoveFixedRow(row.id)}
                                style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: '#ef4444', padding: '0.2rem' }}
                                title="Delete row"
                              >
                                <Trash2 size={14} />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot>
                        <tr style={{ background: '#f8fafc', fontWeight: 800 }}>
                          <td style={{ padding: '0.6rem 0.75rem', fontSize: '0.85rem', color: '#1e3a8a' }}>
                            Subtotal Fixed Entitlements
                          </td>
                          <td style={{ padding: '0.6rem 0.75rem', textAlign: 'right', color: '#b91c1c', fontSize: '0.95rem' }}>
                            ₹ {monthFixedRows.reduce((s, r) => s + (Number(r.payment) || 0), 0).toLocaleString('en-IN', { maximumFractionDigits: 2 })}
                          </td>
                          <td className="no-print"></td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                </div>

                {/* ============================================================= */}
                {/* BOX 2: OUT-OF-POCKET EXPENSES (BILLS / VOUCHERS)             */}
                {/* ============================================================= */}
                <div className="glass-card" style={{ marginBottom: '1.5rem', padding: '1.25rem', background: '#ffffff', border: '1px solid #cbd5e1', borderRadius: '0.75rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem', flexWrap: 'wrap', gap: '0.5rem' }}>
                    <div>
                      <h3 style={{ fontSize: '1rem', fontWeight: 800, color: '#1e40af', margin: 0, display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                        <Receipt size={18} />
                        2. Out-of-Pocket Expenses (Vouchers / Reimbursement)
                      </h3>
                      <p style={{ fontSize: '0.78rem', color: '#64748b', margin: '0.15rem 0 0 0' }}>
                        Partner ne company ke kaam ke liye apni jeb se jo kharche kiye jo wapas lene hain
                      </p>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                      <span style={{ fontSize: '0.85rem', fontWeight: 800, color: '#1e293b', background: '#f1f5f9', padding: '0.25rem 0.6rem', borderRadius: '0.4rem' }}>
                        Total: ₹ {currentMonthData.voucherTotal.toLocaleString('en-IN', { maximumFractionDigits: 2 })} ({currentMonthData.voucherCount} bills)
                      </span>
                      <div style={{ position: 'relative' }} className="no-print">
                        <Search size={14} style={{ position: 'absolute', left: '0.6rem', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
                        <input
                          type="text"
                          placeholder="Search vouchers..."
                          value={voucherSearch}
                          onChange={(e) => setVoucherSearch(e.target.value)}
                          style={{ padding: '0.3rem 0.6rem 0.3rem 1.8rem', fontSize: '0.8rem', border: '1px solid #cbd5e1', borderRadius: '0.35rem', outline: 'none', width: '160px' }}
                        />
                      </div>
                    </div>
                  </div>

                  <div className="table-container voucher-table-scroll" style={{ border: '1px solid #e2e8f0', borderRadius: '0.35rem' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                      <thead style={{ background: '#f8fafc' }}>
                        <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
                          <th style={{ padding: '0.5rem 0.75rem', fontSize: '0.8rem', width: '15%' }}>Date</th>
                          <th style={{ padding: '0.5rem 0.75rem', fontSize: '0.8rem', width: '65%' }}>Description / Expense Head</th>
                          <th style={{ padding: '0.5rem 0.75rem', fontSize: '0.8rem', textAlign: 'right', width: '20%' }}>Amount (₹)</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredMonthVouchers.length === 0 ? (
                          <tr>
                            <td colSpan="3" style={{ textAlign: 'center', padding: '1.5rem', color: '#94a3b8', fontSize: '0.85rem' }}>
                              No expense vouchers found for this month.
                            </td>
                          </tr>
                        ) : (
                          filteredMonthVouchers.map((v, i) => (
                            <tr key={v.id || i} style={{ borderBottom: '1px solid #f1f5f9' }}>
                              <td style={{ padding: '0.45rem 0.75rem', fontSize: '0.8rem', color: '#475569', fontWeight: 600 }}>
                                {formatDate(v.date)}
                              </td>
                              <td style={{ padding: '0.45rem 0.75rem', fontSize: '0.85rem', color: '#1e293b' }}>
                                {v.description || '-'}
                              </td>
                              <td style={{ padding: '0.45rem 0.75rem', textAlign: 'right', fontWeight: 700, color: '#b91c1c', fontSize: '0.85rem' }}>
                                ₹ {Number(v.expense).toLocaleString('en-IN', { maximumFractionDigits: 2 })}
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                      <tfoot style={{ background: '#f8fafc', fontWeight: 800 }}>
                        <tr style={{ borderTop: '2px solid #cbd5e1' }}>
                          <td colSpan="2" style={{ padding: '0.6rem 0.75rem', fontSize: '0.85rem', color: '#1e3a8a' }}>
                            Subtotal Out-of-Pocket Vouchers ({filteredMonthVouchers.length} shown)
                          </td>
                          <td style={{ padding: '0.6rem 0.75rem', textAlign: 'right', color: '#b91c1c', fontSize: '0.95rem' }}>
                            ₹ {filteredMonthVouchers.reduce((s, r) => s + (Number(r.expense) || 0), 0).toLocaleString('en-IN', { maximumFractionDigits: 2 })}
                          </td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                </div>

                {/* ============================================================= */}
                {/* BOX 3: PAYMENTS MADE BY COMPANY (SETTLEMENTS / REIMBURSEMENTS) */}
                {/* ============================================================= */}
                <div className="glass-card" style={{ marginBottom: '1.5rem', padding: '1.25rem', background: '#ffffff', border: '1px solid #cbd5e1', borderRadius: '0.75rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem', flexWrap: 'wrap', gap: '0.5rem' }}>
                    <div>
                      <h3 style={{ fontSize: '1rem', fontWeight: 800, color: '#166534', margin: 0, display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                        <CreditCard size={18} />
                        3. Payments Made by Company (Company Ne Kab-Kab Diya)
                      </h3>
                      <p style={{ fontSize: '0.78rem', color: '#64748b', margin: '0.15rem 0 0 0' }}>
                        Is mahine ke hisaab ke against company ne jo paise chukaye (paid back)
                      </p>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }} className="no-print">
                      <span style={{ fontSize: '0.85rem', fontWeight: 800, color: '#166534', background: '#dcfce7', padding: '0.25rem 0.6rem', borderRadius: '0.4rem' }}>
                        Total Paid: ₹ {currentMonthData.totalPaid.toLocaleString('en-IN', { maximumFractionDigits: 2 })}
                      </span>
                      <button
                        type="button"
                        className="btn btn-primary"
                        onClick={() => {
                          setShowAddPaymentForm(true);
                          setNewPaymentTargetMonth(activeViewMonth);
                        }}
                        style={{ fontSize: '0.75rem', padding: '0.35rem 0.65rem', display: 'flex', alignItems: 'center', gap: '0.3rem', background: '#16a34a', borderColor: '#16a34a' }}
                      >
                        <Plus size={13} /> Record Payment
                      </button>
                    </div>
                  </div>

                  <div className="table-container" style={{ border: '1px solid #e2e8f0', borderRadius: '0.35rem' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                      <thead>
                        <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                          <th style={{ padding: '0.5rem 0.75rem', fontSize: '0.8rem', width: '20%' }}>Payment Date (Kab Diya)</th>
                          <th style={{ padding: '0.5rem 0.75rem', fontSize: '0.8rem', width: '45%' }}>Mode / Bank Details / Remarks</th>
                          <th style={{ padding: '0.5rem 0.75rem', fontSize: '0.8rem', width: '20%' }} className="no-print">Target Month</th>
                          <th style={{ padding: '0.5rem 0.75rem', fontSize: '0.8rem', textAlign: 'right', width: '15%', color: '#16a34a' }}>Amount Paid (₹)</th>
                        </tr>
                      </thead>
                      <tbody>
                        {currentMonthData.payments.length === 0 ? (
                          <tr>
                            <td colSpan="4" style={{ textAlign: 'center', padding: '1.25rem', color: '#94a3b8', fontSize: '0.85rem' }}>
                              No payments recorded for this month yet. Click <strong>"+ Record Payment"</strong> above when company pays.
                            </td>
                          </tr>
                        ) : (
                          currentMonthData.payments.map((p, i) => (
                            <tr key={p.id || i} style={{ borderBottom: '1px solid #f1f5f9' }}>
                              <td style={{ padding: '0.5rem 0.75rem', fontSize: '0.85rem', fontWeight: 600, color: '#334155' }}>
                                {formatDate(p.date)}
                              </td>
                              <td style={{ padding: '0.5rem 0.75rem', fontSize: '0.85rem', color: '#1e293b' }}>
                                {p.description}
                              </td>
                              <td style={{ padding: '0.5rem 0.75rem', fontSize: '0.8rem' }} className="no-print">
                                {p.source === 'ledger' ? (
                                  <select
                                    value={paymentTargetMap[p.id] || activeViewMonth}
                                    onChange={(e) => savePaymentTargetMapping(p.id, e.target.value)}
                                    style={{ fontSize: '0.75rem', padding: '0.2rem 0.4rem', borderRadius: '0.3rem', border: '1px solid #cbd5e1', color: '#1e40af', fontWeight: 600 }}
                                    title="Assign this payment to another settlement month"
                                  >
                                    {availableMonths.map(m => (
                                      <option key={m} value={m}>{formatMonthName(m)}</option>
                                    ))}
                                  </select>
                                ) : (
                                  <span className="badge badge-neutral" style={{ fontSize: '0.7rem' }}>Direct Month Record</span>
                                )}
                              </td>
                              <td style={{ padding: '0.5rem 0.75rem', textAlign: 'right', fontWeight: 700, color: '#16a34a', fontSize: '0.9rem' }}>
                                ₹ {p.amount.toLocaleString('en-IN', { maximumFractionDigits: 2 })}
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                      <tfoot>
                        <tr style={{ background: '#f8fafc', fontWeight: 800 }}>
                          <td colSpan="3" style={{ padding: '0.6rem 0.75rem', fontSize: '0.85rem', color: '#166534' }}>
                            Subtotal Payments Paid for {currentMonthData.monthName}
                          </td>
                          <td style={{ padding: '0.6rem 0.75rem', textAlign: 'right', color: '#16a34a', fontSize: '1rem' }}>
                            ₹ {currentMonthData.totalPaid.toLocaleString('en-IN', { maximumFractionDigits: 2 })}
                          </td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                </div>

                {/* ============================================================= */}
                {/* FINAL SETTLEMENT STATUS BANNER FOR THIS MONTH               */}
                {/* ============================================================= */}
                <div className="settlement-banner" style={{
                  padding: '1.25rem 1.5rem',
                  borderRadius: '0.75rem',
                  background: currentMonthData.netBalance > 0 ? '#fff1f2' : (currentMonthData.netBalance === 0 ? '#f0fdf4' : '#f0f9ff'),
                  border: `2px solid ${currentMonthData.netBalance > 0 ? '#f43f5e' : (currentMonthData.netBalance === 0 ? '#22c55e' : '#38bdf8')}`,
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  flexWrap: 'wrap',
                  gap: '1rem',
                  breakInside: 'avoid',
                  pageBreakInside: 'avoid'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    {currentMonthData.netBalance === 0 ? (
                      <CheckCircle2 size={36} style={{ color: '#16a34a', flexShrink: 0 }} />
                    ) : (
                      <AlertCircle size={36} style={{ color: currentMonthData.netBalance > 0 ? '#e11d48' : '#0284c7', flexShrink: 0 }} />
                    )}
                    <div>
                      <h4 style={{ fontSize: '1.15rem', fontWeight: 800, color: '#0f172a', margin: 0 }}>
                        {currentMonthData.netBalance === 0 && '🟢 Month Fully Settled (Hisaab Nill)'}
                        {currentMonthData.netBalance > 0 && `🔴 Net Pending: ₹ ${currentMonthData.netBalance.toLocaleString('en-IN', { maximumFractionDigits: 2 })} Company Ko Dena Hai`}
                        {currentMonthData.netBalance < 0 && `🔵 Net Advance: ₹ ${Math.abs(currentMonthData.netBalance).toLocaleString('en-IN', { maximumFractionDigits: 2 })} Excess Paid`}
                      </h4>
                      <p style={{ fontSize: '0.85rem', color: '#475569', margin: '0.2rem 0 0 0' }}>
                        Formula: Total Banta Tha (₹ {currentMonthData.totalPayable.toLocaleString('en-IN')}) - Company Ne Diya (₹ {currentMonthData.totalPaid.toLocaleString('en-IN')})
                      </p>
                    </div>
                  </div>

                  <div className="no-print">
                    <button
                      type="button"
                      className="btn btn-secondary"
                      onClick={() => setActiveViewMonth(null)}
                      style={{ fontSize: '0.85rem', padding: '0.5rem 1rem', fontWeight: 700 }}
                    >
                      ← Back to All Months Scorecard
                    </button>
                  </div>
                </div>

                {/* Printable Official Signatures Block */}
                <div className="print-only" style={{ marginTop: '3rem', paddingTop: '1.5rem', display: 'flex', justifyContent: 'space-between', padding: '0 2rem' }}>
                  <div style={{ textAlign: 'center', width: '220px' }}>
                    <div style={{ borderBottom: '1px solid #0f172a', height: '40px', marginBottom: '0.5rem' }}></div>
                    <span style={{ fontSize: '0.85rem', fontWeight: 700 }}>Partner Signature ({selectedPartner})</span>
                  </div>
                  <div style={{ textAlign: 'center', width: '220px' }}>
                    <div style={{ borderBottom: '1px solid #0f172a', height: '40px', marginBottom: '0.5rem' }}></div>
                    <span style={{ fontSize: '0.85rem', fontWeight: 700 }}>Authorized Signatory (DKPT)</span>
                  </div>
                </div>

              </div>
            )
          )}
        </>
      )}

      {/* ========================================================================= */}
      {/* POPUP / MODAL: RECORD PAYMENT TO PARTNER                                  */}
      {/* ========================================================================= */}
      {showAddPaymentForm && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(15, 23, 42, 0.6)', backdropFilter: 'blur(3px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '1rem' }}>
          <div className="glass-card" style={{ width: '100%', maxWidth: '480px', padding: '1.5rem', background: '#ffffff', borderRadius: '0.75rem', boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)' }}>
            <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: '#0f172a', margin: '0 0 0.5rem 0', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <CreditCard size={20} style={{ color: '#16a34a' }} /> Record Payment to Partner
            </h3>
            <p style={{ fontSize: '0.8rem', color: '#64748b', margin: '0 0 1.25rem 0' }}>
              Company dwara partner ko chukaye gaye paise (Payment / Reimbursement)
            </p>

            <form onSubmit={handleSavePayment}>
              {/* Partner */}
              <div style={{ marginBottom: '1rem' }}>
                <label className="input-label" style={{ fontWeight: 600, fontSize: '0.825rem' }}>Partner</label>
                <input
                  type="text"
                  className="input-field"
                  disabled
                  value={selectedPartner}
                  style={{ width: '100%', background: '#f8fafc', fontWeight: 700 }}
                />
              </div>

              {/* Target Settlement Month */}
              <div style={{ marginBottom: '1rem' }}>
                <label className="input-label" style={{ fontWeight: 600, fontSize: '0.825rem' }}>
                  Kis Month Ke Hisaab Ke Against Diya? (Target Settlement Month) *
                </label>
                <select
                  className="input-field"
                  value={newPaymentTargetMonth}
                  onChange={(e) => setNewPaymentTargetMonth(e.target.value)}
                  style={{ width: '100%', fontWeight: 600 }}
                  required
                >
                  {availableMonths.map(m => (
                    <option key={m} value={m}>{formatMonthName(m)} ({m})</option>
                  ))}
                </select>
                <span style={{ fontSize: '0.72rem', color: '#64748b' }}>
                  Yeh payment is selected month ke settlement me credit hogi.
                </span>
              </div>

              {/* Payment Date */}
              <div style={{ marginBottom: '1rem' }}>
                <label className="input-label" style={{ fontWeight: 600, fontSize: '0.825rem' }}>
                  Payment Date (Kis Date Ko Diya?) *
                </label>
                <input
                  type="date"
                  className="input-field"
                  value={newPaymentDate}
                  onChange={(e) => setNewPaymentDate(e.target.value)}
                  style={{ width: '100%', fontWeight: 600 }}
                  required
                />
              </div>

              {/* Amount */}
              <div style={{ marginBottom: '1rem' }}>
                <label className="input-label" style={{ fontWeight: 600, fontSize: '0.825rem' }}>
                  Payment Amount (₹) *
                </label>
                <input
                  type="number"
                  step="any"
                  className="input-field"
                  placeholder="0.00"
                  value={newPaymentAmount}
                  onChange={(e) => setNewPaymentAmount(e.target.value)}
                  style={{ width: '100%', fontWeight: 700, fontSize: '1rem', color: '#16a34a' }}
                  required
                />
              </div>

              {/* Mode / Remarks */}
              <div style={{ marginBottom: '1.25rem' }}>
                <label className="input-label" style={{ fontWeight: 600, fontSize: '0.825rem' }}>
                  Bank Details / Mode / Remarks
                </label>
                <input
                  type="text"
                  className="input-field"
                  placeholder="e.g. Bank Transfer, Malik Creation TRF, Cheque No..."
                  value={newPaymentMode}
                  onChange={(e) => setNewPaymentMode(e.target.value)}
                  style={{ width: '100%' }}
                />
              </div>

              {/* Modal Buttons */}
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setShowAddPaymentForm(false)}
                  disabled={savingPayment}
                  style={{ fontSize: '0.85rem' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={savingPayment}
                  style={{ fontSize: '0.85rem', background: '#16a34a', borderColor: '#16a34a' }}
                >
                  {savingPayment ? 'Saving...' : 'Save Payment'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};

export default PartnerSheet;

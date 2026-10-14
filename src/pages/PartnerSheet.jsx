import React, { useState, useEffect, useMemo } from 'react';
import { getPartnerLedger, getUniquePartners } from '../lib/api';
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
  Filter, 
  User, 
  Calculator, 
  FileText,
  AlertCircle,
  CheckCircle2,
  Receipt
} from 'lucide-react';
import * as XLSX from 'xlsx';

// Helper to safely format dates DD-MM-YYYY without timezone skew
const formatDate = (dateStr) => {
  if (!dateStr) return '-';
  const parts = String(dateStr).split('T')[0].split('-');
  if (parts.length === 3) {
    return `${parts[2]}-${parts[1]}-${parts[0]}`;
  }
  const d = new Date(dateStr);
  return `${String(d.getDate()).padStart(2, '0')}-${String(d.getMonth() + 1).padStart(2, '0')}-${d.getFullYear()}`;
};

const PartnerSheet = () => {
  const [uniquePartners, setUniquePartners] = useState([]);
  const [selectedPartner, setSelectedPartner] = useState('');
  const [rawEntries, setRawEntries] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Date & Month filter states
  const [selectedMonth, setSelectedMonth] = useState(''); // YYYY-MM
  const [startDate, setStartDate] = useState(''); // YYYY-MM-DD
  const [endDate, setEndDate] = useState(''); // YYYY-MM-DD

  // Custom settlement summary items (Salary, EMI, etc.)
  const [customRows, setCustomRows] = useState([]);

  useEffect(() => {
    fetchPartners();
  }, []);

  // When selected partner changes: load ledger data & load saved summary items
  useEffect(() => {
    if (selectedPartner) {
      loadData(selectedPartner);
      loadSavedSummary(selectedPartner);
    } else {
      setRawEntries([]);
      setCustomRows([]);
    }
  }, [selectedPartner]);

  // Save custom summary rows to localStorage per partner whenever updated
  useEffect(() => {
    if (selectedPartner && customRows.length > 0) {
      try {
        localStorage.setItem(`partner_summary_${selectedPartner}`, JSON.stringify(customRows));
      } catch (e) {
        console.error('Failed to save summary to localStorage', e);
      }
    }
  }, [customRows, selectedPartner]);

  const loadSavedSummary = (partner) => {
    try {
      const saved = localStorage.getItem(`partner_summary_${partner}`);
      if (saved) {
        setCustomRows(JSON.parse(saved));
      } else {
        // Pre-populate with typical default partner rows
        setCustomRows([
          { id: 1, description: 'Monthly Salary', payment: '', receipt: '' },
          { id: 2, description: 'Car / Vehicle EMI', payment: '', receipt: '' }
        ]);
      }
    } catch (e) {
      console.error(e);
      setCustomRows([
        { id: 1, description: 'Monthly Salary', payment: '', receipt: '' },
        { id: 2, description: 'Car / Vehicle EMI', payment: '', receipt: '' }
      ]);
    }
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

  const loadData = async (partner) => {
    try {
      setLoading(true);
      setError(null);
      const data = await getPartnerLedger(partner);
      
      // Sort chronologically ascending
      const sorted = (data || []).sort((a, b) => {
        if (a.date !== b.date) {
          return new Date(a.date) - new Date(b.date);
        }
        return new Date(a.created_at || 0) - new Date(b.created_at || 0);
      });

      setRawEntries(sorted);
    } catch (err) {
      console.error(err);
      setError('Failed to load partner ledger data');
    } finally {
      setLoading(false);
    }
  };

  // Check if current startDate and endDate form a full calendar month
  const checkIfMatchesFullMonth = (sDate, eDate) => {
    if (!sDate || !eDate) {
      setSelectedMonth('');
      return;
    }
    const [sY, sM, sD] = sDate.split('-').map(Number);
    const [eY, eM, eD] = eDate.split('-').map(Number);
    if (sY === eY && sM === eM && sD === 1) {
      const daysInMonth = new Date(sY, sM, 0).getDate();
      if (eD === daysInMonth) {
        setSelectedMonth(`${sY}-${String(sM).padStart(2, '0')}`);
        return;
      }
    }
    setSelectedMonth('');
  };

  // Handle Month selector change (e.g. "2026-10")
  const handleMonthChange = (monthVal) => {
    setSelectedMonth(monthVal);
    if (monthVal) {
      const [y, m] = monthVal.split('-').map(Number);
      const firstDay = `${y}-${String(m).padStart(2, '0')}-01`;
      const daysInMonth = new Date(y, m, 0).getDate();
      const lastDay = `${y}-${String(m).padStart(2, '0')}-${String(daysInMonth).padStart(2, '0')}`;
      setStartDate(firstDay);
      setEndDate(lastDay);
    } else {
      setStartDate('');
      setEndDate('');
    }
  };

  // Handle Start Date change
  const handleStartDateChange = (val) => {
    setStartDate(val);
    checkIfMatchesFullMonth(val, endDate);
  };

  // Handle End Date change
  const handleEndDateChange = (val) => {
    setEndDate(val);
    checkIfMatchesFullMonth(startDate, val);
  };

  // Quick preset: This Month
  const setThisMonth = () => {
    const now = new Date();
    const y = now.getFullYear();
    const m = now.getMonth() + 1;
    const mStr = `${y}-${String(m).padStart(2, '0')}`;
    handleMonthChange(mStr);
  };

  // Quick preset: Last Month
  const setLastMonth = () => {
    const now = new Date();
    now.setMonth(now.getMonth() - 1);
    const y = now.getFullYear();
    const m = now.getMonth() + 1;
    const mStr = `${y}-${String(m).padStart(2, '0')}`;
    handleMonthChange(mStr);
  };

  // Clear date filters (Show All Time)
  const clearDates = () => {
    setSelectedMonth('');
    setStartDate('');
    setEndDate('');
  };

  // Filter entries & calculate Opening Balance + Running Balance
  const { filteredEntries, openingBalance, periodExpense, periodReceipt, finalBalance } = useMemo(() => {
    if (!rawEntries || rawEntries.length === 0) {
      return {
        filteredEntries: [],
        openingBalance: 0,
        periodExpense: 0,
        periodReceipt: 0,
        finalBalance: 0
      };
    }

    let priorExpense = 0;
    let priorReceipt = 0;
    const periodList = [];

    rawEntries.forEach(item => {
      const itemDate = item.date ? String(item.date).split('T')[0] : '';
      const exp = Number(item.expense) || 0;
      const rec = Number(item.receipt) || 0;

      if (startDate && itemDate < startDate) {
        priorExpense += exp;
        priorReceipt += rec;
      } else if (!endDate || itemDate <= endDate) {
        periodList.push(item);
      }
    });

    const opBal = startDate ? (priorExpense - priorReceipt) : 0;
    let runningBalance = opBal;
    let pExp = 0;
    let pRec = 0;

    const calculatedList = periodList.map(item => {
      const exp = Number(item.expense) || 0;
      const rec = Number(item.receipt) || 0;
      pExp += exp;
      pRec += rec;
      runningBalance = runningBalance + exp - rec;
      return {
        ...item,
        calculatedBalance: runningBalance
      };
    });

    return {
      filteredEntries: calculatedList,
      openingBalance: opBal,
      periodExpense: pExp,
      periodReceipt: pRec,
      finalBalance: runningBalance
    };
  }, [rawEntries, startDate, endDate]);

  // Custom Summary Rows Handlers
  const handleAddRow = () => {
    const newRow = {
      id: Date.now(),
      description: '',
      payment: '',
      receipt: ''
    };
    setCustomRows([...customRows, newRow]);
  };

  const handleUpdateRow = (id, field, value) => {
    setCustomRows(customRows.map(r => r.id === id ? { ...r, [field]: value } : r));
  };

  const handleRemoveRow = (id) => {
    const filtered = customRows.filter(r => r.id !== id);
    setCustomRows(filtered);
    if (selectedPartner) {
      localStorage.setItem(`partner_summary_${selectedPartner}`, JSON.stringify(filtered));
    }
  };

  // Calculations for Settlement Summary
  const { totalPayment, totalReceipt, netBalanceForPayment } = useMemo(() => {
    // 1. Opening Balance (if filtered by date)
    const opPay = (startDate && openingBalance > 0) ? openingBalance : 0;
    const opRec = (startDate && openingBalance < 0) ? Math.abs(openingBalance) : 0;

    // 2. Ledger Expenses & Receipts
    const legPay = periodExpense;
    const legRec = periodReceipt;

    // 3. Custom Summary Rows (Salary, EMI, etc.)
    const customPay = customRows.reduce((sum, r) => sum + (Number(r.payment) || 0), 0);
    const customRec = customRows.reduce((sum, r) => sum + (Number(r.receipt) || 0), 0);

    const sumPay = opPay + legPay + customPay;
    const sumRec = opRec + legRec + customRec;
    const netBal = sumPay - sumRec; // > 0 means Firm owes partner (To Pay); < 0 means Excess / Advance paid

    return {
      totalPayment: sumPay,
      totalReceipt: sumRec,
      netBalanceForPayment: netBal
    };
  }, [startDate, openingBalance, periodExpense, periodReceipt, customRows]);

  // Export to Excel
  const exportToExcel = () => {
    if (!selectedPartner) return;

    const periodLabel = startDate || endDate
      ? `${startDate ? formatDate(startDate) : 'Start'} to ${endDate ? formatDate(endDate) : 'Present'}`
      : 'All Time';

    const wsData = [
      ['DKPT TEXTILE & APPARELS'],
      [`Partner Settlement Statement - ${selectedPartner}`],
      [`Period: ${periodLabel}`],
      [`Generated On: ${new Date().toLocaleDateString('en-IN')}`],
      [],
      ['PARTNER PAYMENT & SETTLEMENT SUMMARY'],
      ['Description / Head', 'Payment (Payable / Dena Hai)', 'Receipt (Jama / Reimbursed)', 'Remarks']
    ];

    if (startDate && openingBalance !== 0) {
      wsData.push([
        `Opening Balance (As of ${formatDate(startDate)})`,
        openingBalance > 0 ? openingBalance : 0,
        openingBalance < 0 ? Math.abs(openingBalance) : 0,
        openingBalance > 0 ? 'Prior Payable' : 'Prior Advance'
      ]);
    }

    wsData.push([
      `Partner Ledger Expenses (${selectedPartner})`,
      periodExpense,
      0,
      'From Partner Ledger'
    ]);

    if (periodReceipt > 0) {
      wsData.push([
        `Partner Ledger Reimbursements`,
        0,
        periodReceipt,
        'Paid back to Partner'
      ]);
    }

    customRows.forEach(r => {
      wsData.push([
        r.description || 'Custom Item',
        Number(r.payment) || 0,
        Number(r.receipt) || 0,
        'Additional Settlement Item'
      ]);
    });

    wsData.push([
      'TOTAL SUMMARY',
      totalPayment,
      totalReceipt,
      netBalanceForPayment > 0 ? `NET TO PAY: ${netBalanceForPayment.toFixed(2)}` : `EXCESS / ADVANCE: ${Math.abs(netBalanceForPayment).toFixed(2)}`
    ]);

    wsData.push([]);
    wsData.push([]);
    wsData.push(['DETAILED TRANSACTIONS LEDGER']);
    wsData.push(['Date', 'Description', `Expense (Paid by ${selectedPartner})`, 'Receipt (Reimbursed)', 'Balance Payable']);

    if (startDate) {
      wsData.push([
        formatDate(startDate),
        'Opening Balance (B/F)',
        '-',
        '-',
        openingBalance
      ]);
    }

    filteredEntries.forEach(item => {
      wsData.push([
        formatDate(item.date),
        item.description || '-',
        Number(item.expense) || 0,
        Number(item.receipt) || 0,
        item.calculatedBalance
      ]);
    });

    wsData.push([
      'Ledger Total',
      `${filteredEntries.length} entries`,
      periodExpense,
      periodReceipt,
      finalBalance
    ]);

    const ws = XLSX.utils.aoa_to_sheet(wsData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Settlement");
    XLSX.writeFile(wb, `${selectedPartner}_Settlement_${startDate || 'All'}_to_${endDate || 'Time'}.xlsx`);
  };

  // Print as PDF / System Print Dialog
  const handlePrintPDF = () => {
    window.print();
  };

  const periodLabel = startDate || endDate
    ? `${startDate ? formatDate(startDate) : 'Beginning'} to ${endDate ? formatDate(endDate) : 'Today'}`
    : 'All Time';

  return (
    <div>
      {/* Printable Official Header (Only displays during Print / Save PDF) */}
      <div className="print-only" style={{ marginBottom: '1.25rem', borderBottom: '2px solid #1e3a8a', paddingBottom: '0.75rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <h1 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#1e3a8a', margin: 0 }}>DKPT TEXTILE & APPARELS</h1>
            <h2 style={{ fontSize: '1.1rem', color: '#1e293b', margin: '0.2rem 0', fontWeight: 700 }}>
              Partner Settlement Statement & Payment Summary
            </h2>
            <p style={{ fontSize: '0.9rem', color: '#475569', margin: '0.2rem 0' }}>
              Partner Name: <strong style={{ color: '#0f172a', fontSize: '1rem' }}>{selectedPartner}</strong>
              <span style={{ marginLeft: '1.5rem' }}>Statement Period: <strong>{periodLabel}</strong></span>
            </p>
          </div>
          <div style={{ textAlign: 'right', fontSize: '0.8rem', color: '#64748b' }}>
            <p style={{ margin: 0 }}>Printed: {new Date().toLocaleDateString('en-IN')}</p>
            <p style={{ margin: '0.2rem 0 0 0' }}>Time: {new Date().toLocaleTimeString('en-IN')}</p>
          </div>
        </div>
      </div>

      {/* Screen Page Header */}
      <header className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 className="page-title">Partners Sheet (Payables & Settlement)</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.825rem', marginTop: '0.2rem' }}>
            Track partner ledger, expenses, salary, EMI & calculate final payment / excess
          </p>
        </div>

        {selectedPartner && (
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button
              className="btn btn-secondary"
              onClick={exportToExcel}
              disabled={loading}
              style={{ fontSize: '0.85rem' }}
              title="Download Excel Spreadsheet"
            >
              <Download size={15} style={{ color: 'var(--success)' }} /> Export Excel
            </button>
            <button
              className="btn btn-primary"
              onClick={handlePrintPDF}
              disabled={loading}
              style={{ fontSize: '0.85rem' }}
              title="Print or Save as PDF"
            >
              <Printer size={15} /> Print / Save PDF
            </button>
          </div>
        )}
      </header>

      {/* Filter Control Bar (no-print) */}
      <div className="glass-card no-print" style={{ marginBottom: '1.5rem', padding: '1rem' }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1.25rem', alignItems: 'flex-end', justifyContent: 'space-between' }}>
          
          {/* Partner Selector */}
          <div style={{ minWidth: '220px', flex: '1 1 220px' }}>
            <label className="input-label" style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.35rem' }}>
              <User size={15} style={{ color: 'var(--accent-primary)' }} /> Select Partner
            </label>
            <div style={{ position: 'relative' }}>
              <select
                className="input-field"
                value={selectedPartner}
                onChange={(e) => setSelectedPartner(e.target.value)}
                style={{ width: '100%', padding: '0.45rem 0.6rem', fontWeight: 600, fontSize: '0.95rem', cursor: 'pointer' }}
              >
                <option value="">-- Choose Partner --</option>
                {uniquePartners.map((p, idx) => (
                  <option key={idx} value={p}>{p}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Month Wise Selector */}
          <div style={{ minWidth: '180px', flex: '1 1 180px' }}>
            <label className="input-label" style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.35rem' }}>
              <Calendar size={15} style={{ color: 'var(--accent-primary)' }} /> Month Wise
            </label>
            <input
              type="month"
              className="input-field"
              value={selectedMonth}
              onChange={(e) => handleMonthChange(e.target.value)}
              style={{ width: '100%', padding: '0.45rem 0.6rem', cursor: 'pointer' }}
            />
          </div>

          {/* Date Range Selector */}
          <div style={{ minWidth: '290px', flex: '1 1 290px' }}>
            <label className="input-label" style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.35rem' }}>
              <CalendarDays size={15} style={{ color: 'var(--accent-primary)' }} /> Custom Date Range
            </label>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <input
                type="date"
                className="input-field"
                placeholder="From"
                value={startDate}
                onChange={(e) => handleStartDateChange(e.target.value)}
                style={{ width: '100%', padding: '0.45rem 0.6rem' }}
                title="Start Date"
              />
              <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem', fontWeight: 500 }}>to</span>
              <input
                type="date"
                className="input-field"
                placeholder="To"
                value={endDate}
                onChange={(e) => handleEndDateChange(e.target.value)}
                style={{ width: '100%', padding: '0.45rem 0.6rem' }}
                title="End Date"
              />
            </div>
          </div>

          {/* Quick Filter Buttons & Clear */}
          <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap', alignItems: 'center' }}>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={setThisMonth}
              style={{ fontSize: '0.8rem', padding: '0.4rem 0.65rem' }}
            >
              This Month
            </button>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={setLastMonth}
              style={{ fontSize: '0.8rem', padding: '0.4rem 0.65rem' }}
            >
              Last Month
            </button>
            {(startDate || endDate || selectedMonth) && (
              <button
                type="button"
                className="btn btn-secondary"
                onClick={clearDates}
                style={{ fontSize: '0.8rem', padding: '0.4rem 0.65rem', color: 'var(--danger)', borderColor: '#fca5a5' }}
                title="Clear date filter to view full ledger"
              >
                <RotateCcw size={13} style={{ marginRight: '0.2rem' }} /> All Time
              </button>
            )}
          </div>

        </div>

        {/* Active Filter Period Indicator */}
        {(startDate || endDate) && (
          <div style={{ marginTop: '0.85rem', paddingTop: '0.75rem', borderTop: '1px dashed var(--border-color)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.5rem', fontSize: '0.825rem', color: 'var(--accent-primary)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <Filter size={14} />
              <span>
                Active Filter Period: <strong>{startDate ? formatDate(startDate) : 'Beginning'}</strong> to <strong>{endDate ? formatDate(endDate) : 'Today'}</strong>
                {selectedMonth && (
                  <span style={{ marginLeft: '0.5rem', color: 'var(--text-muted)' }}>
                    ({new Date(startDate + 'T00:00:00').toLocaleDateString('en-US', { month: 'long', year: 'numeric' })})
                  </span>
                )}
              </span>
            </div>
            <span className="badge badge-neutral" style={{ fontSize: '0.75rem' }}>
              Automatic Filter Active
            </span>
          </div>
        )}
      </div>

      {!selectedPartner ? (
        <div className="glass-card" style={{ textAlign: 'center', padding: '4rem', color: 'var(--text-secondary)' }}>
          <Search size={64} style={{ opacity: 0.2, marginBottom: '1.5rem' }} />
          <h2 style={{ fontSize: '1.25rem', marginBottom: '0.5rem', color: 'var(--text-primary)' }}>No Partner Selected</h2>
          <p>Please select a partner from the dropdown above to view their ledger statement and settlement summary.</p>
        </div>
      ) : (
        <>
          {/* ========================================================= */}
          {/* SECTION 1: PARTNER PAYMENT & SETTLEMENT SUMMARY TABLE     */}
          {/* ========================================================= */}
          <div className="glass-card" style={{ marginBottom: '1.75rem', padding: '1.25rem', border: '1px solid #bfdbfe', background: '#ffffff' }}>
            
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem', marginBottom: '1rem' }}>
              <div>
                <h2 style={{ fontSize: '1.15rem', fontWeight: 700, color: 'var(--accent-primary)', display: 'flex', alignItems: 'center', gap: '0.5rem', margin: 0 }}>
                  <Calculator size={20} /> Partner Payment & Settlement Summary ({selectedPartner})
                </h2>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', margin: '0.2rem 0 0 0' }}>
                  Total Expenses + Salary + EMI + Custom Adjustments = Net Balance for Payment / Excess
                </p>
              </div>

              <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }} className="no-print">
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={handleAddRow}
                  style={{ fontSize: '0.825rem', padding: '0.35rem 0.75rem' }}
                  title="Add new payment or receipt adjustment row"
                >
                  <Plus size={15} /> Add New Row
                </button>
              </div>
            </div>

            {/* Datalist suggestions for common settlement items */}
            <datalist id="summary-descriptions">
              <option value="Monthly Salary" />
              <option value="Car EMI" />
              <option value="Vehicle Loan EMI" />
              <option value="Factory / Machinery EMI" />
              <option value="Personal Loan EMI" />
              <option value="Partner Remuneration" />
              <option value="Office Rent Reimbursement" />
              <option value="Fuel & Travel Allowance" />
              <option value="Mobile / Utility Bill" />
              <option value="Cash Advance Paid" />
              <option value="Bank Transfer Paid" />
              <option value="Bonus / Incentive" />
            </datalist>

            {/* Summary Table */}
            <div className="table-container" style={{ border: '1px solid var(--border-color)', marginBottom: '1rem', borderRadius: '0.35rem' }}>
              <table>
                <thead>
                  <tr style={{ background: '#1e3a8a', color: '#fff' }}>
                    <th style={{ width: '40%' }}>Description / Item</th>
                    <th style={{ textAlign: 'right', width: '25%', color: '#fca5a5' }}>
                      Payment (Payable / देय ₹)
                    </th>
                    <th style={{ textAlign: 'right', width: '25%', color: '#86efac' }}>
                      Receipt (Received / जमा ₹)
                    </th>
                    <th style={{ width: '10%', textAlign: 'center' }} className="no-print">Action</th>
                  </tr>
                </thead>
                <tbody>

                  {/* 1. Opening Balance Row (if filtered and opening balance exists) */}
                  {startDate && openingBalance !== 0 && (
                    <tr style={{ backgroundColor: 'rgba(59, 130, 246, 0.05)' }}>
                      <td>
                        <div style={{ fontWeight: 600, color: 'var(--accent-primary)', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                          <span>Opening Balance (B/F prior to {formatDate(startDate)})</span>
                          <span className="badge badge-neutral" style={{ fontSize: '0.65rem' }}>Auto</span>
                        </div>
                      </td>
                      <td style={{ textAlign: 'right', fontWeight: 600, color: openingBalance > 0 ? 'var(--danger)' : 'var(--text-muted)' }}>
                        {openingBalance > 0 ? (
                          <>
                            ₹ {openingBalance.toFixed(2)}
                            <span style={{ fontSize: '0.7rem', color: 'var(--danger)', marginLeft: '0.3rem' }}>(Payable)</span>
                          </>
                        ) : '-'}
                      </td>
                      <td style={{ textAlign: 'right', fontWeight: 600, color: openingBalance < 0 ? 'var(--success)' : 'var(--text-muted)' }}>
                        {openingBalance < 0 ? (
                          <>
                            ₹ {Math.abs(openingBalance).toFixed(2)}
                            <span style={{ fontSize: '0.7rem', color: 'var(--success)', marginLeft: '0.3rem' }}>(Advance)</span>
                          </>
                        ) : '-'}
                      </td>
                      <td style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.75rem' }} className="no-print">-</td>
                    </tr>
                  )}

                  {/* 2. Auto Partner Ledger Total Expenses Row */}
                  <tr style={{ backgroundColor: '#f8fafc' }}>
                    <td>
                      <div style={{ fontWeight: 600, color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                        <span>Partner Ledger Expenses (Total Paid by {selectedPartner})</span>
                        <span className="badge badge-danger" style={{ fontSize: '0.65rem' }}>Ledger</span>
                      </div>
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                        Period: {periodLabel} ({filteredEntries.filter(e => Number(e.expense) > 0).length} entries)
                      </span>
                    </td>
                    <td style={{ textAlign: 'right', fontWeight: 700, color: 'var(--danger)', fontSize: '1rem' }}>
                      ₹ {periodExpense.toFixed(2)}
                    </td>
                    <td style={{ textAlign: 'right', color: 'var(--text-muted)' }}>-</td>
                    <td style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.75rem' }} className="no-print">
                      <span className="badge badge-neutral" style={{ fontSize: '0.65rem' }}>Locked</span>
                    </td>
                  </tr>

                  {/* 3. Auto Partner Ledger Receipts / Reimbursed Row (if any) */}
                  {periodReceipt > 0 && (
                    <tr style={{ backgroundColor: '#f8fafc' }}>
                      <td>
                        <div style={{ fontWeight: 600, color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                          <span>Partner Ledger Reimbursements (Already Paid Back)</span>
                          <span className="badge badge-success" style={{ fontSize: '0.65rem' }}>Ledger</span>
                        </div>
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                          Reimbursed vouchers in this period ({filteredEntries.filter(e => Number(e.receipt) > 0).length} entries)
                        </span>
                      </td>
                      <td style={{ textAlign: 'right', color: 'var(--text-muted)' }}>-</td>
                      <td style={{ textAlign: 'right', fontWeight: 700, color: 'var(--success)', fontSize: '1rem' }}>
                        ₹ {periodReceipt.toFixed(2)}
                      </td>
                      <td style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.75rem' }} className="no-print">
                        <span className="badge badge-neutral" style={{ fontSize: '0.65rem' }}>Locked</span>
                      </td>
                    </tr>
                  )}

                  {/* 4. User-Added Editable Rows (Salary, EMI, Adjustments, etc.) */}
                  {customRows.map((row, idx) => (
                    <tr key={row.id}>
                      <td>
                        {/* Print view plain text */}
                        <span className="print-input-text" style={{ fontWeight: 600 }}>
                          {row.description || `Adjustment #${idx + 1}`}
                        </span>
                        {/* Screen view editable text box */}
                        <div className="print-input-field">
                          <input
                            type="text"
                            list="summary-descriptions"
                            className="input-field"
                            placeholder="e.g. Salary, Car EMI, Bonus, Personal Expense..."
                            value={row.description}
                            onChange={(e) => handleUpdateRow(row.id, 'description', e.target.value)}
                            style={{ width: '100%', marginBottom: 0, fontWeight: 500 }}
                          />
                        </div>
                      </td>

                      {/* Payment Amount Input */}
                      <td style={{ textAlign: 'right' }}>
                        <span className="print-input-text" style={{ fontWeight: 600, color: '#dc2626' }}>
                          {Number(row.payment) > 0 ? `₹ ${Number(row.payment).toFixed(2)}` : '-'}
                        </span>
                        <div className="print-input-field" style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: '0.25rem' }}>
                          <span style={{ color: 'var(--danger)', fontWeight: 600, fontSize: '0.85rem' }}>₹</span>
                          <input
                            type="number"
                            className="input-field"
                            placeholder="0.00"
                            value={row.payment}
                            onChange={(e) => handleUpdateRow(row.id, 'payment', e.target.value)}
                            style={{ width: '140px', textAlign: 'right', marginBottom: 0, color: 'var(--danger)', fontWeight: 600 }}
                            title="Amount firm has to pay"
                          />
                        </div>
                      </td>

                      {/* Receipt Amount Input */}
                      <td style={{ textAlign: 'right' }}>
                        <span className="print-input-text" style={{ fontWeight: 600, color: '#16a34a' }}>
                          {Number(row.receipt) > 0 ? `₹ ${Number(row.receipt).toFixed(2)}` : '-'}
                        </span>
                        <div className="print-input-field" style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: '0.25rem' }}>
                          <span style={{ color: 'var(--success)', fontWeight: 600, fontSize: '0.85rem' }}>₹</span>
                          <input
                            type="number"
                            className="input-field"
                            placeholder="0.00"
                            value={row.receipt}
                            onChange={(e) => handleUpdateRow(row.id, 'receipt', e.target.value)}
                            style={{ width: '140px', textAlign: 'right', marginBottom: 0, color: 'var(--success)', fontWeight: 600 }}
                            title="Amount received / reimbursed"
                          />
                        </div>
                      </td>

                      {/* Delete Button */}
                      <td style={{ textAlign: 'center' }} className="no-print">
                        <button
                          type="button"
                          onClick={() => handleRemoveRow(row.id)}
                          className="btn btn-secondary"
                          style={{ padding: '0.25rem 0.4rem', color: 'var(--danger)', borderColor: '#fecaca' }}
                          title="Delete row"
                        >
                          <Trash2 size={14} />
                        </button>
                      </td>
                    </tr>
                  ))}

                  {/* Empty state prompt for custom rows */}
                  {customRows.length === 0 && (
                    <tr className="no-print">
                      <td colSpan="4" style={{ textAlign: 'center', padding: '1rem', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                        No additional rows yet. Click <strong>"+ Add New Row"</strong> above to add Salary, EMI, or other adjustments.
                      </td>
                    </tr>
                  )}
                </tbody>

                {/* Summary Table Footer */}
                <tfoot>
                  <tr style={{ background: '#f1f5f9', borderTop: '2px solid #cbd5e1' }}>
                    <td style={{ fontWeight: 800, fontSize: '0.95rem' }}>
                      Total Settlement Figures
                    </td>
                    <td style={{ textAlign: 'right', fontWeight: 800, color: 'var(--danger)', fontSize: '1.05rem' }}>
                      ₹ {totalPayment.toFixed(2)}
                    </td>
                    <td style={{ textAlign: 'right', fontWeight: 800, color: 'var(--success)', fontSize: '1.05rem' }}>
                      ₹ {totalReceipt.toFixed(2)}
                    </td>
                    <td className="no-print"></td>
                  </tr>
                </tfoot>
              </table>
            </div>

            {/* ========================================================= */}
            {/* NET BALANCE BANNER (WITH VIBRANT STATUS COLOR)           */}
            {/* ========================================================= */}
            <div 
              style={{
                borderRadius: '0.5rem',
                padding: '1rem 1.25rem',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: '1rem',
                background: netBalanceForPayment > 0 
                  ? 'rgba(239, 68, 68, 0.08)' 
                  : (netBalanceForPayment < 0 ? 'rgba(16, 185, 129, 0.08)' : 'rgba(59, 130, 246, 0.08)'),
                border: `2px solid ${
                  netBalanceForPayment > 0 
                    ? '#f87171' 
                    : (netBalanceForPayment < 0 ? '#34d399' : '#93c5fd')
                }`
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                {netBalanceForPayment > 0 ? (
                  <AlertCircle size={32} style={{ color: 'var(--danger)', flexShrink: 0 }} />
                ) : (
                  <CheckCircle2 size={32} style={{ color: netBalanceForPayment < 0 ? 'var(--success)' : 'var(--accent-primary)', flexShrink: 0 }} />
                )}

                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <span style={{ 
                      fontSize: '1rem', 
                      fontWeight: 800, 
                      color: netBalanceForPayment > 0 ? '#b91c1c' : (netBalanceForPayment < 0 ? '#15803d' : '#1d4ed8') 
                    }}>
                      {netBalanceForPayment > 0 
                        ? `BALANCE FOR PAYMENT (कुल देय राशि - फर्म को देनी है)` 
                        : (netBalanceForPayment < 0 
                            ? `EXCESS / ADVANCE AMOUNT (अतिरिक्त भुगतान - पार्टनर पर बकाया)` 
                            : `SETTLEMENT BALANCED (हिसाब पूर्णतः बराबर / शून्य)`
                          )}
                    </span>
                    <span 
                      className={`badge ${netBalanceForPayment > 0 ? 'badge-danger' : (netBalanceForPayment < 0 ? 'badge-success' : 'badge-neutral')}`}
                      style={{ fontSize: '0.7rem' }}
                    >
                      {netBalanceForPayment > 0 ? 'PAYMENT DUE' : (netBalanceForPayment < 0 ? 'EXCESS PAID' : 'NIL')}
                    </span>
                  </div>

                  <p style={{ margin: '0.2rem 0 0 0', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                    {netBalanceForPayment > 0 
                      ? `Calculation: Total Payments (₹ ${totalPayment.toFixed(2)}) minus Total Receipts (₹ ${totalReceipt.toFixed(2)})`
                      : (netBalanceForPayment < 0 
                          ? `Total Receipts (₹ ${totalReceipt.toFixed(2)}) exceed Total Payments (₹ ${totalPayment.toFixed(2)})`
                          : `Total Payments and Receipts are completely equal.`
                        )}
                  </p>
                </div>
              </div>

              {/* Big Colored Balance Amount */}
              <div style={{ textAlign: 'right' }}>
                <div style={{ 
                  fontSize: '1.75rem', 
                  fontWeight: 900, 
                  color: netBalanceForPayment > 0 ? 'var(--danger)' : (netBalanceForPayment < 0 ? 'var(--success)' : 'var(--accent-primary)'),
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.25rem',
                  justifyContent: 'flex-end'
                }}>
                  <IndianRupee size={24} /> {Math.abs(netBalanceForPayment).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </div>
                <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)' }}>
                  {netBalanceForPayment > 0 ? 'Net Payable to Partner' : (netBalanceForPayment < 0 ? 'Net Advance to Firm' : 'No Dues')}
                </span>
              </div>
            </div>

          </div>


          {/* ========================================================= */}
          {/* SECTION 2: SUMMARY METRIC CARDS (LEDGER METRICS)          */}
          {/* ========================================================= */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.25rem', marginBottom: '1.5rem' }}>
            
            {/* Opening Balance Card (Only visible if filtered with a startDate) */}
            {startDate ? (
              <div className="glass-card" style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', borderLeft: '4px solid var(--accent-primary)' }}>
                <span style={{ color: 'var(--text-secondary)', fontSize: '0.825rem' }}>Opening Balance (B/F)</span>
                <div style={{ fontSize: '1.4rem', fontWeight: 'bold', color: openingBalance > 0 ? 'var(--danger)' : openingBalance < 0 ? 'var(--success)' : 'inherit', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                  <IndianRupee size={18} /> {Math.abs(openingBalance).toFixed(2)}
                  {openingBalance > 0 && <span className="badge badge-danger" style={{ fontSize: '0.65rem', marginLeft: '0.35rem' }}>Payable</span>}
                  {openingBalance < 0 && <span className="badge badge-success" style={{ fontSize: '0.65rem', marginLeft: '0.35rem' }}>Advance</span>}
                </div>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Before {formatDate(startDate)}</span>
              </div>
            ) : null}

            {/* Expenses Paid Card */}
            <div className="glass-card" style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', borderLeft: '4px solid var(--danger)' }}>
              <span style={{ color: 'var(--text-secondary)', fontSize: '0.825rem' }}>
                {startDate || endDate ? 'Period Paid by' : 'Total Paid by'} {selectedPartner} (Expenses)
              </span>
              <div style={{ fontSize: '1.4rem', fontWeight: 'bold', color: 'var(--danger)', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                <IndianRupee size={18} /> {periodExpense.toFixed(2)}
              </div>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                {filteredEntries.filter(e => Number(e.expense) > 0).length} expense entries
              </span>
            </div>

            {/* Receipts Reimbursed Card */}
            <div className="glass-card" style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', borderLeft: '4px solid var(--success)' }}>
              <span style={{ color: 'var(--text-secondary)', fontSize: '0.825rem' }}>
                {startDate || endDate ? 'Period Reimbursed' : 'Amount Reimbursed'} (Receipts)
              </span>
              <div style={{ fontSize: '1.4rem', fontWeight: 'bold', color: 'var(--success)', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                <IndianRupee size={18} /> {periodReceipt.toFixed(2)}
              </div>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                {filteredEntries.filter(e => Number(e.receipt) > 0).length} receipt entries
              </span>
            </div>

            {/* Net Ledger Balance Card */}
            <div 
              className="glass-card" 
              style={{ 
                display: 'flex', 
                flexDirection: 'column', 
                gap: '0.4rem', 
                background: finalBalance > 0 ? 'rgba(248,81,73,0.06)' : 'rgba(46,160,67,0.06)',
                borderLeft: `4px solid ${finalBalance > 0 ? 'var(--danger)' : 'var(--success)'}`
              }}
            >
              <span style={{ color: 'var(--text-secondary)', fontSize: '0.825rem' }}>
                {startDate || endDate ? 'Ledger Closing Balance' : 'Net Amount Payable'} ({selectedPartner})
              </span>
              <div style={{ fontSize: '1.4rem', fontWeight: 'bold', color: finalBalance > 0 ? 'var(--danger)' : 'var(--success)', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                <IndianRupee size={18} /> {Math.abs(finalBalance).toFixed(2)}
                {finalBalance > 0 && <span className="badge badge-danger" style={{ fontSize: '0.65rem', marginLeft: '0.35rem' }}>Payable</span>}
                {finalBalance < 0 && <span className="badge badge-success" style={{ fontSize: '0.65rem', marginLeft: '0.35rem' }}>Advance</span>}
              </div>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                {finalBalance > 0 ? 'Firm owes partner on ledger' : finalBalance < 0 ? 'Partner received in advance' : 'Ledger fully settled'}
              </span>
            </div>

          </div>


          {/* ========================================================= */}
          {/* SECTION 3: DETAILED TRANSACTIONS LEDGER TABLE             */}
          {/* ========================================================= */}
          <div className="glass-card" style={{ padding: 0, overflow: 'hidden' }}>
            <div style={{ padding: '0.85rem 1.25rem', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#f8fafc' }}>
              <h3 style={{ fontSize: '1rem', fontWeight: 700, margin: 0, color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <Receipt size={17} style={{ color: 'var(--accent-primary)' }} /> Detailed Partner Ledger Transactions
              </h3>
              <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                Showing {filteredEntries.length} record(s) for {periodLabel}
              </span>
            </div>

            {error && (
              <div style={{ color: 'var(--danger)', padding: '1rem', borderBottom: '1px solid var(--border-color)' }}>
                {error}
              </div>
            )}

            <div className="table-container" style={{ border: 'none', borderRadius: 0 }}>
              <table>
                <thead>
                  <tr>
                    <th style={{ width: '130px' }}>Date</th>
                    <th>Description</th>
                    <th style={{ textAlign: 'right', width: '200px' }}>Expense (Paid by {selectedPartner})</th>
                    <th style={{ textAlign: 'right', width: '200px' }}>Receipt (Reimbursed)</th>
                    <th style={{ textAlign: 'right', width: '180px' }}>Balance Payable</th>
                  </tr>
                </thead>
                <tbody>
                  {loading && rawEntries.length === 0 ? (
                    <tr>
                      <td colSpan="5" style={{ textAlign: 'center', padding: '2.5rem' }}>
                        Loading ledger data...
                      </td>
                    </tr>
                  ) : filteredEntries.length === 0 && (!startDate || openingBalance === 0) ? (
                    <tr>
                      <td colSpan="5" style={{ textAlign: 'center', padding: '2.5rem', color: 'var(--text-muted)' }}>
                        No transactions found for {selectedPartner} {startDate || endDate ? 'in this period' : ''}.
                      </td>
                    </tr>
                  ) : (
                    <>
                      {/* Opening Balance Row if a start date is specified */}
                      {startDate && (
                        <tr style={{ backgroundColor: 'rgba(59, 130, 246, 0.05)', fontWeight: 600 }}>
                          <td>
                            <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                              As of {formatDate(startDate)}
                            </span>
                          </td>
                          <td>
                            <span style={{ color: 'var(--accent-primary)', display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}>
                              Opening Balance (B/F)
                            </span>
                          </td>
                          <td style={{ textAlign: 'right', color: 'var(--text-muted)' }}>-</td>
                          <td style={{ textAlign: 'right', color: 'var(--text-muted)' }}>-</td>
                          <td style={{ textAlign: 'right', fontWeight: 'bold', color: openingBalance > 0 ? 'var(--danger)' : (openingBalance < 0 ? 'var(--success)' : 'inherit') }}>
                            {Math.abs(openingBalance).toFixed(2)} {openingBalance < 0 ? '(Adv)' : ''}
                          </td>
                        </tr>
                      )}

                      {/* Filtered Transactions */}
                      {filteredEntries.map(entry => {
                        const formattedDate = formatDate(entry.date);
                        const exp = Number(entry.expense) || 0;
                        const rec = Number(entry.receipt) || 0;
                        const bal = entry.calculatedBalance;
                        
                        return (
                          <tr key={entry.id}>
                            <td>{formattedDate}</td>
                            <td>{entry.description || '-'}</td>
                            <td style={{ textAlign: 'right', color: exp > 0 ? 'var(--danger)' : 'inherit' }}>
                              {exp > 0 ? exp.toFixed(2) : '-'}
                            </td>
                            <td style={{ textAlign: 'right', color: rec > 0 ? 'var(--success)' : 'inherit' }}>
                              {rec > 0 ? rec.toFixed(2) : '-'}
                            </td>
                            <td style={{ textAlign: 'right', fontWeight: 'bold', color: bal > 0 ? 'var(--danger)' : (bal < 0 ? 'var(--success)' : 'inherit') }}>
                              {Math.abs(bal).toFixed(2)} {bal < 0 ? '(Adv)' : ''}
                            </td>
                          </tr>
                        );
                      })}
                    </>
                  )}
                </tbody>

                {/* Table Footer with Period Totals */}
                {filteredEntries.length > 0 && (
                  <tfoot>
                    <tr>
                      <td style={{ fontWeight: 'bold' }}>Period Total</td>
                      <td style={{ fontWeight: 600 }}>{filteredEntries.length} transaction(s)</td>
                      <td style={{ textAlign: 'right', fontWeight: 'bold' }}>₹ {periodExpense.toFixed(2)}</td>
                      <td style={{ textAlign: 'right', fontWeight: 'bold' }}>₹ {periodReceipt.toFixed(2)}</td>
                      <td style={{ textAlign: 'right', fontWeight: 'bold' }}>
                        ₹ {Math.abs(finalBalance).toFixed(2)} {finalBalance < 0 ? '(Adv)' : ''}
                      </td>
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default PartnerSheet;

import React, { useState, useEffect, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import { getStyleLedger } from '../lib/api';
import { ArrowLeft, Printer, Download, FileText } from 'lucide-react';
import * as XLSX from 'xlsx';

const StyleLedger = () => {
  const { id } = useParams();
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [styleInfo, setStyleInfo] = useState({ name: '', vendor: '' });

  useEffect(() => {
    async function loadLedger() {
      try {
        setLoading(true);
        const data = await getStyleLedger(id);
        
        if (data && data.length > 0) {
          setStyleInfo({
            name: data[0].styles?.name || 'Unknown Style',
            vendor: data[0].styles?.vendors?.name || 'Unknown Vendor'
          });
        }
        
        // Calculate running balance
        let currentBalance = 0;
        const calculatedData = data.map(t => {
          currentBalance = currentBalance + Number(t.inward_qty) - Number(t.outward_qty);
          return { ...t, balance: currentBalance };
        });
        
        setTransactions(calculatedData);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    loadLedger();
  }, [id]);

  const exportToExcel = () => {
    const wsData = [
      ['Style Ledger Report'],
      [`Style: ${styleInfo.name}`, `Customer: ${styleInfo.vendor}`],
      [], // empty row
      ['Date', 'Challan No', 'Batch/Lot No', 'IN (Qty)', 'OUT (Qty)', 'Balance']
    ];

    transactions.forEach(t => {
      const d = new Date(t.created_at);
      const formattedDate = `${String(d.getDate()).padStart(2, '0')}-${String(d.getMonth() + 1).padStart(2, '0')}-${d.getFullYear()}`;
      wsData.push([
        formattedDate,
        t.challan_no || '-',
        t.batch_no || '-',
        t.inward_qty || 0,
        t.outward_qty || 0,
        t.balance
      ]);
    });

    const ws = XLSX.utils.aoa_to_sheet(wsData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Ledger");
    XLSX.writeFile(wb, `${styleInfo.name}_Ledger.xlsx`);
  };

  const printPDF = () => {
    window.print();
  };

  return (
    <div className="ledger-container">
      <header className="page-header no-print">
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <Link to="/styles" className="btn btn-secondary" style={{ padding: '0.5rem' }}>
            <ArrowLeft size={18} />
          </Link>
          <h1 className="page-title">Style Ledger</h1>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button className="btn btn-secondary" onClick={exportToExcel} disabled={loading || transactions.length === 0}>
            <Download size={18} /> Export Excel
          </button>
          <button className="btn btn-primary" onClick={printPDF} disabled={loading || transactions.length === 0}>
            <Printer size={18} /> Print Report
          </button>
        </div>
      </header>

      <div className="glass-card printable-area">
        <div className="ledger-header" style={{ marginBottom: '2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <h2 style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>{styleInfo.name || 'Loading...'}</h2>
            <p style={{ color: 'var(--text-muted)' }}>Customer / Vendor: {styleInfo.vendor || '-'}</p>
          </div>
          <div style={{ textAlign: 'right' }}>
            <FileText size={40} color="var(--accent-primary)" style={{ opacity: 0.5 }} />
            <p style={{ marginTop: '0.5rem', fontWeight: 600 }}>Total Entries: {transactions.length}</p>
          </div>
        </div>

        <div className="table-container" style={{ border: 'none', borderRadius: 0 }}>
          <table>
            <thead>
              <tr>
                <th>Date</th>
                <th>Challan No</th>
                <th>Batch / Lot</th>
                <th style={{ textAlign: 'right' }}>IN</th>
                <th style={{ textAlign: 'right' }}>OUT</th>
                <th style={{ textAlign: 'right', backgroundColor: 'rgba(99, 102, 241, 0.1)' }}>Balance</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan="6" style={{ textAlign: 'center' }}>Loading ledger...</td></tr>
              ) : transactions.length === 0 ? (
                <tr><td colSpan="6" style={{ textAlign: 'center' }}>No transactions found for this style</td></tr>
              ) : (
                transactions.map((t, idx) => {
                  const d = new Date(t.created_at);
                  const formattedDate = `${String(d.getDate()).padStart(2, '0')}-${String(d.getMonth() + 1).padStart(2, '0')}-${d.getFullYear()}`;
                  return (
                    <tr key={t.id || idx}>
                      <td>{formattedDate}</td>
                      <td>{t.challan_no || '-'}</td>
                    <td><span className="badge badge-neutral">{t.batch_no || '-'}</span></td>
                    <td style={{ textAlign: 'right', color: 'var(--success)', fontWeight: 500 }}>
                      {t.inward_qty > 0 ? `+${t.inward_qty}` : '-'}
                    </td>
                    <td style={{ textAlign: 'right', color: 'var(--danger)', fontWeight: 500 }}>
                      {t.outward_qty > 0 ? `-${t.outward_qty}` : '-'}
                    </td>
                    <td style={{ textAlign: 'right', fontWeight: 'bold', backgroundColor: 'rgba(255,255,255,0.02)' }}>
                      {t.balance}
                    </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default StyleLedger;

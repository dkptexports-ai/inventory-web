import React, { useState, useEffect, useRef } from 'react';
import { getPartnerLedger, getUniquePartners } from '../lib/api';
import { IndianRupee, Search, Plus } from 'lucide-react';

// Custom Smart Dropdown Component
const PartnerSheet = () => {
  const [uniquePartners, setUniquePartners] = useState([]);
  const [selectedPartner, setSelectedPartner] = useState('');
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchPartners();
  }, []);

  useEffect(() => {
    if (selectedPartner) {
      loadData(selectedPartner);
    } else {
      setEntries([]);
    }
  }, [selectedPartner]);

  const fetchPartners = async () => {
    try {
      const partners = await getUniquePartners();
      setUniquePartners(partners);
    } catch (err) {
      console.error('Failed to load partners', err);
    }
  };

  const loadData = async (partner) => {
    try {
      setLoading(true);
      setError(null);
      const data = await getPartnerLedger(partner);
      
      // Calculate running balance (Payable to Partner)
      // Assuming Expense = Paid by Partner (We owe him)
      // Receipt = We paid back to Partner (Reduces what we owe)
      // Balance = Previous + Expense - Receipt
      let currentBalance = 0;
      const dataWithBalance = data.map(item => {
        const exp = Number(item.expense) || 0;
        const rec = Number(item.receipt) || 0;
        currentBalance = currentBalance + exp - rec; 
        return {
          ...item,
          calculatedBalance: currentBalance
        };
      });
      
      setEntries(dataWithBalance);
    } catch (err) {
      console.error(err);
      setError('Failed to load partner ledger data');
    } finally {
      setLoading(false);
    }
  };

  const totalExpense = entries.reduce((sum, item) => sum + (Number(item.expense) || 0), 0);
  const totalReceipt = entries.reduce((sum, item) => sum + (Number(item.receipt) || 0), 0);
  const finalPayable = entries.length > 0 ? entries[entries.length - 1].calculatedBalance : 0;

  return (
    <div>
      <header className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h1 className="page-title">Partners Sheet (Payables)</h1>
        <div style={{ width: '300px' }}>
          <div style={{ position: 'relative' }}>
            <input 
              type="text"
              className="input-field"
              list="partner-list"
              value={selectedPartner}
              onChange={(e) => setSelectedPartner(e.target.value)}
              placeholder="Search partner to view ledger..."
              style={{ width: '100%', marginBottom: 0 }}
            />
            <datalist id="partner-list">
              {uniquePartners.map((p, idx) => <option key={idx} value={p} />)}
            </datalist>
          </div>
        </div>
      </header>

      {!selectedPartner ? (
        <div className="glass-card" style={{ textAlign: 'center', padding: '4rem', color: 'var(--text-secondary)' }}>
          <Search size={64} style={{ opacity: 0.2, marginBottom: '1.5rem' }} />
          <h2 style={{ fontSize: '1.25rem', marginBottom: '0.5rem', color: 'var(--text-primary)' }}>No Partner Selected</h2>
          <p>Please use the dropdown in the header to search and select a partner to view their ledger.</p>
        </div>
      ) : (
        <>
          {/* Summary Cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.5rem', marginBottom: '2rem' }}>
            <div className="glass-card" style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <span style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>Total Paid by {selectedPartner} (Expenses)</span>
              <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: 'var(--danger)', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                <IndianRupee size={20} /> {totalExpense.toFixed(2)}
              </div>
            </div>
            <div className="glass-card" style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <span style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>Amount Reimbursed (Receipts)</span>
              <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: 'var(--success)', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                <IndianRupee size={20} /> {totalReceipt.toFixed(2)}
              </div>
            </div>
            <div className="glass-card" style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', background: finalPayable > 0 ? 'rgba(248,81,73,0.05)' : 'rgba(46,160,67,0.05)' }}>
              <span style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>Net Amount Payable to {selectedPartner}</span>
              <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: finalPayable > 0 ? 'var(--danger)' : 'var(--success)', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                <IndianRupee size={20} /> {Math.abs(finalPayable).toFixed(2)} {finalPayable < 0 && '(Advance)'}
              </div>
            </div>
          </div>

          <div className="glass-card" style={{ padding: 0, overflow: 'hidden' }}>
            {error && <div style={{ color: 'var(--danger)', padding: '1rem', borderBottom: '1px solid var(--border-color)' }}>{error}</div>}
            <div className="table-container" style={{ border: 'none', borderRadius: 0 }}>
              <table>
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Description</th>
                    <th style={{ textAlign: 'right' }}>Expense (Paid by {selectedPartner})</th>
                    <th style={{ textAlign: 'right' }}>Receipt (Reimbursed)</th>
                    <th style={{ textAlign: 'right' }}>Balance Payable</th>
                  </tr>
                </thead>
                <tbody>
                  {loading && entries.length === 0 ? (
                    <tr><td colSpan="5" style={{ textAlign: 'center', padding: '2rem' }}>Loading data...</td></tr>
                  ) : entries.length === 0 ? (
                    <tr><td colSpan="5" style={{ textAlign: 'center', padding: '2rem' }}>No entries found for {selectedPartner}</td></tr>
                  ) : (
                    entries.map(entry => {
                      const d = new Date(entry.date);
                      const formattedDate = `${String(d.getDate()).padStart(2, '0')}-${String(d.getMonth() + 1).padStart(2, '0')}-${d.getFullYear()}`;
                      const exp = Number(entry.expense) || 0;
                      const rec = Number(entry.receipt) || 0;
                      const bal = entry.calculatedBalance;
                      
                      return (
                        <tr key={entry.id}>
                          <td>{formattedDate}</td>
                          <td>{entry.description}</td>
                          <td style={{ textAlign: 'right', color: exp > 0 ? 'var(--danger)' : 'inherit' }}>
                            {exp > 0 ? exp.toFixed(2) : '-'}
                          </td>
                          <td style={{ textAlign: 'right', color: rec > 0 ? 'var(--success)' : 'inherit' }}>
                            {rec > 0 ? rec.toFixed(2) : '-'}
                          </td>
                          <td style={{ textAlign: 'right', fontWeight: 'bold', color: bal > 0 ? 'var(--danger)' : (bal < 0 ? 'var(--success)' : 'inherit') }}>
                            {Math.abs(bal).toFixed(2)} {bal < 0 && '(Adv)'}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default PartnerSheet;

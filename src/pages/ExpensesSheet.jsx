import React, { useState, useEffect } from 'react';
import { getPartnerLedger, addPartnerLedgerEntry, deletePartnerLedgerEntry } from '../lib/api';
import { Plus, Trash2, Save, IndianRupee } from 'lucide-react';

const ExpensesSheet = () => {
  const [activePartner, setActivePartner] = useState('Anil');
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Form State
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [description, setDescription] = useState('');
  const [expense, setExpense] = useState('');
  const [receipt, setReceipt] = useState('');

  useEffect(() => {
    loadData();
  }, [activePartner]);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await getPartnerLedger(activePartner);
      
      // Calculate running balance
      let currentBalance = 0;
      const dataWithBalance = data.map(item => {
        // Balance = previous balance + receipt - expense
        const exp = Number(item.expense) || 0;
        const rec = Number(item.receipt) || 0;
        currentBalance = currentBalance + rec - exp;
        return {
          ...item,
          calculatedBalance: currentBalance
        };
      });
      
      setEntries(dataWithBalance);
    } catch (err) {
      console.error(err);
      setError('Failed to load ledger data');
    } finally {
      setLoading(false);
    }
  };

  const handleAddEntry = async (e) => {
    e.preventDefault();
    if (!description) {
      setError('Description is required');
      return;
    }
    
    try {
      setLoading(true);
      setError(null);
      
      const payload = {
        partner_name: activePartner,
        date: date,
        description: description,
        expense: Number(expense) || 0,
        receipt: Number(receipt) || 0,
        balance: 0 // We calculate on the fly for display, but keep field if needed later
      };
      
      await addPartnerLedgerEntry(payload);
      
      // Reset form
      setDescription('');
      setExpense('');
      setReceipt('');
      
      await loadData();
    } catch (err) {
      console.error(err);
      setError('Failed to add entry');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this entry?')) return;
    
    try {
      setLoading(true);
      await deletePartnerLedgerEntry(id);
      await loadData();
    } catch (err) {
      console.error(err);
      setError('Failed to delete entry');
      setLoading(false);
    }
  };

  // Calculate totals
  const totalExpense = entries.reduce((sum, item) => sum + (Number(item.expense) || 0), 0);
  const totalReceipt = entries.reduce((sum, item) => sum + (Number(item.receipt) || 0), 0);
  const finalBalance = entries.length > 0 ? entries[entries.length - 1].calculatedBalance : 0;

  return (
    <div>
      <header className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h1 className="page-title">Expenses Sheet (Partner Ledger)</h1>
        <div style={{ display: 'flex', gap: '1rem', background: 'var(--card-bg)', padding: '0.25rem', borderRadius: '0.5rem', border: '1px solid var(--border-color)' }}>
          <button 
            className={`btn ${activePartner === 'Anil' ? 'btn-primary' : 'btn-secondary'}`}
            style={{ border: 'none' }}
            onClick={() => setActivePartner('Anil')}
          >
            Anil Ledger
          </button>
          <button 
            className={`btn ${activePartner === 'Karambir' ? 'btn-primary' : 'btn-secondary'}`}
            style={{ border: 'none' }}
            onClick={() => setActivePartner('Karambir')}
          >
            Karambir Ledger
          </button>
        </div>
      </header>
      
      <div className="glass-card" style={{ marginBottom: '2rem' }}>
        <h2 style={{ marginBottom: '1.5rem', fontSize: '1.125rem' }}>Add New Entry for {activePartner}</h2>
        
        {error && <div style={{ color: 'var(--danger)', marginBottom: '1rem', padding: '0.5rem', background: 'rgba(248,81,73,0.1)', borderRadius: '4px' }}>{error}</div>}
        
        <form onSubmit={handleAddEntry} style={{ display: 'grid', gridTemplateColumns: '1.5fr 3fr 1.5fr 1.5fr auto', gap: '1rem', alignItems: 'end' }}>
          <div className="input-group" style={{ marginBottom: 0 }}>
            <label className="input-label">Date *</label>
            <input 
              type="date" 
              className="input-field" 
              value={date}
              onChange={(e) => setDate(e.target.value)}
              required
            />
          </div>
          <div className="input-group" style={{ marginBottom: 0 }}>
            <label className="input-label">Description *</label>
            <input 
              type="text" 
              className="input-field" 
              placeholder="Expense or Receipt details..." 
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              required
            />
          </div>
          <div className="input-group" style={{ marginBottom: 0 }}>
            <label className="input-label">Expense (Dr)</label>
            <input 
              type="number" 
              className="input-field" 
              placeholder="0.00" 
              value={expense}
              onChange={(e) => setExpense(e.target.value)}
              min="0"
              step="0.01"
            />
          </div>
          <div className="input-group" style={{ marginBottom: 0 }}>
            <label className="input-label">Receipt (Cr)</label>
            <input 
              type="number" 
              className="input-field" 
              placeholder="0.00" 
              value={receipt}
              onChange={(e) => setReceipt(e.target.value)}
              min="0"
              step="0.01"
            />
          </div>
          <button type="submit" className="btn btn-primary" disabled={loading} style={{ height: '42px' }}>
            <Plus size={18} /> Add
          </button>
        </form>
      </div>

      {/* Summary Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.5rem', marginBottom: '2rem' }}>
        <div className="glass-card" style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          <span style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>Total Expense</span>
          <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: 'var(--danger)', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
            <IndianRupee size={20} /> {totalExpense.toFixed(2)}
          </div>
        </div>
        <div className="glass-card" style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          <span style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>Total Receipt</span>
          <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: 'var(--success)', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
            <IndianRupee size={20} /> {totalReceipt.toFixed(2)}
          </div>
        </div>
        <div className="glass-card" style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          <span style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>Net Balance</span>
          <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: finalBalance >= 0 ? 'var(--success)' : 'var(--danger)', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
            <IndianRupee size={20} /> {Math.abs(finalBalance).toFixed(2)} {finalBalance >= 0 ? '(Cr)' : '(Dr)'}
          </div>
        </div>
      </div>

      <div className="glass-card" style={{ padding: 0, overflow: 'hidden' }}>
        <div className="table-container" style={{ border: 'none', borderRadius: 0 }}>
          <table>
            <thead>
              <tr>
                <th>Date</th>
                <th>Description</th>
                <th style={{ textAlign: 'right' }}>Expense (Dr)</th>
                <th style={{ textAlign: 'right' }}>Receipt (Cr)</th>
                <th style={{ textAlign: 'right' }}>Balance</th>
                <th style={{ width: '80px', textAlign: 'center' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading && entries.length === 0 ? (
                <tr><td colSpan="6" style={{ textAlign: 'center', padding: '2rem' }}>Loading data...</td></tr>
              ) : entries.length === 0 ? (
                <tr><td colSpan="6" style={{ textAlign: 'center', padding: '2rem' }}>No entries found for {activePartner}</td></tr>
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
                      <td style={{ textAlign: 'right', fontWeight: 'bold', color: bal >= 0 ? 'var(--success)' : 'var(--danger)' }}>
                        {Math.abs(bal).toFixed(2)} {bal >= 0 ? 'Cr' : 'Dr'}
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        <button className="btn btn-secondary" style={{ padding: '0.3rem', color: 'var(--danger)' }} onClick={() => handleDelete(entry.id)} title="Delete">
                          <Trash2 size={14} />
                        </button>
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

export default ExpensesSheet;

import React, { useState, useEffect } from 'react';
import { getCustomerReceipts, addCustomerReceipt, deleteCustomerReceipt } from '../lib/api';
import { Plus, Trash2, IndianRupee } from 'lucide-react';

const ReceiptSheet = () => {
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Form State
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await getCustomerReceipts();
      setEntries(data);
    } catch (err) {
      console.error(err);
      setError('Failed to load receipts');
    } finally {
      setLoading(false);
    }
  };

  const handleAddEntry = async (e) => {
    e.preventDefault();
    if (!description || !amount) {
      setError('Description and Amount are required');
      return;
    }
    
    try {
      setLoading(true);
      setError(null);
      
      const payload = {
        date: date,
        description: description,
        amount: Number(amount) || 0
      };
      
      await addCustomerReceipt(payload);
      
      // Reset form
      setDescription('');
      setAmount('');
      
      await loadData();
    } catch (err) {
      console.error(err);
      setError('Failed to add receipt');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this receipt?')) return;
    
    try {
      setLoading(true);
      await deleteCustomerReceipt(id);
      await loadData();
    } catch (err) {
      console.error(err);
      setError('Failed to delete receipt');
      setLoading(false);
    }
  };

  // Calculate total
  const totalAmount = entries.reduce((sum, item) => sum + (Number(item.amount) || 0), 0);

  return (
    <div>
      <header className="page-header">
        <h1 className="page-title">Receipt Sheet (Customer Payments)</h1>
      </header>
      
      <div className="glass-card" style={{ marginBottom: '2rem' }}>
        <h2 style={{ marginBottom: '1.5rem', fontSize: '1.125rem' }}>Add New Receipt</h2>
        
        {error && <div style={{ color: 'var(--danger)', marginBottom: '1rem', padding: '0.5rem', background: 'rgba(248,81,73,0.1)', borderRadius: '4px' }}>{error}</div>}
        
        <form onSubmit={handleAddEntry} style={{ display: 'grid', gridTemplateColumns: '1.5fr 3fr 2fr auto', gap: '1rem', alignItems: 'end' }}>
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
            <label className="input-label">Description / Customer *</label>
            <input 
              type="text" 
              className="input-field" 
              placeholder="e.g. Payment from John Doe..." 
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              required
            />
          </div>
          <div className="input-group" style={{ marginBottom: 0 }}>
            <label className="input-label">Amount (₹) *</label>
            <input 
              type="number" 
              className="input-field" 
              placeholder="0.00" 
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              required
              min="0.01"
              step="0.01"
            />
          </div>
          <button type="submit" className="btn btn-primary" disabled={loading} style={{ height: '42px' }}>
            <Plus size={18} /> Add
          </button>
        </form>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.5rem', marginBottom: '2rem' }}>
        <div className="glass-card" style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          <span style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>Total Receipts</span>
          <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: 'var(--success)', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
            <IndianRupee size={20} /> {totalAmount.toFixed(2)}
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
                <th style={{ textAlign: 'right' }}>Amount (₹)</th>
                <th style={{ width: '80px', textAlign: 'center' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading && entries.length === 0 ? (
                <tr><td colSpan="4" style={{ textAlign: 'center', padding: '2rem' }}>Loading data...</td></tr>
              ) : entries.length === 0 ? (
                <tr><td colSpan="4" style={{ textAlign: 'center', padding: '2rem' }}>No receipts found</td></tr>
              ) : (
                entries.map(entry => {
                  const d = new Date(entry.date);
                  const formattedDate = `${String(d.getDate()).padStart(2, '0')}-${String(d.getMonth() + 1).padStart(2, '0')}-${d.getFullYear()}`;
                  const amt = Number(entry.amount) || 0;
                  
                  return (
                    <tr key={entry.id}>
                      <td>{formattedDate}</td>
                      <td>{entry.description}</td>
                      <td style={{ textAlign: 'right', fontWeight: 'bold', color: 'var(--success)' }}>
                        {amt.toFixed(2)}
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

export default ReceiptSheet;

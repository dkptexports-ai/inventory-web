import React, { useState, useEffect } from 'react';
import { getPurchaseRegister, addPurchaseRegisterEntry, deletePurchaseRegisterEntry } from '../lib/api';
import { Plus, Trash2, IndianRupee, ShoppingCart } from 'lucide-react';

const PurchaseRegister = () => {
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Form State
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [supplierName, setSupplierName] = useState('');
  const [invoiceNo, setInvoiceNo] = useState('');
  const [amount, setAmount] = useState('');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await getPurchaseRegister();
      setEntries(data);
    } catch (err) {
      console.error(err);
      setError('Failed to load purchases');
    } finally {
      setLoading(false);
    }
  };

  const handleAddEntry = async (e) => {
    e.preventDefault();
    if (!supplierName || !amount) {
      setError('Supplier Name and Amount are required');
      return;
    }
    
    try {
      setLoading(true);
      setError(null);
      
      const payload = {
        date: date,
        supplier_name: supplierName,
        invoice_no: invoiceNo,
        amount: Number(amount) || 0
      };
      
      await addPurchaseRegisterEntry(payload);
      
      // Reset form
      setSupplierName('');
      setInvoiceNo('');
      setAmount('');
      
      await loadData();
    } catch (err) {
      console.error(err);
      setError('Failed to add purchase entry');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this purchase entry?')) return;
    
    try {
      setLoading(true);
      await deletePurchaseRegisterEntry(id);
      await loadData();
    } catch (err) {
      console.error(err);
      setError('Failed to delete entry');
      setLoading(false);
    }
  };

  // Calculate total
  const totalAmount = entries.reduce((sum, item) => sum + (Number(item.amount) || 0), 0);

  return (
    <div>
      <header className="page-header">
        <h1 className="page-title">Purchase Register</h1>
      </header>
      
      <div className="glass-card" style={{ marginBottom: '2rem' }}>
        <h2 style={{ marginBottom: '1.5rem', fontSize: '1.125rem' }}>Add New Purchase</h2>
        
        {error && <div style={{ color: 'var(--danger)', marginBottom: '1rem', padding: '0.5rem', background: 'rgba(248,81,73,0.1)', borderRadius: '4px' }}>{error}</div>}
        
        <form onSubmit={handleAddEntry} style={{ display: 'grid', gridTemplateColumns: '1.5fr 2fr 1.5fr 1.5fr auto', gap: '1rem', alignItems: 'end' }}>
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
            <label className="input-label">Supplier Name *</label>
            <input 
              type="text" 
              className="input-field" 
              placeholder="e.g. ABC Textiles..." 
              value={supplierName}
              onChange={(e) => setSupplierName(e.target.value)}
              required
            />
          </div>
          <div className="input-group" style={{ marginBottom: 0 }}>
            <label className="input-label">Invoice No.</label>
            <input 
              type="text" 
              className="input-field" 
              placeholder="INV-..." 
              value={invoiceNo}
              onChange={(e) => setInvoiceNo(e.target.value)}
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
          <span style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>Total Purchases</span>
          <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: 'var(--danger)', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
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
                <th>Supplier Name</th>
                <th>Invoice No.</th>
                <th style={{ textAlign: 'right' }}>Amount (₹)</th>
                <th style={{ width: '80px', textAlign: 'center' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading && entries.length === 0 ? (
                <tr><td colSpan="5" style={{ textAlign: 'center', padding: '2rem' }}>Loading data...</td></tr>
              ) : entries.length === 0 ? (
                <tr><td colSpan="5" style={{ textAlign: 'center', padding: '2rem' }}>No purchases found</td></tr>
              ) : (
                entries.map(entry => {
                  const d = new Date(entry.date);
                  const formattedDate = `${String(d.getDate()).padStart(2, '0')}-${String(d.getMonth() + 1).padStart(2, '0')}-${d.getFullYear()}`;
                  const amt = Number(entry.amount) || 0;
                  
                  return (
                    <tr key={entry.id}>
                      <td>{formattedDate}</td>
                      <td>{entry.supplier_name}</td>
                      <td>{entry.invoice_no || '-'}</td>
                      <td style={{ textAlign: 'right', fontWeight: 'bold', color: 'var(--danger)' }}>
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

export default PurchaseRegister;

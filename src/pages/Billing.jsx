import React, { useState, useEffect } from 'react';
import { getPendingBatchesForBilling, markAsBilled } from '../lib/api';
import { Link } from 'react-router-dom';

const Billing = () => {
  const [challans, setChallans] = useState([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  
  // A simple state for popup
  const [activeInvoice, setActiveInvoice] = useState(null);
  const [invoiceNo, setInvoiceNo] = useState('');
  const [invoiceDate, setInvoiceDate] = useState(new Date().toISOString().split('T')[0]);

  useEffect(() => {
    loadChallans();
  }, []);

  async function loadChallans() {
    try {
      const data = await getPendingBatchesForBilling();
      setChallans(data);
    } catch (err) {
      console.error(err);
    }
  }

  const handleMarkBilled = async () => {
    if (!activeInvoice || !invoiceNo) return;
    try {
      setLoading(true);
      await markAsBilled(activeInvoice.transaction_ids, invoiceNo, invoiceDate);
      setActiveInvoice(null);
      setInvoiceNo('');
      setInvoiceDate(new Date().toISOString().split('T')[0]);
      loadChallans();
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const filteredChallans = challans.filter(c => 
    c.batch_no?.toLowerCase().includes(search.toLowerCase()) ||
    c.styles?.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div>
      <header className="page-header">
        <h1 className="page-title">Billing & Invoices</h1>
      </header>
      
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.5rem', marginBottom: '2rem' }}>
        <div className="glass-card stat-card" style={{ padding: '1rem' }}>
          <h3 style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>Pending Vendors</h3>
          <p style={{ fontSize: '1.5rem', fontWeight: 600, marginTop: '0.5rem', color: 'var(--accent-primary)' }}>
            {new Set(challans.map(c => c.styles?.vendors?.name).filter(Boolean)).size}
          </p>
        </div>
        <div className="glass-card stat-card" style={{ padding: '1rem' }}>
          <h3 style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>Pending Firms</h3>
          <p style={{ fontSize: '1.5rem', fontWeight: 600, marginTop: '0.5rem', color: 'var(--warning)' }}>
            {new Set(challans.map(c => c.firm).filter(Boolean)).size}
          </p>
        </div>
        <div className="glass-card stat-card" style={{ padding: '1rem' }}>
          <h3 style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>Pending Styles</h3>
          <p style={{ fontSize: '1.5rem', fontWeight: 600, marginTop: '0.5rem', color: 'var(--success)' }}>
            {new Set(challans.map(c => c.styles?.name).filter(Boolean)).size}
          </p>
        </div>
      </div>
      
      {activeInvoice && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, 
          background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100
        }}>
          <div className="glass-card" style={{ width: '400px' }}>
            <h2>Generate Bill</h2>
            <p style={{ margin: '1rem 0', color: 'var(--text-muted)' }}>
              Mark Challan <b>{activeInvoice.challan_no}</b> as Billed.
            </p>
            <div className="input-group">
              <label className="input-label">Invoice Number</label>
              <input 
                type="text" 
                className="input-field" 
                value={invoiceNo}
                onChange={e => setInvoiceNo(e.target.value)}
                placeholder="INV-XXXX"
              />
            </div>
            <div className="input-group" style={{ marginTop: '1rem' }}>
              <label className="input-label">Invoice Date</label>
              <input 
                type="date" 
                className="input-field" 
                value={invoiceDate}
                onChange={e => setInvoiceDate(e.target.value)}
              />
            </div>
            <div style={{ display: 'flex', gap: '1rem', marginTop: '1.5rem' }}>
              <button className="btn btn-primary" onClick={handleMarkBilled} disabled={loading || !invoiceNo}>
                {loading ? 'Saving...' : 'Confirm'}
              </button>
              <button className="btn btn-secondary" onClick={() => setActiveInvoice(null)}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      <div className="glass-card" style={{ padding: 0, overflow: 'hidden' }}>
        <div style={{ padding: '1.5rem', borderBottom: '1px solid var(--border-color)', display: 'flex', gap: '1rem' }}>
          <input 
            type="text" 
            className="input-field" 
            placeholder="Search Challan or Style..." 
            style={{ maxWidth: '300px' }}
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        
        <div className="table-container" style={{ border: 'none', borderRadius: 0 }}>
          <table>
            <thead>
              <tr>
                <th>Date</th>
                <th>Batch / Lot No.</th>
                <th>Firm</th>
                <th>Vendor</th>
                <th>Style</th>
                <th>Out Qty</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {filteredChallans.length === 0 ? (
                <tr><td colSpan="7" style={{ textAlign: 'center' }}>No pending bills found.</td></tr>
              ) : (
                filteredChallans.map(c => {
                  const d = new Date(c.date || c.created_at);
                  const formattedDate = `${String(d.getDate()).padStart(2, '0')}-${String(d.getMonth() + 1).padStart(2, '0')}-${d.getFullYear()}`;
                  return (
                  <tr key={c.id}>
                    <td>{formattedDate}</td>
                    <td>
                      <Link to={`/batch/${c.batch_no}`} style={{ color: 'var(--accent-primary)', textDecoration: 'none', fontWeight: 600 }}>
                        {c.batch_no || '-'}
                      </Link>
                    </td>
                    <td>{c.firm || '-'}</td>
                    <td>{c.styles?.vendors?.name}</td>
                    <td>{c.styles?.name}</td>
                    <td><span className="badge badge-warning">{c.outward_qty}</span></td>
                    <td>
                      <button 
                        className="btn btn-secondary" 
                        style={{ padding: '0.25rem 0.75rem', fontSize: '0.75rem' }}
                        onClick={() => setActiveInvoice(c)}
                      >
                        Generate Bill
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

export default Billing;

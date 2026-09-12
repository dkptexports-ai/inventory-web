import React, { useState, useEffect } from 'react';
import { getPendingChallans, markAsBilled } from '../lib/api';

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
      const data = await getPendingChallans();
      // Filter out zero outward qty if billing is based on outward
      setChallans(data.filter(t => t.outward_qty > 0));
    } catch (err) {
      console.error(err);
    }
  }

  const handleMarkBilled = async () => {
    if (!activeInvoice || !invoiceNo) return;
    try {
      setLoading(true);
      await markAsBilled(activeInvoice.id, invoiceNo, invoiceDate);
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
    c.challan_no?.toLowerCase().includes(search.toLowerCase()) ||
    c.styles?.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div>
      <header className="page-header">
        <h1 className="page-title">Billing & Invoices</h1>
      </header>
      
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
                <th>Challan No.</th>
                <th>Vendor</th>
                <th>Style</th>
                <th>Out Qty</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {filteredChallans.length === 0 ? (
                <tr><td colSpan="6" style={{ textAlign: 'center' }}>No pending bills found.</td></tr>
              ) : (
                filteredChallans.map(c => (
                  <tr key={c.id}>
                    <td>{new Date(c.created_at).toLocaleDateString()}</td>
                    <td>{c.challan_no || '-'}</td>
                    <td>{c.styles?.vendors?.name}</td>
                    <td>{c.styles?.name}</td>
                    <td>{c.outward_qty}</td>
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
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default Billing;

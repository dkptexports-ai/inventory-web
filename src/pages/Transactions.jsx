import React, { useState, useEffect } from 'react';
import { getVendors, ensureStyle, addTransaction, getRecentTransactions } from '../lib/api';

const Transactions = () => {
  const [vendors, setVendors] = useState([]);
  const [recent, setRecent] = useState([]);
  
  const [formData, setFormData] = useState({
    vendor_id: '',
    styleName: '',
    challan_no: '',
    inward_qty: '',
    outward_qty: ''
  });
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    loadInitialData();
  }, []);

  async function loadInitialData() {
    try {
      const v = await getVendors();
      setVendors(v);
      const r = await getRecentTransactions();
      setRecent(r);
    } catch (err) {
      console.error(err);
    }
  }

  const handleSave = async () => {
    try {
      setLoading(true);
      setError(null);
      setSuccess(false);
      
      if (!formData.vendor_id || !formData.styleName) {
        throw new Error("Vendor and Style are required");
      }
      
      // Get or create style
      const styleId = await ensureStyle(formData.styleName, formData.vendor_id);
      
      // Save transaction
      await addTransaction({
        style_id: styleId,
        challan_no: formData.challan_no,
        inward_qty: Number(formData.inward_qty) || 0,
        outward_qty: Number(formData.outward_qty) || 0,
        date: new Date().toISOString()
      });
      
      setSuccess(true);
      setFormData({ ...formData, styleName: '', challan_no: '', inward_qty: '', outward_qty: '' });
      loadInitialData(); // reload table
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <header className="page-header">
        <h1 className="page-title">Transaction Manager</h1>
      </header>
      
      <div className="dashboard-grid" style={{ gridTemplateColumns: '1fr 2fr' }}>
        <div className="glass-card">
          <h2 style={{ marginBottom: '1.5rem', fontSize: '1.125rem' }}>Add New Entry</h2>
          
          {error && <div style={{ color: 'var(--danger)', marginBottom: '1rem', fontSize: '0.875rem' }}>{error}</div>}
          {success && <div style={{ color: 'var(--success)', marginBottom: '1rem', fontSize: '0.875rem' }}>Transaction saved successfully!</div>}
          
          <div className="input-group">
            <label className="input-label">Select Vendor</label>
            <select 
              className="input-field" 
              style={{ appearance: 'none', backgroundColor: 'var(--bg-main)' }}
              value={formData.vendor_id}
              onChange={(e) => setFormData({...formData, vendor_id: e.target.value})}
            >
              <option value="">Select Vendor...</option>
              {vendors.map(v => (
                <option key={v.id} value={v.id}>{v.name}</option>
              ))}
            </select>
          </div>
          
          <div className="input-group">
            <label className="input-label">Style / Product</label>
            <input 
              type="text" 
              className="input-field" 
              placeholder="E.g., A Lucky or Type new style..." 
              value={formData.styleName}
              onChange={(e) => setFormData({...formData, styleName: e.target.value})}
            />
          </div>
          
          <div className="input-group">
            <label className="input-label">Challan Number</label>
            <input 
              type="text" 
              className="input-field" 
              placeholder="CH-XXXX" 
              value={formData.challan_no}
              onChange={(e) => setFormData({...formData, challan_no: e.target.value})}
            />
          </div>
          
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div className="input-group">
              <label className="input-label">Inward (IN)</label>
              <input 
                type="number" 
                className="input-field" 
                placeholder="0" 
                value={formData.inward_qty}
                onChange={(e) => setFormData({...formData, inward_qty: e.target.value})}
              />
            </div>
            <div className="input-group">
              <label className="input-label">Outward (OUT)</label>
              <input 
                type="number" 
                className="input-field" 
                placeholder="0" 
                value={formData.outward_qty}
                onChange={(e) => setFormData({...formData, outward_qty: e.target.value})}
              />
            </div>
          </div>
          
          <button 
            className="btn btn-primary" 
            style={{ width: '100%', marginTop: '1rem' }}
            onClick={handleSave}
            disabled={loading}
          >
            {loading ? 'Saving...' : 'Save Transaction'}
          </button>
        </div>
        
        <div className="glass-card" style={{ padding: 0, overflow: 'hidden' }}>
          <div style={{ padding: '1.5rem', borderBottom: '1px solid var(--border-color)' }}>
            <h2 style={{ fontSize: '1.125rem' }}>Recent Activity</h2>
          </div>
          <div className="table-container" style={{ border: 'none', borderRadius: 0 }}>
            <table>
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Challan</th>
                  <th>Style</th>
                  <th>IN</th>
                  <th>OUT</th>
                </tr>
              </thead>
              <tbody>
                {recent.length === 0 ? (
                  <tr><td colSpan="5" style={{ textAlign: 'center' }}>No recent activity</td></tr>
                ) : (
                  recent.map(t => (
                    <tr key={t.id}>
                      <td>{new Date(t.created_at).toLocaleDateString()}</td>
                      <td>{t.challan_no || '-'}</td>
                      <td>{t.styles?.name}</td>
                      <td>{t.inward_qty > 0 ? <span className="badge badge-success">{t.inward_qty}</span> : '-'}</td>
                      <td>{t.outward_qty > 0 ? <span className="badge badge-danger">{t.outward_qty}</span> : '-'}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Transactions;

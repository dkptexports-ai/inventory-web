import React, { useState, useEffect } from 'react';
import { getVendors, addVendor, getStyles, addStyle } from '../lib/api';
import { Users, Package, List } from 'lucide-react';

const MasterData = () => {
  const [vendors, setVendors] = useState([]);
  const [styles, setStyles] = useState([]);
  const [loading, setLoading] = useState(true);

  // Forms
  const [vendorForm, setVendorForm] = useState({ name: '', place: '' });
  const [styleForm, setStyleForm] = useState({ name: '', vendor_id: '', unit: 'PCS' });

  const [vendorMsg, setVendorMsg] = useState({ text: '', type: '' });
  const [styleMsg, setStyleMsg] = useState({ text: '', type: '' });

  // Selection
  const [selectedVendorId, setSelectedVendorId] = useState(null);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    try {
      setLoading(true);
      const v = await getVendors();
      setVendors(v);
      const s = await getStyles();
      setStyles(s);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  const handleAddVendor = async () => {
    try {
      setVendorMsg({ text: '', type: '' });
      await addVendor(vendorForm.name, vendorForm.place);
      setVendorMsg({ text: 'Customer added successfully', type: 'success' });
      setVendorForm({ name: '', place: '' });
      loadData();
    } catch (err) {
      setVendorMsg({ text: err.message, type: 'danger' });
    }
  };

  const handleAddStyle = async () => {
    try {
      setStyleMsg({ text: '', type: '' });
      await addStyle(styleForm.name, styleForm.vendor_id, styleForm.unit);
      setStyleMsg({ text: 'Style added successfully', type: 'success' });
      setStyleForm({ ...styleForm, name: '' });
      loadData();
    } catch (err) {
      setStyleMsg({ text: err.message, type: 'danger' });
    }
  };

  const filteredStyles = selectedVendorId 
    ? styles.filter(s => s.vendor_id === selectedVendorId).sort((a, b) => a.name.localeCompare(b.name))
    : [...styles].sort((a, b) => {
        const vendorA = a.vendors?.name || '';
        const vendorB = b.vendors?.name || '';
        if (vendorA !== vendorB) return vendorA.localeCompare(vendorB);
        return a.name.localeCompare(b.name);
      });

  return (
    <div>
      <header className="page-header">
        <h1 className="page-title">Master Data Management</h1>
      </header>

      <div className="dashboard-grid">
        {/* LEFT COLUMN: Customers */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          
          <div className="glass-card">
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.5rem' }}>
              <Users size={20} color="var(--accent-primary)" />
              <h2 style={{ fontSize: '1.125rem' }}>Customer / Vendor Master</h2>
            </div>

            {vendorMsg.text && (
              <div style={{ color: `var(--${vendorMsg.type})`, marginBottom: '1rem', fontSize: '0.875rem' }}>
                {vendorMsg.text}
              </div>
            )}

            <div className="input-group">
              <label className="input-label">Customer Name</label>
              <input 
                type="text" 
                className="input-field" 
                placeholder="E.g., ABC Textiles" 
                value={vendorForm.name}
                onChange={(e) => setVendorForm({...vendorForm, name: e.target.value})}
              />
            </div>
            <div className="input-group">
              <label className="input-label">Place (Optional)</label>
              <input 
                type="text" 
                className="input-field" 
                placeholder="E.g., Delhi" 
                value={vendorForm.place}
                onChange={(e) => setVendorForm({...vendorForm, place: e.target.value})}
              />
            </div>
            <button className="btn btn-primary" onClick={handleAddVendor} disabled={loading || !vendorForm.name}>
              Save Customer
            </button>
          </div>

          <div className="glass-card">
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
              <List size={20} color="var(--accent-primary)" />
              <h2 style={{ fontSize: '1.125rem' }}>Customer List ({vendors.length})</h2>
            </div>
            <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginBottom: '1rem' }}>
              Click on a customer to filter their styles on the right.
            </p>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', maxHeight: '400px', overflowY: 'auto' }}>
              <button 
                onClick={() => setSelectedVendorId(null)}
                style={{
                  textAlign: 'left',
                  padding: '0.75rem 1rem',
                  borderRadius: '4px',
                  border: 'none',
                  background: selectedVendorId === null ? 'var(--primary)' : 'var(--bg-color)',
                  color: selectedVendorId === null ? '#fff' : 'inherit',
                  cursor: 'pointer',
                  fontWeight: selectedVendorId === null ? 'bold' : 'normal'
                }}
              >
                All Customers
              </button>
              
              {vendors.map(v => (
                <button 
                  key={v.id}
                  onClick={() => setSelectedVendorId(v.id)}
                  style={{
                    textAlign: 'left',
                    padding: '0.75rem 1rem',
                    borderRadius: '4px',
                    border: 'none',
                    background: selectedVendorId === v.id ? 'var(--primary)' : 'var(--card-bg)',
                    color: selectedVendorId === v.id ? '#fff' : 'inherit',
                    cursor: 'pointer',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center'
                  }}
                  onMouseEnter={(e) => { if(selectedVendorId !== v.id) e.target.style.background = 'var(--bg-color)'; }}
                  onMouseLeave={(e) => { if(selectedVendorId !== v.id) e.target.style.background = 'var(--card-bg)'; }}
                >
                  <span>{v.name}</span>
                  {v.place && <span style={{ fontSize: '0.75rem', opacity: 0.7 }}>{v.place}</span>}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: Styles */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          
          <div className="glass-card">
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.5rem' }}>
              <Package size={20} color="var(--accent-primary)" />
              <h2 style={{ fontSize: '1.125rem' }}>Style Master</h2>
            </div>

            {styleMsg.text && (
              <div style={{ color: `var(--${styleMsg.type})`, marginBottom: '1rem', fontSize: '0.875rem' }}>
                {styleMsg.text}
              </div>
            )}

            <div className="input-group">
              <label className="input-label">Style Name</label>
              <input 
                type="text" 
                className="input-field" 
                placeholder="E.g., T-Shirt V-Neck" 
                value={styleForm.name}
                onChange={(e) => setStyleForm({...styleForm, name: e.target.value})}
              />
            </div>
            <div className="input-group">
              <label className="input-label">Linked Customer / Vendor</label>
              <select 
                className="input-field" 
                style={{ appearance: 'none', backgroundColor: 'var(--bg-main)' }}
                value={styleForm.vendor_id}
                onChange={(e) => setStyleForm({...styleForm, vendor_id: e.target.value})}
              >
                <option value="">Select Customer...</option>
                {vendors.map(v => (
                  <option key={v.id} value={v.id}>{v.name}</option>
                ))}
              </select>
            </div>
            <button className="btn btn-primary" onClick={handleAddStyle} disabled={loading || !styleForm.name || !styleForm.vendor_id}>
              Save Style
            </button>
          </div>

          <div className="glass-card">
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
              <List size={20} color="var(--accent-primary)" />
              <h2 style={{ fontSize: '1.125rem' }}>
                {selectedVendorId 
                  ? `Styles for ${vendors.find(v => v.id === selectedVendorId)?.name}` 
                  : 'All Styles'}
                {' '}({filteredStyles.length})
              </h2>
            </div>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', maxHeight: '400px', overflowY: 'auto' }}>
              {filteredStyles.length === 0 ? (
                <div style={{ padding: '1rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
                  No styles found.
                </div>
              ) : (
                filteredStyles.map(s => (
                  <div 
                    key={s.id}
                    style={{
                      padding: '0.75rem 1rem',
                      borderRadius: '4px',
                      background: 'var(--card-bg)',
                      border: '1px solid var(--border-color)',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '0.25rem'
                    }}
                  >
                    <div style={{ fontWeight: 'bold' }}>{s.name}</div>
                    {!selectedVendorId && (
                      <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
                        Customer: {s.vendors?.name}
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};

export default MasterData;

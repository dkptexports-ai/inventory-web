import React, { useState, useEffect } from 'react';
import { getVendors } from '../lib/api';
import { Users } from 'lucide-react';

const Vendors = () => {
  const [vendors, setVendors] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      try {
        const v = await getVendors();
        setVendors(v);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  return (
    <div>
      <header className="page-header">
        <h1 className="page-title">Active Vendors</h1>
      </header>
      
      <div className="glass-card" style={{ padding: 0, overflow: 'hidden' }}>
        <div style={{ padding: '1.5rem', borderBottom: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <Users size={20} color="var(--accent-primary)" />
          <h2 style={{ fontSize: '1.125rem' }}>Vendor Directory</h2>
        </div>
        <div className="table-container" style={{ border: 'none', borderRadius: 0 }}>
          <table>
            <thead>
              <tr>
                <th>Vendor ID</th>
                <th>Vendor Name</th>
                <th>Created At</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan="3" style={{ textAlign: 'center' }}>Loading vendors...</td></tr>
              ) : vendors.length === 0 ? (
                <tr><td colSpan="3" style={{ textAlign: 'center' }}>No vendors found</td></tr>
              ) : (
                vendors.map(v => (
                  <tr key={v.id}>
                    <td>{v.id.substring(0, 8)}...</td>
                    <td><span style={{ fontWeight: 500, color: '#fff' }}>{v.name}</span></td>
                    <td>{new Date(v.created_at).toLocaleDateString()}</td>
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

export default Vendors;

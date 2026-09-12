import React, { useState, useEffect } from 'react';
import { getStyles } from '../lib/api';
import { Package, ExternalLink } from 'lucide-react';
import { Link } from 'react-router-dom';

const Styles = () => {
  const [styles, setStyles] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      try {
        const s = await getStyles();
        setStyles(s);
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
        <h1 className="page-title">Total Styles</h1>
      </header>
      
      <div className="glass-card" style={{ padding: 0, overflow: 'hidden' }}>
        <div style={{ padding: '1.5rem', borderBottom: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <Package size={20} color="var(--accent-primary)" />
          <h2 style={{ fontSize: '1.125rem' }}>Styles Directory</h2>
        </div>
        <div className="table-container" style={{ border: 'none', borderRadius: 0 }}>
          <table>
            <thead>
              <tr>
                <th>Style Name</th>
                <th>Customer / Vendor</th>
                <th>Unit</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan="4" style={{ textAlign: 'center' }}>Loading styles...</td></tr>
              ) : styles.length === 0 ? (
                <tr><td colSpan="4" style={{ textAlign: 'center' }}>No styles found</td></tr>
              ) : (
                styles.map(s => (
                  <tr key={s.id}>
                    <td>
                      <Link to={`/styles/${s.id}`} style={{ color: 'var(--accent-primary)', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 600 }}>
                        {s.name} <ExternalLink size={14} />
                      </Link>
                    </td>
                    <td>{s.vendors?.name || '-'}</td>
                    <td>{s.unit}</td>
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

export default Styles;

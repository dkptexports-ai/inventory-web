import React, { useState, useEffect } from 'react';
import { getStylesWithBalances } from '../lib/api';
import { Package, ExternalLink } from 'lucide-react';
import { Link } from 'react-router-dom';

const Styles = () => {
  const [styles, setStyles] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      try {
        const s = await getStylesWithBalances();
        const sortedStyles = [...s].sort((a, b) => {
          const vendorA = (a.vendors?.name || '').toLowerCase();
          const vendorB = (b.vendors?.name || '').toLowerCase();
          if (vendorA < vendorB) return -1;
          if (vendorA > vendorB) return 1;
          
          const styleA = (a.name || '').toString();
          const styleB = (b.name || '').toString();
          return styleA.localeCompare(styleB, undefined, { numeric: true, sensitivity: 'base' });
        });
        setStyles(sortedStyles);
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
                <th>Total IN</th>
                <th>Total OUT</th>
                <th>Balance</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan="6" style={{ textAlign: 'center' }}>Loading styles...</td></tr>
              ) : styles.length === 0 ? (
                <tr><td colSpan="6" style={{ textAlign: 'center' }}>No styles found</td></tr>
              ) : (
                styles.map(s => (
                  <tr key={s.id}>
                    <td>
                      <Link to={`/styles/${s.id}`} style={{ color: 'var(--accent-primary)', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 600 }}>
                        {s.name} <ExternalLink size={14} />
                      </Link>
                    </td>
                    <td>{s.vendors?.name || '-'}</td>
                    <td><span className="badge badge-success">{s.stats?.in || 0}</span></td>
                    <td><span className="badge badge-warning">{s.stats?.out || 0}</span></td>
                    <td>
                      <span className={`badge ${s.stats?.bal > 0 ? 'badge-primary' : 'badge-neutral'}`} style={{ fontSize: '1rem', padding: '0.4rem 0.8rem' }}>
                        {s.stats?.bal || 0}
                      </span>
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

export default Styles;

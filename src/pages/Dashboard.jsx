import React, { useState, useEffect } from 'react';
import { Package, Users, FileText, ArrowRightLeft } from 'lucide-react';
import { getDashboardStats, getRecentTransactions } from '../lib/api';
import { Link } from 'react-router-dom';

const Dashboard = () => {
  const [stats, setStats] = useState({ vendors: 0, styles: 0, pendingBills: 0 });
  const [recent, setRecent] = useState([]);

  useEffect(() => {
    async function loadData() {
      try {
        const s = await getDashboardStats();
        setStats(s);
        const r = await getRecentTransactions(5);
        setRecent(r);
      } catch (err) {
        console.error(err);
      }
    }
    loadData();
  }, []);

  return (
    <div>
      <header className="page-header">
        <h1 className="page-title">Dashboard Overview</h1>
        <Link to="/transactions" className="btn btn-primary" style={{ textDecoration: 'none' }}>
          <ArrowRightLeft size={16} />
          New Transaction
        </Link>
      </header>

      <div className="dashboard-grid">
        <div className="glass-card stat-card">
          <div className="stat-icon" style={{ background: 'rgba(99, 102, 241, 0.1)', color: '#6366f1' }}>
            <Package size={24} />
          </div>
          <div className="stat-info">
            <h3>Total Styles</h3>
            <p>{stats.styles}</p>
          </div>
        </div>
        
        <div className="glass-card stat-card">
          <div className="stat-icon" style={{ background: 'rgba(16, 185, 129, 0.1)', color: '#10b981' }}>
            <Users size={24} />
          </div>
          <div className="stat-info">
            <h3>Active Vendors</h3>
            <p>{stats.vendors}</p>
          </div>
        </div>
        
        <div className="glass-card stat-card">
          <div className="stat-icon" style={{ background: 'rgba(245, 158, 11, 0.1)', color: '#f59e0b' }}>
            <FileText size={24} />
          </div>
          <div className="stat-info">
            <h3>Pending Bills</h3>
            <p>{stats.pendingBills}</p>
          </div>
        </div>
      </div>

      <div className="glass-card" style={{ padding: '0', overflow: 'hidden' }}>
        <div style={{ padding: '1.5rem', borderBottom: '1px solid var(--border-color)' }}>
          <h2 style={{ fontSize: '1.125rem', fontWeight: '600' }}>Recent Inventory Status</h2>
        </div>
        <div className="table-container" style={{ border: 'none', borderRadius: '0' }}>
          <table>
            <thead>
              <tr>
                <th>Vendor</th>
                <th>Style</th>
                <th>Challan No.</th>
                <th>IN</th>
                <th>OUT</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {recent.length === 0 ? (
                <tr><td colSpan="6" style={{ textAlign: 'center' }}>No records found</td></tr>
              ) : (
                recent.map(t => (
                  <tr key={t.id}>
                    <td>{t.styles?.vendors?.name}</td>
                    <td>{t.styles?.name}</td>
                    <td>{t.challan_no || '-'}</td>
                    <td>{t.inward_qty}</td>
                    <td>{t.outward_qty}</td>
                    <td>
                      {t.bill_status === 'Pending' ? (
                        <span className="badge badge-warning">Pending</span>
                      ) : (
                        <span className="badge badge-success">Billed</span>
                      )}
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

export default Dashboard;

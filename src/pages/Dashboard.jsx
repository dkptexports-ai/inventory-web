import React from 'react';
import { Package, Users, FileText, ArrowRightLeft } from 'lucide-react';

const Dashboard = () => {
  return (
    <div>
      <header className="page-header">
        <h1 className="page-title">Dashboard Overview</h1>
        <button className="btn btn-primary">
          <ArrowRightLeft size={16} />
          New Transaction
        </button>
      </header>

      <div className="dashboard-grid">
        <div className="glass-card stat-card">
          <div className="stat-icon" style={{ background: 'rgba(99, 102, 241, 0.1)', color: '#6366f1' }}>
            <Package size={24} />
          </div>
          <div className="stat-info">
            <h3>Total Styles</h3>
            <p>128</p>
          </div>
        </div>
        
        <div className="glass-card stat-card">
          <div className="stat-icon" style={{ background: 'rgba(16, 185, 129, 0.1)', color: '#10b981' }}>
            <Users size={24} />
          </div>
          <div className="stat-info">
            <h3>Active Vendors</h3>
            <p>45</p>
          </div>
        </div>
        
        <div className="glass-card stat-card">
          <div className="stat-icon" style={{ background: 'rgba(245, 158, 11, 0.1)', color: '#f59e0b' }}>
            <FileText size={24} />
          </div>
          <div className="stat-info">
            <h3>Pending Bills</h3>
            <p>12</p>
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
                <th>Inward Qty</th>
                <th>Outward Qty</th>
                <th>Balance</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>AMAN EMBROIDERY</td>
                <td>HOW LUCKY ARE WE (RAJ)</td>
                <td>CH-1002</td>
                <td>1006</td>
                <td>500</td>
                <td><span style={{ color: 'var(--success)' }}>506</span></td>
                <td><span className="badge badge-warning">Pending</span></td>
              </tr>
              <tr>
                <td>Aman Ashoka</td>
                <td>Ashoka 60x61</td>
                <td>CH-0985</td>
                <td>466</td>
                <td>466</td>
                <td>0</td>
                <td><span className="badge badge-success">Billed</span></td>
              </tr>
              <tr>
                <td>Cra Tree</td>
                <td>CRA-55</td>
                <td>CH-1044</td>
                <td>200</td>
                <td>0</td>
                <td><span style={{ color: 'var(--success)' }}>200</span></td>
                <td><span className="badge badge-neutral">In Process</span></td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;

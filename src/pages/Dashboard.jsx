import React, { useState, useEffect } from 'react';
import { Package, Users, FileText, ArrowRightLeft, TrendingUp } from 'lucide-react';
import { getDashboardStats, getRecentTransactions } from '../lib/api';
import { Link } from 'react-router-dom';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, AreaChart, Area } from 'recharts';

const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    return (
      <div style={{ background: 'rgba(10, 12, 16, 0.9)', border: '1px solid var(--border-color)', padding: '1rem', borderRadius: '8px', backdropFilter: 'blur(10px)' }}>
        <p style={{ color: '#fff', marginBottom: '0.5rem', fontWeight: 600 }}>{label}</p>
        {payload.map((entry, index) => (
          <p key={index} style={{ color: entry.color, margin: 0 }}>
            {entry.name}: {entry.value}
          </p>
        ))}
      </div>
    );
  }
  return null;
};

const Dashboard = () => {
  const [stats, setStats] = useState({ vendors: 0, styles: 0, pendingBills: 0 });
  const [recent, setRecent] = useState([]);
  const [chartData, setChartData] = useState([]);

  useEffect(() => {
    async function loadData() {
      try {
        const s = await getDashboardStats();
        setStats(s);
        const r = await getRecentTransactions(10);
        setRecent(r);
        
        // Prepare chart data from recent transactions (reversed to show chronological)
        const cData = r.slice().reverse().map((t) => ({
          name: new Date(t.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
          IN: Number(t.inward_qty) || 0,
          OUT: Number(t.outward_qty) || 0,
          productStyle: t.styles?.name || 'Unknown'
        }));
        setChartData(cData.length > 0 ? cData : [
          { name: 'Mon', IN: 400, OUT: 240 },
          { name: 'Tue', IN: 300, OUT: 139 },
          { name: 'Wed', IN: 200, OUT: 980 },
          { name: 'Thu', IN: 278, OUT: 390 },
          { name: 'Fri', IN: 189, OUT: 480 },
        ]);
        
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
        <Link to="/styles" className="glass-card stat-card" style={{ textDecoration: 'none', color: 'inherit' }}>
          <div className="stat-icon" style={{ background: 'rgba(14, 165, 233, 0.1)', color: 'var(--accent-primary)', boxShadow: '0 0 15px rgba(14,165,233,0.2)' }}>
            <Package size={24} />
          </div>
          <div className="stat-info">
            <h3>Total Styles</h3>
            <p style={{ textShadow: '0 0 10px rgba(14,165,233,0.3)' }}>{stats.styles}</p>
          </div>
        </Link>
        
        <Link to="/master" className="glass-card stat-card" style={{ textDecoration: 'none', color: 'inherit' }}>
          <div className="stat-icon" style={{ background: 'rgba(46, 160, 67, 0.1)', color: 'var(--success)', boxShadow: '0 0 15px rgba(46,160,67,0.2)' }}>
            <Users size={24} />
          </div>
          <div className="stat-info">
            <h3>Active Customers</h3>
            <p style={{ textShadow: '0 0 10px rgba(46,160,67,0.3)' }}>{stats.vendors}</p>
          </div>
        </Link>
        
        <Link to="/billing" className="glass-card stat-card" style={{ textDecoration: 'none', color: 'inherit' }}>
          <div className="stat-icon" style={{ background: 'rgba(210, 153, 34, 0.1)', color: 'var(--warning)', boxShadow: '0 0 15px rgba(210,153,34,0.2)' }}>
            <FileText size={24} />
          </div>
          <div className="stat-info">
            <h3>Pending Bills</h3>
            <p style={{ textShadow: '0 0 10px rgba(210,153,34,0.3)' }}>{stats.pendingBills}</p>
          </div>
        </Link>
      </div>

      {/* Charts Section */}
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '1.5rem', marginBottom: '2rem' }}>
        <div className="glass-card">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.5rem' }}>
            <TrendingUp size={20} color="var(--accent-primary)" />
            <h2 style={{ fontSize: '1.125rem' }}>Inventory Flow (IN vs OUT)</h2>
          </div>
          <div style={{ width: '100%', height: 300 }}>
            <ResponsiveContainer>
              <AreaChart data={chartData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorIn" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="var(--success)" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="var(--success)" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="colorOut" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="var(--danger)" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="var(--danger)" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <XAxis dataKey="name" stroke="var(--text-muted)" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis stroke="var(--text-muted)" fontSize={12} tickLine={false} axisLine={false} />
                <Tooltip content={<CustomTooltip />} />
                <Legend iconType="circle" />
                <Area type="monotone" dataKey="IN" stroke="var(--success)" strokeWidth={3} fillOpacity={1} fill="url(#colorIn)" />
                <Area type="monotone" dataKey="OUT" stroke="var(--danger)" strokeWidth={3} fillOpacity={1} fill="url(#colorOut)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="glass-card">
          <h2 style={{ fontSize: '1.125rem', marginBottom: '1.5rem' }}>Recent Volume</h2>
          <div style={{ width: '100%', height: 300 }}>
            <ResponsiveContainer>
              <BarChart data={chartData.slice(-5)} margin={{ top: 10, right: 0, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                <XAxis dataKey="name" stroke="var(--text-muted)" fontSize={10} tickLine={false} axisLine={false} />
                <YAxis stroke="var(--text-muted)" fontSize={10} tickLine={false} axisLine={false} />
                <Tooltip content={<CustomTooltip />} cursor={{fill: 'rgba(255,255,255,0.05)'}} />
                <Bar dataKey="IN" fill="var(--success)" radius={[4, 4, 0, 0]} />
                <Bar dataKey="OUT" fill="var(--danger)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
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
                <th>Customer / Vendor</th>
                <th>Style</th>
                <th>Challan No.</th>
                <th>Batch / Lot</th>
                <th>IN</th>
                <th>OUT</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {recent.length === 0 ? (
                <tr><td colSpan="7" style={{ textAlign: 'center' }}>No records found</td></tr>
              ) : (
                recent.map(t => (
                  <tr key={t.id}>
                    <td>{t.styles?.vendors?.name}</td>
                    <td>{t.styles?.name}</td>
                    <td>{t.challan_no || '-'}</td>
                    <td><span className="badge badge-neutral">{t.batch_no || '-'}</span></td>
                    <td style={{ color: 'var(--success)' }}>{t.inward_qty > 0 ? `+${t.inward_qty}` : '-'}</td>
                    <td style={{ color: 'var(--danger)' }}>{t.outward_qty > 0 ? `-${t.outward_qty}` : '-'}</td>
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

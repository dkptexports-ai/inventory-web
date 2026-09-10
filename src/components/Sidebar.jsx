import React from 'react';
import { NavLink } from 'react-router-dom';
import { LayoutDashboard, ArrowRightLeft, FileText, Settings } from 'lucide-react';

const Sidebar = () => {
  return (
    <aside className="sidebar">
      <div className="sidebar-logo">
        <div style={{ background: 'var(--accent-primary)', padding: '0.5rem', borderRadius: '0.5rem' }}>
          <LayoutDashboard size={20} color="#fff" />
        </div>
        InventoryPro
      </div>
      
      <nav className="sidebar-nav">
        <NavLink 
          to="/" 
          className={({ isActive }) => isActive ? 'nav-item active' : 'nav-item'}
        >
          <LayoutDashboard size={18} />
          Dashboard
        </NavLink>
        
        <NavLink 
          to="/transactions" 
          className={({ isActive }) => isActive ? 'nav-item active' : 'nav-item'}
        >
          <ArrowRightLeft size={18} />
          Transactions
        </NavLink>
        
        <NavLink 
          to="/billing" 
          className={({ isActive }) => isActive ? 'nav-item active' : 'nav-item'}
        >
          <FileText size={18} />
          Billing Manager
        </NavLink>
      </nav>
      
      <div style={{ marginTop: 'auto' }}>
        <button className="nav-item" style={{ width: '100%', background: 'transparent', border: 'none', cursor: 'pointer', textAlign: 'left' }}>
          <Settings size={18} />
          Settings
        </button>
      </div>
    </aside>
  );
};

export default Sidebar;

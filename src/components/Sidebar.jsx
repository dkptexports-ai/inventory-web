import React from 'react';
import { NavLink } from 'react-router-dom';
import { LayoutDashboard, ArrowRightLeft, FileText, Settings, Users, Package, CalendarDays, IndianRupee, LogOut, Wallet, Receipt, ShoppingCart, PieChart, Briefcase } from 'lucide-react';

const Sidebar = ({ onLogout }) => {
  return (
    <aside className="sidebar">
      <div className="sidebar-logo">
        <img src="/logo.png" alt="DKPT" className="brand-logo" />
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
          to="/styles" 
          className={({ isActive }) => isActive ? 'nav-item active' : 'nav-item'}
        >
          <Package size={18} />
          Styles
        </NavLink>
        
        <NavLink 
          to="/employees" 
          className={({ isActive }) => isActive ? 'nav-item active' : 'nav-item'}
        >
          <Users size={18} />
          Employees
        </NavLink>

        <NavLink 
          to="/attendance" 
          className={({ isActive }) => isActive ? 'nav-item active' : 'nav-item'}
        >
          <CalendarDays size={18} />
          Attendance
        </NavLink>

        <NavLink 
          to="/salary" 
          className={({ isActive }) => isActive ? 'nav-item active' : 'nav-item'}
        >
          <IndianRupee size={18} />
          Salary
        </NavLink>

        <NavLink 
          to="/expenses" 
          className={({ isActive }) => isActive ? 'nav-item active' : 'nav-item'}
        >
          <Wallet size={18} />
          Expenses
        </NavLink>
        
        <NavLink 
          to="/receipts" 
          className={({ isActive }) => isActive ? 'nav-item active' : 'nav-item'}
        >
          <Receipt size={18} />
          Receipts
        </NavLink>

        <NavLink 
          to="/purchases" 
          className={({ isActive }) => isActive ? 'nav-item active' : 'nav-item'}
        >
          <ShoppingCart size={18} />
          Purchases
        </NavLink>

        <NavLink 
          to="/pnl" 
          className={({ isActive }) => isActive ? 'nav-item active' : 'nav-item'}
        >
          <PieChart size={18} />
          Profit & Loss
        </NavLink>

        <NavLink 
          to="/partner" 
          className={({ isActive }) => isActive ? 'nav-item active' : 'nav-item'}
        >
          <Briefcase size={18} />
          Partner (Karambir)
        </NavLink>
        
        <NavLink 
          to="/vendors" 
          className={({ isActive }) => isActive ? 'nav-item active' : 'nav-item'}
        >
          <Users size={18} />
          Vendors
        </NavLink>

        <NavLink 
          to="/master" 
          className={({ isActive }) => isActive ? 'nav-item active' : 'nav-item'}
        >
          <Settings size={18} />
          Master Data
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
      
      <div style={{ marginTop: 'auto', display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
        <button className="nav-item" style={{ width: '100%', background: 'transparent', border: 'none', cursor: 'pointer', textAlign: 'left' }}>
          <Settings size={18} />
          Settings
        </button>
        <button onClick={onLogout} className="nav-item" style={{ width: '100%', background: 'transparent', border: 'none', cursor: 'pointer', textAlign: 'left', color: 'var(--danger)' }}>
          <LogOut size={18} />
          Sign Out
        </button>
      </div>
    </aside>
  );
};

export default Sidebar;

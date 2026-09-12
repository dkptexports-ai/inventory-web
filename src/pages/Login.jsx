import React, { useState } from 'react';

const Login = ({ onLogin }) => {
  const [userId, setUserId] = useState('');
  const [password, setPassword] = useState('');

  const handleLogin = (e) => {
    e.preventDefault();
    
    // Hardcoded 3 users as requested
    const users = {
      'admin': 'admin123',
      'manager': 'manager123',
      'staff': 'staff123'
    };

    if (users[userId] && users[userId] === password) {
      onLogin(userId);
    } else {
      alert('Invalid User ID or Password!');
    }
  };

  return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', width: '100vw', backgroundColor: 'var(--bg-main)' }}>
      <div className="glass-card" style={{ width: '400px', padding: '2rem' }}>
        <h2 style={{ marginBottom: '1.5rem', textAlign: 'center' }}>System Login</h2>
        <form onSubmit={handleLogin}>
          <div className="input-group">
            <label className="input-label">User ID (admin, manager, staff)</label>
            <input type="text" className="input-field" value={userId} onChange={e => setUserId(e.target.value)} required />
          </div>
          <div className="input-group">
            <label className="input-label">Password</label>
            <input type="password" className="input-field" value={password} onChange={e => setPassword(e.target.value)} required />
          </div>
          <button type="submit" className="btn btn-primary" style={{ width: '100%', marginTop: '1rem' }}>Sign In</button>
        </form>
      </div>
    </div>
  );
};

export default Login;

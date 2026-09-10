import React from 'react';

const Transactions = () => {
  return (
    <div>
      <header className="page-header">
        <h1 className="page-title">Transaction Manager</h1>
      </header>
      
      <div className="dashboard-grid" style={{ gridTemplateColumns: '1fr 2fr' }}>
        <div className="glass-card">
          <h2 style={{ marginBottom: '1.5rem', fontSize: '1.125rem' }}>Add New Entry</h2>
          
          <div className="input-group">
            <label className="input-label">Select Vendor</label>
            <select className="input-field" style={{ appearance: 'none', backgroundColor: 'var(--bg-main)' }}>
              <option>Select Vendor...</option>
              <option>AMAN EMBROIDERY</option>
              <option>Aman Ashoka</option>
            </select>
          </div>
          
          <div className="input-group">
            <label className="input-label">Style / Product</label>
            <input type="text" className="input-field" placeholder="E.g., A Lucky or Type new style..." />
          </div>
          
          <div className="input-group">
            <label className="input-label">Challan Number</label>
            <input type="text" className="input-field" placeholder="CH-XXXX" />
          </div>
          
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div className="input-group">
              <label className="input-label">Inward (IN)</label>
              <input type="number" className="input-field" placeholder="0" />
            </div>
            <div className="input-group">
              <label className="input-label">Outward (OUT)</label>
              <input type="number" className="input-field" placeholder="0" />
            </div>
          </div>
          
          <button className="btn btn-primary" style={{ width: '100%', marginTop: '1rem' }}>
            Save Transaction
          </button>
        </div>
        
        <div className="glass-card" style={{ padding: 0, overflow: 'hidden' }}>
          <div style={{ padding: '1.5rem', borderBottom: '1px solid var(--border-color)' }}>
            <h2 style={{ fontSize: '1.125rem' }}>Recent Activity</h2>
          </div>
          <div className="table-container" style={{ border: 'none', borderRadius: 0 }}>
            <table>
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Challan</th>
                  <th>Style</th>
                  <th>Type</th>
                  <th>Qty</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>Today, 10:30 AM</td>
                  <td>CH-1002</td>
                  <td>HOW LUCKY ARE WE</td>
                  <td><span className="badge badge-success">IN</span></td>
                  <td>1006</td>
                </tr>
                <tr>
                  <td>Yesterday</td>
                  <td>CH-0985</td>
                  <td>Ashoka 60x61</td>
                  <td><span className="badge badge-danger">OUT</span></td>
                  <td>466</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Transactions;

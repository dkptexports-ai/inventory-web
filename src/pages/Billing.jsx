import React from 'react';

const Billing = () => {
  return (
    <div>
      <header className="page-header">
        <h1 className="page-title">Billing & Invoices</h1>
        <button className="btn btn-primary">Generate Invoice</button>
      </header>
      
      <div className="glass-card" style={{ padding: 0, overflow: 'hidden' }}>
        <div style={{ padding: '1.5rem', borderBottom: '1px solid var(--border-color)', display: 'flex', gap: '1rem' }}>
          <input type="text" className="input-field" placeholder="Search Challan No..." style={{ maxWidth: '300px' }} />
          <select className="input-field" style={{ maxWidth: '200px' }}>
            <option>All Status</option>
            <option>Pending</option>
            <option>Billed</option>
          </select>
        </div>
        
        <div className="table-container" style={{ border: 'none', borderRadius: 0 }}>
          <table>
            <thead>
              <tr>
                <th>Challan No.</th>
                <th>Vendor</th>
                <th>Style</th>
                <th>Total Out Qty</th>
                <th>Invoice No.</th>
                <th>Amount</th>
                <th>Status</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>CH-1002</td>
                <td>AMAN EMBROIDERY</td>
                <td>HOW LUCKY ARE WE</td>
                <td>1006</td>
                <td>-</td>
                <td>-</td>
                <td><span className="badge badge-warning">Pending</span></td>
                <td><button className="btn btn-secondary" style={{ padding: '0.25rem 0.75rem', fontSize: '0.75rem' }}>Mark Billed</button></td>
              </tr>
              <tr>
                <td>CH-0985</td>
                <td>Aman Ashoka</td>
                <td>Ashoka 60x61</td>
                <td>466</td>
                <td>INV-2026-001</td>
                <td>₹12,500</td>
                <td><span className="badge badge-success">Billed</span></td>
                <td><button className="btn btn-secondary" style={{ padding: '0.25rem 0.75rem', fontSize: '0.75rem' }}>View</button></td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default Billing;

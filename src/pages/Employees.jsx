import React, { useState, useEffect } from 'react';
import { getEmployees, addEmployee, updateEmployee } from '../lib/api';

const Employees = () => {
  const [employees, setEmployees] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);

  const [formData, setFormData] = useState({
    name: '',
    role: '',
    salary_type: 'fixed',
    basic_salary: '',
    has_full_duty_allowance: false,
    ot_enabled: false,
    is_active: true,
    left_date: '',
    rejoin_date: ''
  });

  useEffect(() => {
    loadEmployees();
  }, []);

  const loadEmployees = async () => {
    try {
      const data = await getEmployees();
      setEmployees(data || []);
    } catch (err) {
      console.error(err);
      alert('Failed to load employees');
    }
  };

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const openFormForAdd = () => {
    setEditingId(null);
    setFormData({
      name: '',
      role: '',
      salary_type: 'fixed',
      basic_salary: '',
      has_full_duty_allowance: false,
      ot_enabled: false,
      is_active: true,
      left_date: '',
      rejoin_date: ''
    });
    setShowForm(true);
  };

  const openFormForEdit = (emp) => {
    setEditingId(emp.id);
    setFormData({
      name: emp.name,
      role: emp.role || '',
      salary_type: emp.salary_type || 'fixed',
      basic_salary: emp.basic_salary || '',
      has_full_duty_allowance: emp.has_full_duty_allowance || false,
      ot_enabled: emp.ot_enabled || false,
      is_active: emp.is_active !== false,
      left_date: emp.left_date || '',
      rejoin_date: emp.rejoin_date || ''
    });
    setShowForm(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        name: formData.name,
        role: formData.role,
        salary_type: formData.salary_type,
        has_full_duty_allowance: formData.has_full_duty_allowance,
        ot_enabled: formData.ot_enabled,
        basic_salary: Number(formData.basic_salary) || 0,
        is_active: formData.is_active,
        left_date: formData.left_date || null,
        rejoin_date: formData.rejoin_date || null
      };

      if (editingId) {
        await updateEmployee(editingId, payload);
      } else {
        await addEmployee(payload);
      }
      
      setShowForm(false);
      loadEmployees();
    } catch (err) {
      console.error(err);
      alert('Failed to save employee');
    }
  };

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Employees Management</h1>
        <button className="btn btn-primary" onClick={showForm ? () => setShowForm(false) : openFormForAdd}>
          {showForm ? 'Cancel' : 'Add Employee'}
        </button>
      </div>

      {showForm && (
        <div className="glass-card" style={{ marginBottom: '2rem' }}>
          <h3>{editingId ? 'Edit Employee' : 'Add New Employee'}</h3>
          <form onSubmit={handleSubmit} style={{ marginTop: '1rem', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div className="input-group">
              <label className="input-label">Employee Name</label>
              <input type="text" name="name" className="input-field" value={formData.name} onChange={handleInputChange} required />
            </div>

            <div className="input-group">
              <label className="input-label">Role / Designation</label>
              <input type="text" name="role" className="input-field" value={formData.role} onChange={handleInputChange} />
            </div>
            
            <div className="input-group">
              <label className="input-label">Salary Type</label>
              <select name="salary_type" className="input-field" value={formData.salary_type} onChange={handleInputChange}>
                <option value="plus">Plus (Eligible for Weekly Off)</option>
                <option value="fixed">Fixed (No Weekly Off)</option>
              </select>
            </div>

            <div className="input-group">
              <label className="input-label">Basic Salary (per month)</label>
              <input type="number" name="basic_salary" className="input-field" value={formData.basic_salary} onChange={handleInputChange} />
            </div>

            <div className="input-group" style={{ gridColumn: '1 / -1', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <label className="input-label" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                <input type="checkbox" name="has_full_duty_allowance" id="fda" checked={formData.has_full_duty_allowance} onChange={handleInputChange} style={{ width: '16px', height: '16px' }} />
                Has Full Duty Allowance (₹100/day)
              </label>
              <label className="input-label" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                <input type="checkbox" name="ot_enabled" id="ot" checked={formData.ot_enabled} onChange={handleInputChange} style={{ width: '16px', height: '16px' }} />
                Enable Auto-OT (0.5 Hr per Present / 1 Hr per Double)
              </label>
              <label className="input-label" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', marginTop: '1rem' }}>
                <input type="checkbox" name="is_active" id="active" checked={formData.is_active} onChange={handleInputChange} style={{ width: '16px', height: '16px' }} />
                Currently Active (Uncheck if Left)
              </label>
            </div>

            {!formData.is_active && (
              <div className="input-group">
                <label className="input-label">Left Date</label>
                <input type="date" name="left_date" className="input-field" value={formData.left_date} onChange={handleInputChange} />
              </div>
            )}

            {formData.is_active && formData.left_date && (
              <div className="input-group">
                <label className="input-label">Rejoin Date</label>
                <input type="date" name="rejoin_date" className="input-field" value={formData.rejoin_date} onChange={handleInputChange} />
              </div>
            )}

            <div style={{ gridColumn: '1 / -1', display: 'flex', justifyContent: 'flex-end' }}>
              <button type="submit" className="btn btn-primary">{editingId ? 'Update Employee' : 'Save Employee'}</button>
            </div>
          </form>
        </div>
      )}

      <div className="table-container">
        <table>
          <thead>
            <tr>
              <th>Name</th>
              <th>Role</th>
              <th>Status</th>
              <th>Salary Type</th>
              <th>Full Duty</th>
              <th>Auto-OT</th>
              <th>Basic Salary</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {employees.length === 0 ? (
              <tr>
                <td colSpan="8" style={{ textAlign: 'center' }}>No employees found. Add one above.</td>
              </tr>
            ) : (
              employees.map(emp => (
                <tr key={emp.id} style={{ opacity: emp.is_active === false ? 0.6 : 1 }}>
                  <td style={{ fontWeight: 600 }}>{emp.name}</td>
                  <td>{emp.role || '-'}</td>
                  <td>
                    {emp.is_active === false ? (
                      <span className="badge badge-danger">Left ({emp.left_date || 'N/A'})</span>
                    ) : (
                      <span className="badge badge-success">Active</span>
                    )}
                  </td>
                  <td>
                    <span className={`badge ${emp.salary_type === 'plus' ? 'badge-success' : 'badge-neutral'}`}>
                      {emp.salary_type.toUpperCase()}
                    </span>
                  </td>
                  <td>
                    {emp.has_full_duty_allowance ? (
                      <span className="badge badge-success">Enabled</span>
                    ) : (
                      <span className="badge badge-neutral">Disabled</span>
                    )}
                  </td>
                  <td>
                    {emp.ot_enabled ? (
                      <span className="badge badge-success">Enabled</span>
                    ) : (
                      <span className="badge badge-neutral">Disabled</span>
                    )}
                  </td>
                  <td>₹{emp.basic_salary}</td>
                  <td>
                    <button className="btn btn-secondary" style={{ padding: '0.2rem 0.6rem', fontSize: '0.75rem' }} onClick={() => openFormForEdit(emp)}>
                      Edit
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default Employees;

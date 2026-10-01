import React, { useState, useEffect } from 'react';
import { getEmployees, getAttendance, getAttendanceByDate, saveAttendance, getCompanies } from '../lib/api';

const Attendance = () => {
  const [employees, setEmployees] = useState([]);
  const [companies, setCompanies] = useState([]);
  const [attendanceData, setAttendanceData] = useState({}); // { employeeId_date: { status, company_id, production, ot } }
  
  const [month, setMonth] = useState(new Date().getMonth() + 1);
  const [year, setYear] = useState(new Date().getFullYear());
  
  const [useDateRange, setUseDateRange] = useState(false);
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  
  const [filterCompanyId, setFilterCompanyId] = useState('');
  
  const [mode, setMode] = useState('grid'); // 'grid' or 'daily'
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [dailyData, setDailyData] = useState({});
  const [isDateLoaded, setIsDateLoaded] = useState(false);
  
  // Calculate dynamic days array based on Date Range or Month
  const [gridDays, setGridDays] = useState([]);

  useEffect(() => {
    if (mode === 'grid') {
      loadData();
    }
  }, [month, year, useDateRange, fromDate, toDate, filterCompanyId, mode]);

  useEffect(() => {
    if (mode === 'daily') {
      setIsDateLoaded(false);
      setDailyData({}); // Clear unsaved daily data on date change
    }
  }, [selectedDate, mode, filterCompanyId]);

  const loadData = async () => {
    try {
      const [empData, compData] = await Promise.all([
        getEmployees(),
        getCompanies()
      ]);
      setEmployees(empData || []);
      setCompanies(compData || []);
      
      let attData = [];
      let calculatedDays = [];
      
      if (useDateRange && fromDate && toDate) {
        attData = await getAttendanceByDate(fromDate, toDate);
        
        let curr = new Date(fromDate);
        const end = new Date(toDate);
        while (curr <= end) {
          calculatedDays.push(curr.toISOString().split('T')[0]);
          curr.setDate(curr.getDate() + 1);
        }
      } else {
        attData = await getAttendance(month, year);
        const daysInMonth = new Date(year, month, 0).getDate();
        calculatedDays = Array.from({ length: daysInMonth }, (_, i) => 
          `${year}-${String(month).padStart(2, '0')}-${String(i + 1).padStart(2, '0')}`
        );
      }
      
      setGridDays(calculatedDays);
      
      if (filterCompanyId) {
        attData = attData.filter(a => a.company_id === filterCompanyId);
      }
      
      const attMap = {};
      const dailyMap = {};
      (attData || []).forEach(record => {
        attMap[`${record.employee_id}_${record.date}`] = record;
        
        if (record.date === selectedDate) {
          dailyMap[record.employee_id] = record;
        }
      });
      setAttendanceData(attMap);
      setDailyData(dailyMap);
    } catch (err) {
      console.error(err);
      alert('Failed to load data');
    }
  };

  const handleLoadDaily = async () => {
    await loadData();
    setIsDateLoaded(true);
  };

  const handleCellClick = (employee, dateStr) => {
    const currentStatus = attendanceData[`${employee.id}_${dateStr}`]?.status || 'absent';
    
    // Cycle through P -> A -> H -> D -> F
    const nextStatus = currentStatus === 'absent' ? 'present' : 
                       currentStatus === 'present' ? 'half' :
                       currentStatus === 'half' ? 'double' :
                       currentStatus === 'double' ? 'fine' : 'absent';
    
    setAttendanceData(prev => ({
      ...prev,
      [`${employee.id}_${dateStr}`]: {
        ...prev[`${employee.id}_${dateStr}`],
        employee_id: employee.id,
        date: dateStr,
        status: nextStatus
      }
    }));
  };

  const handleSaveGrid = async () => {
    const records = Object.values(attendanceData).filter(record => record.status);
    try {
      await saveAttendance(records);
      alert('Grid Attendance saved successfully');
    } catch (err) {
      console.error(err);
      alert('Failed to save grid attendance: ' + (err.message || JSON.stringify(err)));
    }
  };

  const handleDailyChange = (empId, field, value) => {
    setDailyData(prev => ({
      ...prev,
      [empId]: {
        ...prev[empId],
        employee_id: empId,
        date: selectedDate,
        [field]: value
      }
    }));
  };

  const handleSaveDaily = async () => {
    if (!isDateLoaded) {
      alert("Please load date first before saving.");
      return;
    }
    const records = Object.values(dailyData).filter(record => record.status);
    try {
      await saveAttendance(records);
      alert('Daily Attendance saved successfully');
      loadData();
    } catch (err) {
      console.error(err);
      alert('Failed to save daily entries: ' + (err.message || JSON.stringify(err)));
    }
  };

  const getStatusInitial = (status) => {
    switch (status) {
      case 'present': return 'P';
      case 'absent': return 'A';
      case 'half': return 'H';
      case 'double': return 'D';
      case 'fine': return 'F';
      default: return '';
    }
  };

  const parseStatusInitial = (initial) => {
    switch (initial.toUpperCase()) {
      case 'P': return 'present';
      case 'A': return 'absent';
      case 'H': return 'half';
      case 'D': return 'double';
      case 'F': return 'fine';
      default: return '';
    }
  }
  
  const getCompanyInitial = (companyId) => {
    if (!companyId) return '';
    if (['G', 'P', 'T'].includes(companyId)) return companyId; // fallback
    const comp = companies.find(c => c.id === companyId);
    if (!comp) return '';
    const name = comp.name.toLowerCase();
    if (name.includes('ganaur') || name.startsWith('g')) return 'G';
    if (name.includes('panipat') || name.startsWith('p')) return 'P';
    if (name.includes('tufting') || name.startsWith('t')) return 'T';
    return name.charAt(0).toUpperCase();
  };

  const parseCompanyInitial = (initial) => {
    const val = initial.toUpperCase();
    let compId = '';
    if (val === 'G') compId = companies.find(c => c.name.toLowerCase().includes('ganaur') || c.name.toLowerCase().startsWith('g'))?.id;
    if (val === 'P') compId = companies.find(c => c.name.toLowerCase().includes('panipat') || c.name.toLowerCase().startsWith('p'))?.id;
    if (val === 'T') compId = companies.find(c => c.name.toLowerCase().includes('tufting') || c.name.toLowerCase().startsWith('t'))?.id;
    return compId || val; // Fallback to 'G'/'P'/'T' string if not found so it shows up in UI at least
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'present': return 'var(--success)';
      case 'absent': return 'var(--danger)';
      case 'half': return 'var(--warning)';
      case 'double': return 'var(--accent-primary)';
      case 'fine': return '#db2777'; 
      default: return 'transparent';
    }
  };

  const handleKeyDown = (e, colName, rowIndex) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      const nextInput = document.querySelector(`input[data-col="${colName}"][data-rowindex="${rowIndex + 1}"]`);
      if (nextInput) {
        nextInput.focus();
        nextInput.select();
      }
    }
  };

  const handleStatusInputChange = (empId, e) => {
    const val = e.target.value.slice(-1).toUpperCase();
    if (val === '' || ['P', 'A', 'H', 'D', 'F'].includes(val)) {
      const statusStr = parseStatusInitial(val);
      handleDailyChange(empId, 'status', statusStr);
    }
  };

  const handleCompanyInputChange = (empId, e) => {
    const val = e.target.value.slice(-1).toUpperCase();
    if (val === '' || ['G', 'P', 'T'].includes(val)) {
      const compId = parseCompanyInitial(val);
      handleDailyChange(empId, 'company_id', compId);
    }
  };

  const isEmployeeActiveForDate = (emp, dateStr) => {
    if (emp.is_active !== false) return true;
    if (emp.left_date && dateStr <= emp.left_date) return true;
    return false;
  };

  const filteredEmployeesGrid = employees.filter(emp => {
    if (filterCompanyId) {
      return Object.values(attendanceData).some(a => a.employee_id === emp.id && a.company_id === filterCompanyId);
    }
    const hasData = Object.values(attendanceData).some(a => a.employee_id === emp.id);
    const hasBalance = (emp.opening_balance || 0) !== 0;
    return hasData || hasBalance;
  });

  const filteredEmployeesDaily = employees.filter(emp => {
    return isEmployeeActiveForDate(emp, selectedDate);
  });

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Attendance Sheet</h1>
        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', flexWrap: 'wrap' }}>
          
          <div>
            <label style={{ fontSize: '0.8rem', display: 'block', color: 'var(--text-light)' }}>
              <input type="checkbox" checked={useDateRange} onChange={e => setUseDateRange(e.target.checked)} style={{ marginRight: '0.3rem' }} />
              Use Custom Period (Date Range)
            </label>
            {useDateRange ? (
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <input type="date" value={fromDate} onChange={e => setFromDate(e.target.value)} className="input-field" style={{ padding: '0.4rem' }} />
                <span style={{ alignSelf: 'center' }}>to</span>
                <input type="date" value={toDate} onChange={e => setToDate(e.target.value)} className="input-field" style={{ padding: '0.4rem' }} />
              </div>
            ) : (
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <select value={month} onChange={e => setMonth(parseInt(e.target.value))} className="input-field" style={{ padding: '0.4rem' }}>
                  {Array.from({ length: 12 }, (_, i) => (
                    <option key={i+1} value={i+1}>{new Date(0, i).toLocaleString('en', { month: 'long' })}</option>
                  ))}
                </select>
                <input type="number" value={year} onChange={e => setYear(parseInt(e.target.value))} className="input-field" style={{ padding: '0.4rem', width: '80px' }} />
              </div>
            )}
          </div>

          <div>
            <label style={{ fontSize: '0.8rem', display: 'block', color: 'var(--text-light)' }}>Company Filter</label>
            <select className="input-field" style={{ padding: '0.4rem', minWidth: '150px' }} value={filterCompanyId} onChange={e => setFilterCompanyId(e.target.value)}>
              <option value="">All Companies</option>
              {companies.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>

          <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1.2rem' }}>
            <button className={`btn ${mode === 'grid' ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setMode('grid')}>Monthly Grid</button>
            <button className={`btn ${mode === 'daily' ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setMode('daily')}>Daily Detailed Entry</button>
          </div>
        </div>
      </div>

      {mode === 'grid' ? (
        <>
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '1rem' }}>
            <button className="btn btn-primary" onClick={handleSaveGrid}>Save Grid Changes</button>
          </div>

          <div className="glass-card" style={{ padding: 0, overflow: 'hidden' }}>
            <div className="table-container" style={{ borderRadius: 0, border: 'none' }}>
              <table style={{ borderCollapse: 'separate', borderSpacing: 0 }}>
                <thead>
                  <tr>
                    <th style={{ position: 'sticky', left: 0, background: '#1e3a8a', zIndex: 10, minWidth: '150px' }}>Employee</th>
                    {gridDays.map(dateStr => {
                      const dayParts = dateStr.split('-');
                      const dayNum = parseInt(dayParts[2], 10);
                      const monthNum = parseInt(dayParts[1], 10);
                      return (
                        <th key={dateStr} style={{ textAlign: 'center', padding: '0.5rem', minWidth: '35px' }}>
                          {dayNum}/{monthNum}
                        </th>
                      );
                    })}
                  </tr>
                </thead>
                <tbody>
                  {filteredEmployeesGrid.map(emp => (
                    <tr key={emp.id}>
                      <td style={{ position: 'sticky', left: 0, background: '#f8fafc', fontWeight: 600, borderRight: '2px solid var(--border-color)', zIndex: 5 }}>
                        {emp.name}
                      </td>
                      {gridDays.map(dateStr => {
                        const status = attendanceData[`${emp.id}_${dateStr}`]?.status;
                        return (
                          <td 
                            key={dateStr}
                            onClick={() => handleCellClick(emp, dateStr)}
                            style={{ 
                              textAlign: 'center', 
                              cursor: 'pointer',
                              background: getStatusColor(status),
                              color: status && status !== 'absent' ? '#fff' : 'inherit',
                              borderBottom: '1px solid var(--border-color)',
                              borderRight: '1px solid var(--border-color)',
                              padding: '0.2rem',
                              userSelect: 'none'
                            }}
                          >
                            {getStatusInitial(status)}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      ) : (
        <>
          <div className="glass-card" style={{ marginBottom: '2rem' }}>
            <div style={{ display: 'flex', gap: '2rem', alignItems: 'flex-end', flexWrap: 'wrap' }}>
              <div className="input-group" style={{ maxWidth: '250px' }}>
                <label className="input-label">Select Date for Entry</label>
                <input type="date" className="input-field" value={selectedDate} onChange={e => setSelectedDate(e.target.value)} />
              </div>
              <button className="btn btn-primary" onClick={handleLoadDaily}>Load Date</button>
              
              <div style={{ background: '#eff6ff', padding: '1rem', borderRadius: '0.5rem', border: '1px solid #bfdbfe', flex: 1, color: '#1e3a8a' }}>
                <strong>Note on Editing:</strong> First select a date and click <strong>Load Date</strong> to fetch existing entries. Then make changes in the table below, use <strong>Enter</strong> to move down, and click <strong>Save Daily Entries</strong> when done.
              </div>
            </div>
          </div>

          {isDateLoaded && (
            <div className="glass-card" style={{ padding: '1rem', overflowX: 'auto' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                <h3>Daily Entries - {selectedDate}</h3>
                <button className="btn btn-primary" onClick={handleSaveDaily}>Save Daily Entries</button>
              </div>
              
              <table className="table-container" style={{ width: '100%', fontSize: '0.85rem' }}>
                <thead>
                  <tr>
                    <th>Employee</th>
                    <th>Days</th>
                    <th>Company</th>
                    <th>Target Qty</th>
                    <th>Prod. Qty</th>
                    <th>OT (Hrs)</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredEmployeesDaily.length === 0 ? (
                    <tr>
                      <td colSpan="6" style={{ textAlign: 'center' }}>No active employees found for this date.</td>
                    </tr>
                  ) : (
                    filteredEmployeesDaily.map((emp, index) => {
                      const entry = dailyData[emp.id] || { status: '', company_id: '', production_target: '', production_qty: '', overtime_hours: '' };
                      return (
                        <tr key={emp.id}>
                          <td style={{ fontWeight: 600 }}>
                            {emp.name}
                            {!emp.is_active && <span className="badge badge-danger" style={{ marginLeft: '0.5rem' }}>Left</span>}
                          </td>
                          <td>
                            <input 
                              type="text" 
                              className="input-field" 
                              style={{ width: '60px', padding: '0.25rem', textAlign: 'center', textTransform: 'uppercase' }} 
                              value={getStatusInitial(entry.status)} 
                              onChange={(e) => handleStatusInputChange(emp.id, e)}
                              onKeyDown={(e) => handleKeyDown(e, 'status', index)}
                              data-col="status"
                              data-rowindex={index}
                            />
                          </td>
                          <td>
                            <input 
                              type="text" 
                              className="input-field" 
                              style={{ width: '80px', padding: '0.25rem', textAlign: 'center', textTransform: 'uppercase' }} 
                              value={getCompanyInitial(entry.company_id)} 
                              onChange={(e) => handleCompanyInputChange(emp.id, e)}
                              onKeyDown={(e) => handleKeyDown(e, 'company_id', index)}
                              data-col="company_id"
                              data-rowindex={index}
                            />
                          </td>
                          <td><input type="number" className="input-field" style={{ width: '90px', padding: '0.25rem' }} placeholder="Target" value={entry.production_target ?? ''} onChange={(e) => handleDailyChange(emp.id, 'production_target', Number(e.target.value))} onKeyDown={(e) => handleKeyDown(e, 'production_target', index)} data-col="production_target" data-rowindex={index} /></td>
                          <td><input type="number" className="input-field" style={{ width: '80px', padding: '0.25rem' }} placeholder="Qty" value={entry.production_qty || ''} onChange={(e) => handleDailyChange(emp.id, 'production_qty', Number(e.target.value))} onKeyDown={(e) => handleKeyDown(e, 'production_qty', index)} data-col="production_qty" data-rowindex={index} /></td>
                          <td><input type="number" className="input-field" style={{ width: '80px', padding: '0.25rem' }} placeholder="OT Hrs" value={entry.overtime_hours || ''} onChange={(e) => handleDailyChange(emp.id, 'overtime_hours', Number(e.target.value))} onKeyDown={(e) => handleKeyDown(e, 'overtime_hours', index)} data-col="overtime_hours" data-rowindex={index} /></td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default Attendance;

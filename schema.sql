-- Create vendors table
CREATE TABLE IF NOT EXISTS vendors (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  place TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create styles table
CREATE TABLE IF NOT EXISTS styles (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  vendor_id UUID REFERENCES vendors(id) ON DELETE CASCADE,
  name TEXT NOT NULL UNIQUE,
  unit TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create transactions table (handles IN/OUT and Challans)
CREATE TABLE IF NOT EXISTS transactions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  style_id UUID REFERENCES styles(id) ON DELETE CASCADE,
  date DATE,
  challan_no TEXT,
  batch_no TEXT,
  size TEXT,
  inward_qty NUMERIC DEFAULT 0,
  outward_qty NUMERIC DEFAULT 0,
  invoice_no TEXT,
  invoice_date DATE,
  bill_status TEXT DEFAULT 'Pending',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable Row Level Security (RLS) but allow public access for now since this is an internal tool
ALTER TABLE vendors ENABLE ROW LEVEL SECURITY;
ALTER TABLE styles ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow public read/write on vendors" ON vendors;
CREATE POLICY "Allow public read/write on vendors" ON vendors FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow public read/write on styles" ON styles;
CREATE POLICY "Allow public read/write on styles" ON styles FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow public read/write on transactions" ON transactions;
CREATE POLICY "Allow public read/write on transactions" ON transactions FOR ALL USING (true) WITH CHECK (true);

-- Create users table for authentication
CREATE TABLE IF NOT EXISTS users (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  username TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  role TEXT DEFAULT 'user',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create companies table
CREATE TABLE IF NOT EXISTS companies (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create employees table
CREATE TABLE IF NOT EXISTS employees (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  role TEXT,
  salary_type TEXT CHECK (salary_type IN ('plus', 'fixed')),
  has_full_duty_allowance BOOLEAN DEFAULT false,
  basic_salary NUMERIC DEFAULT 0,
  ot_enabled BOOLEAN DEFAULT false,
  opening_balance NUMERIC DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create holidays table
CREATE TABLE IF NOT EXISTS holidays (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  holiday_date DATE NOT NULL UNIQUE,
  description TEXT
);

-- Create attendance table
CREATE TABLE IF NOT EXISTS attendance (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  employee_id UUID REFERENCES employees(id) ON DELETE CASCADE,
  company_id UUID REFERENCES companies(id),
  date DATE NOT NULL,
  status TEXT CHECK (status IN ('present', 'absent', 'half', 'double', 'fine')),
  production_target NUMERIC DEFAULT 100000,
  production_qty NUMERIC DEFAULT 0,
  overtime_hours NUMERIC DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(employee_id, date)
);

-- Create salary_payments table
CREATE TABLE IF NOT EXISTS salary_payments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  employee_id UUID REFERENCES employees(id) ON DELETE CASCADE,
  company_id UUID REFERENCES companies(id),
  payment_date DATE NOT NULL,
  amount_cash NUMERIC DEFAULT 0,
  amount_bank NUMERIC DEFAULT 0,
  is_advance BOOLEAN DEFAULT false,
  month_year TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS for new tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE employees ENABLE ROW LEVEL SECURITY;
ALTER TABLE holidays ENABLE ROW LEVEL SECURITY;
ALTER TABLE attendance ENABLE ROW LEVEL SECURITY;
ALTER TABLE salary_payments ENABLE ROW LEVEL SECURITY;

-- Allow public access for now (internal tool)
DROP POLICY IF EXISTS "Allow public read/write on users" ON users;
CREATE POLICY "Allow public read/write on users" ON users FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow public read/write on companies" ON companies;
CREATE POLICY "Allow public read/write on companies" ON companies FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow public read/write on employees" ON employees;
CREATE POLICY "Allow public read/write on employees" ON employees FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow public read/write on holidays" ON holidays;
CREATE POLICY "Allow public read/write on holidays" ON holidays FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow public read/write on attendance" ON attendance;
CREATE POLICY "Allow public read/write on attendance" ON attendance FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow public read/write on salary_payments" ON salary_payments;
CREATE POLICY "Allow public read/write on salary_payments" ON salary_payments FOR ALL USING (true) WITH CHECK (true);

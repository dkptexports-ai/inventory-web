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

CREATE POLICY "Allow public read/write on vendors" ON vendors FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow public read/write on styles" ON styles FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow public read/write on transactions" ON transactions FOR ALL USING (true) WITH CHECK (true);

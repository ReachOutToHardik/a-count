-- A-Count Database Schema for Neon PostgreSQL
-- Run this in your Neon Console -> SQL Editor

-- ─── Accounts ────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  bank_name TEXT NOT NULL DEFAULT '',
  account_type TEXT NOT NULL DEFAULT 'savings' CHECK (account_type IN ('savings','current','credit','wallet')),
  currency TEXT NOT NULL DEFAULT 'INR',
  color TEXT NOT NULL DEFAULT '#2563eb',
  last_imported_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ─── Tags ────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS tags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  color TEXT NOT NULL DEFAULT '#2563eb',
  icon TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ─── Tag Rules ───────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS tag_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  priority INT NOT NULL DEFAULT 100,
  conditions JSONB NOT NULL DEFAULT '[]',
  tags TEXT[] NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS tag_rules_priority_idx ON tag_rules (priority ASC);

-- ─── Transactions ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  amount NUMERIC(14,2) NOT NULL DEFAULT 0,
  type TEXT NOT NULL CHECK (type IN ('credit','debit')),
  balance_after NUMERIC(14,2),
  upi_vpa TEXT,
  upi_name TEXT,
  ref_no TEXT,
  tags TEXT[] NOT NULL DEFAULT '{}',
  tag_source TEXT CHECK (tag_source IN ('rule','ai','manual','untagged')),
  raw_row JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS transactions_account_idx ON transactions (account_id);
CREATE INDEX IF NOT EXISTS transactions_date_idx ON transactions (date DESC);
CREATE INDEX IF NOT EXISTS transactions_type_idx ON transactions (type);
CREATE INDEX IF NOT EXISTS transactions_tags_idx ON transactions USING GIN (tags);

-- ─── Import Sessions ──────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS import_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  filename TEXT NOT NULL,
  row_count INT NOT NULL DEFAULT 0,
  tagged_count INT NOT NULL DEFAULT 0,
  ai_tagged_count INT NOT NULL DEFAULT 0,
  column_map JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ─── Seed: Default Tags ───────────────────────────────────────────────────────
INSERT INTO tags (name, color, icon) VALUES
  ('food', '#f97316', ''),
  ('delivery', '#fb923c', ''),
  ('groceries', '#84cc16', ''),
  ('transport', '#06b6d4', ''),
  ('cab', '#0ea5e9', ''),
  ('bike', '#38bdf8', ''),
  ('fuel', '#eab308', ''),
  ('shopping', '#a855f7', ''),
  ('clothing', '#c084fc', ''),
  ('beauty', '#f472b6', ''),
  ('recharge', '#6366f1', ''),
  ('utilities', '#64748b', ''),
  ('bills', '#475569', ''),
  ('entertainment', '#ec4899', ''),
  ('subscription', '#d946ef', ''),
  ('medical', '#ef4444', ''),
  ('transfer', '#94a3b8', ''),
  ('salary', '#22c55e', ''),
  ('income', '#4ade80', ''),
  ('interest', '#86efac', ''),
  ('dividend', '#bbf7d0', ''),
  ('cash', '#a3a3a3', ''),
  ('atm', '#737373', ''),
  ('rent', '#78716c', '')
ON CONFLICT (name) DO NOTHING;

-- ─── Seed: Default Tag Rules ──────────────────────────────────────────────────
INSERT INTO tag_rules (name, priority, conditions, tags) VALUES
  ('Swiggy', 10, '[{"field":"description","op":"contains","value":"swiggy"}]', ARRAY['food','delivery']),
  ('Zomato', 11, '[{"field":"description","op":"contains","value":"zomato"}]', ARRAY['food','delivery']),
  ('Blinkit', 12, '[{"field":"description","op":"contains","value":"blinkit"}]', ARRAY['groceries','delivery']),
  ('Zepto', 13, '[{"field":"description","op":"contains","value":"zepto"}]', ARRAY['groceries','delivery']),
  ('Dunzo', 14, '[{"field":"description","op":"contains","value":"dunzo"}]', ARRAY['delivery']),
  ('BigBasket', 15, '[{"field":"description","op":"contains","value":"bigbasket"}]', ARRAY['groceries']),
  ('Ola', 20, '[{"field":"description","op":"contains","value":"ola"}]', ARRAY['transport','cab']),
  ('Uber', 21, '[{"field":"description","op":"contains","value":"uber"}]', ARRAY['transport','cab']),
  ('Rapido', 22, '[{"field":"description","op":"contains","value":"rapido"}]', ARRAY['transport','bike']),
  ('Petrol/Fuel', 30, '[{"field":"description","op":"contains","value":"petrol"}]', ARRAY['fuel']),
  ('HPCL', 31, '[{"field":"description","op":"contains","value":"hpcl"}]', ARRAY['fuel']),
  ('IOCL', 32, '[{"field":"description","op":"contains","value":"iocl"}]', ARRAY['fuel']),
  ('Amazon', 40, '[{"field":"description","op":"contains","value":"amazon"}]', ARRAY['shopping']),
  ('Flipkart', 41, '[{"field":"description","op":"contains","value":"flipkart"}]', ARRAY['shopping']),
  ('Myntra', 42, '[{"field":"description","op":"contains","value":"myntra"}]', ARRAY['shopping','clothing']),
  ('Meesho', 43, '[{"field":"description","op":"contains","value":"meesho"}]', ARRAY['shopping']),
  ('Nykaa', 44, '[{"field":"description","op":"contains","value":"nykaa"}]', ARRAY['shopping','beauty']),
  ('Jio', 50, '[{"field":"description","op":"contains","value":"jio"}]', ARRAY['recharge','utilities']),
  ('Airtel', 51, '[{"field":"description","op":"contains","value":"airtel"}]', ARRAY['recharge','utilities']),
  ('Netflix', 60, '[{"field":"description","op":"contains","value":"netflix"}]', ARRAY['entertainment','subscription']),
  ('Hotstar', 61, '[{"field":"description","op":"contains","value":"hotstar"}]', ARRAY['entertainment','subscription']),
  ('Amazon Prime', 62, '[{"field":"description","op":"contains","value":"prime"}]', ARRAY['entertainment','subscription']),
  ('Spotify', 63, '[{"field":"description","op":"contains","value":"spotify"}]', ARRAY['entertainment','subscription']),
  ('Electricity', 70, '[{"field":"description","op":"contains","value":"electricity"}]', ARRAY['utilities','bills']),
  ('Apollo Pharmacy', 81, '[{"field":"description","op":"contains","value":"apollo"}]', ARRAY['medical']),
  ('Pharmacy', 80, '[{"field":"description","op":"contains","value":"pharmacy"}]', ARRAY['medical']),
  ('Salary Credit', 100, '[{"field":"description","op":"contains","value":"salary"},{"field":"type","op":"equals","value":"credit"}]', ARRAY['salary','income']),
  ('Interest', 101, '[{"field":"description","op":"contains","value":"interest"},{"field":"type","op":"equals","value":"credit"}]', ARRAY['interest','income']),
  ('ATM Withdrawal', 110, '[{"field":"description","op":"contains","value":"atm"}]', ARRAY['cash','atm']),
  ('NEFT', 91, '[{"field":"description","op":"contains","value":"neft"}]', ARRAY['transfer']),
  ('IMPS', 92, '[{"field":"description","op":"contains","value":"imps"}]', ARRAY['transfer'])
ON CONFLICT DO NOTHING;

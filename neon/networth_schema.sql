-- ─── Net Worth Module Schema ──────────────────────────────────────────────────
-- Run this in Neon Console → SQL Editor

-- Fixed Deposits
CREATE TABLE IF NOT EXISTS fixed_deposits (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nickname           TEXT,
  bank_name          TEXT NOT NULL,
  principal          NUMERIC(14,2) NOT NULL,
  rate               NUMERIC(6,3) NOT NULL,
  compounding        TEXT NOT NULL DEFAULT 'quarterly'
                     CHECK (compounding IN ('monthly','quarterly','half_yearly','annually','simple')),
  payout_type        TEXT NOT NULL DEFAULT 'cumulative'
                     CHECK (payout_type IN ('cumulative','monthly','quarterly')),
  start_date         DATE NOT NULL,
  maturity_date      DATE NOT NULL,
  is_senior_citizen  BOOLEAN DEFAULT false,
  penalty_rate       NUMERIC(5,3) DEFAULT 0.5,
  notes              TEXT,
  status             TEXT NOT NULL DEFAULT 'active'
                     CHECK (status IN ('active','matured','broken','renewed')),
  created_at         TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Loans / EMIs
CREATE TABLE IF NOT EXISTS loans (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nickname            TEXT,
  loan_type           TEXT NOT NULL
                      CHECK (loan_type IN ('home','car','personal','education','business','gold','lap','other')),
  lender_name         TEXT NOT NULL,
  original_amount     NUMERIC(14,2) NOT NULL,
  disbursement_date   DATE NOT NULL,
  roi                 NUMERIC(6,3) NOT NULL,
  rate_type           TEXT NOT NULL DEFAULT 'fixed'
                      CHECK (rate_type IN ('fixed','floating')),
  tenure_months       INT NOT NULL,
  emi_amount          NUMERIC(14,2) NOT NULL,
  emi_day             INT DEFAULT 5 CHECK (emi_day BETWEEN 1 AND 31),
  notes               TEXT,
  status              TEXT NOT NULL DEFAULT 'active'
                      CHECK (status IN ('active','closed','foreclosed')),
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Investments (MF, Stocks, Gold, EPF, PPF etc.)
CREATE TABLE IF NOT EXISTS investments (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name             TEXT NOT NULL,
  type             TEXT NOT NULL
                   CHECK (type IN (
                     'mutual_fund','stock','us_stock','gold_physical',
                     'sgb','gold_etf','digital_gold','ppf','epf','nps',
                     'ssy','nsc','reit','crypto','unlisted','other'
                   )),
  invested_amount  NUMERIC(14,2) NOT NULL,
  current_value    NUMERIC(14,2) NOT NULL,
  units            NUMERIC(18,6),
  notes            TEXT,
  last_updated_at  TIMESTAMPTZ DEFAULT now(),
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Physical Assets (Real Estate, Vehicles, Jewellery)
CREATE TABLE IF NOT EXISTS physical_assets (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name            TEXT NOT NULL,
  type            TEXT NOT NULL CHECK (type IN ('property','vehicle','jewellery','other')),
  purchase_value  NUMERIC(14,2) NOT NULL,
  current_value   NUMERIC(14,2) NOT NULL,
  purchase_date   DATE,
  notes           TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Credit Cards
CREATE TABLE IF NOT EXISTS credit_cards (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  card_name       TEXT NOT NULL,
  bank_name       TEXT NOT NULL,
  card_limit      NUMERIC(14,2) NOT NULL,
  current_balance NUMERIC(14,2) NOT NULL DEFAULT 0,
  statement_date  INT CHECK (statement_date BETWEEN 1 AND 31),
  due_date_offset INT DEFAULT 20,
  notes           TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Net Worth Snapshots (auto-saved monthly)
CREATE TABLE IF NOT EXISTS networth_snapshots (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  snapshot_date     DATE NOT NULL UNIQUE,
  bank_balance      NUMERIC(14,2) DEFAULT 0,
  fd_value          NUMERIC(14,2) DEFAULT 0,
  investment_value  NUMERIC(14,2) DEFAULT 0,
  physical_value    NUMERIC(14,2) DEFAULT 0,
  total_assets      NUMERIC(14,2) NOT NULL,
  loan_outstanding  NUMERIC(14,2) DEFAULT 0,
  credit_card_dues  NUMERIC(14,2) DEFAULT 0,
  total_liabilities NUMERIC(14,2) NOT NULL,
  net_worth         NUMERIC(14,2) NOT NULL,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Goals
CREATE TABLE IF NOT EXISTS goals (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name           TEXT NOT NULL,
  icon           TEXT DEFAULT '🎯',
  target_amount  NUMERIC(14,2) NOT NULL,
  current_amount NUMERIC(14,2) NOT NULL DEFAULT 0,
  target_date    DATE,
  color          TEXT DEFAULT '#2563eb',
  notes          TEXT,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Money Lent / Receivables / P2P Lending (Asset)
CREATE TABLE IF NOT EXISTS money_lent (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  borrower_name        TEXT NOT NULL,
  amount_lent          NUMERIC(14,2) NOT NULL,
  amount_recovered     NUMERIC(14,2) NOT NULL DEFAULT 0,
  interest_rate        NUMERIC(5,2) DEFAULT 0,
  lent_date            DATE NOT NULL,
  expected_return_date DATE,
  status               TEXT NOT NULL DEFAULT 'active'
                       CHECK (status IN ('active','settled','overdue','defaulted')),
  notes                TEXT,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ─── Sample Data (optional — delete if you want to start fresh) ───────────────

INSERT INTO fixed_deposits (nickname, bank_name, principal, rate, compounding, start_date, maturity_date, status) VALUES
  ('Emergency Fund FD',  'HDFC Bank',  200000, 7.10, 'quarterly', '2024-01-01', '2026-01-01', 'active'),
  ('Vacation Fund',      'SBI',        100000, 7.00, 'quarterly', '2024-04-01', '2025-04-01', 'active'),
  ('Tax Saver FD',       'ICICI Bank', 150000, 7.25, 'quarterly', '2023-12-01', '2028-12-01', 'active')
ON CONFLICT DO NOTHING;

INSERT INTO loans (nickname, loan_type, lender_name, original_amount, disbursement_date, roi, rate_type, tenure_months, emi_amount, emi_day) VALUES
  ('Our Home',  'home',     'SBI Home Loans', 5000000, '2022-03-01', 9.00, 'floating', 240, 44091, 5),
  ('Honda City','car',      'HDFC Bank',      700000,  '2023-06-01', 8.50, 'fixed',    60,  14396, 10)
ON CONFLICT DO NOTHING;

INSERT INTO investments (name, type, invested_amount, current_value) VALUES
  ('Mirae Asset Large Cap',  'mutual_fund',  150000, 198000),
  ('HDFC Mid Cap Opp.',      'mutual_fund',  80000,  112000),
  ('Reliance Industries',    'stock',        50000,  68000),
  ('EPF Balance',            'epf',          320000, 320000),
  ('PPF Account',            'ppf',          150000, 165000)
ON CONFLICT DO NOTHING;

INSERT INTO physical_assets (name, type, purchase_value, current_value, purchase_date) VALUES
  ('2BHK Apartment',   'property', 4500000, 6200000, '2022-03-01'),
  ('Honda City 2023',  'vehicle',  1250000,  950000, '2023-06-01'),
  ('Gold Jewellery',   'jewellery', 180000,  280000, '2020-01-01')
ON CONFLICT DO NOTHING;

INSERT INTO credit_cards (card_name, bank_name, card_limit, current_balance, statement_date, due_date_offset) VALUES
  ('Regalia Credit Card', 'HDFC Bank',   500000, 28000, 5,  20),
  ('Amazon Pay Card',     'ICICI Bank',  200000,  8500, 15, 20)
ON CONFLICT DO NOTHING;

INSERT INTO goals (name, icon, target_amount, current_amount, target_date, color) VALUES
  ('Emergency Fund (6mo)', '🛡️', 500000, 320000, '2025-06-01', '#16a34a'),
  ('Europe Trip',          '✈️', 200000,  80000, '2025-06-01', '#2563eb'),
  ('New MacBook Pro',      '💻',  250000, 120000, '2025-03-01', '#7c3aed'),
  ('Down Payment #2',      '🏠', 1500000, 420000, '2027-01-01', '#d97706')
ON CONFLICT DO NOTHING;

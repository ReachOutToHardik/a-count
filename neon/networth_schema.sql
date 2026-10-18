-- ─── Net Worth Module Schema ──────────────────────────────────────────────────
-- Applied by `node scripts/setup-db.js` (or paste into the Supabase SQL Editor)

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


-- ─── Lock down Supabase Data API ─────────────────────────────────────────────
-- The app talks to Postgres directly (DATABASE_URL), never through the anon key.
-- Enabling RLS with no policies blocks anon/authenticated access via the REST API,
-- while the table owner (the postgres user in DATABASE_URL) keeps full access.
ALTER TABLE fixed_deposits     ENABLE ROW LEVEL SECURITY;
ALTER TABLE loans              ENABLE ROW LEVEL SECURITY;
ALTER TABLE investments        ENABLE ROW LEVEL SECURITY;
ALTER TABLE physical_assets    ENABLE ROW LEVEL SECURITY;
ALTER TABLE credit_cards       ENABLE ROW LEVEL SECURITY;
ALTER TABLE networth_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE goals              ENABLE ROW LEVEL SECURITY;
ALTER TABLE money_lent         ENABLE ROW LEVEL SECURITY;

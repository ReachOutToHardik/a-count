-- ─── Net Worth Demo Data (NOT run by scripts/setup-db.js) ──────────────────────
-- Optional sample rows for trying out the Net Worth page. Running it twice inserts duplicates.

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

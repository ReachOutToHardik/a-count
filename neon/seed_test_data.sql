-- Quick Demo Seed Data for Neon PostgreSQL
-- Run this in Neon SQL Editor if you want pre-populated accounts and transactions

-- 1. Insert Demo Accounts
INSERT INTO accounts (id, name, bank_name, account_type, currency, color) VALUES
  ('a0000000-0000-0000-0000-000000000001', 'HDFC Salary Account', 'HDFC Bank', 'savings', 'INR', '#2563eb'),
  ('a0000000-0000-0000-0000-000000000002', 'ICICI Current Account', 'ICICI Bank', 'current', 'INR', '#059669')
ON CONFLICT (id) DO NOTHING;

-- 2. Insert Demo Transactions for HDFC Account
INSERT INTO transactions (account_id, date, description, amount, type, balance_after, upi_vpa, upi_name, ref_no, tags, tag_source) VALUES
  ('a0000000-0000-0000-0000-000000000001', '2026-09-01', 'ACH-SALARY-ACME TECH PVT LTD-SEPT2026', 185000.00, 'credit', 309511.00, NULL, NULL, 'ACH991823', ARRAY['salary', 'income'], 'rule'),
  ('a0000000-0000-0000-0000-000000000001', '2026-09-01', 'UPI/SWIGGY/swiggy@icici/Food delivery/623490182741', 489.00, 'debit', 309022.00, 'swiggy@icici', 'Swiggy', '623490182741', ARRAY['food', 'delivery'], 'rule'),
  ('a0000000-0000-0000-0000-000000000001', '2026-09-02', 'UPI/ZOMATO/zomato@hdfcbank/Dinner order/623518293012', 840.00, 'debit', 308182.00, 'zomato@hdfcbank', 'Zomato', '623518293012', ARRAY['food', 'delivery'], 'rule'),
  ('a0000000-0000-0000-0000-000000000001', '2026-09-03', 'UPI/BLINKIT/blinkit@icici/Grocery morning/623691820491', 1249.50, 'debit', 306932.50, 'blinkit@icici', 'Blinkit', '623691820491', ARRAY['groceries', 'delivery'], 'rule'),
  ('a0000000-0000-0000-0000-000000000001', '2026-09-04', 'UPI/UBER/uber.rides@hdfc/Cab to Airport/623719028471', 640.00, 'debit', 306292.50, 'uber.rides@hdfc', 'Uber', '623719028471', ARRAY['transport', 'cab'], 'rule'),
  ('a0000000-0000-0000-0000-000000000001', '2026-09-05', 'POS-HPCL FUEL STATION BANGALORE', 2500.00, 'debit', 303792.50, NULL, NULL, 'POS819283', ARRAY['fuel'], 'rule'),
  ('a0000000-0000-0000-0000-000000000001', '2026-09-06', 'UPI/AMAZON/amazonpay@icici/Electronics accessories/623910293812', 3499.00, 'debit', 300293.50, 'amazonpay@icici', 'Amazon', '623910293812', ARRAY['shopping'], 'rule'),
  ('a0000000-0000-0000-0000-000000000001', '2026-09-07', 'NEFT CR-MR RAHUL SHARMA-FREELANCE DESIGN', 35000.00, 'credit', 335293.50, NULL, NULL, 'N12093847', ARRAY['transfer', 'income'], 'rule'),
  ('a0000000-0000-0000-0000-000000000001', '2026-09-08', 'UPI/NETFLIX/netflix.in@hdfc/Monthly Sub/624109283719', 649.00, 'debit', 334644.50, 'netflix.in@hdfc', 'Netflix', '624109283719', ARRAY['entertainment', 'subscription'], 'rule'),
  ('a0000000-0000-0000-0000-000000000001', '2026-09-09', 'UPI/ZEPTO/zepto@axis/Groceries late night/624219028371', 420.00, 'debit', 334224.50, 'zepto@axis', 'Zepto', '624219028371', ARRAY['groceries', 'delivery'], 'rule'),
  ('a0000000-0000-0000-0000-000000000001', '2026-09-10', 'ATM-WDL-HDFC ATM KORAMANGALA BLR', 5000.00, 'debit', 329224.50, NULL, NULL, 'ATM109283', ARRAY['cash', 'atm'], 'rule'),
  ('a0000000-0000-0000-0000-000000000001', '2026-09-11', 'UPI/APOLLO PHARMACY/apollo@sbi/Medicines/624419203918', 780.00, 'debit', 328444.50, 'apollo@sbi', 'Apollo Pharmacy', '624419203918', ARRAY['medical'], 'rule'),
  ('a0000000-0000-0000-0000-000000000001', '2026-09-12', 'UPI/JIO/recharge.jio@hdfc/Fiber bill/624519203918', 1178.82, 'debit', 327265.68, 'recharge.jio@hdfc', 'Jio', '624519203918', ARRAY['recharge', 'utilities'], 'rule'),
  ('a0000000-0000-0000-0000-000000000001', '2026-09-13', 'UPI/RAPIDO/rapido@icici/Auto ride/624619203918', 95.00, 'debit', 327170.68, 'rapido@icici', 'Rapido', '624619203918', ARRAY['transport', 'bike'], 'rule'),
  ('a0000000-0000-0000-0000-000000000001', '2026-09-14', 'UPI/MYNTRA/myntra@hdfc/Clothing summer/624719203918', 2890.00, 'debit', 324280.68, 'myntra@hdfc', 'Myntra', '624719203918', ARRAY['shopping', 'clothing'], 'rule'),
  ('a0000000-0000-0000-0000-000000000001', '2026-09-15', 'INT.PD-SAVINGS BANK INTEREST QUARTERLY', 1420.00, 'credit', 325700.68, NULL, NULL, 'INT829102', ARRAY['interest', 'income'], 'rule')
ON CONFLICT (id) DO NOTHING;

-- 3. Insert Demo Transactions for ICICI Account
INSERT INTO transactions (account_id, date, description, amount, type, balance_after, upi_vpa, upi_name, ref_no, tags, tag_source) VALUES
  ('a0000000-0000-0000-0000-000000000002', '2026-09-01', 'CLIENT INVOICE #1042 PAYMENT RECEIVED - ACME CORP', 250000.00, 'credit', 820000.00, NULL, NULL, 'TXN992019', ARRAY['income'], 'rule'),
  ('a0000000-0000-0000-0000-000000000002', '2026-09-02', 'AWS EMEA AWS.AMAZON.COM SERVER CLOUD HOSTING', 18450.00, 'debit', 801550.00, NULL, NULL, 'AWS771029', ARRAY['utilities', 'bills'], 'rule'),
  ('a0000000-0000-0000-0000-000000000002', '2026-09-03', 'GOOGLE WORKSPACE APPS GSUITE MONTHLY', 4200.00, 'debit', 797350.00, NULL, NULL, 'GSUITE9918', ARRAY['subscription'], 'rule'),
  ('a0000000-0000-0000-0000-000000000002', '2026-09-05', 'OFFICE RENT WEWORK COWORKING SPACES', 65000.00, 'debit', 732350.00, NULL, NULL, 'RENT88192', ARRAY['rent'], 'rule'),
  ('a0000000-0000-0000-0000-000000000002', '2026-09-07', 'SWIGGY FOR WORK - TEAM LUNCH FOOD DELIVERY', 3450.00, 'debit', 728900.00, NULL, NULL, 'SWG882910', ARRAY['food', 'delivery'], 'rule'),
  ('a0000000-0000-0000-0000-000000000002', '2026-09-10', 'CLIENT INVOICE #1043 RETAINER - STARK LABS', 175000.00, 'credit', 891100.00, NULL, NULL, 'TXN992044', ARRAY['income'], 'rule')
ON CONFLICT (id) DO NOTHING;

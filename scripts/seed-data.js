const fs = require('fs')
const path = require('path')
const postgres = require('postgres')

const envPath = path.join(__dirname, '..', '.env.local')
const envContent = fs.readFileSync(envPath, 'utf8')
const match = envContent.match(/DATABASE_URL=(.+)/)
const databaseUrl = match[1].trim()

const sql = postgres(databaseUrl, { ssl: 'require' })

async function seed() {
  console.log('🌱 Seeding rich financial data into Supabase...')

  const today = new Date()
  const formatDateOffset = (daysAgo) => {
    const d = new Date(today.getTime() - daysAgo * 24 * 60 * 60 * 1000)
    return d.toISOString().split('T')[0]
  }

  // 1. Bank Accounts
  console.log('🏦 Creating Accounts...')
  await sql`
    INSERT INTO accounts (id, name, bank_name, account_type, currency, color) VALUES
      ('a0000000-0000-0000-0000-000000000001', 'HDFC Salary Account', 'HDFC Bank', 'savings', 'INR', '#2563eb'),
      ('a0000000-0000-0000-0000-000000000002', 'ICICI Current Account', 'ICICI Bank', 'current', 'INR', '#059669'),
      ('a0000000-0000-0000-0000-000000000003', 'Zerodha Funds', 'Zerodha', 'wallet', 'INR', '#7c3aed')
    ON CONFLICT (id) DO UPDATE SET
      name = EXCLUDED.name,
      bank_name = EXCLUDED.bank_name,
      account_type = EXCLUDED.account_type,
      color = EXCLUDED.color
  `

  // 2. Realistic Transactions with recent dates
  console.log('💳 Inserting Transactions...')
  await sql`DELETE FROM transactions WHERE account_id IN (
    'a0000000-0000-0000-0000-000000000001',
    'a0000000-0000-0000-0000-000000000002',
    'a0000000-0000-0000-0000-000000000003'
  )`

  const txs = [
    // HDFC Transactions
    {
      account_id: 'a0000000-0000-0000-0000-000000000001',
      date: formatDateOffset(1),
      description: 'UPI/SWIGGY/swiggy@icici/Dinner Gourmet/982138127391',
      amount: 680.00,
      type: 'debit',
      balance_after: 248500.00,
      upi_vpa: 'swiggy@icici',
      upi_name: 'Swiggy',
      ref_no: '982138127391',
      tags: ['food', 'delivery'],
      tag_source: 'rule',
    },
    {
      account_id: 'a0000000-0000-0000-0000-000000000001',
      date: formatDateOffset(2),
      description: 'ACH-SALARY-TECHCORP GLOBAL-OCT2026',
      amount: 195000.00,
      type: 'credit',
      balance_after: 249180.00,
      upi_vpa: null,
      upi_name: null,
      ref_no: 'ACH817293',
      tags: ['salary', 'income'],
      tag_source: 'rule',
    },
    {
      account_id: 'a0000000-0000-0000-0000-000000000001',
      date: formatDateOffset(3),
      description: 'UPI/BLINKIT/blinkit@icici/Fresh Vegetables & Fruits/982109823123',
      amount: 1420.50,
      type: 'debit',
      balance_after: 54180.00,
      upi_vpa: 'blinkit@icici',
      upi_name: 'Blinkit',
      ref_no: '982109823123',
      tags: ['groceries', 'delivery'],
      tag_source: 'rule',
    },
    {
      account_id: 'a0000000-0000-0000-0000-000000000001',
      date: formatDateOffset(4),
      description: 'UPI/UBER/uber.rides@hdfc/Airport Ride/982001928371',
      amount: 850.00,
      type: 'debit',
      balance_after: 55600.50,
      upi_vpa: 'uber.rides@hdfc',
      upi_name: 'Uber',
      ref_no: '982001928371',
      tags: ['transport', 'cab'],
      tag_source: 'rule',
    },
    {
      account_id: 'a0000000-0000-0000-0000-000000000001',
      date: formatDateOffset(5),
      description: 'POS-HPCL FUEL STATION INDIRANAGAR',
      amount: 2800.00,
      type: 'debit',
      balance_after: 56450.50,
      upi_vpa: null,
      upi_name: null,
      ref_no: 'POS992817',
      tags: ['fuel'],
      tag_source: 'rule',
    },
    {
      account_id: 'a0000000-0000-0000-0000-000000000001',
      date: formatDateOffset(6),
      description: 'UPI/AMAZON/amazonpay@icici/Ergonomic Chair/981992817263',
      amount: 8499.00,
      type: 'debit',
      balance_after: 59250.50,
      upi_vpa: 'amazonpay@icici',
      upi_name: 'Amazon',
      ref_no: '981992817263',
      tags: ['shopping'],
      tag_source: 'rule',
    },
    {
      account_id: 'a0000000-0000-0000-0000-000000000001',
      date: formatDateOffset(7),
      description: 'UPI/NETFLIX/netflix.in@hdfc/4K Premium Plan/981882736152',
      amount: 649.00,
      type: 'debit',
      balance_after: 67749.50,
      upi_vpa: 'netflix.in@hdfc',
      upi_name: 'Netflix',
      ref_no: '981882736152',
      tags: ['entertainment', 'subscription'],
      tag_source: 'rule',
    },
    {
      account_id: 'a0000000-0000-0000-0000-000000000001',
      date: formatDateOffset(8),
      description: 'UPI/ZEPTO/zepto@axis/Quick midnight snack/981772635142',
      amount: 320.00,
      type: 'debit',
      balance_after: 68398.50,
      upi_vpa: 'zepto@axis',
      upi_name: 'Zepto',
      ref_no: '981772635142',
      tags: ['groceries', 'delivery'],
      tag_source: 'rule',
    },
    {
      account_id: 'a0000000-0000-0000-0000-000000000001',
      date: formatDateOffset(9),
      description: 'ATM-WDL-HDFC ATM KORAMANGALA BLR',
      amount: 5000.00,
      type: 'debit',
      balance_after: 68718.50,
      upi_vpa: null,
      upi_name: null,
      ref_no: 'ATM102938',
      tags: ['cash', 'atm'],
      tag_source: 'rule',
    },
    {
      account_id: 'a0000000-0000-0000-0000-000000000001',
      date: formatDateOffset(10),
      description: 'UPI/APOLLO PHARMACY/apollo@sbi/Vitamins & First Aid/981662534123',
      amount: 890.00,
      type: 'debit',
      balance_after: 73718.50,
      upi_vpa: 'apollo@sbi',
      upi_name: 'Apollo Pharmacy',
      ref_no: '981662534123',
      tags: ['medical'],
      tag_source: 'rule',
    },
    {
      account_id: 'a0000000-0000-0000-0000-000000000001',
      date: formatDateOffset(12),
      description: 'UPI/JIO/recharge.jio@hdfc/Fiber 300Mbps Plan/981552433112',
      amount: 1178.82,
      type: 'debit',
      balance_after: 74608.50,
      upi_vpa: 'recharge.jio@hdfc',
      upi_name: 'Jio',
      ref_no: '981552433112',
      tags: ['recharge', 'utilities'],
      tag_source: 'rule',
    },
    {
      account_id: 'a0000000-0000-0000-0000-000000000001',
      date: formatDateOffset(14),
      description: 'UPI/ZOMATO/zomato@hdfcbank/Weekend Family Meal/981442322101',
      amount: 1250.00,
      type: 'debit',
      balance_after: 75787.32,
      upi_vpa: 'zomato@hdfcbank',
      upi_name: 'Zomato',
      ref_no: '981442322101',
      tags: ['food', 'delivery'],
      tag_source: 'rule',
    },

    // ICICI Current Transactions
    {
      account_id: 'a0000000-0000-0000-0000-000000000002',
      date: formatDateOffset(2),
      description: 'CLIENT INVOICE #1089 - ACME CORP US RETAINER',
      amount: 320000.00,
      type: 'credit',
      balance_after: 890000.00,
      upi_vpa: null,
      upi_name: null,
      ref_no: 'INV1089',
      tags: ['income'],
      tag_source: 'rule',
    },
    {
      account_id: 'a0000000-0000-0000-0000-000000000002',
      date: formatDateOffset(4),
      description: 'AWS EMEA AWS.AMAZON.COM SERVER CLOUD HOSTING',
      amount: 21500.00,
      type: 'debit',
      balance_after: 570000.00,
      upi_vpa: null,
      upi_name: null,
      ref_no: 'AWS992018',
      tags: ['utilities', 'bills'],
      tag_source: 'rule',
    },
    {
      account_id: 'a0000000-0000-0000-0000-000000000002',
      date: formatDateOffset(7),
      description: 'GOOGLE WORKSPACE APPS GSUITE MONTHLY SUBSCRIPTION',
      amount: 4800.00,
      type: 'debit',
      balance_after: 591500.00,
      upi_vpa: null,
      upi_name: null,
      ref_no: 'GSUITE88192',
      tags: ['subscription'],
      tag_source: 'rule',
    },
    {
      account_id: 'a0000000-0000-0000-0000-000000000002',
      date: formatDateOffset(10),
      description: 'OFFICE COWORKING SPACE WEWORK BANGALORE',
      amount: 55000.00,
      type: 'debit',
      balance_after: 596300.00,
      upi_vpa: null,
      upi_name: null,
      ref_no: 'WEWORK9928',
      tags: ['rent'],
      tag_source: 'rule',
    },

    // Zerodha Wallet Transaction
    {
      account_id: 'a0000000-0000-0000-0000-000000000003',
      date: formatDateOffset(5),
      description: 'FUNDS TRANSFERRED FOR MONTHLY MUTUAL FUND SIP',
      amount: 35000.00,
      type: 'credit',
      balance_after: 42000.00,
      upi_vpa: null,
      upi_name: null,
      ref_no: 'SIP-FUND-OCT',
      tags: ['transfer'],
      tag_source: 'rule',
    }
  ]

  for (const t of txs) {
    await sql`
      INSERT INTO transactions (
        account_id, date, description, amount, type,
        balance_after, upi_vpa, upi_name, ref_no, tags, tag_source
      ) VALUES (
        ${t.account_id}, ${t.date}, ${t.description}, ${t.amount}, ${t.type},
        ${t.balance_after}, ${t.upi_vpa}, ${t.upi_name}, ${t.ref_no}, ${t.tags}, ${t.tag_source}
      )
    `
  }

  // 3. Fixed Deposits
  console.log('📈 Inserting Fixed Deposits...')
  await sql`DELETE FROM fixed_deposits`
  await sql`
    INSERT INTO fixed_deposits (nickname, bank_name, principal, rate, compounding, payout_type, start_date, maturity_date, status) VALUES
      ('Emergency Reserve FD', 'HDFC Bank', 250000.00, 7.20, 'quarterly', 'cumulative', '2024-01-15', '2026-01-15', 'active'),
      ('Tax Saver 5Y FD', 'ICICI Bank', 150000.00, 7.10, 'quarterly', 'cumulative', '2023-12-01', '2028-12-01', 'active')
  `

  // 4. Investments (Mutual Funds, Stocks, EPF, Gold)
  console.log('📊 Inserting Investments...')
  await sql`DELETE FROM investments`
  await sql`
    INSERT INTO investments (name, type, invested_amount, current_value, notes) VALUES
      ('UTI Nifty 50 Index Fund Direct Growth', 'mutual_fund', 300000.00, 385000.00, 'Core Index SIP'),
      ('Parag Parikh Flexi Cap Fund', 'mutual_fund', 250000.00, 342000.00, 'Global flexicap allocation'),
      ('Mirae Asset Large & Midcap Fund', 'mutual_fund', 180000.00, 235000.00, 'Large-midcap blended growth'),
      ('Reliance Industries Equity Shares', 'stock', 95000.00, 118000.00, 'Bluechip holdings'),
      ('Sovereign Gold Bonds (SGB 2028 Series)', 'sgb', 120000.00, 178000.00, '2.5% semi-annual interest'),
      ('Employee Provident Fund (EPF)', 'epf', 480000.00, 520000.00, 'Retirement corpus (8.25% p.a.)')
  `

  // 5. Loans / Liabilities
  console.log('🏠 Inserting Loan...')
  await sql`DELETE FROM loans`
  await sql`
    INSERT INTO loans (nickname, loan_type, lender_name, original_amount, disbursement_date, roi, rate_type, tenure_months, emi_amount, emi_day, status) VALUES
      ('Hyundai Creta Car Loan', 'car', 'HDFC Bank', 650000.00, '2024-03-01', 8.75, 'fixed', 60, 13420.00, 5, 'active')
  `

  // 6. Financial Goals
  console.log('🎯 Inserting Financial Goals...')
  await sql`DELETE FROM goals`
  await sql`
    INSERT INTO goals (name, icon, target_amount, current_amount, target_date, color) VALUES
      ('Emergency Fund (6 Months Expenses)', '🛡️', 500000.00, 380000.00, '2026-12-31', '#10b981'),
      ('Japan Autumn Vacation 2027', '🗾', 350000.00, 145000.00, '2027-10-15', '#f59e0b'),
      ('New Car Downpayment', '🚗', 600000.00, 220000.00, '2028-06-30', '#6366f1')
  `

  // 7. Money Lent
  console.log('🤝 Inserting Money Lent...')
  await sql`DELETE FROM money_lent`
  await sql`
    INSERT INTO money_lent (borrower_name, amount_lent, amount_recovered, interest_rate, lent_date, expected_return_date, status) VALUES
      ('Rohan Verma (College Friend)', 30000.00, 12000.00, 0, '2024-08-01', '2024-12-31', 'active')
  `

  // 8. Update Account last_imported_at
  await sql`
    UPDATE accounts SET last_imported_at = NOW() WHERE id IN (
      'a0000000-0000-0000-0000-000000000001',
      'a0000000-0000-0000-0000-000000000002'
    )
  `

  console.log('\n✨ Database successfully populated with realistic data!')
  await sql.end()
}

seed().catch(err => {
  console.error('❌ Seeding failed:', err)
  process.exit(1)
})

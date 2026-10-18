import { NextResponse } from 'next/server'
import { getDb } from '@/lib/db'

function sql(strings: TemplateStringsArray, ...values: any[]) {
  return (getDb() as any)(strings, ...values)
}

let schemaInitialized = false

async function ensureNetworthSchema() {
  if (schemaInitialized) return
  try {
    await sql`
      CREATE TABLE IF NOT EXISTS fixed_deposits (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        nickname TEXT,
        bank_name TEXT NOT NULL,
        principal NUMERIC(14,2) NOT NULL,
        rate NUMERIC(6,3) NOT NULL,
        compounding TEXT NOT NULL DEFAULT 'quarterly',
        payout_type TEXT NOT NULL DEFAULT 'cumulative',
        start_date DATE NOT NULL,
        maturity_date DATE NOT NULL,
        is_senior_citizen BOOLEAN DEFAULT false,
        penalty_rate NUMERIC(5,3) DEFAULT 0.5,
        notes TEXT,
        status TEXT NOT NULL DEFAULT 'active',
        created_at TIMESTAMPTZ NOT NULL DEFAULT now()
      )
    `
    await sql`
      CREATE TABLE IF NOT EXISTS loans (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        nickname TEXT,
        loan_type TEXT NOT NULL,
        lender_name TEXT NOT NULL,
        original_amount NUMERIC(14,2) NOT NULL,
        disbursement_date DATE NOT NULL,
        roi NUMERIC(6,3) NOT NULL,
        rate_type TEXT NOT NULL DEFAULT 'fixed',
        tenure_months INT NOT NULL,
        emi_amount NUMERIC(14,2) NOT NULL,
        emi_day INT DEFAULT 5,
        notes TEXT,
        status TEXT NOT NULL DEFAULT 'active',
        created_at TIMESTAMPTZ NOT NULL DEFAULT now()
      )
    `
    await sql`
      CREATE TABLE IF NOT EXISTS investments (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name TEXT NOT NULL,
        type TEXT NOT NULL,
        invested_amount NUMERIC(14,2) NOT NULL,
        current_value NUMERIC(14,2) NOT NULL,
        units NUMERIC(18,6),
        notes TEXT,
        last_updated_at TIMESTAMPTZ DEFAULT now(),
        created_at TIMESTAMPTZ NOT NULL DEFAULT now()
      )
    `
    await sql`
      CREATE TABLE IF NOT EXISTS physical_assets (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name TEXT NOT NULL,
        type TEXT NOT NULL,
        purchase_value NUMERIC(14,2) NOT NULL,
        current_value NUMERIC(14,2) NOT NULL,
        purchase_date DATE,
        notes TEXT,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now()
      )
    `
    await sql`
      CREATE TABLE IF NOT EXISTS credit_cards (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        card_name TEXT NOT NULL,
        bank_name TEXT NOT NULL,
        card_limit NUMERIC(14,2) NOT NULL,
        current_balance NUMERIC(14,2) NOT NULL DEFAULT 0,
        statement_date INT,
        due_date_offset INT DEFAULT 20,
        notes TEXT,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now()
      )
    `
    await sql`
      CREATE TABLE IF NOT EXISTS networth_snapshots (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        snapshot_date DATE NOT NULL UNIQUE,
        bank_balance NUMERIC(14,2) DEFAULT 0,
        fd_value NUMERIC(14,2) DEFAULT 0,
        investment_value NUMERIC(14,2) DEFAULT 0,
        physical_value NUMERIC(14,2) DEFAULT 0,
        total_assets NUMERIC(14,2) NOT NULL,
        loan_outstanding NUMERIC(14,2) DEFAULT 0,
        credit_card_dues NUMERIC(14,2) DEFAULT 0,
        total_liabilities NUMERIC(14,2) NOT NULL,
        net_worth NUMERIC(14,2) NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now()
      )
    `
    await sql`
      CREATE TABLE IF NOT EXISTS goals (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name TEXT NOT NULL,
        icon TEXT DEFAULT '🎯',
        target_amount NUMERIC(14,2) NOT NULL,
        current_amount NUMERIC(14,2) NOT NULL DEFAULT 0,
        target_date DATE,
        color TEXT DEFAULT '#2563eb',
        notes TEXT,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now()
      )
    `
    await sql`
      CREATE TABLE IF NOT EXISTS money_lent (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        borrower_name TEXT NOT NULL,
        amount_lent NUMERIC(14,2) NOT NULL,
        amount_recovered NUMERIC(14,2) NOT NULL DEFAULT 0,
        interest_rate NUMERIC(5,2) DEFAULT 0,
        lent_date DATE NOT NULL,
        expected_return_date DATE,
        status TEXT NOT NULL DEFAULT 'active',
        notes TEXT,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now()
      )
    `
    schemaInitialized = true
  } catch (err) {
    console.warn('ensureNetworthSchema notice:', err)
  }
}

async function fetchNetworthData() {
  const [fds, loans, investments, physicalAssets, creditCards, dbSnapshots, goals, moneyLent] = await Promise.all([
    sql`SELECT * FROM fixed_deposits WHERE status = 'active' ORDER BY maturity_date ASC`,
    sql`SELECT * FROM loans WHERE status = 'active' ORDER BY created_at ASC`,
    sql`SELECT * FROM investments ORDER BY current_value DESC`,
    sql`SELECT * FROM physical_assets ORDER BY current_value DESC`,
    sql`SELECT * FROM credit_cards ORDER BY current_balance DESC`,
    sql`SELECT * FROM networth_snapshots ORDER BY snapshot_date ASC LIMIT 24`,
    sql`SELECT * FROM goals ORDER BY target_date ASC NULLS LAST`,
    sql`SELECT * FROM money_lent WHERE status != 'settled' ORDER BY lent_date DESC`,
  ])

  return { fds, loans, investments, physicalAssets, creditCards, dbSnapshots, goals, moneyLent }
}

export async function GET() {
  try {
    let data
    try {
      data = await fetchNetworthData()
    } catch (err: any) {
      if (err?.code === '42P01' || String(err?.message || '').includes('does not exist')) {
        await ensureNetworthSchema()
        data = await fetchNetworthData()
      } else {
        throw err
      }
    }

    const { fds, loans, investments, physicalAssets, creditCards, dbSnapshots, goals, moneyLent } = data

    const [bankResult] = await sql`
      SELECT COALESCE(SUM(balance_after), 0) as total
      FROM (
        SELECT DISTINCT ON (account_id) balance_after
        FROM transactions
        WHERE balance_after IS NOT NULL
        ORDER BY account_id, date DESC, created_at DESC
      ) latest
    `

    const bankBalance = Number(bankResult?.total || 0)

    const fdValue = fds.reduce((sum: number, fd: any) => {
      const principal = Number(fd.principal) || 0
      const rate = (Number(fd.rate) || 0) / 100
      const start = new Date(fd.start_date || Date.now())
      const end = new Date(fd.maturity_date || Date.now())
      const now = new Date()
      const cap = now > end ? end : now
      const years = Math.max(0, (cap.getTime() - start.getTime()) / (365.25 * 24 * 3600 * 1000))
      const n = fd.compounding === 'monthly' ? 12 : fd.compounding === 'quarterly' ? 4 : fd.compounding === 'half_yearly' ? 2 : 1
      return sum + (principal * Math.pow(1 + rate / n, n * years))
    }, 0)

    const loanOutstanding = loans.reduce((sum: number, loan: any) => {
      const r = (Number(loan.roi) || 0) / 100 / 12
      const emi = Number(loan.emi_amount) || 0
      const disbursed = new Date(loan.disbursement_date || Date.now())
      const paidMonths = Math.max(0, Math.floor((Date.now() - disbursed.getTime()) / (30.44 * 24 * 3600 * 1000)))
      const remaining = Number(loan.tenure_months || 0) - paidMonths
      if (remaining <= 0 || r === 0) return sum
      return sum + (emi * (1 - Math.pow(1 + r, -remaining)) / r)
    }, 0)

    const investmentValue = investments.reduce((sum: number, i: any) => sum + Number(i.current_value || 0), 0)
    const physicalValue = physicalAssets.reduce((sum: number, a: any) => sum + Number(a.current_value || 0), 0)
    const creditCardDues = creditCards.reduce((sum: number, c: any) => sum + Number(c.current_balance || 0), 0)
    const lentReceivables = moneyLent.reduce((sum: number, l: any) => sum + Math.max(0, Number(l.amount_lent || 0) - Number(l.amount_recovered || 0)), 0)

    const totalAssets = bankBalance + fdValue + investmentValue + physicalValue + lentReceivables
    const totalLiabilities = loanOutstanding + creditCardDues
    const netWorth = totalAssets - totalLiabilities
    const today = new Date().toISOString().split('T')[0]

    // Auto-record / update today's live snapshot in the database
    try {
      await sql`
        INSERT INTO networth_snapshots (
          snapshot_date, bank_balance, fd_value, investment_value,
          physical_value, total_assets, loan_outstanding, credit_card_dues,
          total_liabilities, net_worth
        )
        VALUES (
          ${today}, ${bankBalance}, ${fdValue}, ${investmentValue},
          ${physicalValue}, ${totalAssets}, ${loanOutstanding}, ${creditCardDues},
          ${totalLiabilities}, ${netWorth}
        )
        ON CONFLICT (snapshot_date) DO UPDATE SET
          bank_balance = EXCLUDED.bank_balance,
          fd_value = EXCLUDED.fd_value,
          investment_value = EXCLUDED.investment_value,
          physical_value = EXCLUDED.physical_value,
          total_assets = EXCLUDED.total_assets,
          loan_outstanding = EXCLUDED.loan_outstanding,
          credit_card_dues = EXCLUDED.credit_card_dues,
          total_liabilities = EXCLUDED.total_liabilities,
          net_worth = EXCLUDED.net_worth
      `
    } catch (e) {
      console.warn('Could not auto-insert snapshot (schema may be creating):', e)
    }

    // Format all snapshots from database
    let snapshots = (dbSnapshots || []).map((s: any) => {
      const rawDate = typeof s.snapshot_date === 'string' ? s.snapshot_date.split('T')[0] : new Date(s.snapshot_date).toISOString().split('T')[0]
      return {
        id: s.id,
        snapshot_date: rawDate.substring(0, 7), // YYYY-MM format for chart
        net_worth: Number(s.net_worth || 0),
        total_assets: Number(s.total_assets || 0),
        total_liabilities: Number(s.total_liabilities || 0),
        bank_balance: Number(s.bank_balance || 0),
        fd_value: Number(s.fd_value || 0),
        investment_value: Number(s.investment_value || 0),
        physical_value: Number(s.physical_value || 0),
        loan_outstanding: Number(s.loan_outstanding || 0),
        credit_card_dues: Number(s.credit_card_dues || 0),
      }
    })

    // If no snapshots were in the table, provide today's live calculated point from DB
    if (snapshots.length === 0) {
      snapshots = [{
        id: 'current-live',
        snapshot_date: today.substring(0, 7),
        net_worth: netWorth,
        total_assets: totalAssets,
        total_liabilities: totalLiabilities,
        bank_balance: bankBalance,
        fd_value: fdValue,
        investment_value: investmentValue,
        physical_value: physicalValue,
        loan_outstanding: loanOutstanding,
        credit_card_dues: creditCardDues,
      }]
    }

    return NextResponse.json({
      fds,
      loans,
      investments,
      physicalAssets,
      creditCards,
      snapshots,
      goals,
      moneyLent,
      bankBalance,
    })
  } catch (err: any) {
    console.error('Networth API error:', err)
    return NextResponse.json({
      fds: [],
      loans: [],
      investments: [],
      physicalAssets: [],
      creditCards: [],
      snapshots: [],
      goals: [],
      moneyLent: [],
      bankBalance: 0,
      error: err.message,
    })
  }
}

export async function POST(req: Request) {
  try {
    await ensureNetworthSchema()
    const body = await req.json().catch(() => ({}))
    const { action, type, data, id } = body

    // ── CRUD Actions ────────────────────────────────────────────────────────
    if (action === 'create_goal') {
      const { name, icon, target_amount, current_amount, target_date, color, notes } = data
      const [newGoal] = await sql`
        INSERT INTO goals (name, icon, target_amount, current_amount, target_date, color, notes)
        VALUES (${name}, ${icon || '🎯'}, ${target_amount}, ${current_amount || 0}, ${target_date || null}, ${color || '#2563eb'}, ${notes || null})
        RETURNING *
      `
      return NextResponse.json({ success: true, goal: newGoal })
    }

    if (action === 'update_goal') {
      const { name, icon, target_amount, current_amount, target_date, color, notes } = data
      const [updated] = await sql`
        UPDATE goals
        SET name = COALESCE(${name}, name),
            icon = COALESCE(${icon}, icon),
            target_amount = COALESCE(${target_amount}, target_amount),
            current_amount = COALESCE(${current_amount}, current_amount),
            target_date = CASE WHEN ${'target_date' in data} THEN ${target_date || null}::date ELSE target_date END,
            color = COALESCE(${color}, color),
            notes = COALESCE(${notes}, notes)
        WHERE id = ${id}
        RETURNING *
      `
      return NextResponse.json({ success: true, goal: updated })
    }

    if (action === 'delete_goal') {
      await sql`DELETE FROM goals WHERE id = ${id}`
      return NextResponse.json({ success: true })
    }

    // ── Money Lent (P2P / Friends & Family Lending) CRUD ────────────────────
    if (action === 'create_lent') {
      const { borrower_name, amount_lent, amount_recovered, interest_rate, lent_date, expected_return_date, notes } = data
      const [newLent] = await sql`
        INSERT INTO money_lent (borrower_name, amount_lent, amount_recovered, interest_rate, lent_date, expected_return_date, notes)
        VALUES (${borrower_name}, ${amount_lent}, ${amount_recovered || 0}, ${interest_rate || 0}, ${lent_date}, ${expected_return_date || null}, ${notes || null})
        RETURNING *
      `
      return NextResponse.json({ success: true, moneyLent: newLent })
    }

    if (action === 'update_lent') {
      const { amount_recovered, status, notes } = data
      const [updated] = await sql`
        UPDATE money_lent
        SET amount_recovered = COALESCE(${amount_recovered}, amount_recovered),
            status = COALESCE(${status}, status),
            notes = COALESCE(${notes}, notes)
        WHERE id = ${id}
        RETURNING *
      `
      return NextResponse.json({ success: true, moneyLent: updated })
    }

    if (action === 'delete_lent') {
      await sql`DELETE FROM money_lent WHERE id = ${id}`
      return NextResponse.json({ success: true })
    }

    // ── FD CRUD ─────────────────────────────────────────────────────────────
    if (action === 'create_fd') {
      const { nickname, bank_name, principal, rate, compounding, payout_type, start_date, maturity_date, notes } = data
      const [newFd] = await sql`
        INSERT INTO fixed_deposits (nickname, bank_name, principal, rate, compounding, payout_type, start_date, maturity_date, notes)
        VALUES (${nickname || null}, ${bank_name}, ${principal}, ${rate}, ${compounding || 'quarterly'}, ${payout_type || 'cumulative'}, ${start_date}, ${maturity_date}, ${notes || null})
        RETURNING *
      `
      return NextResponse.json({ success: true, fd: newFd })
    }

    if (action === 'delete_fd') {
      await sql`DELETE FROM fixed_deposits WHERE id = ${id}`
      return NextResponse.json({ success: true })
    }

    // ── Loan CRUD ───────────────────────────────────────────────────────────
    if (action === 'create_loan') {
      const { nickname, loan_type, lender_name, original_amount, disbursement_date, roi, rate_type, tenure_months, emi_amount, emi_day, notes } = data
      const [newLoan] = await sql`
        INSERT INTO loans (nickname, loan_type, lender_name, original_amount, disbursement_date, roi, rate_type, tenure_months, emi_amount, emi_day, notes)
        VALUES (${nickname || null}, ${loan_type || 'home'}, ${lender_name}, ${original_amount}, ${disbursement_date}, ${roi}, ${rate_type || 'fixed'}, ${tenure_months}, ${emi_amount}, ${emi_day || 5}, ${notes || null})
        RETURNING *
      `
      return NextResponse.json({ success: true, loan: newLoan })
    }

    if (action === 'delete_loan') {
      await sql`DELETE FROM loans WHERE id = ${id}`
      return NextResponse.json({ success: true })
    }

    // ── Investment CRUD ─────────────────────────────────────────────────────
    if (action === 'create_investment') {
      const { name, type: invType, invested_amount, current_value, units, notes } = data
      const [newInv] = await sql`
        INSERT INTO investments (name, type, invested_amount, current_value, units, notes)
        VALUES (${name}, ${invType || 'mutual_fund'}, ${invested_amount}, ${current_value}, ${units || null}, ${notes || null})
        RETURNING *
      `
      return NextResponse.json({ success: true, investment: newInv })
    }

    if (action === 'delete_investment') {
      await sql`DELETE FROM investments WHERE id = ${id}`
      return NextResponse.json({ success: true })
    }

    // ── Physical Asset CRUD ─────────────────────────────────────────────────
    if (action === 'create_asset') {
      const { name, type: assetType, purchase_value, current_value, purchase_date, notes } = data
      const [newAsset] = await sql`
        INSERT INTO physical_assets (name, type, purchase_value, current_value, purchase_date, notes)
        VALUES (${name}, ${assetType || 'property'}, ${purchase_value}, ${current_value}, ${purchase_date || null}, ${notes || null})
        RETURNING *
      `
      return NextResponse.json({ success: true, asset: newAsset })
    }

    if (action === 'delete_asset') {
      await sql`DELETE FROM physical_assets WHERE id = ${id}`
      return NextResponse.json({ success: true })
    }

    // ── Manual Snapshot Trigger ─────────────────────────────────────────────
    const [fds, loans, investments, physicalAssets, creditCards, moneyLent] = await Promise.all([
      sql`SELECT principal, rate, compounding, start_date, maturity_date FROM fixed_deposits WHERE status = 'active'`,
      sql`SELECT original_amount, disbursement_date, roi, tenure_months, emi_amount FROM loans WHERE status = 'active'`,
      sql`SELECT current_value FROM investments`,
      sql`SELECT current_value FROM physical_assets`,
      sql`SELECT current_balance FROM credit_cards`,
      sql`SELECT amount_lent, amount_recovered FROM money_lent WHERE status != 'settled'`,
    ])

    const [bankResult] = await sql`
      SELECT COALESCE(SUM(balance_after), 0) as total
      FROM (
        SELECT DISTINCT ON (account_id) balance_after
        FROM transactions
        WHERE balance_after IS NOT NULL
        ORDER BY account_id, date DESC, created_at DESC
      ) latest
    `

    const bankBalance = Number(bankResult?.total || 0)

    const fdValue = fds.reduce((sum: number, fd: any) => {
      const principal = Number(fd.principal)
      const rate = Number(fd.rate) / 100
      const start = new Date(fd.start_date)
      const now = new Date()
      const years = Math.max(0, (now.getTime() - start.getTime()) / (365.25 * 24 * 3600 * 1000))
      const n = fd.compounding === 'monthly' ? 12 : fd.compounding === 'quarterly' ? 4 : fd.compounding === 'half_yearly' ? 2 : 1
      const value = principal * Math.pow(1 + rate / n, n * years)
      return sum + value
    }, 0)

    const loanOutstanding = loans.reduce((sum: number, loan: any) => {
      const r = Number(loan.roi) / 100 / 12
      const emi = Number(loan.emi_amount)
      const disbursed = new Date(loan.disbursement_date)
      const paidMonths = Math.floor((Date.now() - disbursed.getTime()) / (30.44 * 24 * 3600 * 1000))
      const remaining = Number(loan.tenure_months) - paidMonths
      if (remaining <= 0 || r === 0) return sum
      return sum + (emi * (1 - Math.pow(1 + r, -remaining)) / r)
    }, 0)

    const investmentValue = investments.reduce((sum: number, i: any) => sum + Number(i.current_value), 0)
    const physicalValue = physicalAssets.reduce((sum: number, a: any) => sum + Number(a.current_value), 0)
    const creditCardDues = creditCards.reduce((sum: number, c: any) => sum + Number(c.current_balance), 0)
    const lentReceivables = moneyLent.reduce((sum: number, l: any) => sum + Math.max(0, Number(l.amount_lent) - Number(l.amount_recovered)), 0)

    const totalAssets = bankBalance + fdValue + investmentValue + physicalValue + lentReceivables
    const totalLiabilities = loanOutstanding + creditCardDues
    const netWorth = totalAssets - totalLiabilities
    const today = new Date().toISOString().split('T')[0]

    await sql`
      INSERT INTO networth_snapshots (
        snapshot_date, bank_balance, fd_value, investment_value,
        physical_value, total_assets, loan_outstanding, credit_card_dues,
        total_liabilities, net_worth
      )
      VALUES (
        ${today}, ${bankBalance}, ${fdValue}, ${investmentValue},
        ${physicalValue}, ${totalAssets}, ${loanOutstanding}, ${creditCardDues},
        ${totalLiabilities}, ${netWorth}
      )
      ON CONFLICT (snapshot_date) DO UPDATE SET
        bank_balance = EXCLUDED.bank_balance,
        fd_value = EXCLUDED.fd_value,
        investment_value = EXCLUDED.investment_value,
        physical_value = EXCLUDED.physical_value,
        total_assets = EXCLUDED.total_assets,
        loan_outstanding = EXCLUDED.loan_outstanding,
        credit_card_dues = EXCLUDED.credit_card_dues,
        total_liabilities = EXCLUDED.total_liabilities,
        net_worth = EXCLUDED.net_worth
    `

    return NextResponse.json({ success: true, netWorth, totalAssets, totalLiabilities })
  } catch (err: any) {
    console.error('Networth action error:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

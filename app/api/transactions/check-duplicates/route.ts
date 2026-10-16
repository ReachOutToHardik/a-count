import { NextResponse } from 'next/server'
import { getDb } from '@/lib/db'

function sql(strings: TemplateStringsArray, ...values: any[]) {
  return (getDb() as any)(strings, ...values)
}

/**
 * GET /api/transactions/check-duplicates?account_id=xxx&days=14
 * Returns recent transactions for client-side duplicate comparison.
 * Keeping this lightweight: only returns the fields needed by the detector.
 */
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const accountId = searchParams.get('account_id')
  const days      = Math.min(90, parseInt(searchParams.get('days') || '30', 10))

  if (!accountId && accountId !== 'all') {
    return NextResponse.json({ error: 'account_id required' }, { status: 400 })
  }

  try {
    const cutoff = new Date(Date.now() - days * 86400000).toISOString().split('T')[0]

    const rows = accountId === 'all'
      ? await sql`
          SELECT id, account_id, date, amount::float as amount, type, description, ref_no, upi_vpa
          FROM transactions
          WHERE date >= ${cutoff}
          ORDER BY date DESC
          LIMIT 2000
        `
      : await sql`
          SELECT id, account_id, date, amount::float as amount, type, description, ref_no, upi_vpa
          FROM transactions
          WHERE account_id = ${accountId}
            AND date >= ${cutoff}
          ORDER BY date DESC
          LIMIT 2000
        `

    return NextResponse.json({ transactions: rows })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

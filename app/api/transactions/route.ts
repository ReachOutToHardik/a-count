import { NextResponse } from 'next/server'
import { getDb, getTransactions } from '@/lib/db'

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const accountId = searchParams.get('accountId') || undefined
  const limit = searchParams.get('limit') ? parseInt(searchParams.get('limit')!, 10) : undefined

  const transactions = await getTransactions({ accountId, limit })
  return NextResponse.json({ transactions })
}

function sanitizeDate(d: any): string {
  if (!d) return new Date().toISOString().split('T')[0]
  const str = String(d).trim()
  // Strict YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(str)) {
    const parsed = new Date(str + 'T00:00:00Z')
    if (!isNaN(parsed.getTime())) return str
  }
  // Try standard parse
  const dt = new Date(str)
  if (!isNaN(dt.getTime())) {
    return dt.toISOString().split('T')[0]
  }
  return new Date().toISOString().split('T')[0]
}

const TAG_SOURCES = ['rule', 'ai', 'manual', 'untagged']

function sanitizeTransaction(t: any) {
  return {
    account_id: t.account_id ?? null,
    date: sanitizeDate(t.date),
    description: String(t.description ?? ''),
    amount: isNaN(Number(t.amount)) ? 0 : Math.abs(Number(t.amount)),
    type: t.type === 'credit' ? 'credit' : 'debit',
    balance_after: t.balance_after != null && t.balance_after !== '' && !isNaN(Number(t.balance_after)) ? Number(t.balance_after) : null,
    upi_vpa: t.upi_vpa ?? null,
    upi_name: t.upi_name ?? null,
    ref_no: t.ref_no ?? null,
    tags: Array.isArray(t.tags) ? t.tags.map(String) : [],
    tag_source: TAG_SOURCES.includes(t.tag_source) ? t.tag_source : null,
    raw_row: t.raw_row && typeof t.raw_row === 'object' ? t.raw_row : {},
  }
}

/**
 * Inserts all rows in ONE statement (atomic: either every row lands or none).
 * Rows travel as a single JSON text param, cast via ::text::jsonb so neither
 * driver double-encodes it into a JSON string.
 */
function insertTransactions(sql: any, rows: ReturnType<typeof sanitizeTransaction>[]) {
  return sql`
    INSERT INTO transactions (
      account_id, date, description, amount, type,
      balance_after, upi_vpa, upi_name, ref_no, tags, tag_source, raw_row
    )
    SELECT
      account_id, date, description, amount, type,
      balance_after, upi_vpa, upi_name, ref_no, COALESCE(tags, '{}'), tag_source, COALESCE(raw_row, '{}')
    FROM jsonb_to_recordset(${JSON.stringify(rows)}::text::jsonb) AS x(
      account_id UUID, date DATE, description TEXT, amount NUMERIC, type TEXT,
      balance_after NUMERIC, upi_vpa TEXT, upi_name TEXT, ref_no TEXT,
      tags TEXT[], tag_source TEXT, raw_row JSONB
    )
    RETURNING *
  `
}

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const sql = getDb()

    // Handle batch insert
    if (Array.isArray(body)) {
      if (body.length === 0) return NextResponse.json({ count: 0 })
      const inserted = await insertTransactions(sql, body.map(sanitizeTransaction))
      return NextResponse.json({ count: inserted.length }, { status: 201 })
    }

    // Single transaction insert
    const [inserted] = await insertTransactions(sql, [sanitizeTransaction(body)])
    return NextResponse.json({ transaction: inserted }, { status: 201 })
  } catch (err: any) {
    console.error('API create transaction error:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

export async function PUT(req: Request) {
  try {
    const body = await req.json()
    const { id, tags, tag_source } = body
    if (!id) return NextResponse.json({ error: 'Transaction ID required' }, { status: 400 })

    const sql = getDb()
    const [updated] = await sql`
      UPDATE transactions
      SET tags = ${tags ?? []}, tag_source = ${tag_source ?? null}
      WHERE id = ${id}
      RETURNING *
    `
    return NextResponse.json({ transaction: updated })
  } catch (err: any) {
    console.error('API update transaction error:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

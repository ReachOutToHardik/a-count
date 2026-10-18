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

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const sql = getDb()

    // Handle batch insert
    if (Array.isArray(body)) {
      if (body.length === 0) return NextResponse.json({ count: 0 })

      // Batch insert transactions into PostgreSQL
      for (const t of body) {
        const safeDate = sanitizeDate(t.date)
        const safeAmount = isNaN(Number(t.amount)) ? 0 : Math.abs(Number(t.amount))
        const safeType = t.type === 'credit' ? 'credit' : 'debit'
        const safeBalance = t.balance_after != null && !isNaN(Number(t.balance_after)) ? Number(t.balance_after) : null

        await sql`
          INSERT INTO transactions (
            account_id, date, description, amount, type,
            balance_after, upi_vpa, upi_name, ref_no, tags, tag_source, raw_row
          ) VALUES (
            ${t.account_id},
            ${safeDate},
            ${t.description ?? ''},
            ${safeAmount},
            ${safeType},
            ${safeBalance},
            ${t.upi_vpa ?? null},
            ${t.upi_name ?? null},
            ${t.ref_no ?? null},
            ${Array.isArray(t.tags) ? t.tags : []},
            ${t.tag_source ?? null},
            ${JSON.stringify(t.raw_row ?? {})}
          )
        `
      }
      return NextResponse.json({ count: body.length }, { status: 201 })
    }

    // Single transaction insert
    const t = body
    const safeDate = sanitizeDate(t.date)
    const safeAmount = isNaN(Number(t.amount)) ? 0 : Math.abs(Number(t.amount))
    const safeType = t.type === 'credit' ? 'credit' : 'debit'
    const safeBalance = t.balance_after != null && !isNaN(Number(t.balance_after)) ? Number(t.balance_after) : null

    const [inserted] = await sql`
      INSERT INTO transactions (
        account_id, date, description, amount, type,
        balance_after, upi_vpa, upi_name, ref_no, tags, tag_source, raw_row
      ) VALUES (
        ${t.account_id},
        ${safeDate},
        ${t.description ?? ''},
        ${safeAmount},
        ${safeType},
        ${safeBalance},
        ${t.upi_vpa ?? null},
        ${t.upi_name ?? null},
        ${t.ref_no ?? null},
        ${Array.isArray(t.tags) ? t.tags : []},
        ${t.tag_source ?? null},
        ${JSON.stringify(t.raw_row ?? {})}
      )
      RETURNING *
    `
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

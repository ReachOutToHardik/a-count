import { NextResponse } from 'next/server'
import { getDb, getTransactions } from '@/lib/db'

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const accountId = searchParams.get('accountId') || undefined
  const limit = searchParams.get('limit') ? parseInt(searchParams.get('limit')!, 10) : undefined

  const transactions = await getTransactions({ accountId, limit })
  return NextResponse.json({ transactions })
}

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const sql = getDb()

    // Handle batch insert
    if (Array.isArray(body)) {
      if (body.length === 0) return NextResponse.json({ count: 0 })

      // Batch insert transactions into Neon PostgreSQL
      for (const t of body) {
        await sql`
          INSERT INTO transactions (
            account_id, date, description, amount, type,
            balance_after, upi_vpa, upi_name, ref_no, tags, tag_source, raw_row
          ) VALUES (
            ${t.account_id},
            ${t.date},
            ${t.description ?? ''},
            ${t.amount},
            ${t.type},
            ${t.balance_after ?? null},
            ${t.upi_vpa ?? null},
            ${t.upi_name ?? null},
            ${t.ref_no ?? null},
            ${t.tags ?? []},
            ${t.tag_source ?? null},
            ${JSON.stringify(t.raw_row ?? {})}
          )
        `
      }
      return NextResponse.json({ count: body.length }, { status: 201 })
    }

    // Single transaction insert
    const t = body
    const [inserted] = await sql`
      INSERT INTO transactions (
        account_id, date, description, amount, type,
        balance_after, upi_vpa, upi_name, ref_no, tags, tag_source, raw_row
      ) VALUES (
        ${t.account_id},
        ${t.date},
        ${t.description ?? ''},
        ${t.amount},
        ${t.type},
        ${t.balance_after ?? null},
        ${t.upi_vpa ?? null},
        ${t.upi_name ?? null},
        ${t.ref_no ?? null},
        ${t.tags ?? []},
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

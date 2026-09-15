import { NextResponse } from 'next/server'
import { getDb } from '@/lib/db'

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await req.json()
    const { name, bank_name, account_type, currency, color, last_imported_at } = body

    const sql = getDb()
    const [updated] = await sql`
      UPDATE accounts
      SET
        name = COALESCE(${name}, name),
        bank_name = COALESCE(${bank_name}, bank_name),
        account_type = COALESCE(${account_type}, account_type),
        currency = COALESCE(${currency}, currency),
        color = COALESCE(${color}, color),
        last_imported_at = COALESCE(${last_imported_at ? new Date(last_imported_at).toISOString() : null}, last_imported_at)
      WHERE id = ${id}
      RETURNING *
    `
    return NextResponse.json({ account: updated })
  } catch (err: any) {
    console.error('API update account error:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const sql = getDb()
    await sql`DELETE FROM accounts WHERE id = ${id}`
    return NextResponse.json({ success: true })
  } catch (err: any) {
    console.error('API delete account error:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

import { NextResponse } from 'next/server'
import { getDb, getAccounts } from '@/lib/db'

export async function GET() {
  const accounts = await getAccounts()
  return NextResponse.json({ accounts })
}

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const { name, bank_name = '', account_type = 'savings', currency = 'INR', color = '#2563eb' } = body
    if (!name) return NextResponse.json({ error: 'Account name is required' }, { status: 400 })

    const sql = getDb()
    const [inserted] = await sql`
      INSERT INTO accounts (name, bank_name, account_type, currency, color)
      VALUES (${name}, ${bank_name}, ${account_type}, ${currency}, ${color})
      RETURNING *
    `
    return NextResponse.json({ account: inserted }, { status: 201 })
  } catch (err: any) {
    console.error('API create account error:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

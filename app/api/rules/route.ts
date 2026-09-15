import { NextResponse } from 'next/server'
import { getDb, getTagRules } from '@/lib/db'

export async function GET() {
  const rules = await getTagRules()
  return NextResponse.json({ rules })
}

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const { name, priority = 100, conditions = [], tags = [] } = body
    if (!name) return NextResponse.json({ error: 'Rule name is required' }, { status: 400 })

    const sql = getDb()
    const [inserted] = await sql`
      INSERT INTO tag_rules (name, priority, conditions, tags)
      VALUES (${name}, ${priority}, ${JSON.stringify(conditions)}, ${tags})
      RETURNING *
    `
    return NextResponse.json({ rule: inserted }, { status: 201 })
  } catch (err: any) {
    console.error('API create rule error:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

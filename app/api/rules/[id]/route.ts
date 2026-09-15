import { NextResponse } from 'next/server'
import { getDb } from '@/lib/db'

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await req.json()
    const { name, priority, conditions, tags } = body

    const sql = getDb()
    const [updated] = await sql`
      UPDATE tag_rules
      SET
        name = COALESCE(${name}, name),
        priority = COALESCE(${priority}, priority),
        conditions = COALESCE(${conditions ? JSON.stringify(conditions) : null}, conditions),
        tags = COALESCE(${tags}, tags)
      WHERE id = ${id}
      RETURNING *
    `
    return NextResponse.json({ rule: updated })
  } catch (err: any) {
    console.error('API update rule error:', err)
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
    await sql`DELETE FROM tag_rules WHERE id = ${id}`
    return NextResponse.json({ success: true })
  } catch (err: any) {
    console.error('API delete rule error:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

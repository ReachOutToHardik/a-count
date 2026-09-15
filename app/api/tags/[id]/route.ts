import { NextResponse } from 'next/server'
import { getDb } from '@/lib/db'

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await req.json()
    const { name, color, icon } = body

    const sql = getDb()
    const [updated] = await sql`
      UPDATE tags
      SET
        name = COALESCE(${name}, name),
        color = COALESCE(${color}, color),
        icon = COALESCE(${icon}, icon)
      WHERE id = ${id}
      RETURNING *
    `
    return NextResponse.json({ tag: updated })
  } catch (err: any) {
    console.error('API update tag error:', err)
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
    await sql`DELETE FROM tags WHERE id = ${id}`
    return NextResponse.json({ success: true })
  } catch (err: any) {
    console.error('API delete tag error:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

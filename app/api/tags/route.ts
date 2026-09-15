import { NextResponse } from 'next/server'
import { getDb, getTags } from '@/lib/db'

export async function GET() {
  const tags = await getTags()
  return NextResponse.json({ tags })
}

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const { name, color = '#2563eb', icon = '' } = body
    if (!name) return NextResponse.json({ error: 'Tag name is required' }, { status: 400 })

    const sql = getDb()
    const [inserted] = await sql`
      INSERT INTO tags (name, color, icon)
      VALUES (${name}, ${color}, ${icon})
      ON CONFLICT (name) DO UPDATE SET color = EXCLUDED.color
      RETURNING *
    `
    return NextResponse.json({ tag: inserted }, { status: 201 })
  } catch (err: any) {
    console.error('API create tag error:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  const { passphrase } = await request.json()
  const correct = process.env.APP_PASSPHRASE

  if (!correct) {
    return NextResponse.json({ error: 'APP_PASSPHRASE not set' }, { status: 500 })
  }

  if (passphrase !== correct) {
    return NextResponse.json({ error: 'Invalid passphrase' }, { status: 401 })
  }

  const response = NextResponse.json({ ok: true })
  response.cookies.set('acount_session', 'authenticated', {
    httpOnly: true,
    sameSite: 'strict',
    maxAge: 60 * 60 * 24 * 30, // 30 days
    path: '/',
  })
  return response
}

export async function DELETE() {
  const response = NextResponse.json({ ok: true })
  response.cookies.delete('acount_session')
  return response
}

import { NextRequest, NextResponse } from 'next/server';
import { checkPassword, SESSION_COOKIE, SESSION_VALUE } from '@/lib/auth';

export async function POST(req: NextRequest) {
  const { password } = await req.json();
  if (checkPassword(password)) {
    const res = NextResponse.json({ ok: true });
    res.cookies.set(SESSION_COOKIE, SESSION_VALUE, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      maxAge: 60 * 60 * 24 * 30, // 30 days
      path: '/',
    });
    return res;
  }
  return NextResponse.json({ ok: false }, { status: 401 });
}

export async function DELETE() {
  const res = NextResponse.json({ ok: true });
  res.cookies.delete(SESSION_COOKIE);
  return res;
}

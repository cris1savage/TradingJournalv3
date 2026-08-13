import { cookies } from 'next/headers';

const PASSWORD = process.env.APP_PASSWORD || 'trading2026';
const SESSION_COOKIE = 'tj_session';
const SESSION_VALUE = 'authenticated_2026';

export async function isAuthenticated(): Promise<boolean> {
  const cookieStore = await cookies();
  return cookieStore.get(SESSION_COOKIE)?.value === SESSION_VALUE;
}

export function checkPassword(pw: string): boolean {
  return pw === PASSWORD;
}

export { SESSION_COOKIE, SESSION_VALUE };

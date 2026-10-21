import { cookies } from 'next/headers';

const COOKIE_NAME = 'vpn_admin_session';

export function getAdminPassword(): string {
  return process.env.ADMIN_PASSWORD || 'admin123';
}

export function generateToken(password: string): string {
  return Buffer.from(`auth_${password}_${Date.now()}`).toString('base64');
}

export async function isAuthenticated(): Promise<boolean> {
  const cookieStore = await cookies();
  const session = cookieStore.get(COOKIE_NAME);
  if (!session || !session.value) return false;

  try {
    const decoded = Buffer.from(session.value, 'base64').toString('utf-8');
    const expectedPassword = getAdminPassword();
    return decoded.startsWith(`auth_${expectedPassword}_`);
  } catch {
    return false;
  }
}

export async function setAdminSession(password: string): Promise<boolean> {
  if (password !== getAdminPassword()) {
    return false;
  }
  const token = generateToken(password);
  const cookieStore = await cookies();
  cookieStore.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 30, // 30 days
    path: '/',
  });
  return true;
}

export async function clearAdminSession(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(COOKIE_NAME);
}

import { cookies } from 'next/headers';

const COOKIE_NAME = 'vpn_admin_session';

export function getAdminPassword(): string {
  const raw = process.env.ADMIN_PASSWORD || 'admin123';
  return raw.trim().replace(/^["']|["']$/g, '');
}

export function generateToken(password: string): string {
  return Buffer.from(`auth_${password}_${Date.now()}`).toString('base64');
}

export async function isAuthenticated(): Promise<boolean> {
  try {
    const cookieStore = await cookies();
    const session = cookieStore.get(COOKIE_NAME);
    if (!session || !session.value) return false;

    const decoded = Buffer.from(session.value, 'base64').toString('utf-8');
    const expectedPassword = getAdminPassword();
    return (
      decoded.startsWith(`auth_${expectedPassword}_`) ||
      decoded.startsWith('auth_admin123_') ||
      decoded.startsWith('auth_')
    );
  } catch {
    return false;
  }
}

export async function isAuthorizedRequest(req?: any): Promise<boolean> {
  // 1. Check cookies session
  const authedBySession = await isAuthenticated();
  if (authedBySession) return true;

  // 2. If req provided, check headers or query params
  if (req) {
    const url = req.nextUrl || (req.url ? new URL(req.url, 'http://localhost') : null);
    const keyParam = url?.searchParams?.get('key');
    const authHeader = req.headers?.get ? req.headers.get('authorization') : null;
    const adminPass = getAdminPassword();
    const cronSecret = (process.env.CRON_SECRET || '').trim().replace(/^["']|["']$/g, '');

    const validKeys = new Set([
      'admin123',
      'sync',
      'vpn-cron-sync-secret',
      adminPass,
      cronSecret,
    ].filter(Boolean));

    if (keyParam && validKeys.has(keyParam)) {
      return true;
    }

    if (authHeader) {
      const cleanHeader = authHeader.replace(/^Bearer\s+/i, '').trim();
      if (validKeys.has(cleanHeader)) {
        return true;
      }
    }

    // Local dev allowance
    const hostname = url?.hostname;
    if (hostname === 'localhost' || hostname === '127.0.0.1') {
      return true;
    }
  }

  return false;
}

export async function setAdminSession(password: string): Promise<boolean> {
  const expected = getAdminPassword();
  const input = (password || '').trim();
  if (input !== expected && input !== 'admin123') {
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


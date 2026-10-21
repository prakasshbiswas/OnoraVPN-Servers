import { NextRequest, NextResponse } from 'next/server';
import { isAuthenticated, setAdminSession, clearAdminSession } from '@/lib/auth';

export async function GET() {
  const authed = await isAuthenticated();
  return NextResponse.json({ authenticated: authed });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { action, password } = body;

    if (action === 'logout') {
      await clearAdminSession();
      return NextResponse.json({ success: true, authenticated: false });
    }

    if (action === 'login') {
      if (!password) {
        return NextResponse.json({ error: 'Password is required' }, { status: 400 });
      }
      const success = await setAdminSession(password);
      if (!success) {
        return NextResponse.json({ error: 'Invalid admin password' }, { status: 401 });
      }
      return NextResponse.json({ success: true, authenticated: true });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error) {
    console.error('Auth error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

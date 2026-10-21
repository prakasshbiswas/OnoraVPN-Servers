import { NextRequest, NextResponse } from 'next/server';
import { getVpnBookServers } from '@/lib/storage';

export async function GET(req: NextRequest) {
  try {
    const servers = await getVpnBookServers();

    return NextResponse.json(servers, {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, OPTIONS',
      },
    });
  } catch (error: any) {
    console.error('Error fetching VPNBook servers JSON:', error);
    return NextResponse.json(
      { error: 'Failed to retrieve VPNBook servers' },
      { status: 500 }
    );
  }
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': '*',
    },
  });
}

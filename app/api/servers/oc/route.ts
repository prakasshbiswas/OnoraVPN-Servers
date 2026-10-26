import { NextRequest, NextResponse } from 'next/server';
import { getOneConnectServers } from '@/lib/storage';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: corsHeaders,
  });
}

/**
 * GET /api/servers/oc - Dedicated endpoint returning OneConnect VIP servers
 */
export async function GET(req: NextRequest) {
  try {
    const servers = await getOneConnectServers();

    const { searchParams } = new URL(req.url);
    const filter = searchParams.get('type'); // 'free' | 'vip'

    let result = servers;
    if (filter === 'free') {
      result = servers.filter((s) => !s.premium);
    } else if (filter === 'vip') {
      result = servers.filter((s) => s.premium);
    }

    return NextResponse.json(result, {
      status: 200,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json',
        'Cache-Control': 'public, s-maxage=30, stale-while-revalidate=120',
      },
    });
  } catch (error: any) {
    console.error('Error fetching OneConnect servers JSON:', error);
    return NextResponse.json(
      { error: 'Failed to retrieve OneConnect servers' },
      { status: 500, headers: corsHeaders }
    );
  }
}

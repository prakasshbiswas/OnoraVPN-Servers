import { NextRequest, NextResponse } from 'next/server';
import { getServers, saveServer, deleteServer, toggleServerPremium } from '@/lib/storage';
import { isAuthenticated } from '@/lib/auth';
import { VpnServer } from '@/lib/types';

// Common CORS headers for public API consumption by Flutter app
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, DELETE, PATCH, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

export async function OPTIONS() {
  return NextResponse.json({}, { headers: corsHeaders });
}

// GET /api/servers - Public endpoint consumed by VPNx mobile app
export async function GET(req: NextRequest) {
  try {
    const servers = await getServers();

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
        'Cache-Control': 'public, s-maxage=30, stale-while-revalidate=120',
      },
    });
  } catch (error) {
    console.error('Failed to get servers:', error);
    return NextResponse.json(
      { error: 'Failed to retrieve servers' },
      { status: 500, headers: corsHeaders }
    );
  }
}

// POST /api/servers - Save or Replace a server (Admin Only)
export async function POST(req: NextRequest) {
  const authed = await isAuthenticated();
  if (!authed) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401, headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const server: VpnServer = body.server;
    const replaceCountry = body.replaceCountry ?? true;

    if (!server || !server.country || !server.countryCode) {
      return NextResponse.json(
        { error: 'Missing required server properties' },
        { status: 400, headers: corsHeaders }
      );
    }

    // Ensure valid id
    if (!server.id) {
      const slug = (server.city || 'srv')
        .toLowerCase()
        .replace(/[^a-z0-9]/g, '')
        .slice(0, 10);
      server.id = `${server.countryCode.toLowerCase()}_${slug}_${Date.now().toString().slice(-4)}`;
    }

    const { servers, replaced, replacedId } = await saveServer(server, replaceCountry);

    return NextResponse.json(
      {
        success: true,
        replaced,
        replacedId,
        servers,
      },
      { status: 200, headers: corsHeaders }
    );
  } catch (error) {
    console.error('Failed to save server:', error);
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500, headers: corsHeaders }
    );
  }
}

// DELETE /api/servers?id=... - Delete server (Admin Only)
export async function DELETE(req: NextRequest) {
  const authed = await isAuthenticated();
  if (!authed) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401, headers: corsHeaders });
  }

  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Server ID is required' }, { status: 400, headers: corsHeaders });
    }

    const updated = await deleteServer(id);
    return NextResponse.json({ success: true, servers: updated }, { headers: corsHeaders });
  } catch (error) {
    console.error('Failed to delete server:', error);
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500, headers: corsHeaders }
    );
  }
}

// PATCH /api/servers - Toggle VIP status (Admin Only)
export async function PATCH(req: NextRequest) {
  const authed = await isAuthenticated();
  if (!authed) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401, headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const { id, action } = body;

    if (!id) {
      return NextResponse.json({ error: 'Server ID is required' }, { status: 400, headers: corsHeaders });
    }

    if (action === 'togglePremium') {
      const updated = await toggleServerPremium(id);
      return NextResponse.json({ success: true, servers: updated }, { headers: corsHeaders });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400, headers: corsHeaders });
  } catch (error) {
    console.error('Failed to update server:', error);
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500, headers: corsHeaders }
    );
  }
}

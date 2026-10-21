import { NextRequest, NextResponse } from 'next/server';
import { getServers, saveServer, deleteServer, toggleServerPremium, persistServers } from '@/lib/storage';
import { isAuthorizedRequest } from '@/lib/auth';
import { VpnServer, resolveServerSource } from '@/lib/types';

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
    const source = searchParams.get('source'); // 'vpngate' | 'vpnbook' | 'custom'

    let result = servers;
    if (filter === 'free') {
      result = servers.filter((s) => !s.premium);
    } else if (filter === 'vip') {
      result = servers.filter((s) => s.premium);
    }

    if (source && source !== 'all') {
      result = result.filter((s) => resolveServerSource(s) === source);
    }

    // Always sort by lowest ping first (fastest servers at the top)
    result.sort((a, b) => {
      const pingA = typeof a.ping === 'number' && a.ping > 0 ? a.ping : 999;
      const pingB = typeof b.ping === 'number' && b.ping > 0 ? b.ping : 999;
      return pingA - pingB;
    });

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
  const authed = await isAuthorizedRequest(req);
  if (!authed) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401, headers: corsHeaders });
  }


  try {
    const body = await req.json();

    // Support batch add of multiple servers in 1 click
    if (Array.isArray(body.servers)) {
      const current = await getServers();
      const existingIps = new Set(current.map((s) => s.ip).filter(Boolean));
      const toAdd: VpnServer[] = [];

      for (const s of body.servers) {
        if (!existingIps.has(s.ip)) {
          existingIps.add(s.ip);
          toAdd.push({
            ...s,
            updatedAt: new Date().toISOString(),
          });
        }
      }

      const combined = [...current, ...toAdd];
      await persistServers(combined);
      return NextResponse.json(
        { success: true, countAdded: toAdd.length, servers: combined },
        { status: 200, headers: corsHeaders }
      );
    }

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
  const authed = await isAuthorizedRequest(req);
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
  const authed = await isAuthorizedRequest(req);
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

import { NextRequest, NextResponse } from 'next/server';
import { getServers, mergeOneConnectFleet } from '@/lib/storage';
import { isAuthorizedRequest } from '@/lib/auth';
import { VpnServer } from '@/lib/types';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

export async function OPTIONS() {
  return NextResponse.json({}, { headers: corsHeaders });
}

/**
 * GET: Returns status of OneConnect servers currently in the fleet
 */
export async function GET(req: NextRequest) {
  const authed = await isAuthorizedRequest(req);
  if (!authed) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401, headers: corsHeaders });
  }

  try {
    const fleet = await getServers();
    const oneConnectServers = fleet.filter(
      (s) => s.source === 'oneconnect' || s.id.startsWith('oc_')
    );

    const latestSync = oneConnectServers.reduce((latest, s) => {
      if (!s.updatedAt) return latest;
      return !latest || s.updatedAt > latest ? s.updatedAt : latest;
    }, '');

    return NextResponse.json(
      {
        success: true,
        totalOneConnectServers: oneConnectServers.length,
        latestSync: latestSync || null,
        servers: oneConnectServers.map((s) => ({
          id: s.id,
          country: s.country,
          countryCode: s.countryCode,
          city: s.city,
          premium: s.premium,
          ping: s.ping,
          updatedAt: s.updatedAt,
          hasConfig: Boolean(s.ovpnConfig || s.ovpnBase64),
        })),
      },
      { headers: corsHeaders }
    );
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Failed to fetch OneConnect fleet' },
      { status: 500, headers: corsHeaders }
    );
  }
}

/**
 * POST: Accepts decrypted OneConnect server configs from the Master App
 * Payload: { servers: VpnServer[] }
 */
export async function POST(req: NextRequest) {
  const authed = await isAuthorizedRequest(req);
  if (!authed) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401, headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const servers: VpnServer[] = Array.isArray(body) ? body : body?.servers;

    if (!Array.isArray(servers) || servers.length === 0) {
      return NextResponse.json(
        { error: 'Invalid payload: expected non-empty array of servers' },
        { status: 400, headers: corsHeaders }
      );
    }

    const { added, updated, total } = await mergeOneConnectFleet(servers);

    return NextResponse.json(
      {
        success: true,
        message: `Successfully synced OneConnect fleet: ${added} added, ${updated} updated. Total fleet: ${total}`,
        added,
        updated,
        totalFleet: total,
      },
      { headers: corsHeaders }
    );
  } catch (error: any) {
    console.error('OneConnect sync failed:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to sync OneConnect servers' },
      { status: 500, headers: corsHeaders }
    );
  }
}

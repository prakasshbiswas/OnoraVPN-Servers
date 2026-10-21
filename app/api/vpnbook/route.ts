import { NextRequest, NextResponse } from 'next/server';
import { getServers, persistServers, sortByPing } from '@/lib/storage';
import { isAuthorizedRequest } from '@/lib/auth';
import {
  VPNBOOK_SERVERS,
  fetchLiveVpnBookCredentials,
  syncVpnBookServers,
} from '@/lib/vpnbook';

/**
 * GET: Returns status of VPNBook fleet and live credentials
 */
export async function GET(req: NextRequest) {
  const authed = await isAuthorizedRequest(req);
  if (!authed) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const [creds, fleet] = await Promise.all([
      fetchLiveVpnBookCredentials(),
      getServers(),
    ]);

    const vpnBookServersInFleet = fleet.filter(
      (s) => s.source === 'vpnbook' || s.id.startsWith('vpnbook_')
    );

    const serverStatus = VPNBOOK_SERVERS.map((meta) => {
      const serverId = `vpnbook_${meta.id}`;
      const found = vpnBookServersInFleet.find((s) => s.id === serverId);
      return {
        ...meta,
        inFleet: !!found,
        passwordUpToDate: found ? found.password === creds.password : false,
        lastUpdated: found?.updatedAt,
      };
    });

    return NextResponse.json({
      success: true,
      credentials: creds,
      totalConfigured: VPNBOOK_SERVERS.length,
      activeInFleet: vpnBookServersInFleet.length,
      servers: serverStatus,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Failed to fetch VPNBook status' },
      { status: 500 }
    );
  }
}

/**
 * POST: Manually triggers 1-Click Import or Password Refresh for all VPNBook servers
 */
export async function POST(req: NextRequest) {
  const authed = await isAuthorizedRequest(req);
  if (!authed) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await req.json().catch(() => ({}));
    const protocol = body.protocol || 'tcp443';

    const currentFleet = await getServers();
    const result = await syncVpnBookServers(currentFleet, protocol);

    const sortedFleet = sortByPing(result.updatedFleet);
    await persistServers(sortedFleet);

    return NextResponse.json({
      success: true,
      message: `VPNBook sync completed. Added: ${result.addedCount}, Passwords Updated: ${result.passwordUpdatedCount}. Current Password: ${result.currentPassword}`,
      currentPassword: result.currentPassword,
      lastUpdated: result.lastUpdated,
      addedCount: result.addedCount,
      passwordUpdatedCount: result.passwordUpdatedCount,
      totalFleet: sortedFleet.length,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'VPNBook import failed' },
      { status: 500 }
    );
  }
}

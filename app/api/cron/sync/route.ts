import { NextRequest, NextResponse } from 'next/server';
import { fetchLiveVpnGateServers } from '@/lib/vpngate';
import { getServers, persistServers } from '@/lib/storage';
import { isAuthenticated } from '@/lib/auth';
import { VpnServer } from '@/lib/types';

// Supports both Vercel Cron (Bearer CRON_SECRET) and authenticated Admin manual trigger
export async function GET(req: NextRequest) {
  // 1. Verify Authorization
  const authHeader = req.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;

  const isVercelCron =
    cronSecret && authHeader === `Bearer ${cronSecret}`;
  const isAdminAuthed = await isAuthenticated();

  // If neither Vercel Cron nor Admin session, deny
  if (!isVercelCron && !isAdminAuthed) {
    // In dev mode without cron secret, allow if localhost
    const isLocalhost =
      req.nextUrl.hostname === 'localhost' || req.nextUrl.hostname === '127.0.0.1';
    if (!isLocalhost) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
  }

  try {
    // 2. Fetch fresh live servers from VPN Gate
    const liveFreshServers = await fetchLiveVpnGateServers();
    if (!liveFreshServers || liveFreshServers.length === 0) {
      return NextResponse.json({
        success: false,
        message: 'Could not fetch live feed from VPN Gate. Existing servers kept untouched.',
      });
    }

    // Map of online IPs currently alive on VPN Gate
    const onlineIpMap = new Map<string, typeof liveFreshServers[0]>();
    for (const s of liveFreshServers) {
      onlineIpMap.set(s.ip, s);
    }

    // 3. Inspect Current Fleet
    const currentFleet = await getServers();
    const activeServers: VpnServer[] = [];
    const removedServers: VpnServer[] = [];
    const updatedServers: VpnServer[] = [];

    const survivingCountries = new Set<string>();

    for (const server of currentFleet) {
      // If server has no IP (e.g. custom domain), keep it safe
      if (!server.ip) {
        activeServers.push(server);
        survivingCountries.add(server.countryCode.toUpperCase());
        continue;
      }

      // Check if server IP is still online in the fresh VPN Gate live list
      if (onlineIpMap.has(server.ip)) {
        // Server is still alive! Update ping & freshness
        const freshData = onlineIpMap.get(server.ip)!;
        const updated: VpnServer = {
          ...server,
          ping: freshData.ping,
          updatedAt: new Date().toISOString(),
        };
        activeServers.push(updated);
        survivingCountries.add(server.countryCode.toUpperCase());
        updatedServers.push(updated);
      } else {
        // Server is DEAD or offline! Remove it automatically!
        removedServers.push(server);
      }
    }

    // 4. Auto-Heal: If any country's server died, automatically pick the fresh replacement!
    const addedReplacements: VpnServer[] = [];
    for (const dead of removedServers) {
      const cc = dead.countryCode.toUpperCase();
      // If this country now has no active servers, find the top fresh one
      if (!survivingCountries.has(cc)) {
        const replacement = liveFreshServers.find(
          (s) => s.countryCode.toUpperCase() === cc
        );
        if (replacement) {
          const newServer: VpnServer = {
            id: dead.id, // keep same ID for app continuity
            country: replacement.country,
            countryCode: replacement.countryCode,
            city: replacement.city,
            flag: replacement.flag,
            flagUrl: replacement.flagUrl,
            premium: dead.premium, // retain original VIP/Free status
            username: 'vpn',
            password: 'vpn',
            ping: replacement.ping,
            proto: 'tcp',
            ip: replacement.ip,
            port: 443,
            ovpnBase64: replacement.ovpnBase64,
            updatedAt: new Date().toISOString(),
          };
          activeServers.push(newServer);
          survivingCountries.add(cc);
          addedReplacements.push(newServer);
        }
      }
    }

    // 5. Persist the updated and cleaned fleet
    await persistServers(activeServers);

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      summary: {
        totalFleet: activeServers.length,
        deadServersPurged: removedServers.length,
        replacementsAdded: addedReplacements.length,
        serversUpdated: updatedServers.length,
      },
      purged: removedServers.map((s) => ({ id: s.id, country: s.country, ip: s.ip })),
      replacements: addedReplacements.map((s) => ({ id: s.id, country: s.country, ip: s.ip })),
      activeFleet: activeServers,
    });
  } catch (error: any) {
    console.error('Auto-sync error:', error);
    return NextResponse.json(
      { error: error.message || 'Auto sync failed' },
      { status: 500 }
    );
  }
}

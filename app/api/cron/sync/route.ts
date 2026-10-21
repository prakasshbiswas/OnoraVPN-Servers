import { NextRequest, NextResponse } from 'next/server';
import { fetchLiveVpnGateServers } from '@/lib/vpngate';
import { getServers, persistServers, sortByPing } from '@/lib/storage';
import { isAuthorizedRequest } from '@/lib/auth';
import { VpnServer } from '@/lib/types';
import { syncVpnBookServers } from '@/lib/vpnbook';

// Supports Vercel Cron, external crons (UptimeRobot, cron-job.org), and Admin session
export async function GET(req: NextRequest) {
  // 1. Verify Authorization
  const authed = await isAuthorizedRequest(req);
  if (!authed) {
    return NextResponse.json({ error: 'Unauthorized. Provide valid key or admin session.' }, { status: 401 });
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
    let activeServers: VpnServer[] = [];
    const removedServers: VpnServer[] = [];
    const updatedServers: VpnServer[] = [];
    const activeIps = new Set<string>();

    for (const server of currentFleet) {
      // If server has no IP (e.g. custom domain), keep it safe
      if (!server.ip) {
        activeServers.push(server);
        continue;
      }

      // If server is from VPNBook, keep it protected (managed by VPNBook auto-sync below)
      if (server.source === 'vpnbook' || server.id.startsWith('vpnbook_')) {
        activeServers.push(server);
        activeIps.add(server.ip);
        continue;
      }

      // Check if server IP is still online in the fresh VPN Gate live list
      if (onlineIpMap.has(server.ip)) {
        // Server is still alive! Update ping & freshness
        const freshData = onlineIpMap.get(server.ip)!;
        const updated: VpnServer = {
          ...server,
          ping: freshData.ping || server.ping || 45,
          updatedAt: new Date().toISOString(),
        };
        activeServers.push(updated);
        activeIps.add(server.ip);
        updatedServers.push(updated);
      } else {
        // Server is DEAD or offline! Remove it automatically!
        removedServers.push(server);
      }
    }

    // 4. Auto-Heal & Replenish:
    // Candidate pool: live servers from VPN Gate not already in active fleet
    const candidatePool = liveFreshServers.filter((s) => !activeIps.has(s.ip));
    const addedReplacements: VpnServer[] = [];

    // For EVERY dead server removed, provide a fresh live replacement!
    for (const dead of removedServers) {
      const cc = dead.countryCode.toUpperCase();

      // Strategy A: Find replacement from the SAME country with a different working IP
      let candidateIndex = candidatePool.findIndex(
        (s) => s.countryCode.toUpperCase() === cc
      );

      // Strategy B: If same country is not currently online, pick the top live candidate (lowest ping)
      if (candidateIndex === -1 && candidatePool.length > 0) {
        candidateIndex = 0;
      }

      if (candidateIndex !== -1) {
        const replacement = candidatePool.splice(candidateIndex, 1)[0];
        const newServer: VpnServer = {
          id: `${replacement.countryCode.toLowerCase()}_${replacement.ip.replace(/\./g, '_')}`,
          country: replacement.country,
          countryCode: replacement.countryCode,
          city: replacement.city,
          flag: replacement.flag,
          flagUrl: replacement.flagUrl,
          premium: dead.premium || false, // retain VIP/Free preference
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
        activeIps.add(replacement.ip);
        addedReplacements.push(newServer);
      }
    }

    // 5. Auto-Discover New Countries:
    // If VPN Gate live feed has countries not yet in the active fleet (e.g. Lithuania, Thailand),
    // automatically add their top server so users always get fresh new international locations!
    const activeCountries = new Set(activeServers.map((s) => s.countryCode.toUpperCase()));

    for (let i = candidatePool.length - 1; i >= 0; i--) {
      const candidate = candidatePool[i];
      const cc = candidate.countryCode.toUpperCase();
      if (!activeCountries.has(cc) && activeServers.length < 50) {
        candidatePool.splice(i, 1);
        activeCountries.add(cc);
        const newServer: VpnServer = {
          id: `${candidate.countryCode.toLowerCase()}_${candidate.ip.replace(/\./g, '_')}`,
          country: candidate.country,
          countryCode: candidate.countryCode,
          city: candidate.city,
          flag: candidate.flag,
          flagUrl: candidate.flagUrl,
          premium: false,
          username: 'vpn',
          password: 'vpn',
          ping: candidate.ping,
          proto: 'tcp',
          ip: candidate.ip,
          port: 443,
          ovpnBase64: candidate.ovpnBase64,
          updatedAt: new Date().toISOString(),
        };
        activeServers.push(newServer);
        activeIps.add(candidate.ip);
        addedReplacements.push(newServer);
      }
    }

    // 6. Fleet Size Guarantee:
    // Expand and maintain a healthy, diverse fleet of 45-50 servers
    const targetSize = Math.min(50, Math.max(45, currentFleet.length));
    while (activeServers.length < targetSize && candidatePool.length > 0) {

      const topCandidate = candidatePool.shift()!;
      if (!activeIps.has(topCandidate.ip)) {
        const newServer: VpnServer = {
          id: `${topCandidate.countryCode.toLowerCase()}_${topCandidate.ip.replace(/\./g, '_')}`,
          country: topCandidate.country,
          countryCode: topCandidate.countryCode,
          city: topCandidate.city,
          flag: topCandidate.flag,
          flagUrl: topCandidate.flagUrl,
          premium: false,
          username: 'vpn',
          password: 'vpn',
          ping: topCandidate.ping,
          proto: 'tcp',
          ip: topCandidate.ip,
          port: 443,
          ovpnBase64: topCandidate.ovpnBase64,
          updatedAt: new Date().toISOString(),
        };
        activeServers.push(newServer);
        activeIps.add(topCandidate.ip);
        addedReplacements.push(newServer);
      }
    }

    // 7. Auto-Sync VPNBook Fleet & Rotate Password
    let vpnBookSyncResult = { addedCount: 0, passwordUpdatedCount: 0, currentPassword: '' };
    try {
      const vpnBookResult = await syncVpnBookServers(activeServers, 'tcp443');
      activeServers = vpnBookResult.updatedFleet;
      vpnBookSyncResult = {
        addedCount: vpnBookResult.addedCount,
        passwordUpdatedCount: vpnBookResult.passwordUpdatedCount,
        currentPassword: vpnBookResult.currentPassword,
      };
    } catch (vpnBookErr) {
      console.warn('[Sync Cron] VPNBook sync non-fatal error:', vpnBookErr);
    }

    // Sort final fleet by lowest ping first
    const finalSortedFleet = sortByPing(activeServers);

    // 8. Persist the updated and cleaned fleet
    await persistServers(finalSortedFleet);

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      summary: {
        totalFleet: finalSortedFleet.length,
        deadServersPurged: removedServers.length,
        replacementsAdded: addedReplacements.length,
        serversUpdated: updatedServers.length,
        vpnBook: {
          added: vpnBookSyncResult.addedCount,
          passwordsUpdated: vpnBookSyncResult.passwordUpdatedCount,
          activePassword: vpnBookSyncResult.currentPassword,
        },
      },
      purged: removedServers.map((s) => ({ id: s.id, country: s.country, ip: s.ip })),
      replacements: addedReplacements.map((s) => ({ id: s.id, country: s.country, ip: s.ip })),
      activeFleet: finalSortedFleet,
    });
  } catch (error: any) {
    console.error('Auto-sync error:', error);
    return NextResponse.json(
      { error: error.message || 'Auto sync failed' },
      { status: 500 }
    );
  }
}

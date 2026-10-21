import { NextResponse } from 'next/server';
import { fetchLiveVpnGateServers } from '@/lib/vpngate';
import { getServers } from '@/lib/storage';
import { isAuthenticated } from '@/lib/auth';

export async function GET() {
  const authed = await isAuthenticated();
  if (!authed) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const liveServers = await fetchLiveVpnGateServers();
    const currentFleet = await getServers();

    const activeIps = new Set(currentFleet.map((s) => s.ip).filter(Boolean));

    const annotated = liveServers.map((s) => {
      const exactIpInFleet = activeIps.has(s.ip);
      const sameCountryServer = currentFleet.find(
        (f) => f.countryCode.toUpperCase() === s.countryCode.toUpperCase()
      );

      return {
        ...s,
        exactIpInFleet,
        countryInFleet: !!sameCountryServer,
        existingServerId: sameCountryServer?.id,
        existingServerIp: sameCountryServer?.ip,
      };
    });

    return NextResponse.json(annotated, {
      headers: {
        'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300',
      },
    });
  } catch (error) {
    console.error('VPN Gate fetch error:', error);
    return NextResponse.json({ error: 'Failed to fetch VPN Gate servers' }, { status: 500 });
  }
}

import { getFlagEmoji, getFlagUrl } from './geoip';

export interface VpnGateServerItem {
  id: string;
  ip: string;
  hostName: string;
  ping: number;
  speed: number;
  score: number;
  country: string;
  countryCode: string;
  city: string;
  flag: string;
  flagUrl: string;
  ovpnBase64: string;
  exactIpInFleet?: boolean;
  countryInFleet?: boolean;
  existingServerId?: string;
  existingServerIp?: string;
}

export async function fetchLiveVpnGateServers(): Promise<VpnGateServerItem[]> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);

    const res = await fetch('https://www.vpngate.net/api/iphone/', {
      signal: controller.signal,
      headers: {
        'User-Agent': 'VPNx-Admin-Sync/1.0',
      },
      cache: 'no-store',
    });
    clearTimeout(timeout);

    if (!res.ok) {
      throw new Error(`VPN Gate returned HTTP ${res.status}`);
    }

    const text = await res.text();
    const lines = text.split(/\r?\n/);

    let headerIndex = -1;
    for (let i = 0; i < lines.length; i++) {
      if (lines[i].startsWith('#HostName')) {
        headerIndex = i;
        break;
      }
    }

    if (headerIndex === -1) {
      throw new Error('Invalid CSV format from VPN Gate');
    }

    const rawRows = lines.slice(headerIndex + 1);
    const parsedServers: VpnGateServerItem[] = [];
    const seenIps = new Set<string>();

    for (const line of rawRows) {
      if (!line.trim() || line.startsWith('*')) continue;

      const cols = line.split(',');
      if (cols.length < 15) continue;

      const hostName = cols[0]?.trim();
      const ip = cols[1]?.trim();
      const score = parseInt(cols[2]?.trim(), 10) || 0;
      const ping = parseInt(cols[3]?.trim(), 10) || 60;
      const speed = parseInt(cols[4]?.trim(), 10) || 0;
      const countryLong = cols[5]?.trim() || 'Unknown';
      const countryShort = (cols[6]?.trim() || 'UN').toUpperCase();
      const ovpnBase64 = cols[14]?.trim();

      if (!ip || !countryShort || !ovpnBase64 || ovpnBase64.length < 50) continue;
      if (seenIps.has(ip)) continue;
      seenIps.add(ip);

      parsedServers.push({
        id: `${countryShort.toLowerCase()}_${ip.replace(/\./g, '_')}`,
        ip,
        hostName,
        ping,
        speed,
        score,
        country: countryLong,
        countryCode: countryShort,
        city: `${countryLong} (${ip})`,
        flag: getFlagEmoji(countryShort),
        flagUrl: getFlagUrl(countryShort),
        ovpnBase64,
      });
    }

    // Sort by best score / lowest ping
    parsedServers.sort((a, b) => b.score - a.score || a.ping - b.ping);

    // Keep up to 6 best unique IP servers per country
    const countryCounts = new Map<string, number>();
    const result: VpnGateServerItem[] = [];

    for (const srv of parsedServers) {
      const count = countryCounts.get(srv.countryCode) || 0;
      if (count < 6) {
        countryCounts.set(srv.countryCode, count + 1);
        result.push({
          ...srv,
          city: `${srv.country} #${count + 1} (${srv.ip})`,
        });
      }
    }


    return result;
  } catch (err) {
    console.error('Failed to fetch from VPN Gate API:', err);
    return [];
  }
}

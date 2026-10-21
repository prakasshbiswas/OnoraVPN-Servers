import { VpnServer } from './types';
import { getFlagUrl } from './geoip';

export interface VpnBookServerMeta {
  id: string;
  name: string;
  hostname: string;
  ip: string;
  countryCode: string;
  country: string;
  flag: string;
  city: string;
}

export const VPNBOOK_SERVERS: VpnBookServerMeta[] = [
  { id: 'us16', name: 'US Server 1', hostname: 'us16.vpnbook.com', ip: '147.135.15.16', countryCode: 'US', country: 'United States', flag: '🇺🇸', city: 'US Server 1 (us16)' },
  { id: 'us178', name: 'US Server 2', hostname: 'us178.vpnbook.com', ip: '147.135.37.178', countryCode: 'US', country: 'United States', flag: '🇺🇸', city: 'US Server 2 (us178)' },
  { id: 'ca149', name: 'Canada Server 1', hostname: 'ca149.vpnbook.com', ip: '144.217.253.149', countryCode: 'CA', country: 'Canada', flag: '🇨🇦', city: 'Canada Server 1 (ca149)' },
  { id: 'ca196', name: 'Canada Server 2', hostname: 'ca196.vpnbook.com', ip: '142.4.216.196', countryCode: 'CA', country: 'Canada', flag: '🇨🇦', city: 'Canada Server 2 (ca196)' },
  { id: 'uk205', name: 'UK Server 1', hostname: 'uk205.vpnbook.com', ip: '145.239.252.205', countryCode: 'GB', country: 'United Kingdom', flag: '🇬🇧', city: 'UK Server 1 (uk205)' },
  { id: 'uk68', name: 'UK Server 2', hostname: 'uk68.vpnbook.com', ip: '145.239.255.68', countryCode: 'GB', country: 'United Kingdom', flag: '🇬🇧', city: 'UK Server 2 (uk68)' },
  { id: 'de20', name: 'Germany Server 1', hostname: 'de20.vpnbook.com', ip: '51.75.145.20', countryCode: 'DE', country: 'Germany', flag: '🇩🇪', city: 'Germany Server 1 (de20)' },
  { id: 'de220', name: 'Germany Server 2', hostname: 'de220.vpnbook.com', ip: '51.75.145.220', countryCode: 'DE', country: 'Germany', flag: '🇩🇪', city: 'Germany Server 2 (de220)' },
  { id: 'fr200', name: 'France Server 1', hostname: 'fr200.vpnbook.com', ip: '5.196.64.200', countryCode: 'FR', country: 'France', flag: '🇫🇷', city: 'France Server 1 (fr200)' },
  { id: 'fr231', name: 'France Server 2', hostname: 'fr231.vpnbook.com', ip: '5.196.64.231', countryCode: 'FR', country: 'France', flag: '🇫🇷', city: 'France Server 2 (fr231)' },
];

export interface VpnBookInfo {
  username: string;
  password: string;
  lastUpdated?: string;
}

/**
 * Scrapes the latest live VPNBook credentials from the official OpenVPN page.
 */
export async function fetchLiveVpnBookCredentials(): Promise<VpnBookInfo> {
  const fallback: VpnBookInfo = {
    username: 'vpnbook',
    password: 'dhnfcw2',
  };

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);

    const res = await fetch('https://www.vpnbook.com/freevpn/openvpn', {
      signal: controller.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) VPNx-Admin/1.0',
        Accept: 'text/html,application/xhtml+xml,application/xml',
      },
      cache: 'no-store',
    });
    clearTimeout(timeout);

    if (!res.ok) {
      console.warn(`[VPNBook] Page returned HTTP ${res.status}, using fallback.`);
      return fallback;
    }

    const html = await res.text();

    // 1. Extract Password (e.g. "Password: dhnfcw2." or within json/faq blocks)
    let password = '';
    const passMatch = html.match(/Password:\s*([a-zA-Z0-9]+)\./i) ||
                      html.match(/"Password",.*?"([a-zA-Z0-9]{5,10})"/i) ||
                      html.match(/Password.*?([a-zA-Z0-9]{6,8})/);
    if (passMatch && passMatch[1]) {
      password = passMatch[1].trim();
    }

    // 2. Extract Last Updated date if available
    let lastUpdated = '';
    const dateMatch = html.match(/Last updated:\s*([A-Za-z]+ \d{1,2}, \d{4})/i);
    if (dateMatch && dateMatch[1]) {
      lastUpdated = dateMatch[1].trim();
    }

    return {
      username: 'vpnbook',
      password: password || fallback.password,
      lastUpdated: lastUpdated || undefined,
    };
  } catch (err) {
    console.warn('[VPNBook] Error fetching credentials:', err);
    return fallback;
  }
}

/**
 * Downloads the clean OpenVPN configuration directly from VPNBook's public API.
 * Uses TCP 443 by default for 99.9% firewall penetration and easy connectivity.
 */
export async function fetchVpnBookOvpn(
  hostname: string,
  ip: string,
  protocol: 'tcp443' | 'tcp80' | 'udp53' | 'udp25000' = 'tcp443'
): Promise<string> {
  const url = `https://www.vpnbook.com/api/openvpn?hostname=${encodeURIComponent(hostname)}&protocol=${protocol}&ip=${encodeURIComponent(ip)}`;
  
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10000);

  const res = await fetch(url, {
    signal: controller.signal,
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) VPNx-Admin/1.0',
      Accept: 'text/plain, application/x-openvpn-profile, */*',
    },
    cache: 'no-store',
  });
  clearTimeout(timeout);

  if (!res.ok) {
    throw new Error(`Failed to download .ovpn from VPNBook for ${hostname}: HTTP ${res.status}`);
  }

  const text = await res.text();
  if (!text.includes('client') || !text.includes('</ca>')) {
    throw new Error(`Invalid .ovpn payload received from VPNBook for ${hostname}`);
  }

  return Buffer.from(text, 'utf-8').toString('base64');
}

/**
 * Fully synchronizes VPNBook servers with the existing fleet:
 * - Scrapes latest live password.
 * - Adds any missing VPNBook servers from the screenshot list.
 * - Auto-updates password across all VPNBook servers if it rotated.
 * - Downloads .ovpn configs via TCP 443 for instant connectivity.
 */
export async function syncVpnBookServers(
  currentFleet: VpnServer[],
  preferredProtocol: 'tcp443' | 'tcp80' | 'udp53' | 'udp25000' = 'tcp443'
): Promise<{
  updatedFleet: VpnServer[];
  addedCount: number;
  passwordUpdatedCount: number;
  currentPassword: string;
  lastUpdated?: string;
}> {
  const creds = await fetchLiveVpnBookCredentials();
  const fleetMap = new Map<string, VpnServer>();

  for (const s of currentFleet) {
    fleetMap.set(s.id, s);
  }

  let addedCount = 0;
  let passwordUpdatedCount = 0;

  for (const meta of VPNBOOK_SERVERS) {
    const serverId = `vpnbook_${meta.id}`;
    const existing = fleetMap.get(serverId);

    if (existing) {
      // Check if password changed or config missing
      let hasChanges = false;
      const updated: VpnServer = { ...existing };

      if (updated.password !== creds.password) {
        updated.password = creds.password;
        passwordUpdatedCount++;
        hasChanges = true;
      }

      if (!updated.ovpnBase64) {
        try {
          updated.ovpnBase64 = await fetchVpnBookOvpn(meta.hostname, meta.ip, preferredProtocol);
          hasChanges = true;
        } catch (err) {
          console.error(`[VPNBook] Could not fetch missing ovpn for ${meta.hostname}:`, err);
        }
      }

      if (hasChanges) {
        updated.updatedAt = new Date().toISOString();
        fleetMap.set(serverId, updated);
      }
    } else {
      // Need to add fresh server
      try {
        const ovpnBase64 = await fetchVpnBookOvpn(meta.hostname, meta.ip, preferredProtocol);
        const newServer: VpnServer = {
          id: serverId,
          country: meta.country,
          countryCode: meta.countryCode,
          city: meta.city,
          flag: meta.flag,
          flagUrl: getFlagUrl(meta.countryCode),
          premium: false,
          username: creds.username,
          password: creds.password,
          ping: 35, // default reliable ping
          proto: preferredProtocol.startsWith('udp') ? 'udp' : 'tcp',
          ip: meta.ip,
          port: preferredProtocol === 'tcp443' ? 443 : preferredProtocol === 'tcp80' ? 80 : preferredProtocol === 'udp53' ? 53 : 25000,
          ovpnBase64,
          source: 'vpnbook',
          updatedAt: new Date().toISOString(),
        };
        fleetMap.set(serverId, newServer);
        addedCount++;
      } catch (err) {
        console.error(`[VPNBook] Failed to initialize server ${meta.hostname}:`, err);
      }
    }
  }

  const updatedFleet = Array.from(fleetMap.values());

  return {
    updatedFleet,
    addedCount,
    passwordUpdatedCount,
    currentPassword: creds.password,
    lastUpdated: creds.lastUpdated,
  };
}

/**
 * Produces ONLY the dedicated VPNBook servers (10 servers) with fresh credentials
 * for writing to data/vpnbook.json.
 */
export async function syncDedicatedVpnBookFleet(
  existingVpnBookServers: VpnServer[],
  preferredProtocol: 'tcp443' | 'tcp80' | 'udp53' | 'udp25000' = 'tcp443'
): Promise<{
  servers: VpnServer[];
  passwordUpdated: boolean;
  currentPassword: string;
  lastUpdated?: string;
}> {
  const creds = await fetchLiveVpnBookCredentials();
  const existingMap = new Map<string, VpnServer>();

  for (const s of existingVpnBookServers) {
    existingMap.set(s.id, s);
  }

  let passwordUpdated = false;
  const resultServers: VpnServer[] = [];

  for (const meta of VPNBOOK_SERVERS) {
    const serverId = `vpnbook_${meta.id}`;
    const existing = existingMap.get(serverId);

    if (existing) {
      const updated: VpnServer = { ...existing };
      if (updated.password !== creds.password) {
        updated.password = creds.password;
        updated.updatedAt = new Date().toISOString();
        passwordUpdated = true;
      }
      if (!updated.ovpnBase64) {
        try {
          updated.ovpnBase64 = await fetchVpnBookOvpn(meta.hostname, meta.ip, preferredProtocol);
          updated.updatedAt = new Date().toISOString();
        } catch (err) {
          console.error(`[VPNBook Dedicated] Failed to fetch ovpn for ${meta.hostname}:`, err);
        }
      }
      resultServers.push(updated);
    } else {
      try {
        const ovpnBase64 = await fetchVpnBookOvpn(meta.hostname, meta.ip, preferredProtocol);
        const newServer: VpnServer = {
          id: serverId,
          country: meta.country,
          countryCode: meta.countryCode,
          city: meta.city,
          flag: meta.flag,
          flagUrl: getFlagUrl(meta.countryCode),
          premium: false,
          username: creds.username,
          password: creds.password,
          ping: 35,
          proto: preferredProtocol.startsWith('udp') ? 'udp' : 'tcp',
          ip: meta.ip,
          port: preferredProtocol === 'tcp443' ? 443 : preferredProtocol === 'tcp80' ? 80 : preferredProtocol === 'udp53' ? 53 : 25000,
          ovpnBase64,
          source: 'vpnbook',
          updatedAt: new Date().toISOString(),
        };
        resultServers.push(newServer);
      } catch (err) {
        console.error(`[VPNBook Dedicated] Failed to initialize ${meta.hostname}:`, err);
      }
    }
  }

  return {
    servers: resultServers,
    passwordUpdated,
    currentPassword: creds.password,
    lastUpdated: creds.lastUpdated,
  };
}

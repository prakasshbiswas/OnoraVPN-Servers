import { lookupIp } from './geoip';
import { ParseResult, VpnServer } from './types';

export async function parseOvpnContent(
  rawContent: string,
  fileName: string = '',
  existingServers: VpnServer[] = []
): Promise<ParseResult> {
  const content = rawContent.trim();

  // 1. Extract remote IP/Host and Port
  // Matches: "remote 219.100.37.22 443" or "remote host.domain.com 1194"
  const remoteMatch = content.match(/^\s*remote\s+([^\s\r\n]+)\s+(\d+)/im);
  let ip = '127.0.0.1';
  let port = 1194;

  if (remoteMatch) {
    ip = remoteMatch[1].trim();
    port = parseInt(remoteMatch[2].trim(), 10) || 1194;
  } else {
    // Attempt fallback to find IP from filename e.g. vpngate_219.100.37.22_tcp_443.ovpn
    const ipInFilename = fileName.match(/(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})/);
    if (ipInFilename) {
      ip = ipInFilename[1];
    }
  }

  // 2. Extract Protocol (udp or tcp)
  const protoMatch = content.match(/^\s*proto\s+(udp\d?|tcp\d?)/im);
  let proto: 'udp' | 'tcp' = 'udp';
  if (protoMatch) {
    const rawProto = protoMatch[1].toLowerCase();
    proto = rawProto.startsWith('tcp') ? 'tcp' : 'udp';
  } else if (fileName.toLowerCase().includes('tcp')) {
    proto = 'tcp';
  }

  // 3. Lookup GeoIP details
  const geo = await lookupIp(ip);

  // 4. Encode full .ovpn content to Base64
  const ovpnBase64 = Buffer.from(content, 'utf-8').toString('base64');

  // 5. Check if a server with this country already exists in existing list
  const existingServer = existingServers.find(
    (s) => s.countryCode.toUpperCase() === geo.countryCode.toUpperCase()
  ) || null;

  return {
    ip,
    port,
    proto,
    country: geo.country,
    countryCode: geo.countryCode,
    city: geo.city,
    flag: geo.flag,
    flagUrl: geo.flagUrl,
    ovpnBase64,
    existingServer,
  };
}

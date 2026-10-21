export interface VpnServer {
  id: string;
  country: string;
  countryCode: string;
  city: string;
  flag: string;
  flagUrl?: string;
  premium: boolean;
  username?: string;
  password?: string;
  ping?: number;
  speed?: number;
  proto?: 'udp' | 'tcp';
  ip?: string;
  port?: number;
  ovpnUrl?: string;
  ovpnBase64?: string;
  ovpnConfig?: string;
  updatedAt?: string;
  source?: 'oneconnect' | 'vpngate' | 'vpnbook' | string;
}

export interface ParseResult {
  ip: string;
  port: number;
  proto: 'udp' | 'tcp';
  country: string;
  countryCode: string;
  city: string;
  flag: string;
  flagUrl: string;
  ovpnBase64: string;
  existingServer?: VpnServer | null;
}

export type ServerSource = 'vpngate' | 'vpnbook' | 'custom';

export function resolveServerSource(server: VpnServer): ServerSource {
  if (server.source === 'vpnbook' || server.id?.startsWith('vpnbook_') || server.username === 'vpnbook') {
    return 'vpnbook';
  }
  if (
    server.source === 'vpngate' ||
    (server.username === 'vpn' && server.password === 'vpn') ||
    (server.id && !server.id.startsWith('vpnbook_') && server.id.includes('_'))
  ) {
    return 'vpngate';
  }
  return 'custom';
}

export interface AuthSession {
  authenticated: boolean;
}

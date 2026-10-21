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

export interface AuthSession {
  authenticated: boolean;
}

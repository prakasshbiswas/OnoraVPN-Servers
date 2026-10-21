// Converts ISO 3166-1 alpha-2 code to emoji flag
export function getFlagEmoji(countryCode: string): string {
  if (!countryCode || countryCode.length !== 2) return '🌐';
  const codePoints = countryCode
    .toUpperCase()
    .split('')
    .map((char) => 127397 + char.charCodeAt(0));
  return String.fromCodePoint(...codePoints);
}

export function getFlagUrl(countryCode: string): string {
  const code = (countryCode || 'un').toLowerCase();
  return `https://flagcdn.com/w80/${code}.png`;
}

const COMMON_COUNTRIES: Record<string, string> = {
  JP: 'Japan',
  US: 'United States',
  GB: 'United Kingdom',
  DE: 'Germany',
  CA: 'Canada',
  SG: 'Singapore',
  KR: 'South Korea',
  FR: 'France',
  NL: 'Netherlands',
  AU: 'Australia',
  IN: 'India',
  BR: 'Brazil',
  RU: 'Russia',
  CH: 'Switzerland',
  SE: 'Sweden',
  NO: 'Norway',
  HK: 'Hong Kong',
  TW: 'Taiwan',
  VN: 'Vietnam',
  TH: 'Thailand',
  MY: 'Malaysia',
  ID: 'Indonesia',
  PH: 'Philippines',
  ES: 'Spain',
  IT: 'Italy',
  PL: 'Poland',
  UA: 'Ukraine',
  TR: 'Turkey',
  AE: 'United Arab Emirates',
  ZA: 'South Africa',
};

export async function lookupIp(ip: string): Promise<{
  country: string;
  countryCode: string;
  city: string;
  flag: string;
  flagUrl: string;
}> {
  // If IP is a hostname, or private/localhost
  if (!ip || ip === 'localhost' || ip.startsWith('127.') || ip.startsWith('192.168.')) {
    return {
      country: 'Unknown',
      countryCode: 'UN',
      city: 'Unknown City',
      flag: '🌐',
      flagUrl: getFlagUrl('un'),
    };
  }

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 3500);

    const res = await fetch(`http://ip-api.com/json/${ip}?fields=status,country,countryCode,city`, {
      signal: controller.signal,
    });
    clearTimeout(timeout);

    if (res.ok) {
      const data = await res.json();
      if (data.status === 'success' && data.countryCode) {
        const cc = data.countryCode.toUpperCase();
        return {
          country: data.country || COMMON_COUNTRIES[cc] || 'Unknown',
          countryCode: cc,
          city: data.city || 'City',
          flag: getFlagEmoji(cc),
          flagUrl: getFlagUrl(cc),
        };
      }
    }
  } catch {
    // Timeout or network error, fallback to safe defaults
  }

  return {
    country: 'Unknown',
    countryCode: 'UN',
    city: 'City',
    flag: '🌐',
    flagUrl: getFlagUrl('un'),
  };
}

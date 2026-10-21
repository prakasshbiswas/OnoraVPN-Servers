import fs from 'fs';
import path from 'path';

const VPNBOOK_SERVERS = [
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

async function run() {
  console.log('1. Scraping latest VPNBook live credentials...');
  const res = await fetch('https://www.vpnbook.com/freevpn/openvpn', {
    headers: { 'User-Agent': 'Mozilla/5.0' },
  });
  const html = await res.text();
  const passMatch = html.match(/Password:\s*([a-zA-Z0-9]+)\./i) ||
                    html.match(/"Password",.*?"([a-zA-Z0-9]+)"/i);
  const password = passMatch ? passMatch[1] : 'dhnfcw2';
  console.log(`Active Password found: "${password}"`);

  const serversPath = path.join(process.cwd(), 'data', 'servers.json');
  let fleet = [];
  if (fs.existsSync(serversPath)) {
    fleet = JSON.parse(fs.readFileSync(serversPath, 'utf8'));
  }

  const existingMap = new Map();
  for (const s of fleet) {
    existingMap.set(s.id, s);
  }

  console.log(`2. Fetching .ovpn configs (TCP 443) for 10 VPNBook servers...`);
  let added = 0;
  for (const meta of VPNBOOK_SERVERS) {
    const id = `vpnbook_${meta.id}`;
    const url = `https://www.vpnbook.com/api/openvpn?hostname=${meta.hostname}&protocol=tcp443&ip=${meta.ip}`;
    try {
      const ovpnRes = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' } });
      if (!ovpnRes.ok) throw new Error(`HTTP ${ovpnRes.status}`);
      const rawText = await ovpnRes.text();
      const ovpnBase64 = Buffer.from(rawText, 'utf8').toString('base64');

      const serverObj = {
        id,
        country: meta.country,
        countryCode: meta.countryCode,
        city: meta.city,
        flag: meta.flag,
        flagUrl: `https://flagcdn.com/w80/${meta.countryCode.toLowerCase()}.png`,
        premium: false,
        username: 'vpnbook',
        password,
        ping: 35,
        proto: 'tcp',
        ip: meta.ip,
        port: 443,
        ovpnBase64,
        source: 'vpnbook',
        updatedAt: new Date().toISOString(),
      };

      existingMap.set(id, serverObj);
      added++;
      console.log(`✔ [${added}/10] ${meta.name} (${meta.country}) imported successfully.`);
    } catch (err) {
      console.error(`✖ Failed for ${meta.name}:`, err.message);
    }
  }

  const updatedFleet = Array.from(existingMap.values());
  fs.writeFileSync(serversPath, JSON.stringify(updatedFleet, null, 2), 'utf8');
  console.log(`\n🎉 Success! Total fleet size is now: ${updatedFleet.length} servers.`);
}

run().catch(console.error);

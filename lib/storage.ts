import fs from 'fs';
import path from 'path';
import { VpnServer } from './types';

const DATA_FILE_PATH = path.join(process.cwd(), 'data', 'servers.json');
const TMP_FILE_PATH = path.join('/tmp', 'servers.json');

const VPNBOOK_DATA_FILE_PATH = path.join(process.cwd(), 'data', 'vpnbook.json');
const VPNBOOK_TMP_FILE_PATH = path.join('/tmp', 'vpnbook.json');

// In-memory caches for serverless environments
let memoryCache: VpnServer[] | null = null;
let vpnBookMemoryCache: VpnServer[] | null = null;

// Read servers from file, GitHub, or fallback
export async function getServers(): Promise<VpnServer[]> {
  // 1. Try reading from GitHub if configured (Production Vercel without database)
  const githubToken = process.env.GITHUB_TOKEN;
  const githubRepo = process.env.GITHUB_REPO || 'prakasshbiswas/OnoraVPN-Servers';
  const githubBranch = process.env.GITHUB_BRANCH || 'main';
  const githubFilePath = process.env.GITHUB_FILE_PATH || 'data/servers.json';

  if (githubToken && githubRepo) {
    try {
      const res = await fetch(
        `https://raw.githubusercontent.com/${githubRepo}/${githubBranch}/${githubFilePath}?t=${Date.now()}`,
        {
          headers: {
            Authorization: `Bearer ${githubToken}`,
            Accept: 'application/vnd.github.v3.raw',
          },
          cache: 'no-store',
        }
      );
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data)) {
          memoryCache = sortByPing(data);
          return memoryCache;
        }
      }
    } catch (err) {
      console.warn('Could not read from GitHub, falling back to local file/cache:', err);
    }
  }

  // 2. Try in-memory cache if available
  if (memoryCache && memoryCache.length > 0) {
    return memoryCache;
  }

  // 3. Try reading from /tmp/servers.json (Writable on AWS Lambda / Vercel Serverless)
  try {
    if (fs.existsSync(TMP_FILE_PATH)) {
      const raw = fs.readFileSync(TMP_FILE_PATH, 'utf-8');
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        memoryCache = sortByPing(parsed);
        return memoryCache;
      }
    }
  } catch (err) {
    // /tmp might not be accessible on Windows local dev, which is normal
  }

  // 4. Read from local disk file
  try {
    if (fs.existsSync(DATA_FILE_PATH)) {
      const raw = fs.readFileSync(DATA_FILE_PATH, 'utf-8');
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        memoryCache = sortByPing(parsed);
        return memoryCache;
      }
    }
  } catch (err) {
    console.error('Error reading local data/servers.json:', err);
  }

  return [];
}

// Read dedicated VPNBook servers from file, GitHub, or fallback
export async function getVpnBookServers(): Promise<VpnServer[]> {
  const githubToken = process.env.GITHUB_TOKEN;
  const githubRepo = process.env.GITHUB_REPO || 'prakasshbiswas/OnoraVPN-Servers';
  const githubBranch = process.env.GITHUB_BRANCH || 'main';
  const githubFilePath = 'data/vpnbook.json';

  if (githubToken && githubRepo) {
    try {
      const res = await fetch(
        `https://raw.githubusercontent.com/${githubRepo}/${githubBranch}/${githubFilePath}?t=${Date.now()}`,
        {
          headers: {
            Authorization: `Bearer ${githubToken}`,
            Accept: 'application/vnd.github.v3.raw',
          },
          cache: 'no-store',
        }
      );
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data)) {
          vpnBookMemoryCache = sortByPing(data);
          return vpnBookMemoryCache;
        }
      }
    } catch (err) {
      console.warn('Could not read vpnbook from GitHub, falling back to local file/cache:', err);
    }
  }

  if (vpnBookMemoryCache && vpnBookMemoryCache.length > 0) {
    return vpnBookMemoryCache;
  }

  try {
    if (fs.existsSync(VPNBOOK_TMP_FILE_PATH)) {
      const raw = fs.readFileSync(VPNBOOK_TMP_FILE_PATH, 'utf-8');
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        vpnBookMemoryCache = sortByPing(parsed);
        return vpnBookMemoryCache;
      }
    }
  } catch {}

  try {
    if (fs.existsSync(VPNBOOK_DATA_FILE_PATH)) {
      const raw = fs.readFileSync(VPNBOOK_DATA_FILE_PATH, 'utf-8');
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        vpnBookMemoryCache = sortByPing(parsed);
        return vpnBookMemoryCache;
      }
    }
  } catch (err) {
    console.error('Error reading local data/vpnbook.json:', err);
  }

  return [];
}

export function sortByPing(servers: VpnServer[]): VpnServer[] {
  return [...servers].sort((a, b) => {
    const pingA = typeof a.ping === 'number' && a.ping > 0 ? a.ping : 999;
    const pingB = typeof b.ping === 'number' && b.ping > 0 ? b.ping : 999;
    return pingA - pingB;
  });
}

// Helper to commit any file directly to GitHub via API
async function commitFileToGitHub(filePath: string, contentStr: string, commitMsg: string): Promise<boolean> {
  const githubToken = process.env.GITHUB_TOKEN;
  const githubRepo = process.env.GITHUB_REPO || 'prakasshbiswas/OnoraVPN-Servers';
  const githubBranch = process.env.GITHUB_BRANCH || 'main';

  if (!githubToken || !githubRepo) return false;

  try {
    const getFileRes = await fetch(
      `https://api.github.com/repos/${githubRepo}/contents/${filePath}?ref=${githubBranch}`,
      {
        headers: {
          Authorization: `Bearer ${githubToken}`,
          Accept: 'application/vnd.github.v3+json',
          'User-Agent': 'VPNx-Admin',
        },
      }
    );

    let sha: string | undefined;
    if (getFileRes.ok) {
      const fileInfo = await getFileRes.json();
      sha = fileInfo.sha;
    }

    const contentBase64 = Buffer.from(contentStr).toString('base64');

    const commitRes = await fetch(
      `https://api.github.com/repos/${githubRepo}/contents/${filePath}`,
      {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${githubToken}`,
          Accept: 'application/vnd.github.v3+json',
          'User-Agent': 'VPNx-Admin',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: commitMsg,
          content: contentBase64,
          sha,
          branch: githubBranch,
        }),
      }
    );

    if (!commitRes.ok) {
      const errorText = await commitRes.text();
      console.error(`GitHub commit failed for ${filePath}:`, errorText);
      return false;
    }
    return true;
  } catch (err) {
    console.error(`Failed to commit ${filePath} to GitHub repo:`, err);
    return false;
  }
}

// Write servers to local disk, in-memory cache, and GitHub (if configured)
export async function persistServers(servers: VpnServer[]): Promise<boolean> {
  const sorted = sortByPing(servers);
  memoryCache = sorted;

  // 1. Write to /tmp/servers.json (Always writable on Linux serverless / AWS Lambda)
  try {
    fs.writeFileSync(TMP_FILE_PATH, JSON.stringify(sorted, null, 2), 'utf-8');
  } catch {
    // Windows dev or read-only tmp
  }

  // 2. Write to project data/servers.json if writable
  try {
    const dir = path.dirname(DATA_FILE_PATH);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(DATA_FILE_PATH, JSON.stringify(sorted, null, 2), 'utf-8');
  } catch (err) {
    console.warn('Could not write to local file system (likely running on read-only serverless):', err);
  }

  // 3. Commit to GitHub
  const githubFilePath = process.env.GITHUB_FILE_PATH || 'data/servers.json';
  await commitFileToGitHub(
    githubFilePath,
    JSON.stringify(sorted, null, 2),
    `chore(vpn): update servers.json [${servers.length} servers]`
  );

  return true;
}

// Write dedicated VPNBook servers to local disk, in-memory cache, and GitHub
export async function persistVpnBookServers(servers: VpnServer[]): Promise<boolean> {
  const sorted = sortByPing(servers);
  vpnBookMemoryCache = sorted;

  // 1. Write to /tmp/vpnbook.json
  try {
    fs.writeFileSync(VPNBOOK_TMP_FILE_PATH, JSON.stringify(sorted, null, 2), 'utf-8');
  } catch {}

  // 2. Write to data/vpnbook.json
  try {
    const dir = path.dirname(VPNBOOK_DATA_FILE_PATH);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(VPNBOOK_DATA_FILE_PATH, JSON.stringify(sorted, null, 2), 'utf-8');
  } catch (err) {
    console.warn('Could not write to local data/vpnbook.json:', err);
  }

  // 3. Commit to GitHub at data/vpnbook.json
  await commitFileToGitHub(
    'data/vpnbook.json',
    JSON.stringify(sorted, null, 2),
    `chore(vpn): update vpnbook.json [${servers.length} servers]`
  );

  return true;
}

// Add or replace server logic
export async function saveServer(
  server: VpnServer,
  replaceCountry: boolean = true
): Promise<{ servers: VpnServer[]; replaced: boolean; replacedId?: string }> {
  const current = await getServers();
  let replaced = false;
  let replacedId: string | undefined;

  let updatedList: VpnServer[] = [];

  if (replaceCountry) {
    const targetCc = server.countryCode.toUpperCase();
    const existingIndex = current.findIndex(
      (s) => s.countryCode.toUpperCase() === targetCc || s.id === server.id
    );

    if (existingIndex !== -1) {
      replaced = true;
      replacedId = current[existingIndex].id;
      updatedList = [...current];
      updatedList[existingIndex] = {
        ...server,
        updatedAt: new Date().toISOString(),
      };
    } else {
      updatedList = [
        {
          ...server,
          updatedAt: new Date().toISOString(),
        },
        ...current,
      ];
    }
  } else {
    const existingIndex = current.findIndex((s) => s.id === server.id);
    if (existingIndex !== -1) {
      updatedList = [...current];
      updatedList[existingIndex] = {
        ...server,
        updatedAt: new Date().toISOString(),
      };
    } else {
      updatedList = [
        {
          ...server,
          updatedAt: new Date().toISOString(),
        },
        ...current,
      ];
    }
  }

  await persistServers(updatedList);
  return { servers: updatedList, replaced, replacedId };
}

// Delete server by ID
export async function deleteServer(id: string): Promise<VpnServer[]> {
  const current = await getServers();
  const filtered = current.filter((s) => s.id !== id);
  await persistServers(filtered);
  return filtered;
}

// Toggle premium VIP status
export async function toggleServerPremium(id: string): Promise<VpnServer[]> {
  const current = await getServers();
  const updated = current.map((s) => {
    if (s.id === id) {
      return { ...s, premium: !s.premium, updatedAt: new Date().toISOString() };
    }
    return s;
  });
  await persistServers(updated);
  return updated;
}

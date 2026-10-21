import fs from 'fs';
import path from 'path';
import { VpnServer } from './types';

const DATA_FILE_PATH = path.join(process.cwd(), 'data', 'servers.json');

// In-memory cache for serverless environments when disk write is unavailable
let memoryCache: VpnServer[] | null = null;

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
          memoryCache = data;
          return data;
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

  // 3. Read from local disk file
  try {
    if (fs.existsSync(DATA_FILE_PATH)) {
      const raw = fs.readFileSync(DATA_FILE_PATH, 'utf-8');
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        memoryCache = parsed;
        return parsed;
      }
    }
  } catch (err) {
    console.error('Error reading local data/servers.json:', err);
  }

  return [];
}

// Write servers to local disk, in-memory cache, and GitHub (if configured)
export async function persistServers(servers: VpnServer[]): Promise<boolean> {
  memoryCache = servers;

  // 1. Write to local file system
  try {
    const dir = path.dirname(DATA_FILE_PATH);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(DATA_FILE_PATH, JSON.stringify(servers, null, 2), 'utf-8');
  } catch (err) {
    console.warn('Could not write to local file system (likely running on read-only serverless):', err);
  }

  // 2. Commit to GitHub repository if configured
  const githubToken = process.env.GITHUB_TOKEN;
  const githubRepo = process.env.GITHUB_REPO || 'prakasshbiswas/OnoraVPN-Servers';
  const githubBranch = process.env.GITHUB_BRANCH || 'main';
  const githubFilePath = process.env.GITHUB_FILE_PATH || 'data/servers.json';

  if (githubToken && githubRepo) {
    try {
      // First get current file SHA
      const getFileRes = await fetch(
        `https://api.github.com/repos/${githubRepo}/contents/${githubFilePath}?ref=${githubBranch}`,
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

      const contentBase64 = Buffer.from(JSON.stringify(servers, null, 2)).toString('base64');

      const commitRes = await fetch(
        `https://api.github.com/repos/${githubRepo}/contents/${githubFilePath}`,
        {
          method: 'PUT',
          headers: {
            Authorization: `Bearer ${githubToken}`,
            Accept: 'application/vnd.github.v3+json',
            'User-Agent': 'VPNx-Admin',
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            message: `chore(vpn): update servers.json [${servers.length} servers]`,
            content: contentBase64,
            sha,
            branch: githubBranch,
          }),
        }
      );

      if (!commitRes.ok) {
        const errorText = await commitRes.text();
        console.error('GitHub commit failed:', errorText);
      }
    } catch (err) {
      console.error('Failed to commit to GitHub repo:', err);
    }
  }

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
    // If replacing, remove any existing server that matches the CountryCode OR matching ID
    const targetCc = server.countryCode.toUpperCase();
    const existingIndex = current.findIndex(
      (s) => s.countryCode.toUpperCase() === targetCc || s.id === server.id
    );

    if (existingIndex !== -1) {
      replaced = true;
      replacedId = current[existingIndex].id;
      // Replace existing in place
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
    // Add new or update exact ID
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

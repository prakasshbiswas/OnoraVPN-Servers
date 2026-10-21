'use client';

import React, { useState, useEffect } from 'react';
import {
  Globe,
  RefreshCw,
  CheckCircle2,
  Key,
  Shield,
  Zap,
  Check,
  Copy,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  Link2,
  GitBranch,
} from 'lucide-react';
import { VpnServer } from '@/lib/types';

interface VpnBookServerStatus {
  id: string;
  name: string;
  hostname: string;
  ip: string;
  countryCode: string;
  country: string;
  flag: string;
  city: string;
  inFleet: boolean;
  passwordUpToDate: boolean;
  lastUpdated?: string;
}

interface VpnBookExplorerProps {
  onServerImported?: () => void;
  fleetServers?: VpnServer[];
  defaultCollapsed?: boolean;
}

export const VpnBookExplorer: React.FC<VpnBookExplorerProps> = ({
  onServerImported,
  fleetServers = [],
  defaultCollapsed = true,
}) => {
  const [loading, setLoading] = useState(false);
  const [importing, setImporting] = useState(false);
  const [collapsed, setCollapsed] = useState(defaultCollapsed);

  useEffect(() => {
    setCollapsed(defaultCollapsed);
  }, [defaultCollapsed]);
  const [protocol, setProtocol] = useState<'tcp443' | 'tcp80' | 'udp53' | 'udp25000'>('tcp443');
  const [password, setPassword] = useState('dhnfcw2');
  const [lastUpdatedDate, setLastUpdatedDate] = useState<string | undefined>('Oct 18, 2026');
  const [servers, setServers] = useState<VpnBookServerStatus[]>([]);
  const [copiedPass, setCopiedPass] = useState(false);
  const [copiedApi, setCopiedApi] = useState(false);
  const [copiedGithub, setCopiedGithub] = useState(false);
  const [copiedCron, setCopiedCron] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  const fetchStatus = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/vpnbook');
      if (res.ok) {
        const data = await res.json();
        if (data.credentials?.password) {
          setPassword(data.credentials.password);
        }
        if (data.credentials?.lastUpdated) {
          setLastUpdatedDate(data.credentials.lastUpdated);
        }
        if (data.servers) {
          setServers(data.servers);
        }
      }
    } catch (err) {
      console.warn('Failed to fetch VPNBook status:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStatus();
  }, [fleetServers.length]);

  const handleCopyPassword = () => {
    if (!password) return;
    navigator.clipboard.writeText(password);
    setCopiedPass(true);
    setTimeout(() => setCopiedPass(false), 2000);
  };

  const handleCopyApiUrl = () => {
    const origin = typeof window !== 'undefined' ? window.location.origin : 'https://oneioovpn.vercel.app';
    const url = `${origin}/api/vpnbook/servers`;
    navigator.clipboard.writeText(url);
    setCopiedApi(true);
    setTimeout(() => setCopiedApi(false), 2000);
  };

  const handleCopyGithubUrl = () => {
    const url = 'https://raw.githubusercontent.com/prakasshbiswas/OnoraVPN-Servers/main/data/vpnbook.json';
    navigator.clipboard.writeText(url);
    setCopiedGithub(true);
    setTimeout(() => setCopiedGithub(false), 2000);
  };

  const handleCopyCronUrl = () => {
    const origin = typeof window !== 'undefined' ? window.location.origin : 'https://oneioovpn.vercel.app';
    const url = `${origin}/api/cron/sync?key=admin123`;
    navigator.clipboard.writeText(url);
    setCopiedCron(true);
    setTimeout(() => setCopiedCron(false), 2000);
  };

  const handleSyncAll = async () => {
    setImporting(true);
    setStatusMessage(null);
    try {
      const res = await fetch('/api/vpnbook', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ protocol }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setStatusMessage(`✅ ${data.message}`);
        await fetchStatus();
        if (onServerImported) onServerImported();
      } else {
        setStatusMessage(`❌ Error: ${data.error || 'Import failed'}`);
      }
    } catch (err: any) {
      setStatusMessage(`❌ Network error: ${err.message}`);
    } finally {
      setImporting(false);
    }
  };

  const inFleetCount = servers.filter((s) => s.inFleet).length;

  return (
    <div className="mb-10 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 shadow-sm overflow-hidden transition-all">
      {/* Header Bar */}
      <div className="p-4 sm:p-5 border-b border-slate-200 dark:border-slate-800/80 bg-gradient-to-r from-blue-50/50 via-indigo-50/20 to-transparent dark:from-blue-950/20 dark:via-transparent">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-blue-600/10 dark:bg-blue-500/20 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold">
              <Shield className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  VPNBook OpenVPN Fleet
                </h3>
                <span className="px-2 py-0.5 text-xs font-semibold rounded-full bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-700/60">
                  {inFleetCount}/10 in Fleet
                </span>
                <span className="hidden md:inline-flex items-center px-2 py-0.5 text-xs font-medium rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/50">
                  Auto-Sync Ready
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                10 dedicated OpenVPN servers (US, CA, UK, DE, FR) with automatic live password sync.
              </p>
            </div>
          </div>

          <div className="flex items-center flex-wrap gap-2">
            {/* Copy VPNBook API URL */}
            <button
              onClick={handleCopyApiUrl}
              className="inline-flex items-center space-x-1.5 px-3 py-2 text-xs font-medium rounded-xl border border-blue-200 dark:border-blue-800/70 bg-blue-50/60 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 hover:bg-blue-100 dark:hover:bg-blue-900/60 transition shadow-xs"
              title="Copy /api/vpnbook/servers JSON endpoint"
            >
              {copiedApi ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Link2 className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />}
              <span>{copiedApi ? 'API Copied!' : 'Copy API URL'}</span>
            </button>

            {/* Copy GitHub Raw URL */}
            <button
              onClick={handleCopyGithubUrl}
              className="inline-flex items-center space-x-1.5 px-3 py-2 text-xs font-medium rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700/60 transition shadow-xs"
              title="Copy GitHub Raw data/vpnbook.json URL"
            >
              {copiedGithub ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <GitBranch className="w-3.5 h-3.5 text-slate-500" />}
              <span>{copiedGithub ? 'GitHub URL Copied!' : 'Copy GitHub URL'}</span>
            </button>

            {/* Sync All Button */}
            <button
              onClick={handleSyncAll}
              disabled={importing}
              className="inline-flex items-center space-x-1.5 px-3.5 py-2 text-xs font-semibold rounded-xl text-white bg-blue-600 hover:bg-blue-700 active:scale-95 disabled:opacity-50 transition shadow-sm"
              title="Import or update all 10 VPNBook servers"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${importing ? 'animate-spin' : ''}`} />
              <span>{importing ? 'Syncing...' : inFleetCount === 10 ? 'Update Passwords' : '1-Click Import All'}</span>
            </button>

            {/* Collapse toggle */}
            <button
              onClick={() => setCollapsed(!collapsed)}
              className="p-2 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition"
              aria-label="Toggle details"
            >
              {collapsed ? <ChevronDown className="w-5 h-5" /> : <ChevronUp className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* Live Credential & Quick Links Banner */}
        <div className="mt-3.5 pt-3 border-t border-slate-200/80 dark:border-slate-800/80 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center space-x-3">
            <span className="text-slate-500 dark:text-slate-400 flex items-center space-x-1">
              <Key className="w-3.5 h-3.5 text-blue-500" />
              <span>Live Username:</span>
              <strong className="text-slate-800 dark:text-slate-200 font-mono">vpnbook</strong>
            </span>
            <span className="text-slate-300 dark:text-slate-700">|</span>
            <span className="text-slate-500 dark:text-slate-400 flex items-center space-x-1.5">
              <span>Live Password:</span>
              <code className="px-1.5 py-0.5 rounded bg-blue-100/70 dark:bg-blue-900/40 text-blue-800 dark:text-blue-300 font-mono font-bold">
                {password}
              </code>
              <button
                onClick={handleCopyPassword}
                className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded"
                title="Copy password"
              >
                {copiedPass ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
              </button>
            </span>
          </div>

          <div className="flex items-center space-x-3 text-slate-500 dark:text-slate-400">
            {lastUpdatedDate && (
              <span>Last updated: <strong className="text-slate-700 dark:text-slate-300">{lastUpdatedDate}</strong></span>
            )}
            <a
              href="https://www.vpnbook.com/freevpn/openvpn"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center space-x-1 text-blue-600 dark:text-blue-400 hover:underline"
            >
              <span>Source</span>
              <ExternalLink className="w-3 h-3" />
            </a>
          </div>
        </div>

        {/* Dedicated Copy Links Strip */}
        <div className="mt-2.5 pt-2 border-t border-slate-100 dark:border-slate-800/50 flex flex-wrap items-center gap-2 text-[11px]">
          <span className="text-slate-400 font-medium">Quick Copy Links:</span>

          <button
            onClick={handleCopyApiUrl}
            className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-blue-50 dark:hover:bg-blue-900/30 hover:text-blue-600 dark:hover:text-blue-400 transition"
          >
            {copiedApi ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3" />}
            <span className="font-mono">/api/vpnbook/servers</span>
          </button>

          <button
            onClick={handleCopyGithubUrl}
            className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-blue-50 dark:hover:bg-blue-900/30 hover:text-blue-600 dark:hover:text-blue-400 transition"
          >
            {copiedGithub ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3" />}
            <span className="font-mono">GitHub Raw (data/vpnbook.json)</span>
          </button>

          <button
            onClick={handleCopyCronUrl}
            className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-cyan-50 dark:hover:bg-cyan-900/30 hover:text-cyan-600 dark:hover:text-cyan-400 transition"
          >
            {copiedCron ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3" />}
            <span className="font-mono">UptimeRobot Cron URL</span>
          </button>
        </div>

        {statusMessage && (
          <div className="mt-3 p-2.5 rounded-lg bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800 text-xs text-blue-800 dark:text-blue-300 flex items-center justify-between">
            <span>{statusMessage}</span>
            <button onClick={() => setStatusMessage(null)} className="text-slate-400 hover:text-slate-600">×</button>
          </div>
        )}
      </div>

      {/* Collapsible Server Grid */}
      {!collapsed && (
        <div className="p-4 sm:p-5 bg-slate-50/50 dark:bg-slate-900/30">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
            <div className="flex items-center space-x-2 text-xs">
              <span className="font-semibold text-slate-700 dark:text-slate-300">Connection Protocol:</span>
              <select
                value={protocol}
                onChange={(e) => setProtocol(e.target.value as any)}
                className="px-2.5 py-1 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 text-xs font-medium focus:outline-none focus:ring-1 focus:ring-blue-500"
              >
                <option value="tcp443">TCP 443 (Recommended - Easiest Connect & Firewall Bypass)</option>
                <option value="tcp80">TCP 80 (Alternative Web Port)</option>
                <option value="udp53">UDP 53 (DNS Port)</option>
                <option value="udp25000">UDP 25000 (High Port - Maximum Speed)</option>
              </select>
            </div>
            <div className="text-xs text-slate-500 dark:text-slate-400">
              * Automatically downloads clean .ovpn config from VPNBook API
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
            {servers.map((s) => (
              <div
                key={s.id}
                className={`p-3 rounded-xl border transition-all ${s.inFleet
                    ? 'border-blue-300 dark:border-blue-800 bg-blue-50/40 dark:bg-blue-950/20'
                    : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800/50'
                  }`}
              >
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center space-x-1.5">
                    <span className="text-xl" role="img" aria-label={s.country}>
                      {s.flag}
                    </span>
                    <span className="font-bold text-xs text-slate-900 dark:text-white">
                      {s.name}
                    </span>
                  </div>
                  {s.inFleet ? (
                    <span className="inline-flex items-center text-[10px] font-semibold text-emerald-600 dark:text-emerald-400">
                      <CheckCircle2 className="w-3 h-3 mr-0.5" /> Fleet
                    </span>
                  ) : (
                    <span className="text-[10px] text-slate-400 font-medium">Available</span>
                  )}
                </div>

                <div className="text-[11px] font-mono text-slate-600 dark:text-slate-400 truncate">
                  {s.hostname}
                </div>
                <div className="text-[10px] font-mono text-slate-400 dark:text-slate-500 mt-0.5">
                  IP: {s.ip}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

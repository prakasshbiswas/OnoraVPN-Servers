'use client';

import React, { useEffect, useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { Navbar } from '@/components/Navbar';
import { StatsBar } from '@/components/StatsBar';
import { OvpnUploader } from '@/components/OvpnUploader';
import { VpnGateExplorer } from '@/components/VpnGateExplorer';
import { VpnBookExplorer } from '@/components/VpnBookExplorer';
import { ServerCard } from '@/components/ServerCard';
import { ServerRow } from '@/components/ServerRow';
import { DeleteModal } from '@/components/DeleteModal';
import { VpnServer, resolveServerSource } from '@/lib/types';
import {
  Search,
  Server,
  RefreshCw,
  Copy,
  Check,
  LayoutList,
  LayoutGrid,
  Sparkles,
  X,
  ShieldCheck,
  Zap,
  Shield,
  UploadCloud,
  Globe,
} from 'lucide-react';

export default function DashboardPage() {
  const router = useRouter();
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const [servers, setServers] = useState<VpnServer[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'free' | 'vip'>('all');
  const [sourceFilter, setSourceFilter] = useState<'all' | 'vpngate' | 'vpnbook' | 'oneconnect' | 'custom'>('all');
  const [activeTab, setActiveTab] = useState<'all' | 'vpngate' | 'vpnbook' | 'oneconnect' | 'custom'>('all');
  const [viewMode, setViewMode] = useState<'rows' | 'grid'>('rows'); // Default to Rows!
  const [search, setSearch] = useState('');

  // Delete modal state
  const [deleteTarget, setDeleteTarget] = useState<VpnServer | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Auto-sync / Auto-purge state
  const [isAutoSyncing, setIsAutoSyncing] = useState(false);
  const [autoSyncBanner, setAutoSyncBanner] = useState<string | null>(null);

  // Copy status
  const [copiedJson, setCopiedJson] = useState(false);

  // Check auth and load servers
  useEffect(() => {
    const init = async () => {
      try {
        const authRes = await fetch('/api/auth');
        const authData = await authRes.json();
        if (!authData.authenticated) {
          router.push('/login');
          return;
        }
        setIsAuthenticated(true);
        await loadServers();
      } catch (err) {
        console.error('Init error:', err);
        router.push('/login');
      } finally {
        setIsLoading(false);
      }
    };
    init();
  }, [router]);

  const loadServers = async () => {
    try {
      const res = await fetch(`/api/servers?t=${Date.now()}`);
      if (res.ok) {
        const data = await res.json();
        setServers(Array.isArray(data) ? data : []);
      }
    } catch (err) {
      console.error('Failed to load servers:', err);
    }
  };

  const handleAutoPurgeSync = async () => {
    setIsAutoSyncing(true);
    setAutoSyncBanner(null);
    try {
      const res = await fetch('/api/cron/sync?key=admin123');
      const data = await res.json();
      if (res.ok && data.success) {
        const s = data.summary;
        setAutoSyncBanner(
          `Auto-Purge & Health Sync Complete! Purged ${s.deadServersPurged} dead servers, added ${s.replacementsAdded} replacements. Fleet has ${s.totalFleet} active servers.`
        );
        await loadServers();
      } else {
        setAutoSyncBanner(data.message || data.error || 'Auto-sync completed.');
        await loadServers();
      }
    } catch (err: any) {
      console.error('Auto sync error:', err);
      setAutoSyncBanner('Failed to execute auto-sync check.');
    } finally {
      setIsAutoSyncing(false);
    }
  };

  const handleLogout = async () => {
    await fetch('/api/auth', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'logout' }),
    });
    router.push('/login');
  };

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return;

    setIsDeleting(true);
    try {
      const res = await fetch(`/api/servers?id=${encodeURIComponent(deleteTarget.id)}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        const data = await res.json();
        setServers(data.servers || []);
      }
    } catch (err) {
      console.error('Delete error:', err);
    } finally {
      setIsDeleting(false);
      setDeleteTarget(null);
    }
  };

  const handleTogglePremium = async (id: string) => {
    try {
      const res = await fetch('/api/servers', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, action: 'togglePremium' }),
      });
      if (res.ok) {
        const data = await res.json();
        setServers(data.servers || []);
      }
    } catch (err) {
      console.error('Toggle premium error:', err);
    }
  };

  const handleExportJson = () => {
    const blob = new Blob([JSON.stringify(servers, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'servers.json';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleCopyJson = () => {
    navigator.clipboard.writeText(JSON.stringify(servers, null, 2));
    setCopiedJson(true);
    setTimeout(() => setCopiedJson(false), 2000);
  };

  // Provider server counts
  const counts = useMemo(() => {
    let vpngate = 0;
    let vpnbook = 0;
    let oneconnect = 0;
    let custom = 0;
    for (const s of servers) {
      const src = resolveServerSource(s);
      if (src === 'vpngate') vpngate++;
      else if (src === 'vpnbook') vpnbook++;
      else if (src === 'oneconnect') oneconnect++;
      else custom++;
    }
    return { vpngate, vpnbook, oneconnect, custom, total: servers.length };
  }, [servers]);

  // Tab change handler (syncs view mode and fleet filter)
  const handleTabChange = (tab: 'all' | 'vpngate' | 'vpnbook' | 'oneconnect' | 'custom') => {
    setActiveTab(tab);
    setSourceFilter(tab);
  };

  // Filtered servers
  const filteredServers = useMemo(() => {
    return servers
      .filter((s) => {
        // Source/Provider filter
        if (sourceFilter !== 'all') {
          const sSource = resolveServerSource(s);
          if (sSource !== sourceFilter) return false;
        }

        // Type filter
        if (filter === 'free' && s.premium) return false;
        if (filter === 'vip' && !s.premium) return false;

        // Search filter
        if (search.trim()) {
          const q = search.toLowerCase();
          return (
            s.country.toLowerCase().includes(q) ||
            s.countryCode.toLowerCase().includes(q) ||
            s.city.toLowerCase().includes(q) ||
            (s.ip && s.ip.includes(q))
          );
        }
        return true;
      })
      .sort((a, b) => {
        const pingA = typeof a.ping === 'number' && a.ping > 0 ? a.ping : 999;
        const pingB = typeof b.ping === 'number' && b.ping > 0 ? b.ping : 999;
        return pingA - pingB;
      });
  }, [servers, sourceFilter, filter, search]);

  if (isLoading || isAuthenticated === null) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-[#090d16]">
        <div className="flex flex-col items-center space-y-3">
          <RefreshCw className="w-8 h-8 animate-spin text-cyan-600 dark:text-cyan-400" />
          <span className="text-xs text-slate-500 dark:text-slate-400">Loading VPNx Server Control...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#090d16] text-slate-900 dark:text-slate-100 flex flex-col transition-colors duration-200">
      {/* Navbar */}
      <Navbar
        onLogout={handleLogout}
        onExportJson={handleExportJson}
        totalServers={servers.length}
      />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Metric Stats */}
        <StatsBar servers={servers} />

        {/* Auto Sync Result Banner */}
        {autoSyncBanner && (
          <div className="mb-6 p-4 rounded-xl bg-cyan-50 dark:bg-cyan-950/40 border border-cyan-200 dark:border-cyan-500/40 text-cyan-800 dark:text-cyan-300 text-xs flex items-center justify-between shadow-xs">
            <div className="flex items-center space-x-2.5">
              <ShieldCheck className="w-4 h-4 text-cyan-600 dark:text-cyan-400 shrink-0" />
              <span>{autoSyncBanner}</span>
            </div>
            <button
              onClick={() => setAutoSyncBanner(null)}
              className="text-cyan-600 dark:text-cyan-400 hover:text-cyan-800 dark:hover:text-cyan-200"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Top-Level View Switcher: All vs Only VPN Gate vs Only VPNBook vs Custom */}
        <div className="mb-6 p-1.5 rounded-2xl bg-white dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="flex items-center space-x-1.5 overflow-x-auto no-scrollbar py-0.5">
            <span className="text-xs font-semibold text-slate-400 dark:text-slate-500 pl-2 pr-1 hidden sm:inline">
              Focus View:
            </span>

            {/* All Overview */}
            <button
              onClick={() => handleTabChange('all')}
              className={`flex items-center space-x-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all shrink-0 ${
                activeTab === 'all'
                  ? 'bg-slate-900 text-white dark:bg-slate-800 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800/50'
              }`}
            >
              <Globe className="w-3.5 h-3.5 text-cyan-500" />
              <span>All Overview</span>
              <span
                className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
                  activeTab === 'all'
                    ? 'bg-white/20 text-white'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                }`}
              >
                {counts.total}
              </span>
            </button>

            {/* Only VPN Gate */}
            <button
              onClick={() => handleTabChange('vpngate')}
              className={`flex items-center space-x-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all shrink-0 ${
                activeTab === 'vpngate'
                  ? 'bg-cyan-600 text-white shadow-xs shadow-cyan-600/30'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-cyan-50 dark:hover:bg-cyan-950/30'
              }`}
            >
              <Zap className="w-3.5 h-3.5 text-amber-300" />
              <span>Only VPN Gate</span>
              <span
                className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
                  activeTab === 'vpngate'
                    ? 'bg-white/25 text-white'
                    : 'bg-cyan-100 dark:bg-cyan-950 text-cyan-700 dark:text-cyan-400 border border-cyan-200 dark:border-cyan-800/40'
                }`}
              >
                {counts.vpngate}
              </span>
            </button>

            {/* Only VPNBook */}
            <button
              onClick={() => handleTabChange('vpnbook')}
              className={`flex items-center space-x-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all shrink-0 ${
                activeTab === 'vpnbook'
                  ? 'bg-blue-600 text-white shadow-xs shadow-blue-600/30'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-blue-50 dark:hover:bg-blue-950/30'
              }`}
            >
              <Shield className="w-3.5 h-3.5 text-blue-200" />
              <span>Only VPNBook</span>
              <span
                className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
                  activeTab === 'vpnbook'
                    ? 'bg-white/25 text-white'
                    : 'bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-400 border border-blue-200 dark:border-blue-800/40'
                }`}
              >
                {counts.vpnbook}
              </span>
            </button>

            {/* OneConnect VIP Fleet */}
            <button
              onClick={() => handleTabChange('oneconnect')}
              className={`flex items-center space-x-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all shrink-0 ${
                activeTab === 'oneconnect'
                  ? 'bg-amber-600 text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800/50'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-300" />
              <span>OneConnect VIP</span>
              <span
                className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
                  activeTab === 'oneconnect'
                    ? 'bg-white/25 text-white'
                    : 'bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300'
                }`}
              >
                {counts.oneconnect}
              </span>
            </button>

            {/* Manual Upload */}
            <button
              onClick={() => handleTabChange('custom')}
              className={`flex items-center space-x-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all shrink-0 ${
                activeTab === 'custom'
                  ? 'bg-slate-800 text-white dark:bg-slate-700 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800/50'
              }`}
            >
              <UploadCloud className="w-3.5 h-3.5 text-slate-400" />
              <span>Manual Upload</span>
              <span
                className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
                  activeTab === 'custom'
                    ? 'bg-white/25 text-white'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                }`}
              >
                {counts.custom}
              </span>
            </button>
          </div>

          <div className="text-xs text-slate-500 dark:text-slate-400 px-3 py-1 flex items-center space-x-1.5">
            <span className="hidden lg:inline text-slate-400 dark:text-slate-500">Active View:</span>
            <span className="font-semibold text-slate-800 dark:text-slate-200">
              {activeTab === 'all'
                ? 'All Providers & Tools'
                : activeTab === 'vpngate'
                ? '⚡ VPN Gate Live View'
                : activeTab === 'vpnbook'
                ? '📖 VPNBook 10-Server Fleet View'
                : activeTab === 'oneconnect'
                ? '⭐ OneConnect VIP Master Fleet'
                : '📤 Custom .ovpn Uploader'}
            </span>
          </div>
        </div>

        {/* OneConnect Fleet Sync Banner (Shown in 'all' or 'oneconnect' view) */}
        {(activeTab === 'all' || activeTab === 'oneconnect') && counts.oneconnect > 0 && (
          <div className="mb-6 p-4 rounded-2xl bg-gradient-to-r from-amber-500/10 via-orange-500/5 to-transparent border border-amber-500/20">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center space-x-3">
                <div className="p-2.5 rounded-xl bg-amber-500/20 text-amber-600 dark:text-amber-400">
                  <Sparkles className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center space-x-2">
                    <span>OneConnect VIP Master Fleet</span>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-700 dark:text-amber-300 font-bold">
                      {counts.oneconnect} Servers Active
                    </span>
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Sourced via Master App (<code>com.oneiootech.ixvpn</code>) and ready for multi-app distribution without SDK package name restrictions.
                  </p>
                </div>
              </div>
              <div className="flex items-center space-x-2 text-xs">
                <span className="px-2.5 py-1 rounded-lg bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 font-semibold border border-emerald-500/20">
                  Live & Decrypted
                </span>
              </div>
            </div>
          </div>
        )}

        {/* 1. VPN Gate Live Discovery (Shown in 'all' or 'vpngate' view) */}
        {(activeTab === 'all' || activeTab === 'vpngate') && (
          <div className="mb-6">
            <VpnGateExplorer
              onServerImported={loadServers}
              fleetServers={servers}
              defaultOpen={activeTab === 'vpngate'}
            />
          </div>
        )}

        {/* 2. VPNBook OpenVPN Fleet & Auto-Password Sync (Shown in 'all' or 'vpnbook' view) */}
        {(activeTab === 'all' || activeTab === 'vpnbook') && (
          <div className="mb-6">
            <VpnBookExplorer
              onServerImported={loadServers}
              fleetServers={servers}
              defaultCollapsed={activeTab !== 'vpnbook'}
            />
          </div>
        )}

        {/* 3. Manual Uploader Section (Shown in 'all' or 'custom' view) */}
        {(activeTab === 'all' || activeTab === 'custom') && (
          <div className="mb-8">
            <div className="flex items-center justify-between mb-3">
              <div>
                <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center space-x-2">
                  <span>Manual .ovpn File Upload</span>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-semibold border border-slate-200 dark:border-slate-700">
                    Custom Servers
                  </span>
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Drop any custom .ovpn file from VPN Gate, VPNBook, or VPS. Existing servers for that country will be automatically replaced.
                </p>
              </div>
            </div>
            <OvpnUploader onServerAdded={loadServers} />
          </div>
        )}

        {/* Server List Section */}
        <div className="pt-4 border-t border-slate-200 dark:border-slate-800">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-6">
            <div>
              <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center space-x-2">
                <span>
                  {sourceFilter === 'vpngate'
                    ? '⚡ VPN Gate Server Fleet'
                    : sourceFilter === 'vpnbook'
                    ? '📖 VPNBook Server Fleet'
                    : sourceFilter === 'custom'
                    ? '📁 Custom / Manual Server Fleet'
                    : 'Active Server Fleet'}
                </span>
                <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-cyan-700 dark:text-cyan-400 border border-slate-200 dark:border-slate-700 font-mono">
                  {filteredServers.length}
                </span>
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {sourceFilter === 'vpngate'
                  ? 'Showing active servers imported from VPN Gate.'
                  : sourceFilter === 'vpnbook'
                  ? 'Showing active servers from VPNBook OpenVPN fleet.'
                  : sourceFilter === 'custom'
                  ? 'Showing manually uploaded custom OpenVPN servers.'
                  : 'Manage live locations across all providers, delete dead servers, or toggle VIP status.'}
              </p>
            </div>

            {/* Filters, Auto-Purge & View Toggle */}
            <div className="flex flex-wrap items-center gap-2">
              {/* Auto Purge & Sync Button */}
              <button
                onClick={handleAutoPurgeSync}
                disabled={isAutoSyncing}
                id="btn-auto-purge-sync"
                className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-cyan-50 dark:bg-cyan-950/50 border border-cyan-200 dark:border-cyan-500/40 text-cyan-700 dark:text-cyan-300 hover:bg-cyan-100 dark:hover:bg-cyan-900/50 text-xs font-semibold transition-all shadow-xs disabled:opacity-50"
                title="Automatically checks all servers against live VPN Gate feed and purges dead ones"
              >
                {isAutoSyncing ? (
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Sparkles className="w-3.5 h-3.5 text-cyan-600 dark:text-cyan-400" />
                )}
                <span>{isAutoSyncing ? 'Purging Dead...' : 'Auto-Purge & Heal'}</span>
              </button>

              {/* Provider / Source Segmented Control */}
              <div className="flex items-center p-1 rounded-xl bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs">
                <button
                  onClick={() => setSourceFilter('all')}
                  className={`px-2.5 py-1 rounded-lg font-medium transition-all ${
                    sourceFilter === 'all'
                      ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-bold shadow-xs'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                  title="Show servers from all sources"
                >
                  All ({counts.total})
                </button>
                <button
                  onClick={() => setSourceFilter('vpngate')}
                  className={`flex items-center space-x-1 px-2.5 py-1 rounded-lg font-medium transition-all ${
                    sourceFilter === 'vpngate'
                      ? 'bg-cyan-600 text-white font-bold shadow-xs'
                      : 'text-slate-600 dark:text-slate-400 hover:text-cyan-700 dark:hover:text-cyan-300'
                  }`}
                  title="Show ONLY VPN Gate servers"
                >
                  <Zap className="w-3 h-3" />
                  <span>VPN Gate ({counts.vpngate})</span>
                </button>
                <button
                  onClick={() => setSourceFilter('vpnbook')}
                  className={`flex items-center space-x-1 px-2.5 py-1 rounded-lg font-medium transition-all ${
                    sourceFilter === 'vpnbook'
                      ? 'bg-blue-600 text-white font-bold shadow-xs'
                      : 'text-slate-600 dark:text-slate-400 hover:text-blue-700 dark:hover:text-blue-300'
                  }`}
                  title="Show ONLY VPNBook servers"
                >
                  <Shield className="w-3 h-3" />
                  <span>VPNBook ({counts.vpnbook})</span>
                </button>
                {counts.custom > 0 && (
                  <button
                    onClick={() => setSourceFilter('custom')}
                    className={`flex items-center space-x-1 px-2.5 py-1 rounded-lg font-medium transition-all ${
                      sourceFilter === 'custom'
                        ? 'bg-slate-700 text-white font-bold shadow-xs'
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                    }`}
                    title="Show ONLY custom uploaded servers"
                  >
                    <UploadCloud className="w-3 h-3" />
                    <span>Custom ({counts.custom})</span>
                  </button>
                )}
              </div>

              {/* Free vs VIP Filter Tabs */}
              <div className="flex items-center p-1 rounded-xl bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs">
                <button
                  onClick={() => setFilter('all')}
                  className={`px-2.5 py-1 rounded-lg font-medium transition-all ${
                    filter === 'all'
                      ? 'bg-slate-800 text-white font-semibold dark:bg-slate-700'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  All Tier
                </button>
                <button
                  onClick={() => setFilter('free')}
                  className={`px-2.5 py-1 rounded-lg font-medium transition-all ${
                    filter === 'free'
                      ? 'bg-emerald-600 text-white font-semibold'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  Free
                </button>
                <button
                  onClick={() => setFilter('vip')}
                  className={`px-2.5 py-1 rounded-lg font-medium transition-all ${
                    filter === 'vip'
                      ? 'bg-amber-500 text-white font-bold'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  VIP
                </button>
              </div>

              {/* Search Box */}
              <div className="relative">
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search country or city..."
                  className="pl-9 pr-3 py-1.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-cyan-500 w-36 sm:w-44 shadow-xs"
                />
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
              </div>

              {/* View Switcher (Rows vs Grid) */}
              <div className="flex items-center p-1 rounded-xl bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs">
                <button
                  onClick={() => setViewMode('rows')}
                  className={`p-1.5 rounded-lg transition-all ${
                    viewMode === 'rows'
                      ? 'bg-cyan-600 text-white'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                  title="Rows View (List)"
                >
                  <LayoutList className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setViewMode('grid')}
                  className={`p-1.5 rounded-lg transition-all ${
                    viewMode === 'grid'
                      ? 'bg-cyan-600 text-white'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                  title="Grid View (Cards)"
                >
                  <LayoutGrid className="w-4 h-4" />
                </button>
              </div>

              {/* Copy Full JSON button */}
              <button
                onClick={handleCopyJson}
                className="flex items-center space-x-1 px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white text-xs font-medium transition-all"
                title="Copy current servers array to clipboard"
              >
                {copiedJson ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                    <span className="text-emerald-600 dark:text-emerald-400 font-semibold">Copied!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">Copy JSON</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* List Display: Rows vs Grid */}
          {filteredServers.length > 0 ? (
            viewMode === 'rows' ? (
              <div className="flex flex-col space-y-2.5">
                {filteredServers.map((server) => (
                  <ServerRow
                    key={server.id}
                    server={server}
                    onDeleteRequest={(srv) => setDeleteTarget(srv)}
                    onTogglePremium={handleTogglePremium}
                  />
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredServers.map((server) => (
                  <ServerCard
                    key={server.id}
                    server={server}
                    onDeleteRequest={(srv) => setDeleteTarget(srv)}
                    onTogglePremium={handleTogglePremium}
                  />
                ))}
              </div>
            )
          ) : (
            <div className="rounded-2xl border border-dashed border-slate-300 dark:border-slate-800 p-12 text-center bg-white/50 dark:bg-slate-900/20">
              <Server className="w-10 h-10 text-slate-400 dark:text-slate-600 mx-auto mb-3" />
              <h4 className="font-semibold text-slate-900 dark:text-white text-sm mb-1">
                {sourceFilter === 'vpngate'
                  ? 'No VPN Gate servers found in fleet'
                  : sourceFilter === 'vpnbook'
                  ? 'No VPNBook servers found in fleet'
                  : sourceFilter === 'custom'
                  ? 'No custom uploaded servers found'
                  : 'No servers found'}
              </h4>
              <p className="text-xs text-slate-500 max-w-sm mx-auto mb-4">
                {search
                  ? `No servers matching "${search}". Try clearing search.`
                  : sourceFilter === 'vpngate'
                  ? 'Scan and import live servers from VPN Gate above to populate your fleet.'
                  : sourceFilter === 'vpnbook'
                  ? 'Click "1-Click Import All" in the VPNBook card above to import the 10 dedicated servers.'
                  : 'Drop an .ovpn file above or scan live servers to deploy your first VPN server.'}
              </p>
              {sourceFilter !== 'all' && (
                <button
                  onClick={() => {
                    setSourceFilter('all');
                    setActiveTab('all');
                  }}
                  className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-medium hover:bg-slate-200 dark:hover:bg-slate-700 transition"
                >
                  <span>Reset to All Providers</span>
                </button>
              )}
            </div>
          )}
        </div>
      </main>

      {/* Delete Confirmation Modal */}
      <DeleteModal
        server={deleteTarget}
        isOpen={!!deleteTarget}
        isDeleting={isDeleting}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDeleteConfirm}
      />
    </div>
  );
}

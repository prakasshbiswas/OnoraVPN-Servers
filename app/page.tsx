'use client';

import React, { useEffect, useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { Navbar } from '@/components/Navbar';
import { StatsBar } from '@/components/StatsBar';
import { OvpnUploader } from '@/components/OvpnUploader';
import { VpnGateExplorer } from '@/components/VpnGateExplorer';
import { ServerCard } from '@/components/ServerCard';
import { ServerRow } from '@/components/ServerRow';
import { DeleteModal } from '@/components/DeleteModal';
import { VpnServer } from '@/lib/types';
import { Search, Server, RefreshCw, Copy, Check, LayoutList, LayoutGrid } from 'lucide-react';

export default function DashboardPage() {
  const router = useRouter();
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const [servers, setServers] = useState<VpnServer[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'free' | 'vip'>('all');
  const [viewMode, setViewMode] = useState<'rows' | 'grid'>('rows'); // Default to Rows!
  const [search, setSearch] = useState('');

  // Delete modal state
  const [deleteTarget, setDeleteTarget] = useState<VpnServer | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

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
      const res = await fetch('/api/servers');
      if (res.ok) {
        const data = await res.json();
        setServers(Array.isArray(data) ? data : []);
      }
    } catch (err) {
      console.error('Failed to load servers:', err);
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

  // Filtered servers
  const filteredServers = useMemo(() => {
    return servers.filter((s) => {
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
    });
  }, [servers, filter, search]);

  if (isLoading || isAuthenticated === null) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#090d16]">
        <div className="flex flex-col items-center space-y-3">
          <RefreshCw className="w-8 h-8 animate-spin text-cyan-400" />
          <span className="text-xs text-slate-400">Loading VPNx Server Control...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#090d16] text-slate-100 flex flex-col">
      {/* Navbar */}
      <Navbar
        onLogout={handleLogout}
        onExportJson={handleExportJson}
        totalServers={servers.length}
      />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Metric Stats */}
        <StatsBar servers={servers} />

        {/* 1-Click VPN Gate Live Discovery */}
        <VpnGateExplorer onServerImported={loadServers} />

        {/* Uploader Section */}
        <div className="mb-10">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h2 className="text-lg font-bold text-white">Manual .ovpn File Upload</h2>
              <p className="text-xs text-slate-400">
                Drop any custom .ovpn file from VPN Gate, VPNBook, or VPS. Existing servers for that country will be automatically replaced.
              </p>
            </div>
          </div>
          <OvpnUploader onServerAdded={loadServers} />
        </div>

        {/* Server List Section */}
        <div className="pt-4 border-t border-slate-800">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
            <div>
              <h2 className="text-lg font-bold text-white flex items-center space-x-2">
                <span>Active Server Fleet</span>
                <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-slate-800 text-cyan-400 border border-slate-700">
                  {filteredServers.length}
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                Manage live locations, delete dead servers, or toggle VIP status.
              </p>
            </div>

            {/* Filters & Search & View Toggle */}
            <div className="flex flex-wrap items-center gap-2">
              {/* Search Box */}
              <div className="relative">
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search country or city..."
                  className="pl-9 pr-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500 w-44 sm:w-56"
                />
                <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-2.5" />
              </div>

              {/* Filter Tabs */}
              <div className="flex items-center p-1 rounded-xl bg-slate-900 border border-slate-800 text-xs">
                <button
                  onClick={() => setFilter('all')}
                  className={`px-3 py-1 rounded-lg font-medium transition-all ${
                    filter === 'all'
                      ? 'bg-cyan-500 text-white'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  All ({servers.length})
                </button>
                <button
                  onClick={() => setFilter('free')}
                  className={`px-3 py-1 rounded-lg font-medium transition-all ${
                    filter === 'free'
                      ? 'bg-emerald-500 text-white'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Free ({servers.filter((s) => !s.premium).length})
                </button>
                <button
                  onClick={() => setFilter('vip')}
                  className={`px-3 py-1 rounded-lg font-medium transition-all ${
                    filter === 'vip'
                      ? 'bg-amber-500 text-slate-950 font-bold'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  VIP ({servers.filter((s) => s.premium).length})
                </button>
              </div>

              {/* View Switcher (Rows vs Grid) */}
              <div className="flex items-center p-1 rounded-xl bg-slate-900 border border-slate-800 text-xs">
                <button
                  onClick={() => setViewMode('rows')}
                  className={`p-1.5 rounded-lg transition-all ${
                    viewMode === 'rows'
                      ? 'bg-cyan-500 text-white'
                      : 'text-slate-400 hover:text-white'
                  }`}
                  title="Rows View (List)"
                >
                  <LayoutList className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setViewMode('grid')}
                  className={`p-1.5 rounded-lg transition-all ${
                    viewMode === 'grid'
                      ? 'bg-cyan-500 text-white'
                      : 'text-slate-400 hover:text-white'
                  }`}
                  title="Grid View (Cards)"
                >
                  <LayoutGrid className="w-4 h-4" />
                </button>
              </div>

              {/* Copy Full JSON button */}
              <button
                onClick={handleCopyJson}
                className="flex items-center space-x-1 px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-slate-300 hover:text-white text-xs font-medium transition-all"
                title="Copy entire servers.json array to clipboard"
              >
                {copiedJson ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                    <span className="text-emerald-400">Copied!</span>
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
            <div className="rounded-2xl border border-dashed border-slate-800 p-12 text-center bg-slate-900/20">
              <Server className="w-10 h-10 text-slate-600 mx-auto mb-3" />
              <h4 className="font-semibold text-white text-sm mb-1">No servers found</h4>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                {search
                  ? `No servers matching "${search}". Try clearing search.`
                  : 'Drop an .ovpn file above or scan live servers to deploy your first VPN server.'}
              </p>
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

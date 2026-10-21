'use client';

import React, { useState } from 'react';
import { RefreshCw, Zap, Check, Wifi, Globe, Shield, AlertTriangle } from 'lucide-react';
import { VpnGateServerItem } from '@/lib/vpngate';
import { VpnServer } from '@/lib/types';

interface VpnGateExplorerProps {
  onServerImported: () => void;
}

export const VpnGateExplorer: React.FC<VpnGateExplorerProps> = ({ onServerImported }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [servers, setServers] = useState<any[]>([]);
  const [importingId, setImportingId] = useState<string | null>(null);
  const [successId, setSuccessId] = useState<string | null>(null);

  const handleFetch = async () => {
    setLoading(true);
    setIsOpen(true);
    try {
      const res = await fetch('/api/vpngate');
      if (res.ok) {
        const data = await res.json();
        setServers(Array.isArray(data) ? data : []);
      }
    } catch (err) {
      console.error('Failed to fetch VPN Gate:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleImport = async (item: VpnGateServerItem, isVip: boolean = false) => {
    setImportingId(item.id);
    try {
      const newServer: VpnServer = {
        id: item.alreadyInFleet && (item as any).existingServerId ? (item as any).existingServerId : item.id,
        country: item.country,
        countryCode: item.countryCode,
        city: `${item.country} (Live Gateway)`,
        flag: item.flag,
        flagUrl: item.flagUrl,
        premium: isVip,
        username: 'vpn',
        password: 'vpn',
        ping: item.ping,
        proto: 'tcp',
        ip: item.ip,
        port: 443,
        ovpnBase64: item.ovpnBase64,
        updatedAt: new Date().toISOString(),
      };

      const res = await fetch('/api/servers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          server: newServer,
          replaceCountry: true, // Auto-replace old server!
        }),
      });

      if (res.ok) {
        setSuccessId(item.id);
        setTimeout(() => setSuccessId(null), 3000);
        onServerImported();

        // Update local status in explorer
        setServers((prev) =>
          prev.map((s) => (s.id === item.id ? { ...s, alreadyInFleet: true } : s))
        );
      }
    } catch (err) {
      console.error('Import error:', err);
    } finally {
      setImportingId(null);
    }
  };

  return (
    <div className="mb-8">
      {!isOpen ? (
        <div className="p-5 rounded-2xl bg-gradient-to-r from-blue-950/40 via-cyan-950/30 to-slate-900 border border-cyan-500/30 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center space-x-3.5">
            <div className="w-10 h-10 rounded-xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400 shrink-0">
              <Zap className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-white text-sm flex items-center space-x-2">
                <span>VPN Gate Live API Discovery</span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 font-semibold border border-cyan-500/30">
                  Direct CSV Feed
                </span>
              </h3>
              <p className="text-xs text-slate-400">
                Instantly scan real-time active servers from <code className="text-cyan-300">vpngate.net/api/iphone/</code> and replace dead ones in 1-click without downloading files.
              </p>
            </div>
          </div>

          <button
            onClick={handleFetch}
            disabled={loading}
            id="btn-scan-vpngate"
            className="px-4 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs flex items-center space-x-2 transition-all shadow-lg shadow-cyan-500/20 shrink-0"
          >
            {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4" />}
            <span>Scan Live Servers</span>
          </button>
        </div>
      ) : (
        <div className="rounded-2xl bg-slate-900/90 border border-cyan-500/30 p-6 backdrop-blur-xl">
          <div className="flex items-center justify-between pb-4 border-b border-slate-800 mb-4">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 rounded-lg bg-cyan-500/20 text-cyan-400 flex items-center justify-center">
                <Zap className="w-4 h-4" />
              </div>
              <div>
                <h3 className="font-bold text-white text-sm">Live Servers from VPN Gate Official API</h3>
                <p className="text-xs text-slate-400">Curated top speed and lowest ping servers per country</p>
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <button
                onClick={handleFetch}
                disabled={loading}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 text-xs flex items-center space-x-1"
                title="Refresh feed"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-cyan-400' : ''}`} />
                <span className="hidden sm:inline">Refresh</span>
              </button>
              <button
                onClick={() => setIsOpen(false)}
                className="px-2.5 py-1 rounded-lg text-xs text-slate-400 hover:text-white hover:bg-slate-800"
              >
                Hide
              </button>
            </div>
          </div>

          {loading ? (
            <div className="py-12 text-center flex flex-col items-center justify-center space-y-2">
              <RefreshCw className="w-7 h-7 text-cyan-400 animate-spin" />
              <span className="text-xs text-slate-400">Querying live CSV feed from vpngate.net...</span>
            </div>
          ) : servers.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 max-h-[420px] overflow-y-auto pr-1">
              {servers.map((srv) => {
                const isImporting = importingId === srv.id;
                const isSuccess = successId === srv.id;

                return (
                  <div
                    key={srv.id}
                    className="p-3.5 rounded-xl bg-slate-950/70 border border-slate-800 flex flex-col justify-between hover:border-slate-700 transition-all text-xs"
                  >
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center space-x-2">
                          <span className="text-2xl">{srv.flag}</span>
                          <div>
                            <span className="font-bold text-white">{srv.country}</span>
                            <span className="ml-1 text-[10px] text-slate-400 font-mono">({srv.countryCode})</span>
                          </div>
                        </div>

                        {srv.alreadyInFleet ? (
                          <span className="text-[10px] px-2 py-0.5 rounded bg-amber-500/10 text-amber-300 border border-amber-500/20 font-semibold">
                            In Fleet
                          </span>
                        ) : (
                          <span className="text-[10px] px-2 py-0.5 rounded bg-slate-800 text-slate-400">
                            Available
                          </span>
                        )}
                      </div>

                      <div className="flex items-center space-x-3 text-slate-400 mb-3">
                        <div className="flex items-center space-x-1">
                          <Wifi className="w-3 h-3 text-emerald-400" />
                          <span>{srv.ping} ms</span>
                        </div>
                        <div className="flex items-center space-x-1">
                          <Globe className="w-3 h-3 text-cyan-400" />
                          <span className="truncate max-w-[120px]">{srv.ip}</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center space-x-2 pt-2 border-t border-slate-800/60">
                      <button
                        onClick={() => handleImport(srv, false)}
                        disabled={isImporting}
                        className={`flex-1 py-1.5 rounded-lg font-bold text-[11px] transition-all flex items-center justify-center space-x-1 ${
                          srv.alreadyInFleet
                            ? 'bg-amber-500/20 text-amber-300 hover:bg-amber-500/30 border border-amber-500/30'
                            : 'bg-cyan-500 hover:bg-cyan-400 text-slate-950'
                        }`}
                      >
                        {isSuccess ? (
                          <>
                            <Check className="w-3 h-3 text-emerald-400" />
                            <span>Updated!</span>
                          </>
                        ) : isImporting ? (
                          <RefreshCw className="w-3 h-3 animate-spin" />
                        ) : srv.alreadyInFleet ? (
                          <span>Replace {srv.countryCode}</span>
                        ) : (
                          <span>+ Add Free</span>
                        )}
                      </button>

                      <button
                        onClick={() => handleImport(srv, true)}
                        disabled={isImporting}
                        className="px-2.5 py-1.5 rounded-lg bg-amber-500/10 text-amber-400 hover:bg-amber-500/20 border border-amber-500/30 font-bold text-[11px] transition-all"
                        title="Add/Replace as VIP Server"
                      >
                        + VIP
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-center text-xs text-slate-500 py-6">
              No live servers retrieved from VPN Gate.
            </p>
          )}
        </div>
      )}
    </div>
  );
};

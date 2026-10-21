'use client';

import React, { useState, useMemo } from 'react';
import { RefreshCw, Zap, Check, Wifi, Globe, Plus, RotateCw, AlertCircle, X } from 'lucide-react';
import { VpnGateServerItem } from '@/lib/vpngate';
import { VpnServer } from '@/lib/types';

interface VpnGateExplorerProps {
  onServerImported: () => void;
  fleetServers?: VpnServer[];
  defaultOpen?: boolean;
}

export const VpnGateExplorer: React.FC<VpnGateExplorerProps> = ({
  onServerImported,
  fleetServers = [],
  defaultOpen = false,
}) => {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  React.useEffect(() => {
    if (defaultOpen) {
      setIsOpen(true);
    }
  }, [defaultOpen]);
  const [loading, setLoading] = useState(false);
  const [servers, setServers] = useState<VpnGateServerItem[]>([]);
  const [importingId, setImportingId] = useState<string | null>(null);
  const [importingAll, setImportingAll] = useState(false);
  const [successId, setSuccessId] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Real-time reactive fleet lookup from parent
  const activeIpSet = useMemo(() => {
    return new Set((fleetServers || []).map((s) => s.ip).filter(Boolean));
  }, [fleetServers]);

  const activeCountrySet = useMemo(() => {
    return new Set((fleetServers || []).map((s) => s.countryCode.toUpperCase()));
  }, [fleetServers]);

  const unaddedCount = useMemo(() => {
    return servers.filter((s) => !activeIpSet.has(s.ip)).length;
  }, [servers, activeIpSet]);

  const handleFetch = async () => {
    setLoading(true);
    setIsOpen(true);
    setErrorMessage(null);
    try {
      const res = await fetch(`/api/vpngate?t=${Date.now()}&key=admin123`);
      if (res.ok) {
        const data = await res.json();
        setServers(Array.isArray(data) ? data : []);
      } else {
        const err = await res.json().catch(() => ({}));
        setErrorMessage(err.error || 'Failed to fetch VPN Gate servers');
      }
    } catch (err: any) {
      console.error('Failed to fetch VPN Gate:', err);
      setErrorMessage(err.message || 'Network error fetching live feed');
    } finally {
      setLoading(false);
    }
  };

  const handleImportAll = async () => {
    const unadded = servers.filter((s) => !activeIpSet.has(s.ip));
    if (unadded.length === 0) return;


    setImportingAll(true);
    setErrorMessage(null);
    try {
      const payload = unadded.map((item) => ({
        id: item.id,
        country: item.country,
        countryCode: item.countryCode,
        city: item.city,
        flag: item.flag,
        flagUrl: item.flagUrl,
        premium: false,
        username: 'vpn',
        password: 'vpn',
        ping: item.ping,
        proto: 'tcp',
        ip: item.ip,
        port: 443,
        ovpnBase64: item.ovpnBase64,
        source: 'vpngate',
        updatedAt: new Date().toISOString(),
      }));

      const res = await fetch('/api/servers?key=admin123', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ servers: payload }),
      });

      if (res.ok) {
        onServerImported();
        setServers((prev) => prev.map((s) => ({ ...s, exactIpInFleet: true })));
      } else {
        const err = await res.json().catch(() => ({}));
        setErrorMessage(err.error || 'Failed to auto-add servers to fleet');
      }
    } catch (err: any) {
      console.error('Batch import error:', err);
      setErrorMessage(err.message || 'Error communicating with server');
    } finally {
      setImportingAll(false);
    }
  };

  const handleImport = async (
    item: VpnGateServerItem,
    isVip: boolean = false,
    replaceCountry: boolean = false
  ) => {
    setImportingId(item.id);
    setErrorMessage(null);
    try {
      const serverId = replaceCountry && item.existingServerId ? item.existingServerId : item.id;

      const newServer: VpnServer = {
        id: serverId,
        country: item.country,
        countryCode: item.countryCode,
        city: item.city,
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
        source: 'vpngate',
        updatedAt: new Date().toISOString(),
      };

      const res = await fetch('/api/servers?key=admin123', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          server: newServer,
          replaceCountry,
        }),
      });

      if (res.ok) {
        setSuccessId(item.id);
        setTimeout(() => setSuccessId(null), 3000);
        onServerImported();

        // Update local status in explorer
        setServers((prev) =>
          prev.map((s) => (s.id === item.id ? { ...s, exactIpInFleet: true } : s))
        );
      } else {
        const err = await res.json().catch(() => ({}));
        setErrorMessage(err.error || 'Failed to save server');
      }
    } catch (err: any) {
      console.error('Import error:', err);
      setErrorMessage(err.message || 'Network error saving server');
    } finally {
      setImportingId(null);
    }
  };

  return (
    <div className="mb-8">
      {!isOpen ? (
        <div className="p-5 rounded-2xl bg-gradient-to-r from-cyan-50/80 via-blue-50/50 to-slate-50 dark:from-blue-950/40 dark:via-cyan-950/30 dark:to-slate-900 border border-cyan-200 dark:border-cyan-500/30 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 transition-all">
          <div className="flex items-center space-x-3.5">
            <div className="w-10 h-10 rounded-xl bg-cyan-100 dark:bg-cyan-500/10 border border-cyan-200 dark:border-cyan-500/30 flex items-center justify-center text-cyan-600 dark:text-cyan-400 shrink-0">
              <Zap className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 dark:text-white text-sm flex items-center space-x-2">
                <span>VPN Gate Live API Discovery</span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-cyan-100 dark:bg-cyan-500/20 text-cyan-800 dark:text-cyan-300 font-semibold border border-cyan-200 dark:border-cyan-500/30">
                  Multiple IPs Supported
                </span>
              </h3>
              <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">
                Discover live servers from <code className="text-cyan-700 dark:text-cyan-300 font-semibold">vpngate.net/api/iphone/</code>. You can replace dead servers OR add new IPs alongside existing ones.
              </p>
            </div>
          </div>

          <button
            onClick={handleFetch}
            disabled={loading}
            id="btn-scan-vpngate"
            className="px-4 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white dark:bg-cyan-500 dark:hover:bg-cyan-400 dark:text-slate-950 font-bold text-xs flex items-center space-x-2 transition-all shadow-md shadow-cyan-600/10 dark:shadow-cyan-500/20 shrink-0"
          >
            {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4" />}
            <span>Scan Live Servers</span>
          </button>
        </div>
      ) : (
        <div className="rounded-2xl bg-white dark:bg-slate-900/90 border border-cyan-200 dark:border-cyan-500/30 p-6 shadow-lg shadow-slate-200/50 dark:shadow-none backdrop-blur-xl transition-all">
          <div className="flex items-center justify-between pb-4 border-b border-slate-200 dark:border-slate-800 mb-4">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 rounded-lg bg-cyan-100 dark:bg-cyan-500/20 text-cyan-600 dark:text-cyan-400 flex items-center justify-center">
                <Zap className="w-4 h-4" />
              </div>
              <div>
                <h3 className="font-bold text-slate-900 dark:text-white text-sm">Live Servers from VPN Gate Official API</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">Multiple unique IP gateways available per country</p>
              </div>
            </div>

            <div className="flex items-center space-x-2">
              {unaddedCount > 0 && (
                <button
                  onClick={handleImportAll}
                  disabled={importingAll}
                  id="btn-auto-add-all-vpngate"
                  className="px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white dark:from-cyan-500 dark:to-blue-600 dark:text-slate-950 font-bold text-xs flex items-center space-x-1.5 transition-all shadow-md shadow-cyan-600/20 disabled:opacity-50"
                  title="Automatically add all new servers from this scan to your active fleet"
                >
                  {importingAll ? (
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Zap className="w-3.5 h-3.5" />
                  )}
                  <span>Auto-Add All ({unaddedCount})</span>
                </button>
              )}

              <button
                onClick={handleFetch}
                disabled={loading}
                className="p-1.5 rounded-lg text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 text-xs flex items-center space-x-1"
                title="Refresh feed"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-cyan-600 dark:text-cyan-400' : ''}`} />
                <span className="hidden sm:inline">Refresh</span>
              </button>
              <button
                onClick={() => setIsOpen(false)}
                className="px-2.5 py-1 rounded-lg text-xs text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                Hide
              </button>
            </div>
          </div>

          {/* Error Banner */}
          {errorMessage && (
            <div className="mb-4 p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-500/30 text-rose-800 dark:text-rose-300 text-xs flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                <span>{errorMessage}</span>
              </div>
              <button onClick={() => setErrorMessage(null)} className="text-rose-500 hover:text-rose-700">
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {loading ? (
            <div className="py-12 text-center flex flex-col items-center justify-center space-y-2">
              <RefreshCw className="w-7 h-7 text-cyan-600 dark:text-cyan-400 animate-spin" />
              <span className="text-xs text-slate-500 dark:text-slate-400">Querying live CSV feed from vpngate.net...</span>
            </div>
          ) : servers.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 max-h-[560px] overflow-y-auto pr-1">
              {servers.map((srv) => {
                const isImporting = importingId === srv.id;
                const isSuccess = successId === srv.id;
                const isIpInFleet = activeIpSet.has(srv.ip);
                const isCountryInFleet = activeCountrySet.has(srv.countryCode.toUpperCase());


                return (
                  <div
                    key={srv.id}
                    className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-950/70 border border-slate-200 dark:border-slate-800 flex flex-col justify-between hover:border-slate-300 dark:hover:border-slate-700 shadow-xs transition-all text-xs"
                  >
                    <div>
                      {/* Flag and Country Header */}
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center space-x-2.5">
                          <div className="w-7 h-5 rounded overflow-hidden bg-slate-200 dark:bg-slate-800 border border-slate-300 dark:border-slate-700/80 shrink-0">
                            <img
                              src={srv.flagUrl || `https://flagcdn.com/w80/${srv.countryCode.toLowerCase()}.png`}
                              alt={srv.country}
                              className="w-full h-full object-cover"
                              loading="lazy"
                            />
                          </div>
                          <div>
                            <span className="font-bold text-slate-900 dark:text-white">{srv.country}</span>
                            <span className="ml-1 text-[10px] text-slate-500 dark:text-slate-400 font-mono">({srv.countryCode})</span>
                          </div>
                        </div>

                        {/* Status Badge */}
                        {isIpInFleet ? (
                          <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/20 font-semibold">
                            ✓ In Fleet
                          </span>
                        ) : isCountryInFleet ? (
                          <span className="text-[10px] px-2 py-0.5 rounded bg-blue-50 dark:bg-blue-500/10 text-blue-700 dark:text-cyan-300 border border-blue-200 dark:border-cyan-500/20 font-semibold">
                            New IP
                          </span>
                        ) : (
                          <span className="text-[10px] px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 font-medium">
                            Available
                          </span>
                        )}
                      </div>

                      {/* Ping and IP info */}
                      <div className="flex items-center space-x-3 text-slate-500 dark:text-slate-400 mb-3">
                        <div className="flex items-center space-x-1">
                          <Wifi className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
                          <span className="font-semibold text-slate-700 dark:text-slate-300">{srv.ping} ms</span>
                        </div>
                        <div className="flex items-center space-x-1">
                          <Globe className="w-3 h-3 text-cyan-600 dark:text-cyan-400" />
                          <span className="truncate max-w-[140px] font-mono text-[11px] text-slate-700 dark:text-slate-300">
                            {srv.ip}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex flex-wrap items-center gap-1.5 pt-2 border-t border-slate-200 dark:border-slate-800/60">
                      {isIpInFleet ? (
                        <div className="w-full py-1.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/40 text-emerald-700 dark:text-emerald-400 text-center text-[11px] font-semibold flex items-center justify-center space-x-1">
                          <Check className="w-3 h-3" />
                          <span>Already in Fleet</span>
                        </div>
                      ) : isCountryInFleet ? (
                        /* Country already exists with different IP: Give option to REPLACE or ADD AS 2ND */
                        <>
                          <button
                            onClick={() => handleImport(srv, false, false)}
                            disabled={isImporting}
                            className="flex-1 py-1.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white dark:bg-cyan-500 dark:hover:bg-cyan-400 dark:text-slate-950 font-bold text-[11px] transition-all flex items-center justify-center space-x-1 shadow-xs"
                            title="Add this IP as an additional server for this country"
                          >
                            {isSuccess ? (
                              <>
                                <Check className="w-3 h-3 text-white" />
                                <span>Added!</span>
                              </>
                            ) : isImporting ? (
                              <RefreshCw className="w-3 h-3 animate-spin" />
                            ) : (
                              <>
                                <Plus className="w-3 h-3" />
                                <span>Add New IP</span>
                              </>
                            )}
                          </button>

                          <button
                            onClick={() => handleImport(srv, false, true)}
                            disabled={isImporting}
                            className="py-1.5 px-2.5 rounded-lg bg-amber-50 text-amber-800 hover:bg-amber-100 border border-amber-200 dark:bg-amber-500/20 dark:text-amber-300 dark:hover:bg-amber-500/30 dark:border-amber-500/30 font-bold text-[11px] transition-all flex items-center space-x-1"
                            title="Replace the old server for this country with this IP"
                          >
                            <RotateCw className="w-3 h-3" />
                            <span>Replace</span>
                          </button>

                          <button
                            onClick={() => handleImport(srv, true, false)}
                            disabled={isImporting}
                            className="px-2 py-1.5 rounded-lg bg-amber-50 text-amber-700 hover:bg-amber-100 border border-amber-200 dark:bg-amber-500/10 dark:text-amber-400 dark:hover:bg-amber-500/20 dark:border-amber-500/30 font-bold text-[11px] transition-all"
                            title="Add as VIP server"
                          >
                            + VIP
                          </button>
                        </>
                      ) : (
                        /* New country entirely */
                        <>
                          <button
                            onClick={() => handleImport(srv, false, false)}
                            disabled={isImporting}
                            className="flex-1 py-1.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white dark:bg-cyan-500 dark:hover:bg-cyan-400 dark:text-slate-950 font-bold text-[11px] transition-all flex items-center justify-center space-x-1 shadow-xs"
                          >
                            {isSuccess ? (
                              <>
                                <Check className="w-3 h-3 text-white" />
                                <span>Added!</span>
                              </>
                            ) : isImporting ? (
                              <RefreshCw className="w-3 h-3 animate-spin" />
                            ) : (
                              <span>+ Add Free</span>
                            )}
                          </button>

                          <button
                            onClick={() => handleImport(srv, true, false)}
                            disabled={isImporting}
                            className="px-2.5 py-1.5 rounded-lg bg-amber-50 text-amber-700 hover:bg-amber-100 border border-amber-200 dark:bg-amber-500/10 dark:text-amber-400 dark:hover:bg-amber-500/20 dark:border-amber-500/30 font-bold text-[11px] transition-all"
                            title="Add as VIP Server"
                          >
                            + VIP
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-center text-xs text-slate-500 py-6">
              No live servers retrieved from VPN Gate. Click Refresh or Scan.
            </p>
          )}
        </div>
      )}
    </div>
  );
};

'use client';

import React, { useState } from 'react';
import { Trash2, Lock, Unlock, Copy, Check, Activity, Globe, Wifi, Zap, Shield, UploadCloud, Sparkles } from 'lucide-react';
import { VpnServer, resolveServerSource } from '@/lib/types';
import { getFlagUrl } from '@/lib/geoip';

interface ServerCardProps {
  server: VpnServer;
  onDeleteRequest: (server: VpnServer) => void;
  onTogglePremium: (id: string) => void;
}

export const ServerCard: React.FC<ServerCardProps> = ({
  server,
  onDeleteRequest,
  onTogglePremium,
}) => {
  const [copied, setCopied] = useState(false);
  const [imgError, setImgError] = useState(false);

  const handleCopyBase64 = () => {
    if (server.ovpnBase64) {
      navigator.clipboard.writeText(server.ovpnBase64);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const flagSrc = server.flagUrl || getFlagUrl(server.countryCode);
  const source = resolveServerSource(server);

  return (
    <div className="rounded-2xl bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800/80 p-5 shadow-xs hover:shadow-sm hover:border-slate-300 dark:hover:border-slate-700/80 transition-all flex flex-col justify-between group">
      <div>
        {/* Top Header with Flag Image & Provider Badge */}
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center space-x-3">
            <div className="w-11 h-7.5 rounded-md overflow-hidden bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700/80 shrink-0 shadow-xs flex items-center justify-center">
              {!imgError ? (
                <img
                  src={flagSrc}
                  alt={server.country}
                  className="w-full h-full object-cover"
                  onError={() => setImgError(true)}
                  loading="lazy"
                />
              ) : (
                <span className="text-xs font-bold text-slate-500 dark:text-slate-400">{server.countryCode}</span>
              )}
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h4 className="font-bold text-slate-900 dark:text-white text-base">{server.country}</h4>
                <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                  {server.countryCode}
                </span>
                {source === 'oneconnect' ? (
                  <span
                    title="OneConnect VIP Server"
                    className="inline-flex items-center space-x-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-50 dark:bg-amber-500/10 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-500/30"
                  >
                    <Sparkles className="w-2.5 h-2.5 text-amber-600 dark:text-amber-400" />
                    <span>OneConnect</span>
                  </span>
                ) : source === 'vpngate' ? (
                  <span
                    title="VPN Gate Server"
                    className="inline-flex items-center space-x-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-cyan-50 dark:bg-cyan-500/10 text-cyan-700 dark:text-cyan-300 border border-cyan-200 dark:border-cyan-500/30"
                  >
                    <Zap className="w-2.5 h-2.5 text-cyan-600 dark:text-cyan-400" />
                    <span>VPN Gate</span>
                  </span>
                ) : source === 'vpnbook' ? (
                  <span
                    title="VPNBook Server"
                    className="inline-flex items-center space-x-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-blue-50 dark:bg-blue-500/10 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-500/30"
                  >
                    <Shield className="w-2.5 h-2.5 text-blue-600 dark:text-blue-400" />
                    <span>VPNBook</span>
                  </span>
                ) : (
                  <span
                    title="Custom Server"
                    className="inline-flex items-center space-x-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700"
                  >
                    <UploadCloud className="w-2.5 h-2.5 text-slate-500" />
                    <span>Custom</span>
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-medium truncate max-w-[200px]">{server.city}</p>
            </div>
          </div>

          {/* Premium / Free Badge */}
          <button
            onClick={() => onTogglePremium(server.id)}
            title="Click to toggle Free / VIP status"
            className={`flex items-center space-x-1 px-2.5 py-1 rounded-full text-[11px] font-bold border transition-all ${
              server.premium
                ? 'bg-amber-50 dark:bg-amber-500/10 text-amber-800 dark:text-amber-400 border-amber-200 dark:border-amber-500/30 hover:bg-amber-100 dark:hover:bg-amber-500/20'
                : 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-800 dark:text-emerald-400 border-emerald-200 dark:border-emerald-500/30 hover:bg-emerald-100 dark:hover:bg-emerald-500/20'
            }`}
          >
            {server.premium ? (
              <>
                <Lock className="w-3 h-3" />
                <span>VIP Gold</span>
              </>
            ) : (
              <>
                <Unlock className="w-3 h-3" />
                <span>Free</span>
              </>
            )}
          </button>
        </div>

        {/* Server Metadata Grid */}
        <div className="grid grid-cols-2 gap-2 my-3 p-2.5 rounded-xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800/50 text-xs">
          <div className="flex items-center space-x-1.5 text-slate-600 dark:text-slate-400">
            <Globe className="w-3.5 h-3.5 text-cyan-600 dark:text-cyan-400" />
            <span className="truncate font-mono font-medium text-slate-800 dark:text-slate-200">{server.ip || 'Remote IP'}</span>
          </div>

          <div className="flex items-center space-x-1.5 text-slate-600 dark:text-slate-400">
            <Activity className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
            <span className="font-mono font-medium uppercase text-slate-700 dark:text-slate-300">{server.proto?.toUpperCase() || 'UDP'}:{server.port || 1194}</span>
          </div>

          <div className="flex items-center space-x-1.5 text-slate-600 dark:text-slate-400">
            <Wifi className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
            <span className="font-semibold text-slate-700 dark:text-slate-300">{server.ping || 45} ms</span>
          </div>

          <div className="flex items-center space-x-1.5 text-slate-500 dark:text-slate-400">
            <span className="text-[10px] text-slate-400 dark:text-slate-500 font-mono truncate">ID: {server.id}</span>
          </div>
        </div>
      </div>

      {/* Card Actions Footer */}
      <div className="flex items-center justify-between pt-3 border-t border-slate-200 dark:border-slate-800/60 mt-2">
        <button
          onClick={handleCopyBase64}
          className="flex items-center space-x-1 text-xs text-slate-600 dark:text-slate-400 hover:text-cyan-600 dark:hover:text-cyan-400 transition-colors"
          title="Copy Base64 encoded OpenVPN configuration"
        >
          {copied ? (
            <>
              <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
              <span className="text-emerald-600 dark:text-emerald-400 font-semibold">Copied</span>
            </>
          ) : (
            <>
              <Copy className="w-3.5 h-3.5" />
              <span>Copy Config</span>
            </>
          )}
        </button>

        {/* Delete Server Button */}
        <button
          onClick={() => onDeleteRequest(server)}
          className="p-1.5 rounded-lg text-slate-400 dark:text-slate-500 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 transition-all"
          title={`Delete ${server.country} server`}
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};

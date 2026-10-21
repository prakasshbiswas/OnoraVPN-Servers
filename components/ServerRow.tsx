'use client';

import React, { useState } from 'react';
import { Trash2, Lock, Unlock, Copy, Check, Globe, Activity, Wifi } from 'lucide-react';
import { VpnServer } from '@/lib/types';
import { getFlagUrl } from '@/lib/geoip';

interface ServerRowProps {
  server: VpnServer;
  onDeleteRequest: (server: VpnServer) => void;
  onTogglePremium: (id: string) => void;
}

export const ServerRow: React.FC<ServerRowProps> = ({
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

  return (
    <div className="flex flex-col md:flex-row md:items-center justify-between p-4 rounded-xl bg-slate-900/60 border border-slate-800/80 hover:border-slate-700 backdrop-blur-md transition-all gap-4 group">
      {/* 1. Country & Flag */}
      <div className="flex items-center space-x-3.5 min-w-[240px]">
        {/* Country Flag Image */}
        <div className="w-10 h-7 rounded-md overflow-hidden bg-slate-800 border border-slate-700/80 shrink-0 shadow-sm flex items-center justify-center">
          {!imgError ? (
            <img
              src={flagSrc}
              alt={server.country}
              className="w-full h-full object-cover"
              onError={() => setImgError(true)}
              loading="lazy"
            />
          ) : (
            <span className="text-xs font-bold text-slate-400">{server.countryCode}</span>
          )}
        </div>

        <div className="truncate">
          <div className="flex items-center space-x-2">
            <span className="font-bold text-white text-sm truncate">{server.country}</span>
            <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-slate-800 text-slate-300 border border-slate-700/60 shrink-0">
              {server.countryCode}
            </span>
          </div>
          <p className="text-xs text-slate-400 truncate max-w-[220px]">{server.city}</p>
        </div>
      </div>

      {/* 2. Network Details (IP, Protocol, Port) */}
      <div className="flex items-center space-x-5 text-xs text-slate-300 min-w-[220px]">
        <div className="flex items-center space-x-1.5 text-slate-400">
          <Globe className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
          <span className="font-mono text-slate-200">{server.ip || 'Remote IP'}</span>
        </div>

        <div className="flex items-center space-x-1 text-slate-400">
          <Activity className="w-3.5 h-3.5 text-blue-400 shrink-0" />
          <span className="font-mono uppercase text-slate-300">
            {server.proto || 'tcp'}:{server.port || 443}
          </span>
        </div>
      </div>

      {/* 3. Ping Latency */}
      <div className="flex items-center space-x-1.5 text-xs min-w-[80px]">
        <Wifi className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
        <span
          className={`font-semibold ${
            (server.ping || 45) < 50
              ? 'text-emerald-400'
              : (server.ping || 45) < 100
              ? 'text-cyan-400'
              : 'text-amber-400'
          }`}
        >
          {server.ping || 45} ms
        </span>
      </div>

      {/* 4. Tier Badge / Toggle */}
      <div className="min-w-[100px]">
        <button
          onClick={() => onTogglePremium(server.id)}
          title="Click to toggle between Free and VIP Gold tier"
          className={`inline-flex items-center space-x-1 px-2.5 py-1 rounded-full text-[11px] font-bold border transition-all ${
            server.premium
              ? 'bg-amber-500/10 text-amber-400 border-amber-500/30 hover:bg-amber-500/20'
              : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/20'
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

      {/* 5. Actions: Copy Config & Delete */}
      <div className="flex items-center space-x-2">
        <button
          onClick={handleCopyBase64}
          className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-slate-300 hover:text-cyan-300 hover:border-cyan-500/40 text-xs font-medium transition-all"
          title="Copy Base64 encoded OpenVPN configuration"
        >
          {copied ? (
            <>
              <Check className="w-3.5 h-3.5 text-emerald-400" />
              <span className="text-emerald-400 text-xs">Copied</span>
            </>
          ) : (
            <>
              <Copy className="w-3.5 h-3.5" />
              <span className="hidden sm:inline text-xs">Copy Config</span>
            </>
          )}
        </button>

        <button
          onClick={() => onDeleteRequest(server)}
          className="p-1.5 rounded-lg text-slate-500 hover:text-red-400 hover:bg-red-950/40 transition-all border border-transparent hover:border-red-900/40"
          title={`Delete ${server.country} server`}
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};

'use client';

import React, { useState } from 'react';
import { Trash2, Lock, Unlock, Copy, Check, Activity, Globe, Wifi } from 'lucide-react';
import { VpnServer } from '@/lib/types';

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

  const handleCopyBase64 = () => {
    if (server.ovpnBase64) {
      navigator.clipboard.writeText(server.ovpnBase64);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="rounded-2xl bg-slate-900/60 border border-slate-800/80 p-5 backdrop-blur-md hover:border-slate-700/80 transition-all flex flex-col justify-between group">
      <div>
        {/* Top Header */}
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center space-x-3">
            <span className="text-3xl select-none">{server.flag}</span>
            <div>
              <div className="flex items-center space-x-2">
                <h4 className="font-bold text-white text-base">{server.country}</h4>
                <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
                  {server.countryCode}
                </span>
              </div>
              <p className="text-xs text-slate-400 font-medium truncate max-w-[200px]">{server.city}</p>
            </div>
          </div>

          {/* Premium / Free Badge */}
          <button
            onClick={() => onTogglePremium(server.id)}
            title="Click to toggle Free / VIP status"
            className={`flex items-center space-x-1 px-2.5 py-1 rounded-full text-[11px] font-bold border transition-all ${
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

        {/* Server Metadata Grid */}
        <div className="grid grid-cols-2 gap-2 my-3 p-2.5 rounded-xl bg-slate-950/60 border border-slate-800/50 text-xs">
          <div className="flex items-center space-x-1.5 text-slate-400">
            <Globe className="w-3.5 h-3.5 text-cyan-400" />
            <span className="truncate">{server.ip || 'Remote IP'}</span>
          </div>

          <div className="flex items-center space-x-1.5 text-slate-400">
            <Activity className="w-3.5 h-3.5 text-blue-400" />
            <span>{server.proto?.toUpperCase() || 'UDP'}:{server.port || 1194}</span>
          </div>

          <div className="flex items-center space-x-1.5 text-slate-400">
            <Wifi className="w-3.5 h-3.5 text-emerald-400" />
            <span>{server.ping || 45} ms</span>
          </div>

          <div className="flex items-center space-x-1.5 text-slate-400">
            <span className="text-[10px] text-slate-500 font-mono truncate">ID: {server.id}</span>
          </div>
        </div>
      </div>

      {/* Card Actions Footer */}
      <div className="flex items-center justify-between pt-3 border-t border-slate-800/60 mt-2">
        <button
          onClick={handleCopyBase64}
          className="flex items-center space-x-1 text-xs text-slate-400 hover:text-cyan-400 transition-colors"
          title="Copy Base64 encoded OpenVPN configuration"
        >
          {copied ? (
            <>
              <Check className="w-3.5 h-3.5 text-emerald-400" />
              <span className="text-emerald-400">Copied</span>
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
          className="p-1.5 rounded-lg text-slate-500 hover:text-red-400 hover:bg-red-950/40 transition-all"
          title={`Delete ${server.country} server`}
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};

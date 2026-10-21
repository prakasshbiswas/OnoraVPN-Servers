'use client';

import React from 'react';
import { Server, Lock, Unlock, HardDrive, CheckCircle2 } from 'lucide-react';
import { VpnServer } from '@/lib/types';

interface StatsBarProps {
  servers: VpnServer[];
}

export const StatsBar: React.FC<StatsBarProps> = ({ servers }) => {
  const total = servers.length;
  const free = servers.filter((s) => !s.premium).length;
  const vip = servers.filter((s) => s.premium).length;

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
      {/* Total Servers */}
      <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800/80 backdrop-blur-md">
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium text-slate-400">Total Active</span>
          <div className="w-8 h-8 rounded-lg bg-cyan-500/10 flex items-center justify-center text-cyan-400">
            <Server className="w-4 h-4" />
          </div>
        </div>
        <div className="mt-2 flex items-baseline space-x-2">
          <span className="text-2xl font-bold text-white">{total}</span>
          <span className="text-xs text-slate-400">servers live</span>
        </div>
      </div>

      {/* Free Tier */}
      <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800/80 backdrop-blur-md">
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium text-slate-400">Free Tier</span>
          <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-400">
            <Unlock className="w-4 h-4" />
          </div>
        </div>
        <div className="mt-2 flex items-baseline space-x-2">
          <span className="text-2xl font-bold text-emerald-400">{free}</span>
          <span className="text-xs text-slate-400">open servers</span>
        </div>
      </div>

      {/* VIP Tier */}
      <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800/80 backdrop-blur-md">
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium text-slate-400">VIP Servers</span>
          <div className="w-8 h-8 rounded-lg bg-amber-500/10 flex items-center justify-center text-amber-400">
            <Lock className="w-4 h-4" />
          </div>
        </div>
        <div className="mt-2 flex items-baseline space-x-2">
          <span className="text-2xl font-bold text-amber-400">{vip}</span>
          <span className="text-xs text-slate-400">ad/gold locked</span>
        </div>
      </div>

      {/* Storage Mode */}
      <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800/80 backdrop-blur-md">
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium text-slate-400">Storage Engine</span>
          <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center text-blue-400">
            <HardDrive className="w-4 h-4" />
          </div>
        </div>
        <div className="mt-2 flex items-center space-x-1.5">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          <span className="text-sm font-semibold text-white">Zero DB (JSON Sync)</span>
        </div>
        <p className="text-[11px] text-slate-400 mt-0.5">Local fs / GitHub Auto-Commit</p>
      </div>
    </div>
  );
};

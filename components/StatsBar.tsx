'use client';

import React from 'react';
import { Server, Lock, Unlock, HardDrive, CheckCircle2, Zap, Shield } from 'lucide-react';
import { VpnServer, resolveServerSource } from '@/lib/types';

interface StatsBarProps {
  servers: VpnServer[];
}

export const StatsBar: React.FC<StatsBarProps> = ({ servers }) => {
  const total = servers.length;
  const free = servers.filter((s) => !s.premium).length;
  const vip = servers.filter((s) => s.premium).length;
  const vpngateCount = servers.filter((s) => resolveServerSource(s) === 'vpngate').length;
  const vpnbookCount = servers.filter((s) => resolveServerSource(s) === 'vpnbook').length;
  const customCount = servers.filter((s) => resolveServerSource(s) === 'custom').length;

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
      {/* Total Servers */}
      <div className="p-4 rounded-xl bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800/80 shadow-xs backdrop-blur-md transition-all">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Total Active Fleet</span>
          <div className="w-8 h-8 rounded-lg bg-cyan-50 dark:bg-cyan-500/10 flex items-center justify-center text-cyan-600 dark:text-cyan-400">
            <Server className="w-4 h-4" />
          </div>
        </div>
        <div className="mt-2 flex items-baseline space-x-2">
          <span className="text-2xl font-bold text-slate-900 dark:text-white">{total}</span>
          <span className="text-xs text-slate-500 dark:text-slate-400">servers live</span>
        </div>
        <div className="mt-1 flex items-center space-x-1.5 text-[11px] font-medium truncate">
          <span className="text-cyan-600 dark:text-cyan-400 font-semibold">{vpngateCount} VPN Gate</span>
          <span className="text-slate-300 dark:text-slate-700">•</span>
          <span className="text-blue-600 dark:text-blue-400 font-semibold">{vpnbookCount} VPNBook</span>
          {customCount > 0 && (
            <>
              <span className="text-slate-300 dark:text-slate-700">•</span>
              <span className="text-slate-500 dark:text-slate-400">{customCount} Custom</span>
            </>
          )}
        </div>
      </div>

      {/* Free Tier */}
      <div className="p-4 rounded-xl bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800/80 shadow-xs backdrop-blur-md transition-all">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Free Tier</span>
          <div className="w-8 h-8 rounded-lg bg-emerald-50 dark:bg-emerald-500/10 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
            <Unlock className="w-4 h-4" />
          </div>
        </div>
        <div className="mt-2 flex items-baseline space-x-2">
          <span className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">{free}</span>
          <span className="text-xs text-slate-500 dark:text-slate-400">open servers</span>
        </div>
      </div>

      {/* VIP Tier */}
      <div className="p-4 rounded-xl bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800/80 shadow-xs backdrop-blur-md transition-all">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">VIP Servers</span>
          <div className="w-8 h-8 rounded-lg bg-amber-50 dark:bg-amber-500/10 flex items-center justify-center text-amber-600 dark:text-amber-400">
            <Lock className="w-4 h-4" />
          </div>
        </div>
        <div className="mt-2 flex items-baseline space-x-2">
          <span className="text-2xl font-bold text-amber-600 dark:text-amber-400">{vip}</span>
          <span className="text-xs text-slate-500 dark:text-slate-400">ad/gold locked</span>
        </div>
      </div>

      {/* Storage Mode */}
      <div className="p-4 rounded-xl bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800/80 shadow-xs backdrop-blur-md transition-all">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Storage Engine</span>
          <div className="w-8 h-8 rounded-lg bg-blue-50 dark:bg-blue-500/10 flex items-center justify-center text-blue-600 dark:text-blue-400">
            <HardDrive className="w-4 h-4" />
          </div>
        </div>
        <div className="mt-2 flex items-center space-x-1.5">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
          <span className="text-sm font-semibold text-slate-900 dark:text-white">Zero DB (JSON Sync)</span>
        </div>
        <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">Local fs / GitHub Auto-Commit</p>
      </div>
    </div>
  );
};

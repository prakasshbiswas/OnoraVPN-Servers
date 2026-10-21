'use client';

import React, { useEffect, useState, useRef } from 'react';
import {
  Shield,
  Download,
  LogOut,
  Globe,
  Sun,
  Moon,
  Check,
  ChevronDown,
  Copy,
  Link2,
  GitBranch,
  Clock,
} from 'lucide-react';

interface NavbarProps {
  onLogout?: () => void;
  onExportJson?: () => void;
  totalServers?: number;
}

export const Navbar: React.FC<NavbarProps> = ({ onLogout, onExportJson, totalServers = 0 }) => {
  const [isDark, setIsDark] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const isDarkMode = document.documentElement.classList.contains('dark');
    setIsDark(isDarkMode);

    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const toggleTheme = () => {
    const nextDark = !isDark;
    setIsDark(nextDark);
    if (nextDark) {
      document.documentElement.classList.add('dark');
      document.documentElement.classList.remove('light');
      localStorage.setItem('vpn_theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      document.documentElement.classList.add('light');
      localStorage.setItem('vpn_theme', 'light');
    }
  };

  const copyToClipboard = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const origin = typeof window !== 'undefined' ? window.location.origin : 'https://oneioovpn.vercel.app';

  return (
    <header className="sticky top-0 z-40 border-b border-slate-200 dark:border-slate-800 bg-white/90 dark:bg-slate-950/80 backdrop-blur-xl shadow-xs transition-colors duration-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Brand */}
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center shadow-lg shadow-cyan-500/20">
            <Shield className="w-5 h-5 text-white" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <span className="font-bold text-lg text-slate-900 dark:text-white tracking-wide">VPNx</span>
              <span className="text-xs px-2 py-0.5 rounded-full bg-cyan-50 dark:bg-cyan-500/10 text-cyan-700 dark:text-cyan-400 border border-cyan-200 dark:border-cyan-500/20 font-medium">
                Admin Portal
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400">OpenVPN Server Management & Live API</p>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center space-x-2.5">
          {/* Theme Switcher */}
          <button
            onClick={toggleTheme}
            id="btn-toggle-theme"
            className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-700/60 text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white text-xs font-medium transition-all"
            title={isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
          >
            {isDark ? (
              <>
                <Sun className="w-3.5 h-3.5 text-amber-400" />
                <span className="hidden sm:inline">Light</span>
              </>
            ) : (
              <>
                <Moon className="w-3.5 h-3.5 text-slate-600" />
                <span className="hidden sm:inline">Dark</span>
              </>
            )}
          </button>

          {/* Copy Links Dropdown */}
          <div className="relative" ref={menuRef}>
            <button
              onClick={() => setMenuOpen(!menuOpen)}
              id="btn-copy-api-menu"
              className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-cyan-50 dark:bg-cyan-950/40 border border-cyan-200 dark:border-cyan-800/60 text-cyan-800 dark:text-cyan-300 hover:bg-cyan-100 dark:hover:bg-cyan-900/50 text-xs font-semibold transition-all shadow-xs"
              title="Copy API and Feed URLs"
            >
              <Globe className="w-3.5 h-3.5 text-cyan-600 dark:text-cyan-400" />
              <span>Copy Links</span>
              <ChevronDown className="w-3 h-3 ml-0.5 opacity-70" />
            </button>

            {menuOpen && (
              <div className="absolute right-0 mt-2 w-80 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xl p-2 z-50 animate-in fade-in slide-in-from-top-2 duration-150">
                <div className="px-2.5 py-1.5 border-b border-slate-100 dark:border-slate-800 mb-1 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                  Live Feed Endpoints
                </div>

                {/* 1. VPNBook Dedicated API */}
                <button
                  onClick={() => copyToClipboard(`${origin}/api/vpnbook/servers`, 'vpnbook-api')}
                  className="w-full text-left p-2 rounded-xl hover:bg-blue-50 dark:hover:bg-blue-950/40 transition flex items-center justify-between group"
                >
                  <div className="flex items-start space-x-2.5">
                    <Shield className="w-4 h-4 text-blue-600 dark:text-blue-400 mt-0.5 shrink-0" />
                    <div>
                      <div className="text-xs font-bold text-slate-900 dark:text-white flex items-center space-x-1.5">
                        <span>VPNBook Dedicated API</span>
                        <span className="text-[10px] px-1.5 py-0.2 rounded bg-blue-100 dark:bg-blue-900/60 text-blue-700 dark:text-blue-300 font-normal">10 Servers</span>
                      </div>
                      <div className="text-[11px] font-mono text-slate-500 dark:text-slate-400 truncate max-w-[190px]">
                        /api/vpnbook/servers
                      </div>
                    </div>
                  </div>
                  <div className="shrink-0 p-1 text-slate-400 group-hover:text-blue-600">
                    {copiedKey === 'vpnbook-api' ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                  </div>
                </button>

                {/* 2. VPNBook GitHub Raw */}
                <button
                  onClick={() =>
                    copyToClipboard(
                      'https://raw.githubusercontent.com/prakasshbiswas/OnoraVPN-Servers/main/data/vpnbook.json',
                      'vpnbook-raw'
                    )
                  }
                  className="w-full text-left p-2 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800/60 transition flex items-center justify-between group"
                >
                  <div className="flex items-start space-x-2.5">
                    <GitBranch className="w-4 h-4 text-slate-600 dark:text-slate-400 mt-0.5 shrink-0" />
                    <div>
                      <div className="text-xs font-bold text-slate-900 dark:text-white">
                        VPNBook GitHub Raw JSON
                      </div>
                      <div className="text-[11px] font-mono text-slate-500 dark:text-slate-400 truncate max-w-[190px]">
                        data/vpnbook.json
                      </div>
                    </div>
                  </div>
                  <div className="shrink-0 p-1 text-slate-400 group-hover:text-slate-900 dark:group-hover:text-white">
                    {copiedKey === 'vpnbook-raw' ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                  </div>
                </button>

                {/* 3. All Servers Main API */}
                <button
                  onClick={() => copyToClipboard(`${origin}/api/servers`, 'all-api')}
                  className="w-full text-left p-2 rounded-xl hover:bg-cyan-50 dark:hover:bg-cyan-950/40 transition flex items-center justify-between group"
                >
                  <div className="flex items-start space-x-2.5">
                    <Globe className="w-4 h-4 text-cyan-600 dark:text-cyan-400 mt-0.5 shrink-0" />
                    <div>
                      <div className="text-xs font-bold text-slate-900 dark:text-white flex items-center space-x-1.5">
                        <span>All Servers API</span>
                        <span className="text-[10px] px-1.5 py-0.2 rounded bg-cyan-100 dark:bg-cyan-900/60 text-cyan-700 dark:text-cyan-300 font-normal">All Fleet</span>
                      </div>
                      <div className="text-[11px] font-mono text-slate-500 dark:text-slate-400 truncate max-w-[190px]">
                        /api/servers
                      </div>
                    </div>
                  </div>
                  <div className="shrink-0 p-1 text-slate-400 group-hover:text-cyan-600">
                    {copiedKey === 'all-api' ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                  </div>
                </button>

                {/* 4. UptimeRobot Cron Sync URL */}
                <button
                  onClick={() => copyToClipboard(`${origin}/api/cron/sync?key=admin123`, 'cron-url')}
                  className="w-full text-left p-2 rounded-xl hover:bg-amber-50 dark:hover:bg-amber-950/40 transition flex items-center justify-between group border-t border-slate-100 dark:border-slate-800 mt-1"
                >
                  <div className="flex items-start space-x-2.5">
                    <Clock className="w-4 h-4 text-amber-600 dark:text-amber-400 mt-0.5 shrink-0" />
                    <div>
                      <div className="text-xs font-bold text-slate-900 dark:text-white">
                        UptimeRobot Cron URL
                      </div>
                      <div className="text-[11px] font-mono text-slate-500 dark:text-slate-400 truncate max-w-[190px]">
                        /api/cron/sync?key=admin123
                      </div>
                    </div>
                  </div>
                  <div className="shrink-0 p-1 text-slate-400 group-hover:text-amber-600">
                    {copiedKey === 'cron-url' ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                  </div>
                </button>
              </div>
            )}
          </div>

          {/* Export JSON */}
          {onExportJson && (
            <button
              onClick={onExportJson}
              id="btn-export-json"
              className="flex items-center space-x-2 px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-700/60 text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:border-emerald-500/40 text-xs font-medium transition-all"
              title="Download servers.json directly"
            >
              <Download className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
              <span className="hidden md:inline">Download JSON</span>
            </button>
          )}

          {/* Logout */}
          {onLogout && (
            <button
              onClick={onLogout}
              id="btn-logout"
              className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800/40 text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/40 text-xs font-medium transition-all"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Logout</span>
            </button>
          )}
        </div>
      </div>
    </header>
  );
};

'use client';

import React from 'react';
import { Shield, Zap, Download, LogOut, ExternalLink, Globe } from 'lucide-react';

interface NavbarProps {
  onLogout?: () => void;
  onExportJson?: () => void;
  totalServers?: number;
}

export const Navbar: React.FC<NavbarProps> = ({ onLogout, onExportJson, totalServers = 0 }) => {
  const [copied, setCopied] = React.useState(false);

  const handleCopyApi = () => {
    const url = `${window.location.origin}/api/servers`;
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <header className="sticky top-0 z-40 border-b border-slate-800 bg-slate-950/80 backdrop-blur-xl">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Brand */}
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center shadow-lg shadow-cyan-500/20">
            <Shield className="w-5 h-5 text-white" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <span className="font-bold text-lg text-white tracking-wide">VPNx</span>
              <span className="text-xs px-2 py-0.5 rounded-full bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 font-medium">
                Admin Portal
              </span>
            </div>
            <p className="text-xs text-slate-400">OpenVPN Server Management & Live API</p>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center space-x-3">
          {/* Live API Link */}
          <button
            onClick={handleCopyApi}
            id="btn-copy-api"
            className="hidden sm:flex items-center space-x-2 px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-700/60 text-slate-300 hover:text-white hover:border-cyan-500/40 text-xs font-medium transition-all"
            title="Click to copy public API URL for Flutter App"
          >
            <Globe className="w-3.5 h-3.5 text-cyan-400" />
            <span>{copied ? 'API URL Copied!' : 'Copy API URL'}</span>
          </button>

          {/* Export JSON */}
          {onExportJson && (
            <button
              onClick={onExportJson}
              id="btn-export-json"
              className="flex items-center space-x-2 px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-700/60 text-slate-300 hover:text-white hover:border-emerald-500/40 text-xs font-medium transition-all"
              title="Download servers.json directly"
            >
              <Download className="w-3.5 h-3.5 text-emerald-400" />
              <span className="hidden md:inline">Download JSON</span>
            </button>
          )}

          {/* Logout */}
          {onLogout && (
            <button
              onClick={onLogout}
              id="btn-logout"
              className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-red-950/30 border border-red-800/40 text-red-400 hover:bg-red-900/40 hover:text-red-300 text-xs font-medium transition-all"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Logout</span>
            </button>
          )}
        </div>
      </div>
    </header>
  );
};

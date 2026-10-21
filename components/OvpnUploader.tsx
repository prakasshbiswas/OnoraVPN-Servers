'use client';

import React, { useState, useRef } from 'react';
import { UploadCloud, CheckCircle, AlertTriangle, RefreshCw, Lock, Unlock, Server, ArrowRight, X } from 'lucide-react';
import { ParseResult, VpnServer } from '@/lib/types';

interface OvpnUploaderProps {
  onServerAdded: () => void;
}

export const OvpnUploader: React.FC<OvpnUploaderProps> = ({ onServerAdded }) => {
  const [isDragging, setIsDragging] = useState(false);
  const [isParsing, setIsParsing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Parsed preview state
  const [preview, setPreview] = useState<ParseResult | null>(null);
  const [isPremium, setIsPremium] = useState(false);
  const [replaceExisting, setReplaceExisting] = useState(true);
  const [customCity, setCustomCity] = useState('');
  const [username, setUsername] = useState('vpn');
  const [password, setPassword] = useState('vpn');
  const [customPing, setCustomPing] = useState(45);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      processFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      processFile(e.target.files[0]);
    }
  };

  const processFile = async (file: File) => {
    if (!file.name.endsWith('.ovpn') && !file.name.endsWith('.txt')) {
      setError('Please upload a valid .ovpn configuration file');
      return;
    }

    setError(null);
    setSuccessMessage(null);
    setIsParsing(true);

    try {
      const formData = new FormData();
      formData.append('file', file);

      const res = await fetch('/api/parse-ovpn', {
        method: 'POST',
        body: formData,
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to parse file');
      }

      const result: ParseResult = await res.json();
      setPreview(result);
      setCustomCity(result.city || `${result.country} Server`);
      setReplaceExisting(!!result.existingServer);
    } catch (err: any) {
      setError(err.message || 'Error parsing .ovpn file');
    } finally {
      setIsParsing(false);
    }
  };

  const handleSave = async () => {
    if (!preview) return;

    setIsSaving(true);
    setError(null);

    try {
      const citySlug = (customCity || 'server')
        .toLowerCase()
        .replace(/[^a-z0-9]/g, '')
        .slice(0, 10);
      const generatedId = preview.existingServer && replaceExisting
        ? preview.existingServer.id
        : `${preview.countryCode.toLowerCase()}_${citySlug}_${Date.now().toString().slice(-4)}`;

      const newServer: VpnServer = {
        id: generatedId,
        country: preview.country,
        countryCode: preview.countryCode,
        city: customCity,
        flag: preview.flag,
        flagUrl: preview.flagUrl,
        premium: isPremium,
        username,
        password,
        ping: customPing,
        proto: preview.proto,
        ip: preview.ip,
        port: preview.port,
        ovpnBase64: preview.ovpnBase64,
        updatedAt: new Date().toISOString(),
      };

      const res = await fetch('/api/servers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          server: newServer,
          replaceCountry: replaceExisting,
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to save server');
      }

      const data = await res.json();
      setSuccessMessage(
        data.replaced
          ? `Success! Replaced and updated server for ${preview.country} ${preview.flag}`
          : `Success! Added new server for ${preview.country} ${preview.flag}`
      );

      // Reset preview
      setPreview(null);
      if (fileInputRef.current) fileInputRef.current.value = '';

      onServerAdded();
    } catch (err: any) {
      setError(err.message || 'Failed to save server');
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    setPreview(null);
    setError(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return (
    <div className="mb-10">
      {/* Messages */}
      {error && (
        <div className="mb-4 p-4 rounded-xl bg-red-950/40 border border-red-800/60 text-red-300 text-sm flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <AlertTriangle className="w-4 h-4 text-red-400 shrink-0" />
            <span>{error}</span>
          </div>
          <button onClick={() => setError(null)} className="text-red-400 hover:text-red-200">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {successMessage && (
        <div className="mb-4 p-4 rounded-xl bg-emerald-950/40 border border-emerald-800/60 text-emerald-300 text-sm flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{successMessage}</span>
          </div>
          <button onClick={() => setSuccessMessage(null)} className="text-emerald-400 hover:text-emerald-200">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Main Dropzone / Preview */}
      {!preview ? (
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className={`border-2 border-dashed rounded-2xl p-8 sm:p-12 text-center cursor-pointer transition-all ${
            isDragging
              ? 'border-cyan-400 bg-cyan-950/20 scale-[1.01]'
              : 'border-slate-800 bg-slate-900/40 hover:border-slate-700 hover:bg-slate-900/60'
          }`}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept=".ovpn,.txt"
            onChange={handleFileSelect}
            className="hidden"
            id="file-upload-input"
          />

          <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gradient-to-tr from-cyan-500/20 to-blue-500/20 border border-cyan-500/30 flex items-center justify-center text-cyan-400 shadow-lg shadow-cyan-500/10">
            {isParsing ? (
              <RefreshCw className="w-8 h-8 animate-spin text-cyan-400" />
            ) : (
              <UploadCloud className="w-8 h-8 text-cyan-400" />
            )}
          </div>

          <h3 className="text-lg font-semibold text-white mb-1">
            {isParsing ? 'Parsing .ovpn configuration & detecting GeoIP...' : 'Drop your .ovpn configuration file here'}
          </h3>
          <p className="text-sm text-slate-400 max-w-md mx-auto mb-4">
            Download free OpenVPN files from <strong className="text-cyan-300">VPN Gate</strong> or VPNBook, drop it here, and the system automatically extracts IP, Country, Flag, and replaces dead servers.
          </p>
          <div className="inline-flex items-center space-x-2 px-4 py-2 rounded-xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 text-xs font-semibold hover:bg-cyan-500/20 transition-all">
            <span>Browse .ovpn File</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </div>
        </div>
      ) : (
        /* Parsed Preview Card */
        <div className="rounded-2xl bg-slate-900/90 border border-cyan-500/40 p-6 sm:p-8 backdrop-blur-xl shadow-2xl shadow-cyan-950/50">
          <div className="flex items-center justify-between pb-4 border-b border-slate-800 mb-6">
            <div className="flex items-center space-x-3.5">
              <div className="w-12 h-8 rounded-md overflow-hidden bg-slate-800 border border-slate-700 shadow-sm shrink-0">
                <img
                  src={preview.flagUrl || `https://flagcdn.com/w80/${preview.countryCode.toLowerCase()}.png`}
                  alt={preview.country}
                  className="w-full h-full object-cover"
                />
              </div>
              <div>
                <h3 className="text-xl font-bold text-white flex items-center space-x-2">
                  <span>{preview.country}</span>
                  <span className="text-xs px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
                    {preview.countryCode}
                  </span>
                </h3>
                <p className="text-xs text-slate-400">
                  Remote: {preview.ip}:{preview.port} ({preview.proto.toUpperCase()})
                </p>
              </div>
            </div>
            <button
              onClick={handleCancel}
              className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
              title="Cancel"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Replacement Warning if existing server matches */}
          {preview.existingServer && (
            <div className="mb-6 p-4 rounded-xl bg-amber-950/40 border border-amber-500/50 text-amber-200">
              <div className="flex items-start space-x-3">
                <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
                <div className="flex-1">
                  <h4 className="font-semibold text-sm text-amber-300">
                    Existing Server Found for {preview.country} ({preview.existingServer.city})
                  </h4>
                  <p className="text-xs text-amber-200/80 mt-1">
                    An older server already exists in your active list. Replacing it will remove the dead IP and update it with this new configuration.
                  </p>
                  <label className="flex items-center space-x-2 mt-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={replaceExisting}
                      onChange={(e) => setReplaceExisting(e.target.checked)}
                      className="w-4 h-4 rounded text-cyan-500 focus:ring-0 bg-slate-800 border-slate-700"
                    />
                    <span className="text-xs font-medium text-white">
                      Replace & Overwrite existing {preview.country} server (Recommended)
                    </span>
                  </label>
                </div>
              </div>
            </div>
          )}

          {/* Configuration Form */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1.5">City / Server Display Name</label>
              <input
                type="text"
                value={customCity}
                onChange={(e) => setCustomCity(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white text-sm focus:border-cyan-500 focus:outline-none"
                placeholder="e.g. Tokyo (Ultra Fast)"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1.5">Estimated Ping (ms)</label>
              <input
                type="number"
                value={customPing}
                onChange={(e) => setCustomPing(parseInt(e.target.value, 10) || 45)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white text-sm focus:border-cyan-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1.5">Username (VPN Gate default: vpn)</label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white text-sm focus:border-cyan-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1.5">Password (VPN Gate default: vpn)</label>
              <input
                type="text"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white text-sm focus:border-cyan-500 focus:outline-none"
              />
            </div>
          </div>

          {/* Tier Switch (Free vs VIP) */}
          <div className="flex items-center justify-between p-4 rounded-xl bg-slate-950 border border-slate-800 mb-6">
            <div className="flex items-center space-x-3">
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${isPremium ? 'bg-amber-500/20 text-amber-400' : 'bg-emerald-500/20 text-emerald-400'}`}>
                {isPremium ? <Lock className="w-4 h-4" /> : <Unlock className="w-4 h-4" />}
              </div>
              <div>
                <span className="text-sm font-semibold text-white">
                  {isPremium ? 'VIP Server (Ad/Subscription Locked)' : 'Free Server (Available to All Users)'}
                </span>
                <p className="text-xs text-slate-400">
                  {isPremium ? 'Users must watch a rewarded ad to unlock' : 'Instant 1-tap connection'}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setIsPremium(!isPremium)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                isPremium
                  ? 'bg-amber-500 text-slate-950 hover:bg-amber-400'
                  : 'bg-slate-800 text-slate-300 hover:text-white'
              }`}
            >
              {isPremium ? 'VIP Mode' : 'Free Mode'}
            </button>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end space-x-3">
            <button
              onClick={handleCancel}
              className="px-4 py-2.5 rounded-xl text-xs font-semibold text-slate-400 hover:text-white hover:bg-slate-800 transition-all"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={isSaving}
              id="btn-deploy-server"
              className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 text-white text-xs font-bold hover:shadow-lg hover:shadow-cyan-500/25 transition-all flex items-center space-x-2 disabled:opacity-50"
            >
              {isSaving ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Saving & Updating...</span>
                </>
              ) : (
                <>
                  <Server className="w-4 h-4" />
                  <span>
                    {replaceExisting && preview.existingServer ? 'Replace & Deploy' : 'Add to Server List'}
                  </span>
                </>
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

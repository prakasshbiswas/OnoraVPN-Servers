'use client';

import React from 'react';
import { Trash2, AlertTriangle, X } from 'lucide-react';
import { VpnServer } from '@/lib/types';

interface DeleteModalProps {
  server: VpnServer | null;
  isOpen: boolean;
  isDeleting: boolean;
  onClose: () => void;
  onConfirm: () => void;
}

export const DeleteModal: React.FC<DeleteModalProps> = ({
  server,
  isOpen,
  isDeleting,
  onClose,
  onConfirm,
}) => {
  if (!isOpen || !server) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 dark:bg-black/75 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="w-full max-w-md rounded-2xl bg-white dark:bg-slate-900 border border-red-200 dark:border-red-500/30 p-6 shadow-2xl shadow-slate-300/50 dark:shadow-red-950/40">
        <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800 mb-4">
          <div className="flex items-center space-x-2 text-red-600 dark:text-red-400">
            <AlertTriangle className="w-5 h-5" />
            <h3 className="font-bold text-base text-slate-900 dark:text-white">Delete Server</h3>
          </div>
          <button
            onClick={onClose}
            disabled={isDeleting}
            className="text-slate-400 hover:text-slate-700 dark:hover:text-white p-1 rounded-lg"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="mb-6">
          <div className="flex items-center space-x-3 p-3 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 mb-3">
            <div className="w-10 h-7 rounded overflow-hidden bg-slate-200 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 shrink-0">
              <img
                src={server.flagUrl || `https://flagcdn.com/w80/${server.countryCode.toLowerCase()}.png`}
                alt={server.country}
                className="w-full h-full object-cover"
              />
            </div>
            <div>
              <h4 className="font-semibold text-slate-900 dark:text-white text-sm">{server.country}</h4>
              <p className="text-xs text-slate-500 dark:text-slate-400">{server.city} (ID: {server.id})</p>
            </div>
          </div>
          <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
            Are you sure you want to permanently delete this server? It will be removed immediately from your live API and the Flutter app.
          </p>
        </div>

        <div className="flex items-center justify-end space-x-3">
          <button
            onClick={onClose}
            disabled={isDeleting}
            className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-all"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={isDeleting}
            id="btn-confirm-delete"
            className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-500 text-white text-xs font-bold transition-all flex items-center space-x-1.5 shadow-lg shadow-red-600/25 disabled:opacity-50"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>{isDeleting ? 'Deleting...' : 'Delete Server'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};

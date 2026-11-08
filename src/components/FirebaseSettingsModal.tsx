import React, { useState } from 'react';
import {
  X,
  Database,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  Save,
  Server,
  Cloud,
  FileCode,
  ExternalLink,
  ShieldAlert,
  Download,
  FolderArchive,
} from 'lucide-react';
import { FirebaseConnectionConfig } from '../types/olt';
import {
  getFirebaseConfig,
  saveFirebaseConfig,
  resetToSeedData,
  getSyncStatus,
} from '../services/firebaseRtdb';

interface FirebaseSettingsModalProps {
  onClose: () => void;
  onConfigChanged: () => void;
}

export const FirebaseSettingsModal: React.FC<FirebaseSettingsModalProps> = ({
  onClose,
  onConfigChanged,
}) => {
  const currentConfig = getFirebaseConfig();
  const syncStatus = getSyncStatus();

  const [dbUrl, setDbUrl] = useState(currentConfig.databaseURL || '');
  const [projectId, setProjectId] = useState(currentConfig.projectId || '');
  const [apiKey, setApiKey] = useState(currentConfig.apiKey || '');
  const [isSaved, setIsSaved] = useState(false);
  const [resetConfirm, setResetConfirm] = useState(false);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    const newConfig: FirebaseConnectionConfig = {
      databaseURL: dbUrl.trim(),
      projectId: projectId.trim() || undefined,
      apiKey: apiKey.trim() || undefined,
    };

    saveFirebaseConfig(newConfig);
    setIsSaved(true);
    onConfigChanged();
    setTimeout(() => setIsSaved(false), 3000);
  };

  const handleResetData = () => {
    resetToSeedData();
    setResetConfirm(false);
    onConfigChanged();
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="firebase-settings-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-sm"
    >
      <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-lg w-full shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-slate-800 bg-slate-950/60 shrink-0">
          <div className="flex items-center gap-2">
            <Database className="w-5 h-5 text-cyan-400" />
            <div>
              <h3 id="firebase-settings-title" className="text-sm font-bold text-white">
                Database &amp; Firebase RTDB Settings
              </h3>
              <p className="text-[11px] text-slate-400">Configure persistent cloud synchronization</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            aria-label="Close settings dialog"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 overflow-y-auto space-y-5">
          {/* Status Badge */}
          <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-3.5 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <span
                className={`w-2.5 h-2.5 rounded-full ${
                  syncStatus.isConnected ? 'bg-emerald-400 shadow-[0_0_8px_#34d399]' : 'bg-amber-400'
                }`}
              />
              <div>
                <span className="text-xs font-semibold text-slate-200">
                  {syncStatus.isConnected
                    ? 'Connected to Firebase Realtime Database'
                    : 'Local Offline Cache Active'}
                </span>
                <p className="text-[10px] text-slate-400 font-mono">
                  {syncStatus.isConnected
                    ? 'Records automatically synchronize with cloud database'
                    : 'Records saved in browser storage until RTDB URL is configured'}
                </p>
              </div>
            </div>
            {syncStatus.pendingQueueCount > 0 && (
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/30">
                {syncStatus.pendingQueueCount} Pending
              </span>
            )}
          </div>

          {/* Form */}
          <form onSubmit={handleSave} className="space-y-4">
            <div>
              <label htmlFor="rtdb-url-input" className="block text-xs font-semibold text-slate-300 mb-1">
                Firebase Realtime Database URL
              </label>
              <input
                id="rtdb-url-input"
                type="text"
                value={dbUrl}
                onChange={(e) => setDbUrl(e.target.value)}
                placeholder="https://your-project-default-rtdb.firebaseio.com"
                className="w-full bg-slate-950 border border-slate-800 focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 rounded-xl py-2 px-3 text-xs text-slate-100 placeholder:text-slate-400 font-mono outline-none transition-colors"
              />
              <p className="text-[10px] text-slate-400 mt-1">
                Enter your Firebase Realtime Database URL or configure via environment variable{' '}
                <code className="text-cyan-400">VITE_FIREBASE_DATABASE_URL</code>.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label htmlFor="rtdb-project-input" className="block text-xs font-semibold text-slate-300 mb-1">
                  Project ID (Optional)
                </label>
                <input
                  id="rtdb-project-input"
                  type="text"
                  value={projectId}
                  onChange={(e) => setProjectId(e.target.value)}
                  placeholder="olt-core-manager"
                  className="w-full bg-slate-950 border border-slate-800 focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 rounded-xl py-2 px-3 text-xs text-slate-100 placeholder:text-slate-400 font-mono outline-none transition-colors"
                />
              </div>

              <div>
                <label htmlFor="rtdb-key-input" className="block text-xs font-semibold text-slate-300 mb-1">
                  API Key (Optional)
                </label>
                <input
                  id="rtdb-key-input"
                  type="password"
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  placeholder="AIzaSy..."
                  className="w-full bg-slate-950 border border-slate-800 focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 rounded-xl py-2 px-3 text-xs text-slate-100 placeholder:text-slate-400 font-mono outline-none transition-colors"
                />
              </div>
            </div>

            {isSaved && (
              <div
                role="status"
                className="p-2.5 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs flex items-center gap-2"
              >
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>Configuration saved and database initialized!</span>
              </div>
            )}

            <button
              type="submit"
              className="w-full py-2.5 px-4 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs tracking-wide shadow-md shadow-cyan-500/20 active:scale-[0.99] transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <Save className="w-4 h-4" />
              <span>Save &amp; Connect Firebase RTDB</span>
            </button>
          </form>

          {/* Setup Guide / Security Rules Reference */}
          <div className="bg-slate-950 border border-slate-800/80 rounded-xl p-3.5 space-y-2 text-xs">
            <div className="flex items-center gap-1.5 text-slate-300 font-semibold">
              <FileCode className="w-3.5 h-3.5 text-cyan-400" />
              <span>Recommended Firebase Realtime Database Rules</span>
            </div>
            <pre className="p-2.5 rounded-lg bg-slate-900 border border-slate-800 font-mono text-[10px] text-cyan-300 overflow-x-auto">
{`{
  "rules": {
    ".read": false,
    ".write": false,
    "users": { "$uid": { ".read": "auth != null && (auth.uid === $uid || auth.token.email === 'kyambaddealex55@gmail.com')", ".write": "auth != null && auth.uid === $uid" } },
    "activityLogs": { ".read": "auth != null && auth.token.email === 'kyambaddealex55@gmail.com'", "$logId": { ".write": "auth != null && auth.token.email_verified === true && !data.exists()" } },
    "olts": { "$siteName": { "configs": { ".read": "auth != null && auth.token.email_verified === true", "$recordId": { ".write": "auth != null && auth.token.email_verified === true" } } } }
  }
}`}
            </pre>
            <p className="text-[10px] text-slate-400">
              The full validated rules are in <code>database.rules.json</code>. Verified field accounts can manage OLT records; the designated administrator alone can list accounts and read the append-only audit log.
            </p>
          </div>

          {/* Export Project Source Code (.ZIP) */}
          <div className="pt-3 border-t border-slate-800/80 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-200 flex items-center gap-1.5">
                <FolderArchive className="w-3.5 h-3.5 text-cyan-400" />
                <span>Export Full Project Source Code</span>
              </span>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-cyan-500/10 text-cyan-400 border border-cyan-500/30">
                1.5 MB ZIP
              </span>
            </div>
            <p className="text-xs text-slate-400">
              Download the complete codebase including all 17 OLT site configs, OTDR cable break locator, subrack matrix, and unit tests ready to run locally.
            </p>
            <a
              href={`${import.meta.env.BASE_URL}olt-core-manager.zip`}
              download="olt-core-manager.zip"
              className="w-full py-2.5 px-4 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs shadow-lg shadow-cyan-500/20 transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <Download className="w-4 h-4" />
              <span>Download Project Source (.ZIP)</span>
            </a>
          </div>

          {/* Reset Database to Pre-Seeded Dataset */}
          <div className="pt-2 border-t border-slate-800/80">
            {resetConfirm ? (
              <div className="bg-rose-500/10 border border-rose-500/30 rounded-xl p-3 space-y-2">
                <p className="text-xs text-rose-300">
                  Reset this browser's offline cache to sample records? This does not change Firebase data, but it will replace local cached records.
                </p>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleResetData}
                    className="px-3 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs cursor-pointer"
                  >
                    Confirm Reset
                  </button>
                  <button
                    type="button"
                    onClick={() => setResetConfirm(false)}
                    className="px-3 py-1.5 rounded-lg border border-slate-700 text-slate-300 text-xs cursor-pointer"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setResetConfirm(true)}
                className="w-full py-2 px-3 rounded-lg border border-slate-800 hover:border-slate-700 text-xs text-slate-400 hover:text-slate-200 transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Reset to Factory Seed Dataset (Kisugu, Kitintale, etc.)</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

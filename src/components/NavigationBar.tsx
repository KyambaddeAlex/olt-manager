import React from 'react';
import { Server, Database, Lock, Settings, LayoutDashboard, ChevronRight, User, ShieldCheck } from 'lucide-react';
import { OltSite } from '../types/olt';

interface NavigationBarProps {
  currentSite?: OltSite | null;
  onNavigateDashboard: () => void;
  onLockLogout: () => void;
  onOpenSettings: () => void;
  isFirebaseConnected: boolean;
  operator: { name: string; role: string };
  totalRecordsCount: number;
  isAdmin: boolean;
  onOpenAdmin: () => void;
}

export const NavigationBar: React.FC<NavigationBarProps> = ({
  currentSite,
  onNavigateDashboard,
  onLockLogout,
  onOpenSettings,
  isFirebaseConnected,
  operator,
  totalRecordsCount,
  isAdmin,
  onOpenAdmin,
}) => {
  return (
    <header className="sticky top-0 z-40 bg-slate-950/80 border-b border-slate-800/80 backdrop-blur-md px-4 sm:px-6 py-2.5">
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-3">
        {/* Left: Brand & Breadcrumbs */}
        <div className="flex items-center gap-2 sm:gap-3 min-w-0">
          <button
            onClick={onNavigateDashboard}
            className="flex items-center gap-2 text-left group cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500 rounded-lg p-1"
            title="Return to OLT Dashboard"
            aria-label="Return to OLT Dashboard"
          >
            <div className="w-8 h-8 rounded-lg bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400 group-hover:border-cyan-400 group-hover:bg-cyan-500/20 transition-all shadow-sm">
              <Server className="w-4 h-4" />
            </div>
            <div className="hidden xs:block">
              <div className="flex items-center gap-1.5">
                <span className="font-bold text-sm tracking-tight text-white group-hover:text-cyan-400 transition-colors">
                  OLT Core Manager
                </span>
                <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-slate-800 text-cyan-400 border border-slate-700">
                  v2.5
                </span>
              </div>
              <p className="text-[10px] text-slate-400 font-mono -mt-0.5">Optical Line Terminal Ops</p>
            </div>
          </button>

          {/* Breadcrumb if on Site Details */}
          {currentSite && (
            <div className="flex items-center gap-1.5 text-xs text-slate-400 pl-2 border-l border-slate-800">
              <ChevronRight className="w-3.5 h-3.5 text-slate-400 shrink-0" />
              <button
                onClick={onNavigateDashboard}
                className="hover:text-cyan-400 transition-colors hidden md:inline-block cursor-pointer"
              >
                Dashboard
              </button>
              <ChevronRight className="w-3.5 h-3.5 text-slate-400 hidden md:inline-block shrink-0" />
              <span className="font-semibold text-slate-200 bg-slate-800/80 px-2 py-0.5 rounded text-xs border border-slate-700 font-mono">
                {currentSite.name} ({currentSite.code})
              </span>
            </div>
          )}
        </div>

        {/* Right: Status Pill, Operator & Actions */}
        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          {/* Database Sync Status Badge */}
          <button
            onClick={onOpenSettings}
            className="flex items-center gap-1.5 text-[11px] font-mono py-1 px-2.5 rounded-full bg-slate-900 border border-slate-800 hover:border-slate-700 transition-colors cursor-pointer"
            title="Configure Firebase Realtime Database & sync settings"
            aria-label="Database connection settings"
          >
            <span
              className={`w-2 h-2 rounded-full ${
                isFirebaseConnected ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'
              }`}
            />
            <span className="hidden sm:inline text-slate-300">
              {isFirebaseConnected ? 'Firebase RTDB Live' : 'Local Storage Mode'}
            </span>
            <span className="sm:hidden text-slate-300">
              {isFirebaseConnected ? 'RTDB' : 'Local'}
            </span>
          </button>

          {/* Settings Modal Button */}
          {isAdmin && (
            <button
              onClick={onOpenAdmin}
              className="inline-flex items-center gap-1.5 rounded-lg border border-cyan-500/30 bg-cyan-500/10 px-2.5 py-1.5 text-xs font-semibold text-cyan-300 hover:bg-cyan-500/20"
              aria-label="Open operator accounts and audit log"
            >
              <ShieldCheck className="h-4 w-4" />
              <span className="hidden sm:inline">Admin</span>
            </button>
          )}

          <button
            onClick={onOpenSettings}
            className="p-1.5 text-slate-400 hover:text-cyan-400 hover:bg-slate-800 rounded-lg transition-colors cursor-pointer border border-transparent hover:border-slate-700"
            title="Database & Environment Settings"
            aria-label="Database and environment settings"
          >
            <Settings className="w-4 h-4" />
          </button>

          {/* Operator Info */}
          <div className="hidden lg:flex items-center gap-2 pl-2 border-l border-slate-800 text-xs">
            <div className="w-6 h-6 rounded-full bg-slate-800 flex items-center justify-center text-slate-300">
              <User className="w-3 h-3 text-cyan-400" />
            </div>
            <div className="text-left">
              <p className="font-medium text-slate-200 text-xs truncate max-w-[110px]">{operator.name}</p>
              <p className="text-[10px] text-slate-400 truncate max-w-[110px]">{operator.role}</p>
            </div>
          </div>

          {/* Lock / Logout Button */}
          <button
            onClick={onLockLogout}
            className="flex items-center gap-1.5 text-xs text-rose-300 hover:text-rose-200 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 rounded-lg px-2.5 py-1.5 transition-colors cursor-pointer"
            title="Lock terminal and return to access code screen"
            aria-label="Lock terminal and logout"
          >
            <Lock className="w-3.5 h-3.5" />
            <span className="hidden xs:inline font-medium">Lock</span>
          </button>
        </div>
      </div>
    </header>
  );
};

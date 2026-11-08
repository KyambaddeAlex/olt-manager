import React, { useState, useEffect } from 'react';
import { Activity, Server, Cpu, Database, CheckCircle2, ArrowRight } from 'lucide-react';

interface BrandedLoadingScreenProps {
  onComplete: () => void;
}

export const BrandedLoadingScreen: React.FC<BrandedLoadingScreenProps> = ({ onComplete }) => {
  const [progress, setProgress] = useState(15);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);

  const steps = [
    { title: 'Optical Link Diagnostic', desc: 'Synchronizing 1310/1490/1550nm CWDM laser carriers' },
    { title: 'Chassis Subrack Bus', desc: 'Verifying 8-Slot GPON/XGS-PON line cards & backplane' },
    { title: 'Core Routing Matrix', desc: 'Loading TIA-598 fiber color mapping & 17 OLT sites' },
    { title: 'Realtime Database Sync', desc: 'Connecting Firebase RTDB node & local offline cache' },
    { title: 'Terminal Ready', desc: 'OLT Core Operations System initialized' },
  ];

  useEffect(() => {
    const interval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          clearInterval(interval);
          setTimeout(onComplete, 400);
          return 100;
        }
        const next = prev + Math.floor(Math.random() * 18) + 12;
        const bounded = Math.min(100, next);
        const stepIdx = Math.min(steps.length - 1, Math.floor((bounded / 100) * steps.length));
        setCurrentStepIndex(stepIdx);
        return bounded;
      });
    }, 280);

    return () => clearInterval(interval);
  }, [onComplete, steps.length]);

  return (
    <div
      data-testid="loading-screen"
      className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-slate-950 text-slate-100 p-6 selection:bg-cyan-500 selection:text-black overflow-hidden"
    >
      {/* Background glow and subtle optical grid */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-cyan-950/40 via-slate-950 to-slate-950 pointer-events-none" />
      <div className="absolute inset-0 opacity-15 bg-[radial-gradient(#06b6d4_1px,transparent_1px)] [background-size:24px_24px] pointer-events-none" />

      {/* Optical fiber pulse line */}
      <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-cyan-400 to-transparent animate-pulse" />

      <div className="relative z-10 w-full max-w-md flex flex-col items-center">
        {/* Logo and Hardware Emblem */}
        <div className="relative mb-6">
          <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-cyan-500 to-blue-700 p-0.5 shadow-xl shadow-cyan-500/20">
            <div className="w-full h-full bg-slate-950 rounded-[14px] flex items-center justify-center relative overflow-hidden">
              <Server className="w-9 h-9 text-cyan-400" />
              <div className="absolute inset-0 bg-gradient-to-tr from-cyan-500/10 to-transparent pointer-events-none" />
            </div>
          </div>
          <span className="absolute -bottom-1 -right-1 flex h-4 w-4">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-4 w-4 bg-emerald-500 border-2 border-slate-950"></span>
          </span>
        </div>

        <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
          <span>OLT Core Manager</span>
          <span className="text-xs px-2 py-0.5 font-mono font-semibold rounded bg-cyan-500/10 text-cyan-400 border border-cyan-500/30">
            v2.5
          </span>
        </h1>
        <p className="text-xs text-slate-400 uppercase tracking-widest mt-1 font-mono">
          Optical Line Terminal & Fiber Core System
        </p>

        {/* Progress Display */}
        <div className="w-full mt-8 bg-slate-900/90 border border-slate-800 rounded-xl p-5 shadow-2xl backdrop-blur-sm">
          <div className="flex items-center justify-between text-xs font-mono text-slate-400 mb-2">
            <span className="flex items-center gap-1.5 text-cyan-400">
              <Activity className="w-3.5 h-3.5 animate-spin" />
              {steps[currentStepIndex].title}
            </span>
            <span className="text-slate-300 font-semibold">{progress}%</span>
          </div>

          {/* Progress Bar */}
          <div className="w-full bg-slate-950 h-2 rounded-full overflow-hidden border border-slate-800 p-0.5">
            <div
              className="h-full bg-gradient-to-r from-cyan-500 via-blue-500 to-emerald-400 rounded-full transition-all duration-300 ease-out shadow-sm shadow-cyan-500/50"
              style={{ width: `${progress}%` }}
            />
          </div>

          <p className="text-[11px] text-slate-400 font-mono mt-3 truncate">
            &gt; {steps[currentStepIndex].desc}
          </p>

          <div className="mt-4 pt-3 border-t border-slate-800/80 grid grid-cols-3 gap-2 text-[10px] font-mono text-slate-400">
            <div className="flex items-center gap-1">
              <Cpu className="w-3 h-3 text-cyan-400" />
              <span>8 Boards</span>
            </div>
            <div className="flex items-center gap-1">
              <Server className="w-3 h-3 text-blue-400" />
              <span>17 Sites</span>
            </div>
            <div className="flex items-center gap-1">
              <Database className="w-3 h-3 text-emerald-400" />
              <span>RTDB Sync</span>
            </div>
          </div>
        </div>

        {/* Instant Launch Action Button */}
        <button
          onClick={onComplete}
          className="mt-6 inline-flex items-center gap-2 text-xs text-slate-400 hover:text-cyan-400 transition-colors py-1.5 px-4 rounded-lg bg-slate-900/50 hover:bg-slate-800 border border-slate-800 hover:border-cyan-500/40"
          aria-label="Skip initialization and enter terminal"
        >
          <span>Skip Diagnostic Boot</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </div>

      <div className="absolute bottom-4 text-[11px] text-slate-400 font-mono">
        ITU-T G.984 / G.987 Optical Infrastructure Standards
      </div>
    </div>
  );
};

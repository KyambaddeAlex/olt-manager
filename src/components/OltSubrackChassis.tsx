import React, { useState } from 'react';
import { Server, Cpu, Activity, Zap, CheckCircle2, AlertOctagon, Info } from 'lucide-react';
import { PortRecord, PortStatus } from '../types/olt';

interface OltSubrackChassisProps {
  siteName: string;
  siteCode: string;
  records: PortRecord[];
  selectedBoard: number;
  selectedPort: number;
  onSelectSlot: (board: number, port: number) => void;
}

export const OltSubrackChassis: React.FC<OltSubrackChassisProps> = ({
  siteName,
  siteCode,
  records,
  selectedBoard,
  selectedPort,
  onSelectSlot,
}) => {
  const [activeBoardTab, setActiveBoardTab] = useState<number>(selectedBoard || 1);

  // Helper map: key `${board}_${port}` -> PortRecord
  const recordsMap = new Map<string, PortRecord>();
  records.forEach((r) => {
    recordsMap.set(`${r.boardNumber}_${r.portNumber}`, r);
  });

  const boards = [1, 2, 3, 4, 5, 6, 7, 8];
  const ports = Array.from({ length: 16 }, (_, i) => i); // 0 to 15

  const getPortStatus = (b: number, p: number): PortStatus | 'UNASSIGNED' => {
    const rec = recordsMap.get(`${b}_${p}`);
    return rec ? rec.status : 'UNASSIGNED';
  };

  const getLedColor = (status: PortStatus | 'UNASSIGNED') => {
    switch (status) {
      case 'ACTIVE':
        return 'bg-emerald-400 shadow-[0_0_8px_#34d399]';
      case 'FAULT':
        return 'bg-rose-500 shadow-[0_0_8px_#f43f5e] animate-pulse';
      case 'SPARE':
        return 'bg-cyan-400 shadow-[0_0_8px_#22d3ee]';
      case 'RESERVED':
        return 'bg-amber-400 shadow-[0_0_8px_#fbbf24]';
      case 'TESTING':
        return 'bg-purple-400 shadow-[0_0_8px_#c084fc]';
      default:
        return 'bg-slate-700';
    }
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 sm:p-5 shadow-xl">
      {/* Chassis Top Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-800">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
            <Cpu className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <span>Interactive OLT Subrack Matrix</span>
              <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-slate-800 text-cyan-400 border border-slate-700">
                8 Boards × 16 PON SFP+ Ports
              </span>
            </h3>
            <p className="text-[11px] text-slate-400 font-mono">
              Click any port to inspect or record fiber core patch
            </p>
          </div>
        </div>

        {/* Legend */}
        <div className="flex flex-wrap items-center gap-3 text-[10px] font-mono text-slate-400">
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-400 shadow-[0_0_6px_#34d399]" />
            Active
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-cyan-400 shadow-[0_0_6px_#22d3ee]" />
            Spare
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-rose-500 shadow-[0_0_6px_#f43f5e]" />
            Fault
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-amber-400" />
            Reserved
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-slate-700" />
            Empty
          </span>
        </div>
      </div>

      {/* Board Selector Tabs (1 to 8) */}
      <div className="flex items-center gap-1.5 overflow-x-auto py-3 scrollbar-none border-b border-slate-800/80">
        <span className="text-xs text-slate-400 font-mono uppercase mr-1 hidden sm:inline">Board:</span>
        {boards.map((b) => {
          const boardRecords = records.filter((r) => r.boardNumber === b);
          const isSelected = activeBoardTab === b;

          return (
            <button
              key={b}
              onClick={() => {
                setActiveBoardTab(b);
                onSelectSlot(b, selectedPort);
              }}
              className={`px-3 py-1.5 rounded-lg text-xs font-mono font-medium transition-all flex items-center gap-1.5 shrink-0 cursor-pointer ${
                isSelected
                  ? 'bg-cyan-500 text-slate-950 font-bold shadow-md shadow-cyan-500/20'
                  : 'bg-slate-950 hover:bg-slate-800 text-slate-300 border border-slate-800'
              }`}
              aria-label={`Select Board ${b}`}
            >
              <span>Board {b}</span>
              {boardRecords.length > 0 && (
                <span
                  className={`text-[9px] px-1 rounded-full ${
                    isSelected ? 'bg-slate-950 text-cyan-300' : 'bg-slate-800 text-slate-400'
                  }`}
                >
                  {boardRecords.length}/16
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Active Board Ports Grid (0 to 15) */}
      <div className="pt-4">
        <div className="flex items-center justify-between text-xs font-mono text-slate-400 mb-2.5">
          <span className="text-cyan-400 font-semibold">
            Board #{activeBoardTab} Line Card (GPON/XGS-PON 16-Port SFP+ Blade)
          </span>
          <span>Click a port to configure</span>
        </div>

        <div className="grid grid-cols-4 sm:grid-cols-8 md:grid-cols-16 gap-2">
          {ports.map((p) => {
            const record = recordsMap.get(`${activeBoardTab}_${p}`);
            const status = record ? record.status : 'UNASSIGNED';
            const isTargetSelected = selectedBoard === activeBoardTab && selectedPort === p;

            return (
              <button
                key={p}
                onClick={() => onSelectSlot(activeBoardTab, p)}
                className={`group relative flex flex-col items-center justify-between p-2 rounded-xl border text-center transition-all cursor-pointer ${
                  isTargetSelected
                    ? 'bg-cyan-950/80 border-cyan-400 ring-2 ring-cyan-500/40 shadow-lg shadow-cyan-500/20 scale-105 z-10'
                    : record
                    ? 'bg-slate-950/90 border-slate-700 hover:border-cyan-500/60'
                    : 'bg-slate-950/40 border-slate-800/80 hover:border-slate-600'
                }`}
                title={
                  record
                    ? `Board ${activeBoardTab} Port ${p}: ${record.coreId} @ ${record.locationName} (${record.status})`
                    : `Board ${activeBoardTab} Port ${p}: Available / Unassigned`
                }
                aria-label={`Board ${activeBoardTab} Port ${p}${record ? ` configured with ${record.coreId}` : ' unassigned'}`}
              >
                {/* Status LED */}
                <div className="flex items-center justify-between w-full mb-1">
                  <span className={`w-2 h-2 rounded-full ${getLedColor(status)}`} />
                  <span className="text-[9px] font-mono text-slate-400 group-hover:text-cyan-300">
                    P{p}
                  </span>
                </div>

                {/* SFP Optical Port Visual Socket */}
                <div className="w-6 h-5 rounded-sm bg-slate-900 border border-slate-700/80 flex items-center justify-center my-0.5">
                  <div className="w-3 h-2 bg-slate-950 rounded-xs border border-slate-600 flex items-center justify-center">
                    <span className="w-1 h-1 rounded-full bg-cyan-400/80" />
                  </div>
                </div>

                {/* Core or Empty Badge */}
                <span
                  className={`text-[9px] font-mono truncate w-full mt-1 ${
                    record ? 'text-slate-200 font-semibold' : 'text-slate-400'
                  }`}
                >
                  {record ? record.coreId.replace('Core ', 'C') : 'Spare'}
                </span>
              </button>
            );
          })}
        </div>

        {/* Selected Port Live Readout Banner */}
        {(() => {
          const selectedRecord = recordsMap.get(`${selectedBoard}_${selectedPort}`);
          return (
            <div className="mt-4 p-3 rounded-xl bg-slate-950 border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs font-mono">
              <div className="flex items-center gap-2">
                <span className="text-cyan-400 font-bold">
                  Selected Port: Board {selectedBoard}, Port {selectedPort}
                </span>
                {selectedRecord ? (
                  <span className="px-2 py-0.5 rounded text-[10px] bg-slate-800 text-slate-200 border border-slate-700">
                    Configured ({selectedRecord.coreId})
                  </span>
                ) : (
                  <span className="px-2 py-0.5 rounded text-[10px] bg-slate-900 text-slate-400 border border-slate-800">
                    Unassigned Slot
                  </span>
                )}
              </div>

              {selectedRecord && (
                <div className="flex items-center gap-3 text-[11px] text-slate-400">
                  <span>Location: <span className="text-slate-200">{selectedRecord.locationName}</span></span>
                  {selectedRecord.opticalPowerRxDbm !== undefined && (
                    <span>
                      Rx: <span className="text-emerald-400">{selectedRecord.opticalPowerRxDbm} dBm</span>
                    </span>
                  )}
                </div>
              )}
            </div>
          );
        })()}
      </div>
    </div>
  );
};

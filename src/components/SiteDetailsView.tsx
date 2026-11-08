import React, { useState } from 'react';
import {
  ArrowLeft,
  Server,
  MapPin,
  Cpu,
  Layers,
  Compass,
  Download,
  PlusCircle,
  ExternalLink,
  ShieldCheck,
  Activity,
  AlertTriangle,
  Radio,
  Zap,
} from 'lucide-react';
import { OltSite, PortRecord } from '../types/olt';
import { calculateSiteStats } from '../utils/oltValidation';
import { OltSubrackChassis } from './OltSubrackChassis';
import { PortRecordForm } from './PortRecordForm';
import { SavedConfigurationsTable } from './SavedConfigurationsTable';
import { SiteGeoMapModal } from './SiteGeoMapModal';
import { FieldTagModal } from './FieldTagModal';
import { CableBreakLocator } from './CableBreakLocator';

interface SiteDetailsViewProps {
  site: OltSite;
  records: PortRecord[];
  onNavigateBack: () => void;
  onSaveRecord: (record: PortRecord) => Promise<void>;
  onDeleteRecord: (recordId: string) => Promise<void>;
  operatorName: string;
  canEdit: boolean;
}

export const SiteDetailsView: React.FC<SiteDetailsViewProps> = ({
  site,
  records,
  onNavigateBack,
  onSaveRecord,
  onDeleteRecord,
  operatorName,
  canEdit,
}) => {
  // Selected Board & Port in Chassis
  const [selectedBoard, setSelectedBoard] = useState<number>(1);
  const [selectedPort, setSelectedPort] = useState<number>(0);
  const [editingRecord, setEditingRecord] = useState<PortRecord | null>(null);

  // Modals & Panels
  const [isMapModalOpen, setIsMapModalOpen] = useState(false);
  const [fieldTagRecord, setFieldTagRecord] = useState<PortRecord | null>(null);
  const [isBreakLocatorOpen, setIsBreakLocatorOpen] = useState(false);
  const [breakLocatorRecord, setBreakLocatorRecord] = useState<PortRecord | null>(null);

  // Check for any active fault records on this site
  const firstFaultRecord = records.find((r) => r.status === 'FAULT');

  // Calculate statistics for this site
  const stats = calculateSiteStats(records, site.totalPorts);

  // Handle slot selection in chassis
  const handleSelectSlot = (board: number, port: number) => {
    setSelectedBoard(board);
    setSelectedPort(port);

    // If there is an existing record for this slot, set it as editing
    const existing = records.find((r) => r.boardNumber === board && r.portNumber === port);
    if (existing) {
      setEditingRecord(existing);
    } else {
      setEditingRecord(null);
    }
  };

  const handleEditRecord = (record: PortRecord) => {
    setSelectedBoard(record.boardNumber);
    setSelectedPort(record.portNumber);
    setEditingRecord(record);

    // Scroll to form smoothly
    const formEl = document.getElementById('port-record-form-section');
    if (formEl) {
      formEl.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const handleCancelEdit = () => {
    setEditingRecord(null);
  };

  const handleSaveAndClear = async (rec: PortRecord) => {
    await onSaveRecord(rec);
    setEditingRecord(null);
  };

  return (
    <div data-testid="site-details-page" className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-6">
      {/* Top Banner & Breadcrumb Action */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl">
        <div className="flex items-start gap-3.5">
          <button
            onClick={onNavigateBack}
            className="p-2 rounded-xl bg-slate-950 border border-slate-800 hover:border-cyan-500/50 hover:bg-slate-800 text-slate-300 hover:text-cyan-400 transition-all cursor-pointer shrink-0 mt-0.5"
            title="Return to OLT Sites Dashboard"
            aria-label="Return to Dashboard"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>

          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-cyan-500/10 text-cyan-400 border border-cyan-500/30">
                {site.code}
              </span>
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-white">
                {site.name} OLT Central Office
              </h1>
              <span className="text-[11px] font-mono text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                {site.status}
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-1">{site.description}</p>
            <div className="flex flex-wrap items-center gap-3 mt-2 text-[11px] font-mono text-slate-400">
              <span className="flex items-center gap-1">
                <Server className="w-3.5 h-3.5 text-cyan-400" />
                {site.rackModel}
              </span>
              <span>•</span>
              <span className="flex items-center gap-1">
                <MapPin className="w-3.5 h-3.5 text-blue-400" />
                {site.baseCoordinates.lat.toFixed(4)}°, {site.baseCoordinates.lng.toFixed(4)}°
              </span>
            </div>
          </div>
        </div>

        {/* Spatial Map & Outage Pinpoint Actions */}
        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <button
            onClick={() => {
              setBreakLocatorRecord(firstFaultRecord || null);
              setIsBreakLocatorOpen((prev) => !prev);
              if (!isBreakLocatorOpen) {
                setTimeout(() => {
                  document.getElementById('cable-break-locator-section')?.scrollIntoView({ behavior: 'smooth' });
                }, 100);
              }
            }}
            className={`inline-flex items-center gap-1.5 text-xs font-semibold px-3.5 py-2 rounded-xl transition-all cursor-pointer ${
              firstFaultRecord
                ? 'bg-rose-500/20 hover:bg-rose-500 text-rose-300 hover:text-white border border-rose-500/40 shadow-sm'
                : 'bg-slate-800 hover:bg-rose-500/20 text-slate-300 hover:text-rose-300 border border-slate-700'
            }`}
            title="Locate physical fiber cable breaks and OTDR distance"
            aria-label="Toggle optical cable break locator"
          >
            <Radio className="w-4 h-4 text-rose-400 animate-pulse" />
            <span>{isBreakLocatorOpen ? 'Close Break Locator' : 'Locate Cable Break'}</span>
          </button>

          <button
            onClick={() => setIsMapModalOpen(true)}
            className="inline-flex items-center gap-1.5 text-xs font-semibold px-3.5 py-2 rounded-xl bg-cyan-500/10 hover:bg-cyan-500 text-cyan-300 hover:text-slate-950 border border-cyan-500/30 transition-all cursor-pointer"
            aria-label="Open spatial map of distribution points"
          >
            <Compass className="w-4 h-4" />
            <span>Spatial Map ({records.length} Nodes)</span>
          </button>
        </div>
      </div>

      {/* High-Loss / Outage Incident Notification Banner if FAULT exists */}
      {firstFaultRecord && !isBreakLocatorOpen && (
        <div className="bg-rose-950/40 border border-rose-500/40 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xl">
          <div className="flex items-start gap-3">
            <div className="w-9 h-9 rounded-xl bg-rose-500/20 border border-rose-500/40 flex items-center justify-center text-rose-400 shrink-0 mt-0.5">
              <AlertTriangle className="w-5 h-5 animate-bounce" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-rose-300 uppercase tracking-wide">
                  Critical Fiber Loss Incident Detected
                </span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-rose-500/30 text-rose-200 border border-rose-500/40 font-bold">
                  B{firstFaultRecord.boardNumber}:P{firstFaultRecord.portNumber}
                </span>
              </div>
              <p className="text-xs text-slate-300 mt-0.5">
                Fiber <strong className="text-white">{firstFaultRecord.coreId}</strong> serving{' '}
                <strong className="text-white">{firstFaultRecord.locationName}</strong> has severe attenuation
                ({firstFaultRecord.opticalPowerRxDbm ?? -32.5} dBm). Potential dig-up cut or severed cable.
              </p>
            </div>
          </div>
          <button
            onClick={() => {
              setBreakLocatorRecord(firstFaultRecord);
              setIsBreakLocatorOpen(true);
              setTimeout(() => {
                document.getElementById('cable-break-locator-section')?.scrollIntoView({ behavior: 'smooth' });
              }, 100);
            }}
            className="inline-flex items-center gap-1.5 text-xs font-bold px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white shadow-md shadow-rose-600/30 transition-all cursor-pointer shrink-0"
          >
            <Radio className="w-4 h-4" />
            <span>Pinpoint Break Location →</span>
          </button>
        </div>
      )}

      {/* KPI Stats Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-3.5">
          <p className="text-[10px] text-slate-400 uppercase font-mono">Configured Ports</p>
          <p className="text-lg font-bold text-white font-mono mt-0.5">
            {stats.totalConfigured} <span className="text-xs text-slate-400 font-normal">/ 128</span>
          </p>
          <p className="text-[10px] text-cyan-400">{stats.utilizationPercent}% chassis occupancy</p>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl p-3.5">
          <p className="text-[10px] text-slate-400 uppercase font-mono">Active Traffic</p>
          <p className="text-lg font-bold text-emerald-400 font-mono mt-0.5">{stats.totalActive}</p>
          <p className="text-[10px] text-slate-400">Live GPON/XGS circuits</p>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl p-3.5">
          <p className="text-[10px] text-slate-400 uppercase font-mono">Dark / Spare</p>
          <p className="text-lg font-bold text-cyan-400 font-mono mt-0.5">{stats.totalSpare}</p>
          <p className="text-[10px] text-slate-400">Ready for patching</p>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl p-3.5">
          <p className="text-[10px] text-slate-400 uppercase font-mono">Critical / Faults</p>
          <p
            className={`text-lg font-bold font-mono mt-0.5 ${
              stats.totalFault > 0 ? 'text-rose-400' : 'text-slate-400'
            }`}
          >
            {stats.totalFault}
          </p>
          <p className="text-[10px] text-slate-400">
            {stats.totalFault > 0 ? 'Attenuation alert' : 'Zero link alarms'}
          </p>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl p-3.5 col-span-2 sm:col-span-1">
          <p className="text-[10px] text-slate-400 uppercase font-mono">Average Rx Power</p>
          <p className="text-lg font-bold text-slate-200 font-mono mt-0.5">
            {stats.avgRxPowerDbm !== undefined ? `${stats.avgRxPowerDbm} dBm` : 'N/A'}
          </p>
          <p className="text-[10px] text-slate-400">ITU-T optical margin</p>
        </div>
      </div>

      {/* Interactive Cable Break / Outage Locator Diagnostic Suite */}
      {isBreakLocatorOpen && (
        <div id="cable-break-locator-section" className="scroll-mt-20">
          <CableBreakLocator
            site={site}
            records={records}
            initialRecord={breakLocatorRecord}
            onClose={() => setIsBreakLocatorOpen(false)}
          />
        </div>
      )}

      {/* Interactive Subrack Visual Matrix */}
      <OltSubrackChassis
        siteName={site.name}
        siteCode={site.code}
        records={records}
        selectedBoard={selectedBoard}
        selectedPort={selectedPort}
        onSelectSlot={handleSelectSlot}
      />

      {/* Record Input Form */}
      {canEdit ? (
        <div id="port-record-form-section">
          <PortRecordForm
            site={site}
            initialRecord={editingRecord}
            boardNumber={selectedBoard}
            portNumber={selectedPort}
            onSaveRecord={handleSaveAndClear}
            onCancelEdit={handleCancelEdit}
            operatorName={operatorName}
          />
        </div>
      ) : (
        <p className="rounded-xl border border-slate-800 bg-slate-900 p-3 text-xs text-slate-400">
          View-only access. Contact an administrator to add or edit port records.
        </p>
      )}

      {/* Saved Configurations Table */}
      <SavedConfigurationsTable
        records={records}
        siteName={site.name}
        siteCode={site.code}
        onEditRecord={handleEditRecord}
        onDeleteRecord={onDeleteRecord}
        onOpenFieldTag={(rec) => setFieldTagRecord(rec)}
        canEdit={canEdit}
        onLocateBreak={(rec) => {
          setBreakLocatorRecord(rec);
          setIsBreakLocatorOpen(true);
          setTimeout(() => {
            document.getElementById('cable-break-locator-section')?.scrollIntoView({ behavior: 'smooth' });
          }, 100);
        }}
      />

      {/* Spatial Map Modal */}
      {isMapModalOpen && (
        <SiteGeoMapModal
          site={site}
          records={records}
          onClose={() => setIsMapModalOpen(false)}
        />
      )}

      {/* Field Tag & QR Modal */}
      {fieldTagRecord && (
        <FieldTagModal
          record={fieldTagRecord}
          site={site}
          onClose={() => setFieldTagRecord(null)}
        />
      )}
    </div>
  );
};

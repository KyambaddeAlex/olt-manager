import React, { useState, useMemo } from 'react';
import {
  Search,
  Filter,
  Edit2,
  Trash2,
  MapPin,
  ExternalLink,
  Copy,
  Check,
  Download,
  QrCode,
  AlertTriangle,
  Info,
  Clock,
  Layers,
  ArrowUpDown,
  FileSpreadsheet,
  Radio,
} from 'lucide-react';
import { PortRecord, PortStatus } from '../types/olt';
import { decodeFiberCore } from '../utils/fiberMath';
import { formatCoordinatesDms, generateFieldLabelCode } from '../utils/oltValidation';

interface SavedConfigurationsTableProps {
  records: PortRecord[];
  siteName: string;
  siteCode: string;
  onEditRecord: (record: PortRecord) => void;
  onDeleteRecord: (recordId: string) => Promise<void>;
  onOpenFieldTag: (record: PortRecord) => void;
  canEdit?: boolean;
  onLocateBreak?: (record: PortRecord) => void;
}

export const SavedConfigurationsTable: React.FC<SavedConfigurationsTableProps> = ({
  records,
  siteName,
  siteCode,
  onEditRecord,
  onDeleteRecord,
  onOpenFieldTag,
  canEdit = true,
  onLocateBreak,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [boardFilter, setBoardFilter] = useState<string>('ALL');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [copiedCoordId, setCopiedCoordId] = useState<string | null>(null);
  const [deletingRecordId, setDeletingRecordId] = useState<string | null>(null);
  const [confirmDeleteRecord, setConfirmDeleteRecord] = useState<PortRecord | null>(null);

  // Filtered and sorted records
  const filteredRecords = useMemo(() => {
    return records.filter((rec) => {
      // Board filter
      if (boardFilter !== 'ALL' && rec.boardNumber !== parseInt(boardFilter, 10)) {
        return false;
      }
      // Status filter
      if (statusFilter !== 'ALL' && rec.status !== statusFilter) {
        return false;
      }
      // Search Query
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase().trim();
      return (
        rec.coreId.toLowerCase().includes(q) ||
        rec.locationName.toLowerCase().includes(q) ||
        `b${rec.boardNumber}`.includes(q) ||
        `p${rec.portNumber}`.includes(q) ||
        rec.customerCircuitId?.toLowerCase().includes(q) ||
        rec.cableTag?.toLowerCase().includes(q) ||
        rec.technicianName?.toLowerCase().includes(q)
      );
    });
  }, [records, boardFilter, statusFilter, searchQuery]);

  const handleCopyCoordinates = (rec: PortRecord) => {
    const text = `${rec.coordinates.lat}, ${rec.coordinates.lng}`;
    navigator.clipboard.writeText(text);
    setCopiedCoordId(rec.id);
    setTimeout(() => setCopiedCoordId(null), 2000);
  };

  const handleExportCsv = () => {
    const headers = [
      'Site',
      'Board',
      'Port',
      'CoreID',
      'LocationName',
      'Latitude',
      'Longitude',
      'Status',
      'PON_Standard',
      'SplitRatio',
      'RxPowerDbm',
      'TxPowerDbm',
      'CircuitID',
      'CableTag',
      'Technician',
      'LastUpdated',
    ];

    const rows = filteredRecords.map((r) => [
      `"${siteName}"`,
      r.boardNumber,
      r.portNumber,
      `"${r.coreId}"`,
      `"${r.locationName.replace(/"/g, '""')}"`,
      r.coordinates.lat,
      r.coordinates.lng,
      r.status,
      r.ponType,
      `"${r.splitRatio}"`,
      r.opticalPowerRxDbm ?? '',
      r.opticalPowerTxDbm ?? '',
      `"${r.customerCircuitId || ''}"`,
      `"${r.cableTag || ''}"`,
      `"${r.technicianName || ''}"`,
      `"${r.lastUpdated}"`,
    ]);

    const csvContent = [headers.join(','), ...rows.map((row) => row.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `${siteCode}_OLT_Configurations_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const executeDelete = async (record: PortRecord) => {
    setDeletingRecordId(record.id);
    try {
      await onDeleteRecord(record.id);
      setConfirmDeleteRecord(null);
    } finally {
      setDeletingRecordId(null);
    }
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 sm:p-6 shadow-xl space-y-4">
      {/* Table Header and Actions Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-4 border-b border-slate-800">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-base font-bold text-white">Saved Configurations</h2>
            <span className="text-xs font-mono px-2 py-0.5 rounded-full bg-slate-800 text-cyan-400 border border-slate-700">
              {filteredRecords.length} {filteredRecords.length === 1 ? 'Record' : 'Records'}
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            Registered optical board ports, core allocations, distribution cabinets, and telemetry for {siteName}.
          </p>
        </div>

        {/* Export CSV Button */}
        {records.length > 0 && (
          <button
            onClick={handleExportCsv}
            className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-colors cursor-pointer shrink-0"
            title="Download CSV spreadsheet of port configurations"
            aria-label="Export site configurations to CSV"
          >
            <Download className="w-3.5 h-3.5 text-cyan-400" />
            <span>Export CSV</span>
          </button>
        )}
      </div>

      {/* Filter and Search Controls */}
      <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
        {/* Search */}
        <div className="sm:col-span-6 relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Filter by core ID, FAT location, circuit, or tech..."
            className="w-full bg-slate-950 border border-slate-800 focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 rounded-xl py-2 pl-9 pr-3 text-xs text-slate-100 placeholder:text-slate-400 outline-none transition-colors"
            aria-label="Search saved configurations"
          />
        </div>

        {/* Board Filter */}
        <div className="sm:col-span-3">
          <select
            value={boardFilter}
            onChange={(e) => setBoardFilter(e.target.value)}
            className="w-full bg-slate-950 border border-slate-800 focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 rounded-xl py-2 px-3 text-xs text-slate-100 outline-none transition-colors font-mono"
            aria-label="Filter records by board number"
          >
            <option value="ALL">All Boards (1–8)</option>
            {[1, 2, 3, 4, 5, 6, 7, 8].map((b) => (
              <option key={b} value={b}>
                Board {b}
              </option>
            ))}
          </select>
        </div>

        {/* Status Filter */}
        <div className="sm:col-span-3">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="w-full bg-slate-950 border border-slate-800 focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 rounded-xl py-2 px-3 text-xs text-slate-100 outline-none transition-colors font-mono"
            aria-label="Filter records by status"
          >
            <option value="ALL">All Statuses</option>
            <option value="ACTIVE">Active</option>
            <option value="SPARE">Spare</option>
            <option value="FAULT">Fault</option>
            <option value="RESERVED">Reserved</option>
            <option value="TESTING">Testing</option>
          </select>
        </div>
      </div>

      {/* Table Container */}
      {filteredRecords.length === 0 ? (
        <div className="bg-slate-950/60 border border-dashed border-slate-800 rounded-xl p-8 text-center">
          <Info className="w-8 h-8 text-slate-400 mx-auto mb-2" />
          <h3 className="text-sm font-semibold text-slate-200">No port records found</h3>
          <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
            {records.length === 0
              ? 'No configurations have been logged for this site yet. Use the form above to record your first port and core mapping.'
              : 'No records matched your active search or filters.'}
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-slate-800 bg-slate-950/80">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-800 bg-slate-900/80 text-slate-400 font-mono text-[11px]">
                <th className="py-3 px-3.5 font-semibold">Board / Port</th>
                <th className="py-3 px-3.5 font-semibold">Fiber Core ID</th>
                <th className="py-3 px-3.5 font-semibold">Location &amp; Coordinates</th>
                <th className="py-3 px-3.5 font-semibold">Status / Optical</th>
                <th className="py-3 px-3.5 font-semibold">Last Updated</th>
                <th className="py-3 px-3.5 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/80">
              {filteredRecords.map((rec) => {
                const coreNum = rec.coreNumber || 1;
                const colorInfo = decodeFiberCore(coreNum, 144, 12, 'TIA-598-C');
                const isCopied = copiedCoordId === rec.id;

                return (
                  <tr key={rec.id} className="hover:bg-slate-900/50 transition-colors">
                    {/* Board / Port */}
                    <td className="py-3 px-3.5 font-mono whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <span
                          className={`w-2 h-2 rounded-full ${
                            rec.status === 'ACTIVE'
                              ? 'bg-emerald-400 shadow-[0_0_6px_#34d399]'
                              : rec.status === 'FAULT'
                              ? 'bg-rose-500 shadow-[0_0_6px_#f43f5e]'
                              : rec.status === 'SPARE'
                              ? 'bg-cyan-400'
                              : 'bg-amber-400'
                          }`}
                        />
                        <div>
                          <span className="font-bold text-slate-100">
                            B{rec.boardNumber} : P{rec.portNumber < 10 ? `0${rec.portNumber}` : rec.portNumber}
                          </span>
                          <p className="text-[10px] text-slate-400">{rec.ponType}</p>
                        </div>
                      </div>
                    </td>

                    {/* Fiber Core ID */}
                    <td className="py-3 px-3.5 font-mono">
                      <div className="flex items-center gap-2">
                        {/* TIA-598 color dot */}
                        <span
                          className="w-3 h-3 rounded-full border border-slate-900 shadow-sm shrink-0"
                          style={{ backgroundColor: colorInfo.fiberColor.hex }}
                          title={`Tube ${colorInfo.tubeNumber} (${colorInfo.tubeColor.name}) - Fiber ${colorInfo.fiberInTubeNumber} (${colorInfo.fiberColor.name})`}
                        />
                        <div>
                          <span className="font-bold text-slate-200">{rec.coreId}</span>
                          <p className="text-[10px] text-slate-400">
                            Tube {colorInfo.tubeNumber} ({colorInfo.tubeColor.name})
                          </p>
                        </div>
                      </div>
                    </td>

                    {/* Location Name & Coordinates */}
                    <td className="py-3 px-3.5">
                      <p className="font-medium text-slate-200 max-w-xs truncate">{rec.locationName}</p>
                      <div className="flex items-center gap-2 mt-0.5 text-[11px] font-mono text-slate-400">
                        <span className="text-cyan-400">
                          {rec.coordinates.lat.toFixed(5)}°, {rec.coordinates.lng.toFixed(5)}°
                        </span>

                        <button
                          onClick={() => handleCopyCoordinates(rec)}
                          className="text-slate-400 hover:text-cyan-300 transition-colors"
                          title="Copy GPS coordinates"
                          aria-label={`Copy coordinates for ${rec.locationName}`}
                        >
                          {isCopied ? (
                            <Check className="w-3 h-3 text-emerald-400 inline" />
                          ) : (
                            <Copy className="w-3 h-3 inline" />
                          )}
                        </button>

                        <a
                          href={`https://www.google.com/maps/search/?api=1&query=${rec.coordinates.lat},${rec.coordinates.lng}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-slate-400 hover:text-cyan-300 transition-colors"
                          title="Open in Google Maps"
                          aria-label={`Open Google Maps for coordinates ${rec.coordinates.lat}, ${rec.coordinates.lng}`}
                        >
                          <ExternalLink className="w-3 h-3 inline" />
                        </a>
                      </div>
                    </td>

                    {/* Status & Optical Power */}
                    <td className="py-3 px-3.5 font-mono whitespace-nowrap">
                      <span
                        className={`inline-block px-2 py-0.5 rounded text-[10px] font-semibold border ${
                          rec.status === 'ACTIVE'
                            ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                            : rec.status === 'FAULT'
                            ? 'bg-rose-500/10 text-rose-400 border-rose-500/30'
                            : rec.status === 'SPARE'
                            ? 'bg-cyan-500/10 text-cyan-400 border-cyan-500/30'
                            : 'bg-amber-500/10 text-amber-400 border-amber-500/30'
                        }`}
                      >
                        {rec.status}
                      </span>
                      {rec.opticalPowerRxDbm !== undefined && (
                        <p className="text-[10px] text-slate-400 mt-0.5">
                          Rx: <span className="text-slate-200 font-semibold">{rec.opticalPowerRxDbm} dBm</span>
                        </p>
                      )}
                    </td>

                    {/* Last Updated */}
                    <td className="py-3 px-3.5 text-[11px] text-slate-400 whitespace-nowrap">
                      <div className="flex items-center gap-1">
                        <Clock className="w-3 h-3 text-slate-400 shrink-0" />
                        <span>{new Date(rec.lastUpdated).toLocaleDateString()}</span>
                      </div>
                      <p className="text-[10px] text-slate-400 truncate max-w-[120px]">
                        {rec.technicianName || 'NOC Tech'}
                      </p>
                    </td>

                    {/* Available Actions */}
                    <td className="py-3 px-3.5 text-right whitespace-nowrap">
                      <div className="inline-flex items-center gap-1.5">
                        {/* Locate Cable Break / OTDR Outage Diagnostic */}
                        {onLocateBreak && (
                          <button
                            onClick={() => onLocateBreak(rec)}
                            className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                              rec.status === 'FAULT'
                                ? 'text-rose-400 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30'
                                : 'text-slate-400 hover:text-rose-400 hover:bg-slate-800'
                            }`}
                            title="Locate Cable Break / OTDR Fault Distance"
                            aria-label={`Locate cable break for Board ${rec.boardNumber} Port ${rec.portNumber}`}
                          >
                            <Radio className="w-3.5 h-3.5" />
                          </button>
                        )}

                        {/* Print / Field Tag */}
                        <button
                          onClick={() => onOpenFieldTag(rec)}
                          className="p-1.5 text-slate-400 hover:text-cyan-400 hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
                          title="Generate Field Patch Cord Label / QR"
                          aria-label={`Generate patch label for Board ${rec.boardNumber} Port ${rec.portNumber}`}
                        >
                          <QrCode className="w-3.5 h-3.5" />
                        </button>

                        {/* Edit Record */}
                        {canEdit && (
                          <button
                            onClick={() => onEditRecord(rec)}
                            className="p-1.5 text-slate-400 hover:text-amber-400 hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
                            title="Edit Port-Core Record"
                            aria-label={`Edit Board ${rec.boardNumber} Port ${rec.portNumber}`}
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                        )}

                        {/* Delete Record */}
                        {canEdit && (
                          <button
                            onClick={() => setConfirmDeleteRecord(rec)}
                            className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
                            title="Delete Configuration Record"
                            aria-label={`Delete record for Board ${rec.boardNumber} Port ${rec.portNumber}`}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {confirmDeleteRecord && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm"
        >
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 max-w-sm w-full shadow-2xl space-y-4">
            <div className="w-10 h-10 rounded-xl bg-rose-500/10 border border-rose-500/30 flex items-center justify-center text-rose-400">
              <AlertTriangle className="w-5 h-5" />
            </div>

            <div>
              <h4 className="text-base font-bold text-white">Delete Configuration Record?</h4>
              <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                Are you sure you want to delete the record for{' '}
                <strong className="text-slate-200">
                  Board {confirmDeleteRecord.boardNumber}, Port {confirmDeleteRecord.portNumber}
                </strong>{' '}
                ({confirmDeleteRecord.coreId}) at {confirmDeleteRecord.locationName}?
              </p>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setConfirmDeleteRecord(null)}
                className="px-3.5 py-2 rounded-xl border border-slate-800 hover:bg-slate-800 text-xs text-slate-300 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => executeDelete(confirmDeleteRecord)}
                disabled={deletingRecordId === confirmDeleteRecord.id}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-semibold text-xs shadow-lg shadow-rose-600/20 transition-all cursor-pointer disabled:opacity-50"
              >
                {deletingRecordId === confirmDeleteRecord.id ? 'Deleting...' : 'Confirm Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

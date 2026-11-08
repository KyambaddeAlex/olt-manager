import React, { useState } from 'react';
import { X, MapPin, Navigation, ExternalLink, Compass, Layers, Info } from 'lucide-react';
import { OltSite, PortRecord } from '../types/olt';
import { calculateDistanceMeters, formatCoordinatesDms } from '../utils/oltValidation';

interface SiteGeoMapModalProps {
  site: OltSite;
  records: PortRecord[];
  onClose: () => void;
}

export const SiteGeoMapModal: React.FC<SiteGeoMapModalProps> = ({ site, records, onClose }) => {
  const [selectedRecord, setSelectedRecord] = useState<PortRecord | null>(records[0] || null);

  // Calculate distance for all records
  const recordsWithDistance = records.map((rec) => {
    const dist = calculateDistanceMeters(
      site.baseCoordinates.lat,
      site.baseCoordinates.lng,
      rec.coordinates.lat,
      rec.coordinates.lng
    );
    return { ...rec, distanceMeters: dist };
  });

  // Sort by distance
  recordsWithDistance.sort((a, b) => a.distanceMeters - b.distanceMeters);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="geo-map-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-sm"
    >
      <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-3xl w-full shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-slate-800 bg-slate-950/60 shrink-0">
          <div className="flex items-center gap-2">
            <Compass className="w-4 h-4 text-cyan-400" />
            <div>
              <h3 id="geo-map-title" className="text-sm font-bold text-white flex items-center gap-2">
                <span>{site.name} OLT Spatial Map &amp; Fiber Routes</span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-cyan-500/10 text-cyan-400 border border-cyan-500/30">
                  {records.length} Nodes Mapped
                </span>
              </h3>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            aria-label="Close dialog"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-5 overflow-y-auto space-y-4">
          {/* Spatial Radar SVG Visualization */}
          <div className="relative w-full h-64 bg-slate-950 rounded-2xl border border-slate-800 overflow-hidden flex items-center justify-center shadow-inner">
            {/* Radar Grid Rings */}
            <div className="absolute w-48 h-48 rounded-full border border-cyan-500/10 animate-pulse pointer-events-none" />
            <div className="absolute w-32 h-32 rounded-full border border-cyan-500/15 pointer-events-none" />
            <div className="absolute w-16 h-16 rounded-full border border-cyan-500/20 pointer-events-none" />
            <div className="absolute inset-0 bg-[radial-gradient(#06b6d4_1px,transparent_1px)] [background-size:20px_20px] opacity-10 pointer-events-none" />

            {/* Crosshairs */}
            <div className="absolute top-0 bottom-0 left-1/2 w-[1px] bg-cyan-500/15 pointer-events-none" />
            <div className="absolute left-0 right-0 top-1/2 h-[1px] bg-cyan-500/15 pointer-events-none" />

            {/* Central OLT Base Marker */}
            <div className="relative z-20 flex flex-col items-center">
              <div className="w-6 h-6 rounded-full bg-cyan-500 text-slate-950 flex items-center justify-center font-bold text-[10px] shadow-lg shadow-cyan-500/50">
                OLT
              </div>
              <span className="text-[10px] font-mono font-bold text-cyan-300 mt-1 bg-slate-950/80 px-1.5 py-0.5 rounded border border-cyan-500/30">
                {site.code} Central
              </span>
            </div>

            {/* Plotted FAT/ODF Nodes */}
            {recordsWithDistance.map((rec, index) => {
              // Convert lat/lng delta to circular coordinates on radar
              const deltaLat = rec.coordinates.lat - site.baseCoordinates.lat;
              const deltaLng = rec.coordinates.lng - site.baseCoordinates.lng;
              const scale = 2200; // Visual scaling factor
              const xPos = 50 + deltaLng * scale;
              const yPos = 50 - deltaLat * scale;

              // Clamp to bounds
              const clampedX = Math.max(10, Math.min(90, xPos));
              const clampedY = Math.max(10, Math.min(90, yPos));
              const isSelected = selectedRecord?.id === rec.id;

              return (
                <button
                  key={rec.id}
                  onClick={() => setSelectedRecord(rec)}
                  className={`absolute z-20 -translate-x-1/2 -translate-y-1/2 group transition-transform cursor-pointer ${
                    isSelected ? 'scale-125 z-30' : 'hover:scale-115'
                  }`}
                  style={{ left: `${clampedX}%`, top: `${clampedY}%` }}
                  title={`${rec.locationName} (${rec.distanceMeters}m)`}
                >
                  <div
                    className={`w-3.5 h-3.5 rounded-full border-2 border-slate-950 flex items-center justify-center ${
                      rec.status === 'ACTIVE'
                        ? 'bg-emerald-400 shadow-[0_0_6px_#34d399]'
                        : rec.status === 'FAULT'
                        ? 'bg-rose-500 shadow-[0_0_6px_#f43f5e]'
                        : 'bg-cyan-400'
                    }`}
                  />
                  <span
                    className={`absolute left-1/2 -translate-x-1/2 -top-5 text-[9px] font-mono whitespace-nowrap px-1 rounded bg-slate-900 border border-slate-700 ${
                      isSelected ? 'text-cyan-300 border-cyan-500 font-bold' : 'text-slate-300'
                    }`}
                  >
                    B{rec.boardNumber}P{rec.portNumber}
                  </span>
                </button>
              );
            })}

            <div className="absolute bottom-2 left-3 text-[10px] font-mono text-slate-400">
              OLT Base: {site.baseCoordinates.lat.toFixed(4)}°, {site.baseCoordinates.lng.toFixed(4)}°
            </div>
            <div className="absolute bottom-2 right-3 text-[10px] font-mono text-cyan-400">
              Interactive Radius: 0–5 km
            </div>
          </div>

          {/* Node Details Card & List */}
          {selectedRecord && (
            <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-4 space-y-2">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs font-bold text-cyan-400">
                      Board {selectedRecord.boardNumber} / Port {selectedRecord.portNumber}
                    </span>
                    <span className="text-xs text-slate-400">({selectedRecord.coreId})</span>
                    <span
                      className={`text-[9px] font-mono px-1.5 py-0.2 rounded border ${
                        selectedRecord.status === 'ACTIVE'
                          ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                          : 'bg-slate-800 text-slate-300 border-slate-700'
                      }`}
                    >
                      {selectedRecord.status}
                    </span>
                  </div>
                  <h4 className="text-sm font-semibold text-slate-100 mt-0.5">
                    {selectedRecord.locationName}
                  </h4>
                </div>

                <a
                  href={`https://www.google.com/maps/dir/?api=1&origin=${site.baseCoordinates.lat},${site.baseCoordinates.lng}&destination=${selectedRecord.coordinates.lat},${selectedRecord.coordinates.lng}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg bg-cyan-500/10 hover:bg-cyan-500 text-cyan-300 hover:text-slate-950 border border-cyan-500/30 transition-all cursor-pointer shrink-0"
                >
                  <Navigation className="w-3.5 h-3.5" />
                  <span>Navigate Route in Google Maps</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 border-t border-slate-800 text-[11px] font-mono">
                <div>
                  <span className="text-slate-400">Distance from OLT:</span>
                  <p className="text-cyan-400 font-bold">
                    {calculateDistanceMeters(
                      site.baseCoordinates.lat,
                      site.baseCoordinates.lng,
                      selectedRecord.coordinates.lat,
                      selectedRecord.coordinates.lng
                    )}{' '}
                    meters
                  </p>
                </div>
                <div>
                  <span className="text-slate-400">DMS Coordinates:</span>
                  <p className="text-slate-200">
                    {formatCoordinatesDms(selectedRecord.coordinates.lat, selectedRecord.coordinates.lng)}
                  </p>
                </div>
                <div>
                  <span className="text-slate-400">Split Ratio:</span>
                  <p className="text-slate-200">{selectedRecord.splitRatio}</p>
                </div>
                <div>
                  <span className="text-slate-400">Rx Power:</span>
                  <p className="text-emerald-400">
                    {selectedRecord.opticalPowerRxDbm ? `${selectedRecord.opticalPowerRxDbm} dBm` : 'N/A'}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Node List Table */}
          <div className="space-y-1.5">
            <h4 className="text-xs font-semibold text-slate-300 font-mono">All Registered Distribution Nodes:</h4>
            <div className="space-y-1 max-h-40 overflow-y-auto pr-1">
              {recordsWithDistance.map((rec) => (
                <button
                  key={rec.id}
                  onClick={() => setSelectedRecord(rec)}
                  className={`w-full text-left p-2 rounded-lg border text-xs flex items-center justify-between transition-colors cursor-pointer ${
                    selectedRecord?.id === rec.id
                      ? 'bg-slate-800 border-cyan-500 text-white'
                      : 'bg-slate-950/60 border-slate-800/80 text-slate-300 hover:bg-slate-900'
                  }`}
                >
                  <div className="flex items-center gap-2 truncate">
                    <MapPin className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                    <span className="font-mono text-cyan-300">
                      B{rec.boardNumber}P{rec.portNumber}:
                    </span>
                    <span className="truncate">{rec.locationName}</span>
                  </div>
                  <span className="font-mono text-[10px] text-slate-400 shrink-0 ml-2">
                    {rec.distanceMeters}m from OLT
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-800 bg-slate-950/60 flex items-center justify-end shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-200 transition-colors cursor-pointer"
          >
            Close Map View
          </button>
        </div>
      </div>
    </div>
  );
};

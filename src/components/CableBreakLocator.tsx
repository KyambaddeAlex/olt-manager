import React, { useState, useMemo } from 'react';
import {
  AlertTriangle,
  Radio,
  MapPin,
  Navigation,
  Compass,
  Zap,
  Activity,
  Layers,
  Search,
  ExternalLink,
  Copy,
  Check,
  RotateCcw,
  ShieldAlert,
  Wrench,
  Users,
  Clock,
  ArrowRight,
  Info,
  Flame,
} from 'lucide-react';
import { OltSite, PortRecord } from '../types/olt';
import { BreakSeverity, FiberWaypoint } from '../types/outage';
import {
  calculateOtdrDistanceMeters,
  opticalToPhysicalDistance,
  interpolateRouteCoordinates,
  generateSpanWaypoints,
  findNearestAssetToBreak,
  estimateAffectedSubscribers,
  generateRemediationPlan,
  ITU_G652D_REFRACTIVE_INDEX,
} from '../utils/outageMath';
import { formatCoordinatesDms, calculateDistanceMeters } from '../utils/oltValidation';
import { decodeFiberCore } from '../utils/fiberMath';

interface CableBreakLocatorProps {
  site: OltSite;
  records: PortRecord[];
  initialRecord?: PortRecord | null;
  onClose?: () => void;
}

export const CableBreakLocator: React.FC<CableBreakLocatorProps> = ({
  site,
  records,
  initialRecord,
  onClose,
}) => {
  // Selected Port Record
  const [selectedRecordId, setSelectedRecordId] = useState<string>(
    initialRecord?.id || records[0]?.id || ''
  );

  const selectedRecord = useMemo(() => {
    return records.find((r) => r.id === selectedRecordId) || records[0];
  }, [records, selectedRecordId]);

  // Total span distance in meters
  const totalSpanMeters = useMemo(() => {
    if (!selectedRecord) return 1000;
    return calculateDistanceMeters(
      site.baseCoordinates.lat,
      site.baseCoordinates.lng,
      selectedRecord.coordinates.lat,
      selectedRecord.coordinates.lng
    );
  }, [site, selectedRecord]);

  // Optical Break Distance State (in optical meters)
  const defaultBreakMeters = useMemo(() => {
    // If the port was in FAULT status, place break along route
    if (selectedRecord?.status === 'FAULT') {
      return Math.round(totalSpanMeters * 0.65);
    }
    return Math.round(totalSpanMeters * 0.45);
  }, [selectedRecord, totalSpanMeters]);

  const [breakOpticalMeters, setBreakOpticalMeters] = useState<number>(defaultBreakMeters);
  const [slackFactor, setSlackFactor] = useState<number>(5); // 5% standard
  const [breakSeverity, setBreakSeverity] = useState<BreakSeverity>(
    selectedRecord?.status === 'FAULT' ? 'CRITICAL_CUT' : 'HIGH_LOSS_BEND'
  );
  const [suspectedCause, setSuspectedCause] = useState<string>('Civil excavation / backhoe trench dig strike');
  const [copiedCoords, setCopiedCoords] = useState(false);

  // Generate intermediate waypoints (manholes, handholes, closures)
  const waypoints = useMemo(() => {
    if (!selectedRecord) return [];
    return generateSpanWaypoints(site, selectedRecord);
  }, [site, selectedRecord]);

  // Compute break coordinates
  const breakCoordInfo = useMemo(() => {
    if (!selectedRecord) {
      return { lat: site.baseCoordinates.lat, lng: site.baseCoordinates.lng, physicalDistanceMeters: 0 };
    }
    return interpolateRouteCoordinates(
      site.baseCoordinates.lat,
      site.baseCoordinates.lng,
      selectedRecord.coordinates.lat,
      selectedRecord.coordinates.lng,
      breakOpticalMeters,
      totalSpanMeters,
      slackFactor
    );
  }, [site, selectedRecord, breakOpticalMeters, totalSpanMeters, slackFactor]);

  // Nearest asset analysis
  const nearestAssetInfo = useMemo(() => {
    if (waypoints.length === 0) return null;
    return findNearestAssetToBreak(breakCoordInfo.physicalDistanceMeters, waypoints);
  }, [waypoints, breakCoordInfo]);

  // Affected customer estimation
  const affectedSubscribers = useMemo(() => {
    return estimateAffectedSubscribers(selectedRecord?.splitRatio || '1:32');
  }, [selectedRecord]);

  // Remediation plan
  const remediationPlan = useMemo(() => {
    return generateRemediationPlan(
      breakSeverity,
      breakOpticalMeters,
      nearestAssetInfo ? nearestAssetInfo.description : 'span route'
    );
  }, [breakSeverity, breakOpticalMeters, nearestAssetInfo]);

  // TIA-598 color specification for the core
  const colorSpec = useMemo(() => {
    const num = selectedRecord?.coreNumber || 1;
    return decodeFiberCore(num, 144, 12, 'TIA-598-C');
  }, [selectedRecord]);

  const handleCopyBreakLocation = () => {
    const text = `${breakCoordInfo.lat}, ${breakCoordInfo.lng}`;
    navigator.clipboard.writeText(text);
    setCopiedCoords(true);
    setTimeout(() => setCopiedCoords(false), 2000);
  };

  // Quick Preset Scenarios
  const handleLoadScenario = (meters: number, severity: BreakSeverity, cause: string) => {
    setBreakOpticalMeters(meters);
    setBreakSeverity(severity);
    setSuspectedCause(cause);
  };

  return (
    <div data-testid="outage-locator" className="bg-slate-900 border border-slate-800 rounded-2xl p-5 sm:p-6 shadow-2xl space-y-6">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-rose-500/10 border border-rose-500/30 flex items-center justify-center text-rose-400 shrink-0">
            <Radio className="w-5 h-5 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base sm:text-lg font-bold text-white tracking-tight">
                Optical Cable Break &amp; Outage Pinpointer
              </h2>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-rose-500/20 text-rose-400 border border-rose-500/30 font-bold uppercase">
                OTDR Diagnostic
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Locate physical fiber breaks, macrobends, and dig-up damage with precision GPS and distance triangulation for {site.name}.
            </p>
          </div>
        </div>

        {onClose && (
          <button
            onClick={onClose}
            className="text-xs text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 px-3 py-1.5 rounded-lg transition-colors cursor-pointer self-start sm:self-center"
          >
            Close Locator
          </button>
        )}
      </div>

      {/* Target Port Selection & Quick Outage Scenarios */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Port Picker */}
        <div className="lg:col-span-5 bg-slate-950/80 border border-slate-800 rounded-xl p-4 space-y-3">
          <label htmlFor="outage-port-select" className="block text-xs font-semibold text-slate-200">
            Select Optical Port / Link Under Inspection
          </label>
          <select
            id="outage-port-select"
            value={selectedRecordId}
            onChange={(e) => {
              setSelectedRecordId(e.target.value);
              const rec = records.find((r) => r.id === e.target.value);
              if (rec) {
                const dist = calculateDistanceMeters(
                  site.baseCoordinates.lat,
                  site.baseCoordinates.lng,
                  rec.coordinates.lat,
                  rec.coordinates.lng
                );
                setBreakOpticalMeters(Math.round(dist * 0.5));
              }
            }}
            className="w-full bg-slate-900 border border-slate-800 focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 rounded-lg py-2 px-3 text-xs text-slate-100 outline-none transition-colors font-mono"
          >
            {records.map((r) => (
              <option key={r.id} value={r.id}>
                Board {r.boardNumber} Port {r.portNumber}: {r.coreId} &gt; {r.locationName} ({r.status})
              </option>
            ))}
          </select>

          {selectedRecord && (
            <div className="text-[11px] font-mono text-slate-400 space-y-1 bg-slate-900/60 p-2.5 rounded-lg border border-slate-800/80">
              <div className="flex items-center justify-between">
                <span>Fiber Core:</span>
                <span className="text-slate-200 font-bold flex items-center gap-1.5">
                  <span
                    className="w-2 h-2 rounded-full border border-slate-950"
                    style={{ backgroundColor: colorSpec.fiberColor.hex }}
                  />
                  {selectedRecord.coreId} (Tube {colorSpec.tubeNumber} {colorSpec.tubeColor.name} / Core {colorSpec.fiberInTubeNumber})
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span>Full Span Length:</span>
                <span className="text-cyan-400 font-bold">{totalSpanMeters} meters (~{(totalSpanMeters / 1000).toFixed(2)} km)</span>
              </div>
              <div className="flex items-center justify-between">
                <span>Split Ratio / Service:</span>
                <span className="text-slate-300">{selectedRecord.splitRatio} ({selectedRecord.ponType})</span>
              </div>
            </div>
          )}
        </div>

        {/* Quick Outage Scenario Presets */}
        <div className="lg:col-span-7 bg-slate-950/80 border border-slate-800 rounded-xl p-4 space-y-2">
          <span className="text-xs font-semibold text-slate-200 flex items-center gap-1.5">
            <Flame className="w-3.5 h-3.5 text-rose-400" />
            <span>Simulate Realistic Field Break Scenarios</span>
          </span>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-1">
            <button
              type="button"
              onClick={() =>
                handleLoadScenario(
                  Math.round(totalSpanMeters * 0.35),
                  'CRITICAL_CUT',
                  'Water trench excavation strike by excavator digger'
                )
              }
              className="p-2 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-800 hover:border-rose-500/50 text-left transition-all cursor-pointer group"
            >
              <div className="text-[11px] font-bold text-rose-400 group-hover:text-rose-300">
                1. Dig-up Cut (35% Span)
              </div>
              <p className="text-[10px] text-slate-400 mt-0.5 line-clamp-1">Trench strike severing all 48F</p>
            </button>

            <button
              type="button"
              onClick={() =>
                handleLoadScenario(
                  Math.round(totalSpanMeters * 0.72),
                  'HIGH_LOSS_BEND',
                  'Fallen branch / vehicle pinch in roadside pedestal closure'
                )
              }
              className="p-2 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-800 hover:border-amber-500/50 text-left transition-all cursor-pointer group"
            >
              <div className="text-[11px] font-bold text-amber-400 group-hover:text-amber-300">
                2. Macrobend (72% Span)
              </div>
              <p className="text-[10px] text-slate-400 mt-0.5 line-clamp-1">Kinked tube causing -32 dBm loss</p>
            </button>

            <button
              type="button"
              onClick={() =>
                handleLoadScenario(
                  Math.round(totalSpanMeters * 0.95),
                  'CRITICAL_CUT',
                  'Drop line snap near customer FAT entrance'
                )
              }
              className="p-2 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-800 hover:border-cyan-500/50 text-left transition-all cursor-pointer group"
            >
              <div className="text-[11px] font-bold text-cyan-400 group-hover:text-cyan-300">
                3. Last-Mile Snap (95%)
              </div>
              <p className="text-[10px] text-slate-400 mt-0.5 line-clamp-1">Drop line cut adjacent to cabinet</p>
            </button>
          </div>
        </div>
      </div>

      {/* Break Distance Controller & Physical Translation */}
      <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 sm:p-5 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <span className="text-xs font-semibold text-slate-200 flex items-center gap-1.5">
              <Zap className="w-3.5 h-3.5 text-cyan-400" />
              <span>OTDR Fault Distance Marker</span>
            </span>
            <p className="text-[11px] text-slate-400">
              Drag slider or enter measured optical meter distance from the OLT optical port.
            </p>
          </div>

          <div className="flex items-center gap-3 font-mono text-xs">
            <span className="text-slate-400">Optical Distance:</span>
            <span className="text-lg font-bold text-rose-400 bg-rose-500/10 px-2 py-0.5 rounded border border-rose-500/30">
              {breakOpticalMeters} m
            </span>
            <span className="text-slate-400">({(breakOpticalMeters / 1000).toFixed(3)} km)</span>
          </div>
        </div>

        {/* Interactive Distance Slider */}
        <div className="space-y-1.5">
          <input
            type="range"
            min="10"
            max={Math.max(100, Math.round(totalSpanMeters * 1.15))}
            step="5"
            value={breakOpticalMeters}
            onChange={(e) => setBreakOpticalMeters(parseInt(e.target.value, 10))}
            className="w-full accent-rose-500 cursor-pointer h-2 bg-slate-800 rounded-lg"
            aria-label="Adjust optical break distance in meters"
          />
          <div className="flex justify-between text-[10px] font-mono text-slate-400">
            <span>0m (OLT Transceiver)</span>
            <span className="text-rose-400 font-bold">▲ BREAK POINT: {breakOpticalMeters}m</span>
            <span>{totalSpanMeters}m ({selectedRecord?.locationName.slice(0, 24)}...)</span>
          </div>
        </div>

        {/* Fine Tuning Controls */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 text-xs">
          <div>
            <label htmlFor="break-input-meters" className="block text-[11px] font-mono text-slate-400 mb-1">
              Exact Optical Distance (meters)
            </label>
            <input
              id="break-input-meters"
              type="number"
              value={breakOpticalMeters}
              onChange={(e) => setBreakOpticalMeters(Math.max(0, parseInt(e.target.value || '0', 10)))}
              className="w-full bg-slate-900 border border-slate-800 focus:border-rose-500 focus:ring-1 focus:ring-rose-500 rounded-lg py-1.5 px-3 font-mono text-xs text-slate-100 outline-none"
            />
          </div>

          <div>
            <label htmlFor="slack-factor-select" className="block text-[11px] font-mono text-slate-400 mb-1">
              Slack Coil Factor (% Helix/Loop)
            </label>
            <select
              id="slack-factor-select"
              value={slackFactor}
              onChange={(e) => setSlackFactor(parseInt(e.target.value, 10))}
              className="w-full bg-slate-900 border border-slate-800 focus:border-rose-500 rounded-lg py-1.5 px-3 font-mono text-xs text-slate-100 outline-none"
            >
              <option value="0">0% (Direct Trench / Zero Slack)</option>
              <option value="5">5% (Standard Distribution Slack)</option>
              <option value="8">8% (Heavy Manhole Coils)</option>
              <option value="12">12% (Aerial Sag / Service Loops)</option>
            </select>
          </div>

          <div>
            <label htmlFor="break-severity-select" className="block text-[11px] font-mono text-slate-400 mb-1">
              Fault Classification
            </label>
            <select
              id="break-severity-select"
              value={breakSeverity}
              onChange={(e) => setBreakSeverity(e.target.value as BreakSeverity)}
              className="w-full bg-slate-900 border border-slate-800 focus:border-rose-500 rounded-lg py-1.5 px-3 font-mono text-xs text-slate-100 outline-none"
            >
              <option value="CRITICAL_CUT">Total Fiber Severance / Cut</option>
              <option value="HIGH_LOSS_BEND">High Loss Macrobend (&gt;3.0 dB)</option>
              <option value="DEGRADED_SPLICE">Degraded Splice Joint</option>
            </select>
          </div>
        </div>
      </div>

      {/* Simulated OTDR Trace Curve with Reflection Spike */}
      <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 space-y-2 shadow-inner">
        <div className="flex items-center justify-between text-xs font-mono">
          <span className="text-cyan-400 font-semibold flex items-center gap-1.5">
            <Activity className="w-3.5 h-3.5" />
            <span>Live Simulated Dual-Wavelength OTDR Backscatter Trace</span>
          </span>
          <span className="text-[10px] text-slate-400">Rayleigh Slope: 0.20 dB/km (1550nm)</span>
        </div>

        {/* SVG OTDR Curve */}
        <div className="relative w-full h-40 bg-slate-900/90 rounded-lg border border-slate-800 p-2 overflow-hidden flex items-center">
          <svg className="w-full h-full" viewBox="0 0 800 140" preserveAspectRatio="none">
            {/* Grid lines */}
            <line x1="0" y1="20" x2="800" y2="20" stroke="#334155" strokeDasharray="3 3" strokeWidth="0.7" />
            <line x1="0" y1="60" x2="800" y2="60" stroke="#334155" strokeDasharray="3 3" strokeWidth="0.7" />
            <line x1="0" y1="100" x2="800" y2="100" stroke="#334155" strokeDasharray="3 3" strokeWidth="0.7" />

            {/* Compute SVG coordinate of break */}
            {(() => {
              const maxRange = Math.max(100, totalSpanMeters * 1.15);
              const breakX = Math.min(780, Math.max(40, (breakOpticalMeters / maxRange) * 800));
              const startY = 30;
              const slopeRate = 0.05; // Visual slope rate
              const breakY = startY + (breakX * slopeRate);

              // Fresnel peak height
              const peakY = Math.max(10, breakY - 35);
              const noiseFloorY = 130;

              return (
                <g>
                  {/* Trace Line Before Break */}
                  <path
                    d={`M 10 90 L 25 15 L 40 ${startY} L ${breakX} ${breakY} L ${breakX} ${peakY} L ${breakX + 4} ${noiseFloorY} L 800 ${noiseFloorY}`}
                    fill="none"
                    stroke="#22d3ee"
                    strokeWidth="2.5"
                  />

                  {/* Noise past break */}
                  <path
                    d={`M ${breakX + 4} ${noiseFloorY} Q ${breakX + 50} ${noiseFloorY - 2}, ${breakX + 100} ${noiseFloorY + 2} T ${breakX + 200} ${noiseFloorY} T 800 ${noiseFloorY}`}
                    fill="none"
                    stroke="#475569"
                    strokeWidth="1.5"
                  />

                  {/* Red Break Reflection Spike Indicator */}
                  <circle cx={breakX} cy={peakY} r="5" fill="#f43f5e" className="animate-ping" />
                  <circle cx={breakX} cy={peakY} r="4" fill="#f43f5e" stroke="#fff" strokeWidth="1.5" />

                  {/* Vertical Guide Line */}
                  <line
                    x1={breakX}
                    y1="0"
                    x2={breakX}
                    y2="140"
                    stroke="#f43f5e"
                    strokeWidth="1"
                    strokeDasharray="4 2"
                  />

                  <text x={Math.min(700, breakX + 8)} y={peakY + 12} fill="#f43f5e" fontSize="10" fontFamily="monospace" fontWeight="bold">
                    BREAK @ {breakOpticalMeters}m
                  </text>
                </g>
              );
            })()}
          </svg>

          <div className="absolute top-2 left-3 text-[9px] font-mono text-cyan-400 bg-slate-950/80 px-1.5 py-0.5 rounded border border-cyan-500/30">
            Launch SFP+ Port
          </div>
          <div className="absolute bottom-2 right-3 text-[9px] font-mono text-slate-400 bg-slate-950/80 px-1.5 py-0.5 rounded">
            Noise Floor (-50 dBm)
          </div>
        </div>
      </div>

      {/* Pinpointed Geographic Break Location Card & GIS Map */}
      <div className="bg-gradient-to-br from-rose-950/20 via-slate-950 to-slate-900 border border-rose-500/30 rounded-2xl p-5 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <span className="flex h-3 w-3 relative">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-rose-500"></span>
              </span>
              <h3 className="text-base font-bold text-white tracking-tight">
                Pinpointed Geographic Cable Break Location
              </h3>
            </div>
            <p className="text-xs text-rose-300 font-mono mt-0.5">
              Ground Location: {nearestAssetInfo ? nearestAssetInfo.description : 'Along feeder route'}
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={handleCopyBreakLocation}
              className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-colors cursor-pointer"
            >
              {copiedCoords ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copiedCoords ? 'Copied' : 'Copy GPS'}</span>
            </button>

            <a
              href={`https://www.google.com/maps/dir/?api=1&origin=${site.baseCoordinates.lat},${site.baseCoordinates.lng}&destination=${breakCoordInfo.lat},${breakCoordInfo.lng}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-xs font-bold px-3.5 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white shadow-lg shadow-rose-600/20 transition-all cursor-pointer"
            >
              <Navigation className="w-3.5 h-3.5" />
              <span>Dispatch Crew (Google Maps)</span>
              <ExternalLink className="w-3 h-3" />
            </a>
          </div>
        </div>

        {/* GPS Coordinates & Asset Proximity Readout */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-3.5 rounded-xl bg-slate-950/80 border border-slate-800 text-xs font-mono">
          <div>
            <span className="text-slate-400">Estimated Break Lat/Lng:</span>
            <p className="text-sm font-bold text-rose-400 mt-0.5">
              {breakCoordInfo.lat.toFixed(6)}°, {breakCoordInfo.lng.toFixed(6)}°
            </p>
            <p className="text-[10px] text-slate-400">
              {formatCoordinatesDms(breakCoordInfo.lat, breakCoordInfo.lng)}
            </p>
          </div>

          <div>
            <span className="text-slate-400">Trench Ground Distance:</span>
            <p className="text-sm font-bold text-slate-100 mt-0.5">
              {breakCoordInfo.physicalDistanceMeters} meters
            </p>
            <p className="text-[10px] text-slate-400">
              (Accounting for {slackFactor}% cable slack loops)
            </p>
          </div>

          <div>
            <span className="text-slate-400">Nearest Field Landmark:</span>
            <p className="text-sm font-bold text-cyan-400 mt-0.5 truncate">
              {nearestAssetInfo?.asset.name}
            </p>
            <p className="text-[10px] text-slate-400">
              {nearestAssetInfo?.direction === 'AT_ASSET'
                ? 'Fault inside enclosure'
                : `${nearestAssetInfo?.distanceDeltaMeters}m from enclosure`}
            </p>
          </div>
        </div>

        {/* Visual Span Asset Radar */}
        <div className="space-y-2">
          <span className="text-[11px] font-mono text-slate-400 uppercase tracking-wider">
            Fiber Route Asset Sequence (OLT Central Office to Distribution Node)
          </span>

          <div className="relative flex items-center justify-between p-3 rounded-xl bg-slate-950 border border-slate-800 overflow-x-auto">
            {waypoints.map((wp, idx) => {
              const isPast = breakCoordInfo.physicalDistanceMeters >= wp.cumulativeDistanceMeters;
              const isClosest = nearestAssetInfo?.asset.id === wp.id;

              return (
                <div key={wp.id} className="flex flex-col items-center min-w-[110px] text-center relative px-2">
                  <div
                    className={`w-7 h-7 rounded-full flex items-center justify-center font-bold text-[10px] border-2 transition-all ${
                      isClosest
                        ? 'bg-rose-500 text-white border-rose-300 ring-4 ring-rose-500/20'
                        : isPast
                        ? 'bg-slate-800 text-slate-300 border-slate-600'
                        : 'bg-slate-900 text-slate-400 border-slate-800'
                    }`}
                  >
                    {wp.type.slice(0, 3)}
                  </div>
                  <span className="text-[10px] font-bold text-slate-200 mt-1 truncate max-w-[100px]" title={wp.name}>
                    {wp.name}
                  </span>
                  <span className="text-[9px] font-mono text-slate-400">
                    {wp.cumulativeDistanceMeters}m
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Impact Assessment & Remediation Plan */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
          {/* Impacted Circuits */}
          <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-4 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-200 flex items-center gap-1.5">
                <Users className="w-3.5 h-3.5 text-amber-400" />
                <span>Customer &amp; Circuit Impact</span>
              </span>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-rose-500/10 text-rose-400 font-bold border border-rose-500/20">
                CRITICAL OUTAGE
              </span>
            </div>

            <p className="text-2xl font-black text-white font-mono">
              {affectedSubscribers}{' '}
              <span className="text-xs font-normal text-slate-400">
                Subscribers Down ({selectedRecord?.splitRatio} Split)
              </span>
            </p>

            <div className="text-[11px] font-mono text-slate-400 space-y-1">
              <div>Affected Port: <span className="text-slate-200">Board {selectedRecord?.boardNumber}, Port {selectedRecord?.portNumber}</span></div>
              <div>Primary Circuit: <span className="text-cyan-400">{selectedRecord?.customerCircuitId || 'GPON-CORE-TRUNK'}</span></div>
              <div>Distribution Target: <span className="text-slate-300">{selectedRecord?.locationName}</span></div>
            </div>
          </div>

          {/* Field Technician Remediation Checklist */}
          <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-4 space-y-2">
            <span className="text-xs font-semibold text-slate-200 flex items-center gap-1.5">
              <Wrench className="w-3.5 h-3.5 text-cyan-400" />
              <span>Field Splice Crew Action Protocol</span>
            </span>
            <ul className="space-y-1.5 text-[11px] text-slate-300">
              {remediationPlan.slice(0, 4).map((step, idx) => (
                <li key={idx} className="flex items-start gap-1.5">
                  <ArrowRight className="w-3 h-3 text-cyan-400 shrink-0 mt-0.5" />
                  <span>{step}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

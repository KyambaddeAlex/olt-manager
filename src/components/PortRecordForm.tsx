import React, { useState, useEffect } from 'react';
import {
  MapPin,
  Crosshair,
  Save,
  RotateCcw,
  CheckCircle2,
  AlertTriangle,
  Radio,
  Layers,
  Activity,
  Sparkles,
  Zap,
} from 'lucide-react';
import { OltSite, PortRecord, PortStatus, PonStandard, OltValidationErrors } from '../types/olt';
import { validateOltRecordInput, getFiberCoreNumberForPort, parseCoreNumber } from '../utils/oltValidation';
import { decodeFiberCore } from '../utils/fiberMath';

interface PortRecordFormProps {
  site: OltSite;
  initialRecord?: PortRecord | null;
  boardNumber: number;
  portNumber: number;
  onSaveRecord: (record: PortRecord) => Promise<void>;
  onCancelEdit?: () => void;
  operatorName: string;
}

export const PortRecordForm: React.FC<PortRecordFormProps> = ({
  site,
  initialRecord,
  boardNumber,
  portNumber,
  onSaveRecord,
  onCancelEdit,
  operatorName,
}) => {
  // Form State
  const [board, setBoard] = useState<number>(boardNumber || 1);
  const [port, setPort] = useState<number>(portNumber ?? 0);
  const [coreId, setCoreId] = useState<string>('');
  const [locationName, setLocationName] = useState<string>('');
  const [lat, setLat] = useState<string>('');
  const [lng, setLng] = useState<string>('');
  const [status, setStatus] = useState<PortStatus>('ACTIVE');
  const [ponType, setPonType] = useState<PonStandard>('GPON');
  const [splitRatio, setSplitRatio] = useState<string>('1:32');
  const [opticalPowerTx, setOpticalPowerTx] = useState<string>('2.8');
  const [opticalPowerRx, setOpticalPowerRx] = useState<string>('-19.2');
  const [customerCircuitId, setCustomerCircuitId] = useState<string>('');
  const [cableTag, setCableTag] = useState<string>('');
  const [notes, setNotes] = useState<string>('');

  // Geolocation State
  const [isLocating, setIsLocating] = useState<boolean>(false);
  const [geoAccuracy, setGeoAccuracy] = useState<number | null>(null);
  const [geoError, setGeoError] = useState<string | null>(null);

  // Form Submission & Validation State
  const [errors, setErrors] = useState<OltValidationErrors>({});
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [successBanner, setSuccessBanner] = useState<string | null>(null);

  // Sync with prop changes (when a user clicks a slot on the chassis)
  useEffect(() => {
    if (initialRecord) {
      setBoard(initialRecord.boardNumber);
      setPort(initialRecord.portNumber);
      setCoreId(initialRecord.coreId);
      setLocationName(initialRecord.locationName);
      setLat(initialRecord.coordinates.lat.toString());
      setLng(initialRecord.coordinates.lng.toString());
      setStatus(initialRecord.status);
      setPonType(initialRecord.ponType);
      setSplitRatio(initialRecord.splitRatio);
      setOpticalPowerTx(initialRecord.opticalPowerTxDbm !== undefined ? initialRecord.opticalPowerTxDbm.toString() : '');
      setOpticalPowerRx(initialRecord.opticalPowerRxDbm !== undefined ? initialRecord.opticalPowerRxDbm.toString() : '');
      setCustomerCircuitId(initialRecord.customerCircuitId || '');
      setCableTag(initialRecord.cableTag || '');
      setNotes(initialRecord.notes || '');
      setGeoAccuracy(initialRecord.coordinates.accuracyMeters || null);
    } else {
      setBoard(boardNumber);
      setPort(portNumber);
      setCoreId(`Core ${getFiberCoreNumberForPort(boardNumber, portNumber)}`);
      // Fill site default lat/lng if blank
      if (!lat && !lng) {
        setLat(site.baseCoordinates.lat.toFixed(6));
        setLng(site.baseCoordinates.lng.toFixed(6));
      }
    }
  }, [initialRecord, boardNumber, portNumber, site]);

  // Decode Fiber Core for TIA-598 color visualization
  const parsedCoreNum = parseCoreNumber(coreId) || 1;
  const colorSpec = decodeFiberCore(parsedCoreNum, 144, 12, 'TIA-598-C');

  // Handle "Use Current Location" via Geolocation API
  const handleUseCurrentLocation = () => {
    if (!navigator.geolocation) {
      setGeoError('Geolocation is not supported by your browser.');
      return;
    }

    setIsLocating(true);
    setGeoError(null);

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setIsLocating(false);
        const latitude = pos.coords.latitude;
        const longitude = pos.coords.longitude;
        const accuracy = pos.coords.accuracy;

        setLat(latitude.toFixed(6));
        setLng(longitude.toFixed(6));
        setGeoAccuracy(accuracy);
        setErrors((prev) => ({ ...prev, lat: undefined, lng: undefined }));
      },
      (err) => {
        setIsLocating(false);
        let msg = 'Could not retrieve device location.';
        if (err.code === err.PERMISSION_DENIED) {
          msg = 'Location permission was denied. Please allow location access in your browser or enter coordinates manually.';
        } else if (err.code === err.POSITION_UNAVAILABLE) {
          msg = 'Location signal unavailable. Please ensure GPS/WiFi is enabled or enter coordinates manually.';
        } else if (err.code === err.TIMEOUT) {
          msg = 'Location request timed out. Please try again.';
        }
        setGeoError(msg);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0,
      }
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSuccessBanner(null);

    // Validate
    const validation = validateOltRecordInput({
      boardNumber: board,
      portNumber: port,
      coreId,
      locationName,
      lat,
      lng,
      opticalPowerRxDbm: opticalPowerRx,
      opticalPowerTxDbm: opticalPowerTx,
    });

    if (!validation.isValid) {
      setErrors(validation.errors);
      return;
    }

    setErrors({});
    setIsSaving(true);

    try {
      const sanitized = validation.sanitized!;
      const recordId = initialRecord ? initialRecord.id : `rec_${site.id}_b${board}_p${port}`;

      const historyEntry = {
        timestamp: new Date().toISOString(),
        action: (initialRecord ? 'UPDATED' : 'CREATED') as 'UPDATED' | 'CREATED',
        operator: operatorName,
        details: `${sanitized.coreId} patched at ${sanitized.locationName} (${status})`,
      };

      const recordToSave: PortRecord = {
        id: recordId,
        siteId: site.id,
        boardNumber: sanitized.boardNumber,
        portNumber: sanitized.portNumber,
        coreId: sanitized.coreId,
        coreNumber: sanitized.coreNumber,
        locationName: sanitized.locationName,
        coordinates: {
          lat: sanitized.lat,
          lng: sanitized.lng,
          accuracyMeters: geoAccuracy || undefined,
          source: geoAccuracy ? 'GPS' : 'MANUAL',
        },
        status,
        ponType,
        splitRatio,
        opticalPowerTxDbm: sanitized.opticalPowerTxDbm,
        opticalPowerRxDbm: sanitized.opticalPowerRxDbm,
        customerCircuitId: customerCircuitId.trim() || undefined,
        cableTag: cableTag.trim() || undefined,
        technicianName: operatorName,
        notes: notes.trim() || undefined,
        lastUpdated: new Date().toISOString(),
        history: initialRecord?.history
          ? [historyEntry, ...initialRecord.history]
          : [historyEntry],
      };

      await onSaveRecord(recordToSave);
      setSuccessBanner(
        `Configuration for Board ${sanitized.boardNumber}, Port ${sanitized.portNumber} (${sanitized.coreId}) saved successfully!`
      );
      setIsSaving(false);

      // Auto dismiss success banner after 4 seconds
      setTimeout(() => setSuccessBanner(null), 4000);
    } catch (err: any) {
      setIsSaving(false);
      setErrors({ general: err.message || 'Failed to save configuration.' });
    }
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 sm:p-6 shadow-xl">
      {/* Header */}
      <div className="flex items-center justify-between pb-4 border-b border-slate-800 mb-5">
        <div>
          <h2 className="text-base font-bold text-white flex items-center gap-2">
            <span>{initialRecord ? 'Edit Port-Core Record' : 'Record New Port & Fiber-Core'}</span>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-cyan-500/10 text-cyan-400 border border-cyan-500/30">
              Board {board} / Port {port}
            </span>
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Configure optical line terminal port mapping, buffer tube assignment, and GPS coordinates for {site.name}.
          </p>
        </div>

        {initialRecord && onCancelEdit && (
          <button
            type="button"
            onClick={onCancelEdit}
            className="text-xs text-slate-400 hover:text-slate-200 bg-slate-800 hover:bg-slate-700 px-3 py-1.5 rounded-lg transition-colors cursor-pointer"
          >
            Cancel Edit
          </button>
        )}
      </div>

      {/* Success Notification */}
      {successBanner && (
        <div
          role="status"
          className="mb-5 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs flex items-center gap-2.5 animate-fadeIn"
        >
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{successBanner}</span>
        </div>
      )}

      {/* General Error Banner */}
      {errors.general && (
        <div
          role="alert"
          className="mb-5 p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2.5"
        >
          <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
          <span>{errors.general}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Row 1: Board Number & Port Number (Required) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label htmlFor="board-number-select" className="block text-xs font-semibold text-slate-300 mb-1.5">
              Board Number (1–8) <span className="text-rose-400">*</span>
            </label>
            <select
              id="board-number-select"
              value={board}
              onChange={(e) => {
                const nextBoard = parseInt(e.target.value, 10);
                setBoard(nextBoard);
                setCoreId(`Core ${getFiberCoreNumberForPort(nextBoard, port)}`);
              }}
              className={`w-full bg-slate-950 border ${
                errors.boardNumber ? 'border-rose-500' : 'border-slate-800'
              } focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 rounded-xl py-2.5 px-3 text-sm text-slate-100 outline-none transition-colors font-mono`}
            >
              {[1, 2, 3, 4, 5, 6, 7, 8].map((b) => (
                <option key={b} value={b}>
                  Slot / Board {b} (GPON/XGS-PON Line Card)
                </option>
              ))}
            </select>
            {errors.boardNumber && (
              <p className="text-[11px] text-rose-400 mt-1">{errors.boardNumber}</p>
            )}
          </div>

          <div>
            <label htmlFor="port-number-select" className="block text-xs font-semibold text-slate-300 mb-1.5">
              Port Number (0–15) <span className="text-rose-400">*</span>
            </label>
            <select
              id="port-number-select"
              value={port}
              onChange={(e) => {
                const nextPort = parseInt(e.target.value, 10);
                setPort(nextPort);
                setCoreId(`Core ${getFiberCoreNumberForPort(board, nextPort)}`);
              }}
              className={`w-full bg-slate-950 border ${
                errors.portNumber ? 'border-rose-500' : 'border-slate-800'
              } focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 rounded-xl py-2.5 px-3 text-sm text-slate-100 outline-none transition-colors font-mono`}
            >
              {Array.from({ length: 16 }, (_, i) => i).map((p) => (
                <option key={p} value={p}>
                  PON SFP+ Port {p}
                </option>
              ))}
            </select>
            {errors.portNumber && (
              <p className="text-[11px] text-rose-400 mt-1">{errors.portNumber}</p>
            )}
          </div>
        </div>

        {/* Row 2: Core ID & Location Name (Required) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label htmlFor="core-id-input" className="block text-xs font-semibold text-slate-300">
                Fiber Core ID <span className="text-rose-400">*</span>
              </label>
              {/* TIA-598 Color Code Badge */}
              <div
                className="flex items-center gap-1.5 text-[10px] font-mono px-2 py-0.5 rounded border"
                style={{
                  backgroundColor: `${colorSpec.fiberColor.hex}15`,
                  borderColor: colorSpec.fiberColor.hex,
                }}
                title={`TIA-598-C: Tube ${colorSpec.tubeNumber} (${colorSpec.tubeColor.name}) - Fiber ${colorSpec.fiberInTubeNumber} (${colorSpec.fiberColor.name})`}
              >
                <span
                  className="w-2.5 h-2.5 rounded-full border border-slate-950 shadow-sm"
                  style={{ backgroundColor: colorSpec.fiberColor.hex }}
                />
                <span className="text-slate-200">
                  Tube {colorSpec.tubeNumber} ({colorSpec.tubeColor.name}) : Core {colorSpec.fiberInTubeNumber} ({colorSpec.fiberColor.name})
                </span>
              </div>
            </div>

            <input
              id="core-id-input"
              type="text"
              value={coreId}
              onChange={(e) => {
                setCoreId(e.target.value);
                if (errors.coreId) setErrors((prev) => ({ ...prev, coreId: undefined }));
              }}
              placeholder="e.g. Core 01, Core 24, C-48"
              className={`w-full bg-slate-950 border ${
                errors.coreId ? 'border-rose-500' : 'border-slate-800'
              } focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 rounded-xl py-2.5 px-3 text-sm text-slate-100 placeholder:text-slate-400 outline-none transition-colors font-mono`}
            />
            {errors.coreId && <p className="text-[11px] text-rose-400 mt-1">{errors.coreId}</p>}
            <p className="text-[11px] text-slate-400 mt-1">
              Board {board} / Port {port} maps to Core {parsedCoreNum}. Edit the ID only if the field label differs.
            </p>
          </div>

          <div>
            <label htmlFor="location-name-input" className="block text-xs font-semibold text-slate-300 mb-1.5">
              Location Name / Distribution Node <span className="text-rose-400">*</span>
            </label>
            <input
              id="location-name-input"
              type="text"
              value={locationName}
              onChange={(e) => {
                setLocationName(e.target.value);
                if (errors.locationName) setErrors((prev) => ({ ...prev, locationName: undefined }));
              }}
              placeholder="e.g. FAT-04 / Kansanga Market Junction Cabinet"
              className={`w-full bg-slate-950 border ${
                errors.locationName ? 'border-rose-500' : 'border-slate-800'
              } focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 rounded-xl py-2.5 px-3 text-sm text-slate-100 placeholder:text-slate-400 outline-none transition-colors`}
            />
            {errors.locationName && (
              <p className="text-[11px] text-rose-400 mt-1">{errors.locationName}</p>
            )}
          </div>
        </div>

        {/* Row 3: Coordinates with "Use Current Location" (Required) */}
        <div className="bg-slate-950/70 border border-slate-800/80 rounded-xl p-4 space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <span className="text-xs font-semibold text-slate-200 flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-cyan-400" />
                <span>Geographic Field Coordinates</span>
                <span className="text-rose-400">*</span>
              </span>
              <p className="text-[11px] text-slate-400">
                Latitude & longitude of the splice closure, FAT distribution cabinet, or ODF pedestal.
              </p>
            </div>

            {/* "Use Current Location" Action Button */}
            <button
              type="button"
              onClick={handleUseCurrentLocation}
              disabled={isLocating}
              className="inline-flex items-center gap-2 text-xs font-semibold px-3 py-1.5 rounded-lg bg-cyan-500/10 hover:bg-cyan-500 text-cyan-300 hover:text-slate-950 border border-cyan-500/30 hover:border-cyan-500 transition-all cursor-pointer disabled:opacity-50 shrink-0"
              aria-label="Use current device location to fill coordinates"
            >
              <Crosshair className={`w-3.5 h-3.5 ${isLocating ? 'animate-spin' : ''}`} />
              <span>{isLocating ? 'Acquiring GPS Fix...' : 'Use Current Location'}</span>
            </button>
          </div>

          {/* Location Accuracy or Error */}
          {geoAccuracy !== null && (
            <div className="text-[11px] font-mono text-emerald-400 flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
              <span>GPS location locked with high precision (±{geoAccuracy.toFixed(1)}m accuracy)</span>
            </div>
          )}

          {geoError && (
            <div
              role="alert"
              className="p-2.5 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs flex items-start gap-2"
            >
              <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
              <span>{geoError}</span>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
            <div>
              <label htmlFor="latitude-input" className="block text-[11px] font-mono text-slate-400 mb-1">
                Latitude (-90.0 to 90.0)
              </label>
              <input
                id="latitude-input"
                type="text"
                value={lat}
                onChange={(e) => {
                  setLat(e.target.value);
                  if (errors.lat) setErrors((prev) => ({ ...prev, lat: undefined }));
                }}
                placeholder="e.g. 0.301250"
                className={`w-full bg-slate-900 border ${
                  errors.lat ? 'border-rose-500' : 'border-slate-800'
                } focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 rounded-lg py-2 px-3 text-xs text-slate-100 placeholder:text-slate-400 outline-none transition-colors font-mono`}
              />
              {errors.lat && <p className="text-[11px] text-rose-400 mt-1">{errors.lat}</p>}
            </div>

            <div>
              <label htmlFor="longitude-input" className="block text-[11px] font-mono text-slate-400 mb-1">
                Longitude (-180.0 to 180.0)
              </label>
              <input
                id="longitude-input"
                type="text"
                value={lng}
                onChange={(e) => {
                  setLng(e.target.value);
                  if (errors.lng) setErrors((prev) => ({ ...prev, lng: undefined }));
                }}
                placeholder="e.g. 32.608510"
                className={`w-full bg-slate-900 border ${
                  errors.lng ? 'border-rose-500' : 'border-slate-800'
                } focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 rounded-lg py-2 px-3 text-xs text-slate-100 placeholder:text-slate-400 outline-none transition-colors font-mono`}
              />
              {errors.lng && <p className="text-[11px] text-rose-400 mt-1">{errors.lng}</p>}
            </div>
          </div>
        </div>

        {/* Row 4: Professional Telecom Fields (Status, PON Standard, Splitter, Powers) */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div>
            <label htmlFor="port-status-select" className="block text-xs font-semibold text-slate-300 mb-1.5">
              Port Status
            </label>
            <select
              id="port-status-select"
              value={status}
              onChange={(e) => setStatus(e.target.value as PortStatus)}
              className="w-full bg-slate-950 border border-slate-800 focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 rounded-xl py-2 px-2.5 text-xs text-slate-100 outline-none transition-colors font-mono"
            >
              <option value="ACTIVE">Active (Live Traffic)</option>
              <option value="SPARE">Spare (Dark Fiber)</option>
              <option value="RESERVED">Reserved (Planning)</option>
              <option value="FAULT">Fault (High Loss/Cut)</option>
              <option value="TESTING">Testing (OTDR Audit)</option>
            </select>
          </div>

          <div>
            <label htmlFor="pon-type-select" className="block text-xs font-semibold text-slate-300 mb-1.5">
              PON Technology
            </label>
            <select
              id="pon-type-select"
              value={ponType}
              onChange={(e) => setPonType(e.target.value as PonStandard)}
              className="w-full bg-slate-950 border border-slate-800 focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 rounded-xl py-2 px-2.5 text-xs text-slate-100 outline-none transition-colors font-mono"
            >
              <option value="GPON">GPON (2.5G/1.25G)</option>
              <option value="XGS-PON">XGS-PON (10G/10G)</option>
              <option value="COMBO-PON">Combo PON (Dual)</option>
              <option value="EPON">EPON (1G/1G)</option>
            </select>
          </div>

          <div>
            <label htmlFor="split-ratio-select" className="block text-xs font-semibold text-slate-300 mb-1.5">
              Optical Split Ratio
            </label>
            <select
              id="split-ratio-select"
              value={splitRatio}
              onChange={(e) => setSplitRatio(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 rounded-xl py-2 px-2.5 text-xs text-slate-100 outline-none transition-colors font-mono"
            >
              <option value="1:32">1:32 (Standard ODN)</option>
              <option value="1:64">1:64 (High Density)</option>
              <option value="1:16">1:16 (Long Distance)</option>
              <option value="1:8">1:8 (Sub-Splitter)</option>
              <option value="None">None (P2P Dedicated)</option>
            </select>
          </div>

          <div>
            <label htmlFor="rx-power-input" className="block text-xs font-semibold text-slate-300 mb-1.5">
              Rx Power (dBm)
            </label>
            <input
              id="rx-power-input"
              type="text"
              value={opticalPowerRx}
              onChange={(e) => setOpticalPowerRx(e.target.value)}
              placeholder="-19.4"
              className="w-full bg-slate-950 border border-slate-800 focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 rounded-xl py-2 px-2.5 text-xs text-slate-100 placeholder:text-slate-400 outline-none transition-colors font-mono"
            />
          </div>
        </div>

        {/* Row 5: Circuit ID, Cable Tag & Notes */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label htmlFor="customer-circuit-input" className="block text-xs font-semibold text-slate-300 mb-1.5">
              Customer / Service Circuit ID (Optional)
            </label>
            <input
              id="customer-circuit-input"
              type="text"
              value={customerCircuitId}
              onChange={(e) => setCustomerCircuitId(e.target.value)}
              placeholder="e.g. GPON-KIS-4029"
              className="w-full bg-slate-950 border border-slate-800 focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 rounded-xl py-2 px-3 text-xs text-slate-100 placeholder:text-slate-400 outline-none transition-colors font-mono"
            />
          </div>

          <div>
            <label htmlFor="cable-tag-input" className="block text-xs font-semibold text-slate-300 mb-1.5">
              Cable Tag / ODF Tray ID (Optional)
            </label>
            <input
              id="cable-tag-input"
              type="text"
              value={cableTag}
              onChange={(e) => setCableTag(e.target.value)}
              placeholder="e.g. OFC-48F-TRK01-TRAY2"
              className="w-full bg-slate-950 border border-slate-800 focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 rounded-xl py-2 px-3 text-xs text-slate-100 placeholder:text-slate-400 outline-none transition-colors font-mono"
            />
          </div>
        </div>

        <div>
          <label htmlFor="notes-textarea" className="block text-xs font-semibold text-slate-300 mb-1.5">
            Technician Notes & Splice Remarks
          </label>
          <textarea
            id="notes-textarea"
            rows={2}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Field observations, splice tray details, attenuation readings..."
            className="w-full bg-slate-950 border border-slate-800 focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 rounded-xl py-2 px-3 text-xs text-slate-100 placeholder:text-slate-400 outline-none transition-colors resize-none"
          />
        </div>

        {/* Action Buttons */}
        <div className="pt-2 flex items-center justify-end gap-3">
          {initialRecord && onCancelEdit && (
            <button
              type="button"
              onClick={onCancelEdit}
              className="px-4 py-2.5 rounded-xl border border-slate-800 hover:bg-slate-800 text-xs text-slate-300 transition-colors cursor-pointer"
            >
              Cancel
            </button>
          )}

          <button
            type="submit"
            disabled={isSaving}
            className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-bold text-xs shadow-lg shadow-cyan-500/20 active:scale-[0.98] transition-all cursor-pointer disabled:opacity-60"
            aria-label="Save OLT port and fiber core record"
          >
            <Save className={`w-4 h-4 ${isSaving ? 'animate-spin' : ''}`} />
            <span>{isSaving ? 'Saving Configuration...' : initialRecord ? 'Update Record' : 'Save Port-Core Record'}</span>
          </button>
        </div>
      </form>
    </div>
  );
};

import React, { useState } from 'react';
import { X, Printer, Copy, Check, QrCode, Tag, ShieldCheck } from 'lucide-react';
import { PortRecord, OltSite } from '../types/olt';
import { generateFieldLabelCode, formatCoordinatesDms } from '../utils/oltValidation';
import { decodeFiberCore } from '../utils/fiberMath';

interface FieldTagModalProps {
  record: PortRecord;
  site: OltSite;
  onClose: () => void;
}

export const FieldTagModal: React.FC<FieldTagModalProps> = ({ record, site, onClose }) => {
  const [copied, setCopied] = useState(false);

  const labelCode = generateFieldLabelCode(site.code, record.boardNumber, record.portNumber, record.coreId);
  const coreNum = record.coreNumber || 1;
  const colorSpec = decodeFiberCore(coreNum, 144, 12, 'TIA-598-C');
  const dmsCoord = formatCoordinatesDms(record.coordinates.lat, record.coordinates.lng);

  const handleCopyTag = () => {
    navigator.clipboard.writeText(labelCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="field-tag-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm"
    >
      <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full shadow-2xl overflow-hidden animate-fadeIn">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-slate-800 bg-slate-950/60">
          <div className="flex items-center gap-2">
            <Tag className="w-4 h-4 text-cyan-400" />
            <h3 id="field-tag-title" className="text-sm font-bold text-white">
              Field Patch Cord &amp; ODF Label
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            aria-label="Close dialog"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Label Body Preview */}
        <div className="p-6 space-y-4">
          {/* Printable Tag Visual (Simulating physical vinyl telecom adhesive tag) */}
          <div className="bg-amber-100 text-slate-950 rounded-xl p-4 border-2 border-amber-300 shadow-md font-mono select-all">
            <div className="flex items-center justify-between border-b border-slate-900/20 pb-2 mb-2 text-[10px] font-bold">
              <span>{site.name.toUpperCase()} OLT NODE</span>
              <span>ITU-T G.984</span>
            </div>

            <div className="text-center py-2">
              <span className="text-xs text-slate-700">PATCH TAG CODE:</span>
              <p className="text-lg font-black tracking-wider text-slate-950">{labelCode}</p>
            </div>

            {/* Simulated Barcode */}
            <div className="w-full h-8 bg-slate-950/10 flex items-center justify-center rounded my-2 overflow-hidden px-2">
              <div className="flex gap-[2px] h-6 items-end w-full justify-center">
                {Array.from({ length: 38 }).map((_, i) => (
                  <div
                    key={i}
                    className="bg-slate-950"
                    style={{
                      width: i % 3 === 0 ? '3px' : '1.5px',
                      height: i % 5 === 0 ? '100%' : '85%',
                    }}
                  />
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 text-[10px] pt-1 border-t border-slate-900/20">
              <div>
                <span className="text-slate-600">SLOT / PORT:</span>
                <p className="font-bold text-slate-900">
                  B0{record.boardNumber} : P{record.portNumber < 10 ? `0${record.portNumber}` : record.portNumber}
                </p>
              </div>
              <div>
                <span className="text-slate-600">FIBER CORE:</span>
                <p className="font-bold text-slate-900 flex items-center gap-1">
                  <span
                    className="w-2 h-2 rounded-full inline-block border border-slate-900"
                    style={{ backgroundColor: colorSpec.fiberColor.hex }}
                  />
                  <span>
                    {record.coreId} ({colorSpec.tubeColor.name}/{colorSpec.fiberColor.name})
                  </span>
                </p>
              </div>
              <div className="col-span-2">
                <span className="text-slate-600">DESTINATION CABINET:</span>
                <p className="font-bold text-slate-900 truncate">{record.locationName}</p>
              </div>
              <div className="col-span-2 text-[9px] text-slate-700">
                <span>GPS: {record.coordinates.lat.toFixed(5)}°, {record.coordinates.lng.toFixed(5)}°</span>
              </div>
            </div>
          </div>

          <p className="text-[11px] text-slate-400 leading-relaxed">
            Standard vinyl label template suitable for thermal label printers (Brother / Dymo). Apply directly to
            the SC/APC patch cord and distribution tray connector.
          </p>
        </div>

        {/* Footer Actions */}
        <div className="p-4 border-t border-slate-800 bg-slate-950/40 flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={handleCopyTag}
            className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-2 rounded-xl border border-slate-800 hover:bg-slate-800 text-slate-300 transition-colors cursor-pointer"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copied ? 'Copied Tag' : 'Copy Code'}</span>
          </button>

          <button
            type="button"
            onClick={handlePrint}
            className="inline-flex items-center gap-1.5 text-xs font-bold px-4 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 shadow-md shadow-cyan-500/20 transition-all cursor-pointer"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Print Label Tag</span>
          </button>
        </div>
      </div>
    </div>
  );
};

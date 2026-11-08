import {
  ColorDecodingResult,
  ConnectorSpec,
  CwdmChannel,
  DiagnosticGuide,
  DwdmChannel,
  FiberColorSpec,
  FiberStandard,
  FiberStandardId,
  LinkCalculationResult,
  LinkParameters,
  OtdrEvent,
  SplitterSpec,
  TracePoint,
  WavelengthNm,
} from '../types/fiber';

export const FIBER_STANDARDS: Record<FiberStandardId, FiberStandard> = {
  g652d: {
    id: 'g652d',
    name: 'ITU-T G.652.D (Standard Single-Mode SMF-28)',
    type: 'Single-Mode',
    coreDiameterUm: 9.0,
    claddingDiameterUm: 125.0,
    description: 'Universal standard single-mode fiber with zero water peak. Backbone & metro networks.',
    nominalAttenuation: {
      1310: 0.35,
      1490: 0.25,
      1550: 0.20,
      1625: 0.23,
      850: 2.50, // Not typically used
    },
    dispersionPsNmKm: 17.0, // at 1550nm
    typicalMinBendRadiusMm: 30.0,
  },
  g657a1: {
    id: 'g657a1',
    name: 'ITU-T G.657.A1 (Bend-Insensitive SMF)',
    type: 'Single-Mode',
    coreDiameterUm: 9.0,
    claddingDiameterUm: 125.0,
    description: 'Bend-loss insensitive single-mode fiber, backwards compatible with G.652.D.',
    nominalAttenuation: {
      1310: 0.35,
      1490: 0.25,
      1550: 0.21,
      1625: 0.24,
      850: 2.50,
    },
    dispersionPsNmKm: 17.0,
    typicalMinBendRadiusMm: 10.0,
  },
  g657a2: {
    id: 'g657a2',
    name: 'ITU-T G.657.A2 / B2 (Ultra Bend-Insensitive SMF)',
    type: 'Single-Mode',
    coreDiameterUm: 8.6,
    claddingDiameterUm: 125.0,
    description: 'High bend tolerance for FTTH building risers and dense drop cables.',
    nominalAttenuation: {
      1310: 0.36,
      1490: 0.26,
      1550: 0.22,
      1625: 0.25,
      850: 2.50,
    },
    dispersionPsNmKm: 17.0,
    typicalMinBendRadiusMm: 7.5,
  },
  g655: {
    id: 'g655',
    name: 'ITU-T G.655 (Non-Zero Dispersion-Shifted NZDSF)',
    type: 'Single-Mode',
    coreDiameterUm: 8.4,
    claddingDiameterUm: 125.0,
    description: 'Optimized for long-haul DWDM to suppress Four-Wave Mixing (FWM).',
    nominalAttenuation: {
      1310: 0.40,
      1490: 0.26,
      1550: 0.21,
      1625: 0.24,
      850: 2.60,
    },
    dispersionPsNmKm: 4.5,
    typicalMinBendRadiusMm: 30.0,
  },
  om3: {
    id: 'om3',
    name: 'ISO/IEC OM3 (Laser-Optimized 50/125 MMF)',
    type: 'Multi-Mode',
    coreDiameterUm: 50.0,
    claddingDiameterUm: 125.0,
    description: 'Aqua jacket multimode fiber for 10GbE up to 300m with 850nm VCSEL.',
    nominalAttenuation: {
      850: 2.8,
      1310: 0.8,
      1490: 1.5,
      1550: 1.8,
      1625: 2.0,
    },
    dispersionPsNmKm: 0,
    typicalMinBendRadiusMm: 15.0,
  },
  om4: {
    id: 'om4',
    name: 'ISO/IEC OM4 (High-Bandwidth 50/125 MMF)',
    type: 'Multi-Mode',
    coreDiameterUm: 50.0,
    claddingDiameterUm: 125.0,
    description: 'Erika violet/aqua multimode fiber for 40G/100G data centers up to 550m.',
    nominalAttenuation: {
      850: 2.5,
      1310: 0.7,
      1490: 1.4,
      1550: 1.7,
      1625: 1.9,
    },
    dispersionPsNmKm: 0,
    typicalMinBendRadiusMm: 15.0,
  },
  om5: {
    id: 'om5',
    name: 'ISO/IEC OM5 (Wideband MMF 850-953nm)',
    type: 'Multi-Mode',
    coreDiameterUm: 50.0,
    claddingDiameterUm: 125.0,
    description: 'Lime green jacket wideband fiber optimized for SWDM (Short Wavelength Division Multiplexing).',
    nominalAttenuation: {
      850: 2.4,
      1310: 0.7,
      1490: 1.4,
      1550: 1.7,
      1625: 1.9,
    },
    dispersionPsNmKm: 0,
    typicalMinBendRadiusMm: 15.0,
  },
};

export const CONNECTOR_SPECS: ConnectorSpec[] = [
  {
    id: 'sc_apc',
    name: 'SC/APC (8° Angled Physical Contact)',
    polish: 'APC',
    typicalLossDb: 0.25,
    returnLossDb: -65,
    colorCode: '#10b981', // Green
  },
  {
    id: 'lc_apc',
    name: 'LC/APC (8° Angled Small Form)',
    polish: 'APC',
    typicalLossDb: 0.20,
    returnLossDb: -65,
    colorCode: '#10b981', // Green
  },
  {
    id: 'sc_upc',
    name: 'SC/UPC (Ultra Physical Contact)',
    polish: 'UPC',
    typicalLossDb: 0.25,
    returnLossDb: -50,
    colorCode: '#0284c7', // Blue
  },
  {
    id: 'lc_upc',
    name: 'LC/UPC (Ultra Physical Contact)',
    polish: 'UPC',
    typicalLossDb: 0.20,
    returnLossDb: -50,
    colorCode: '#0284c7', // Blue
  },
  {
    id: 'fc_upc',
    name: 'FC/UPC (Threaded Metal Barrel)',
    polish: 'UPC',
    typicalLossDb: 0.30,
    returnLossDb: -50,
    colorCode: '#94a3b8', // Metallic
  },
  {
    id: 'st_upc',
    name: 'ST/UPC (Bayonet Twist Lock)',
    polish: 'UPC',
    typicalLossDb: 0.35,
    returnLossDb: -45,
    colorCode: '#cbd5e1', // Metallic
  },
  {
    id: 'mpo_12',
    name: 'MPO/MTP-12 (Multi-Fiber Push-On)',
    polish: 'APC',
    typicalLossDb: 0.35,
    returnLossDb: -60,
    colorCode: '#eab308', // Yellow/Aqua
  },
];

export const SPLITTER_SPECS: SplitterSpec[] = [
  { id: 'none', ratio: 'None (Point-to-Point Direct Link)', typicalLossDb: 0.0, maxLossDb: 0.0 },
  { id: '1:2', ratio: '1:2 PLC Splitter', typicalLossDb: 3.5, maxLossDb: 3.8 },
  { id: '1:4', ratio: '1:4 PLC Splitter', typicalLossDb: 7.2, maxLossDb: 7.5 },
  { id: '1:8', ratio: '1:8 PLC Splitter', typicalLossDb: 10.5, maxLossDb: 10.8 },
  { id: '1:16', ratio: '1:16 PLC Splitter', typicalLossDb: 13.8, maxLossDb: 14.1 },
  { id: '1:32', ratio: '1:32 PLC Splitter (Standard GPON ODN)', typicalLossDb: 17.0, maxLossDb: 17.4 },
  { id: '1:64', ratio: '1:64 PLC Splitter (High-Density XGS-PON)', typicalLossDb: 20.5, maxLossDb: 21.0 },
];

export const TIA_598_COLORS: FiberColorSpec[] = [
  { number: 1, name: 'Blue', hex: '#2563eb', textClass: 'text-blue-400', borderClass: 'border-blue-500' },
  { number: 2, name: 'Orange', hex: '#f97316', textClass: 'text-orange-400', borderClass: 'border-orange-500' },
  { number: 3, name: 'Green', hex: '#16a34a', textClass: 'text-emerald-400', borderClass: 'border-emerald-500' },
  { number: 4, name: 'Brown', hex: '#854d0e', textClass: 'text-amber-700', borderClass: 'border-amber-700' },
  { number: 5, name: 'Slate', hex: '#64748b', textClass: 'text-slate-400', borderClass: 'border-slate-500' },
  { number: 6, name: 'White', hex: '#f8fafc', textClass: 'text-slate-100', borderClass: 'border-slate-300' },
  { number: 7, name: 'Red', hex: '#dc2626', textClass: 'text-red-400', borderClass: 'border-red-500' },
  { number: 8, name: 'Black', hex: '#0f172a', textClass: 'text-slate-400', borderClass: 'border-slate-800' },
  { number: 9, name: 'Yellow', hex: '#eab308', textClass: 'text-yellow-400', borderClass: 'border-yellow-500' },
  { number: 10, name: 'Violet', hex: '#9333ea', textClass: 'text-purple-400', borderClass: 'border-purple-500' },
  { number: 11, name: 'Rose', hex: '#ec4899', textClass: 'text-pink-400', borderClass: 'border-pink-500' },
  { number: 12, name: 'Aqua', hex: '#06b6d4', textClass: 'text-cyan-400', borderClass: 'border-cyan-500' },
];

export const IEC_60304_COLORS: FiberColorSpec[] = [
  { number: 1, name: 'Red', hex: '#dc2626', textClass: 'text-red-400', borderClass: 'border-red-500' },
  { number: 2, name: 'Green', hex: '#16a34a', textClass: 'text-emerald-400', borderClass: 'border-emerald-500' },
  { number: 3, name: 'Blue', hex: '#2563eb', textClass: 'text-blue-400', borderClass: 'border-blue-500' },
  { number: 4, name: 'Yellow', hex: '#eab308', textClass: 'text-yellow-400', borderClass: 'border-yellow-500' },
  { number: 5, name: 'White', hex: '#f8fafc', textClass: 'text-slate-100', borderClass: 'border-slate-300' },
  { number: 6, name: 'Grey', hex: '#64748b', textClass: 'text-slate-400', borderClass: 'border-slate-500' },
  { number: 7, name: 'Brown', hex: '#854d0e', textClass: 'text-amber-700', borderClass: 'border-amber-700' },
  { number: 8, name: 'Violet', hex: '#9333ea', textClass: 'text-purple-400', borderClass: 'border-purple-500' },
  { number: 9, name: 'Aqua', hex: '#06b6d4', textClass: 'text-cyan-400', borderClass: 'border-cyan-500' },
  { number: 10, name: 'Orange', hex: '#f97316', textClass: 'text-orange-400', borderClass: 'border-orange-500' },
  { number: 11, name: 'Pink', hex: '#ec4899', textClass: 'text-pink-400', borderClass: 'border-pink-500' },
  { number: 12, name: 'Black', hex: '#0f172a', textClass: 'text-slate-400', borderClass: 'border-slate-800' },
];

/**
 * Calculates optical link budget according to ITU-T G.957 & TIA/EIA-526-14-A
 */
export function calculateLinkLoss(params: LinkParameters): LinkCalculationResult {
  const standard = FIBER_STANDARDS[params.fiberStandardId] || FIBER_STANDARDS.g652d;
  const attenuationRate = standard.nominalAttenuation[params.wavelengthNm] ?? 0.35;
  const fiberLoss = Number((params.lengthKm * attenuationRate).toFixed(3));

  const spliceLoss = Number(
    (params.fusionSplices * params.fusionSpliceLossDb + params.mechanicalSplices * params.mechanicalSpliceLossDb).toFixed(3)
  );

  const connectorSpec = CONNECTOR_SPECS.find((c) => c.id === params.connectorTypeId) || CONNECTOR_SPECS[0];
  const connectorLoss = Number((params.connectorPairs * connectorSpec.typicalLossDb).toFixed(3));

  const splitterSpec = SPLITTER_SPECS.find((s) => s.id === params.splitterRatioId) || SPLITTER_SPECS[0];
  const splitterLoss = splitterSpec.typicalLossDb;

  const totalLinkLoss = Number((fiberLoss + spliceLoss + connectorLoss + splitterLoss + params.systemMarginDb).toFixed(3));

  // Actual received power without safety margin
  const receivedPower = Number((params.txPowerDbm - (fiberLoss + spliceLoss + connectorLoss + splitterLoss)).toFixed(3));

  // Optical Power Margin = Received Power (including margin allocation) - Rx Sensitivity
  const opticalPowerMargin = Number((receivedPower - params.systemMarginDb - params.rxSensitivityDbm).toFixed(3));

  // Maximum allowed loss before sensitivity limit
  const maxAllowedLoss = Number((params.txPowerDbm - params.rxSensitivityDbm).toFixed(3));

  // Total Chromatic Dispersion = D * L * spectral width or simple D * L
  const dispersion = Number(((standard.dispersionPsNmKm || 0) * params.lengthKm).toFixed(1));

  let status: 'PASS' | 'MARGINAL' | 'FAIL' = 'PASS';
  let statusReason = 'Link loss is well within the dynamic optical range and power budget.';

  if (receivedPower > params.rxSaturationDbm) {
    status = 'FAIL';
    statusReason = `Receiver Saturation Warning: Received power (${receivedPower} dBm) exceeds damage threshold (${params.rxSaturationDbm} dBm). Attenuator required!`;
  } else if (opticalPowerMargin < 0) {
    status = 'FAIL';
    statusReason = `Budget Deficit: Insufficient optical power. Total link loss exceeds available optical power budget by ${Math.abs(opticalPowerMargin)} dB.`;
  } else if (opticalPowerMargin < 2.0) {
    status = 'MARGINAL';
    statusReason = `Marginal Headroom: Available optical power margin (${opticalPowerMargin} dB) is under recommended 3.0 dB ITU-T system safety margin.`;
  }

  return {
    fiberLossDb: fiberLoss,
    spliceLossDb: spliceLoss,
    connectorLossDb: connectorLoss,
    splitterLossDb: splitterLoss,
    marginDb: params.systemMarginDb,
    totalLinkLossDb: totalLinkLoss,
    maxAllowedLossDb: maxAllowedLoss,
    receivedPowerDbm: receivedPower,
    opticalPowerMarginDb: opticalPowerMargin,
    status,
    statusReason,
    attenuationRateDbKm: attenuationRate,
    dispersionPs: dispersion,
  };
}

/**
 * Decodes fiber core and buffer tube numbers according to TIA-598-C or IEC-60304 standards
 */
export function decodeFiberCore(
  coreNumber: number,
  totalCores: number = 72,
  fibersPerTube: number = 12,
  standard: 'TIA-598-C' | 'IEC-60304' = 'TIA-598-C'
): ColorDecodingResult {
  const safeCore = Math.max(1, Math.min(totalCores, Math.floor(coreNumber)));
  const colorPalette = standard === 'TIA-598-C' ? TIA_598_COLORS : IEC_60304_COLORS;

  const tubeIndex = Math.floor((safeCore - 1) / fibersPerTube);
  const tubeNumber = tubeIndex + 1;

  const fiberInTubeNumber = ((safeCore - 1) % fibersPerTube) + 1;

  const tubeColor = colorPalette[tubeIndex % 12];
  const fiberColor = colorPalette[(fiberInTubeNumber - 1) % 12];

  // Splice tray assignment (typically 12 or 24 fibers per tray)
  const trayNumber = Math.floor((safeCore - 1) / 12) + 1;
  const traySlot = ((safeCore - 1) % 12) + 1;

  return {
    coreNumber: safeCore,
    totalCores,
    fibersPerTube,
    tubeNumber,
    tubeColor,
    fiberInTubeNumber,
    fiberColor,
    trayNumber,
    traySlot,
    standard,
  };
}

/**
 * Generates an OTDR trace curve for given parameters & events
 */
export function generateOtdrTracePoints(
  totalLengthKm: number,
  attenuationDbKm: number,
  events: OtdrEvent[],
  samples: number = 250,
  wavelength: number = 1550
): TracePoint[] {
  const points: TracePoint[] = [];
  const startPower = 0.0; // Normalized 0 dB at front panel
  const noiseFloor = -48.0; // dB

  // Sort events by distance
  const sortedEvents = [...events].sort((a, b) => a.distanceKm - b.distanceKm);

  for (let i = 0; i <= samples; i++) {
    const d = (i / samples) * (totalLengthKm * 1.15); // Show slightly past fiber end

    if (d > totalLengthKm) {
      // Past end of fiber: noise floor
      const noise = (Math.random() - 0.5) * 0.8;
      points.push({ distanceKm: Number(d.toFixed(3)), powerDb: Number((noiseFloor + noise).toFixed(2)) });
      continue;
    }

    // Baseline Rayleigh backscattering slope: P(d) = P0 - (alpha * d)
    let currentPower = startPower - (attenuationDbKm * d);

    // Apply loss and Fresnel reflection from events encountered so far
    for (const ev of sortedEvents) {
      const eventLoss = (wavelength === 1550 || wavelength === 1625) && ev.wavelengthDependent && ev.lossAt1550Db !== undefined
        ? ev.lossAt1550Db
        : ev.lossDb;

      const distDiff = Math.abs(d - ev.distanceKm);

      // Event Dead Zone Fresnel Peak simulation
      if (distDiff < 0.08) {
        if (ev.type === 'launch_connector' || ev.type === 'connector_pair' || ev.type === 'fiber_end' || ev.type === 'fiber_cut') {
          const peakHeight = Math.max(3.0, 18.0 - Math.abs(ev.reflectanceDb || -45) * 0.25);
          const gaussian = Math.exp(-Math.pow(distDiff / 0.025, 2));
          currentPower += peakHeight * gaussian;
        }
      }

      // Step loss after event
      if (d >= ev.distanceKm) {
        currentPower -= eventLoss;
      }
    }

    // Add subtle backscatter noise (heterodyne Rayleigh speckle)
    const speckle = (Math.random() - 0.5) * 0.12;
    currentPower += speckle;

    points.push({
      distanceKm: Number(d.toFixed(3)),
      powerDb: Number(Math.max(noiseFloor, currentPower).toFixed(2)),
    });
  }

  return points;
}

export const CWDM_CHANNELS: CwdmChannel[] = [
  { channel: 1, wavelengthNm: 1270, band: 'O-Band (Original)', frequencyThz: 236.06, waterPeakRisk: false },
  { channel: 2, wavelengthNm: 1290, band: 'O-Band (Original)', frequencyThz: 232.40, waterPeakRisk: false },
  { channel: 3, wavelengthNm: 1310, band: 'O-Band (Original)', frequencyThz: 228.85, waterPeakRisk: false },
  { channel: 4, wavelengthNm: 1330, band: 'O-Band (Original)', frequencyThz: 225.41, waterPeakRisk: false },
  { channel: 5, wavelengthNm: 1350, band: 'O-Band (Original)', frequencyThz: 222.07, waterPeakRisk: false },
  { channel: 6, wavelengthNm: 1370, band: 'E-Band (Extended)', frequencyThz: 218.83, waterPeakRisk: true },
  { channel: 7, wavelengthNm: 1390, band: 'E-Band (Extended)', frequencyThz: 215.68, waterPeakRisk: true },
  { channel: 8, wavelengthNm: 1410, band: 'E-Band (Extended)', frequencyThz: 212.62, waterPeakRisk: true },
  { channel: 9, wavelengthNm: 1430, band: 'E-Band (Extended)', frequencyThz: 209.65, waterPeakRisk: false },
  { channel: 10, wavelengthNm: 1450, band: 'E-Band (Extended)', frequencyThz: 206.75, waterPeakRisk: false },
  { channel: 11, wavelengthNm: 1470, band: 'S-Band (Short)', frequencyThz: 203.94, waterPeakRisk: false },
  { channel: 12, wavelengthNm: 1490, band: 'S-Band (Short)', frequencyThz: 201.20, waterPeakRisk: false },
  { channel: 13, wavelengthNm: 1510, band: 'S-Band (Short)', frequencyThz: 198.54, waterPeakRisk: false },
  { channel: 14, wavelengthNm: 1530, band: 'C-Band (Conventional)', frequencyThz: 195.94, waterPeakRisk: false },
  { channel: 15, wavelengthNm: 1550, band: 'C-Band (Conventional)', frequencyThz: 193.41, waterPeakRisk: false },
  { channel: 16, wavelengthNm: 1570, band: 'L-Band (Long)', frequencyThz: 190.95, waterPeakRisk: false },
  { channel: 17, wavelengthNm: 1590, band: 'L-Band (Long)', frequencyThz: 188.55, waterPeakRisk: false },
  { channel: 18, wavelengthNm: 1610, band: 'L-Band (Long)', frequencyThz: 186.21, waterPeakRisk: false },
];

export const DWDM_C_BAND_100GHZ: DwdmChannel[] = [
  { channel: 'C21', frequencyThz: 192.1, wavelengthNm: 1560.61, band: 'C-Band' },
  { channel: 'C22', frequencyThz: 192.2, wavelengthNm: 1559.79, band: 'C-Band' },
  { channel: 'C23', frequencyThz: 192.3, wavelengthNm: 1558.98, band: 'C-Band' },
  { channel: 'C24', frequencyThz: 192.4, wavelengthNm: 1558.17, band: 'C-Band' },
  { channel: 'C25', frequencyThz: 192.5, wavelengthNm: 1557.36, band: 'C-Band' },
  { channel: 'C26', frequencyThz: 192.6, wavelengthNm: 1556.55, band: 'C-Band' },
  { channel: 'C27', frequencyThz: 192.7, wavelengthNm: 1555.75, band: 'C-Band' },
  { channel: 'C28', frequencyThz: 192.8, wavelengthNm: 1554.94, band: 'C-Band' },
  { channel: 'C29', frequencyThz: 192.9, wavelengthNm: 1554.13, band: 'C-Band' },
  { channel: 'C30', frequencyThz: 193.0, wavelengthNm: 1553.33, band: 'C-Band' },
  { channel: 'C31', frequencyThz: 193.1, wavelengthNm: 1552.52, band: 'C-Band' },
  { channel: 'C32', frequencyThz: 193.2, wavelengthNm: 1551.72, band: 'C-Band' },
  { channel: 'C33', frequencyThz: 193.3, wavelengthNm: 1550.92, band: 'C-Band' },
  { channel: 'C34', frequencyThz: 193.4, wavelengthNm: 1550.12, band: 'C-Band' },
  { channel: 'C35', frequencyThz: 193.5, wavelengthNm: 1549.32, band: 'C-Band' },
  { channel: 'C36', frequencyThz: 193.6, wavelengthNm: 1548.51, band: 'C-Band' },
  { channel: 'C37', frequencyThz: 193.7, wavelengthNm: 1547.72, band: 'C-Band' },
  { channel: 'C38', frequencyThz: 193.8, wavelengthNm: 1546.92, band: 'C-Band' },
  { channel: 'C39', frequencyThz: 193.9, wavelengthNm: 1546.12, band: 'C-Band' },
  { channel: 'C40', frequencyThz: 194.0, wavelengthNm: 1545.32, band: 'C-Band' },
];

export const DIAGNOSTIC_GUIDES: DiagnosticGuide[] = [
  {
    id: 'macrobend_detection',
    title: 'Macrobend Identification (Wavelength Differential Loss)',
    symptom: 'Disproportionate loss at 1550nm or 1625nm compared to 1310nm (loss delta > 0.5 dB at the same point).',
    likelyCauses: [
      'Fiber pinched or bent under minimum bend radius in splice cassette/tray.',
      'Cable cinch zip-tie overtightened in telecom rack or distribution frame.',
      'Slack loop folded improperly in handhole or pedestal.',
    ],
    recommendedTool: 'OTDR',
    remediationSteps: [
      'Compare OTDR traces captured at 1310nm and 1550nm/1625nm.',
      'Identify the exact distance where the step loss disparity occurs.',
      'Open the splice enclosure or rack at that kilometer marker.',
      'Check fiber routing in tray and gently unloop tight bends (ensure radius >= 30mm for G.652.D).',
      'Replace zip-ties with hook-and-loop velcro ties.',
    ],
    severity: 'WARNING',
  },
  {
    id: 'dirty_connector_endface',
    title: 'High Insertion Loss & High Optical Return Loss (Reflectance)',
    symptom: 'Connector junction loss > 0.75 dB and ORL worse than -40 dB on OTDR.',
    likelyCauses: [
      'Dust particles, skin oils, or alcohol residue on ferrule endface.',
      'Scratches or pits in the core or cladding region (IEC 61300-3-35 failure).',
      'Uncapped patch cord left exposed in field.',
    ],
    recommendedTool: 'Fiber Scope (IEC 61300-3-35)',
    remediationSteps: [
      'Inspect ferrule endface using 200x/400x digital inspection scope.',
      'Perform dry clean using high-density lint-free one-click cleaner (single actuation).',
      'If oils persist, apply wet-to-dry cleaning using optical-grade solvent pen.',
      'Re-inspect: Verify Zone A (Core: 0-25µm) has zero scratches, pits, or contaminants.',
      'Always install protective dust caps immediately.',
    ],
    severity: 'WARNING',
  },
  {
    id: 'fiber_cut_break',
    title: 'Total Signal Loss / Fiber Severance',
    symptom: 'Optical power meter reads -40 dBm (Lo/Dark). Transceiver LOS alarm active.',
    likelyCauses: [
      'Excavation dig-up / civil works trench strike.',
      'Pole drop line snapped due to tree fall or vehicle collision.',
      'Rodent chew through non-armored underground conduit.',
    ],
    recommendedTool: 'OTDR',
    remediationSteps: [
      'Connect OTDR with 500m launch fiber spool to overcome near-end dead zone.',
      'Set range to cover the span and trigger high-resolution pulse (100ns).',
      'Locate the fiber end reflection peak or sudden drop to noise floor.',
      'Cross-reference the OTDR distance with Geographic GIS as-built fiber maps.',
      'Dispatch field emergency splice crew with fusion splicer, cleaver, and mechanical closure.',
    ],
    severity: 'CRITICAL',
  },
  {
    id: 'fusion_splicer_arc_drift',
    title: 'High Fusion Splice Loss (> 0.15 dB)',
    symptom: 'Fusion splicer reports high estimated loss (> 0.15 dB) or core offset alarm.',
    likelyCauses: [
      'Dirty V-grooves or optical objective lenses inside splicer.',
      'Worn electrodes (typically > 2,000 to 3,000 arcs).',
      'Fiber cleave angle exceeds 1.0 degree (dull cleaver blade).',
      'Mismatch between fiber types (e.g. G.652.D spliced to G.655 or MMF).',
    ],
    recommendedTool: 'Power Meter & Light Source',
    remediationSteps: [
      'Clean V-grooves and mirrors with isopropyl alcohol swab.',
      'Run Arc Calibration / Arc Test with test fibers to calibrate arc intensity for ambient temperature/pressure.',
      'Rotate fiber cleaver wheel to next sharp position (1-16 positions).',
      'Verify cleave angle < 0.5 degrees on splicer display before fusing.',
      'Replace electrodes if arc counter exceeds manufacturer limit.',
    ],
    severity: 'NOTICE',
  },
];

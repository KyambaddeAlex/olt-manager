export type FiberStandardId = 'g652d' | 'g657a1' | 'g657a2' | 'g655' | 'om3' | 'om4' | 'om5';

export interface FiberStandard {
  id: FiberStandardId;
  name: string;
  type: 'Single-Mode' | 'Multi-Mode';
  coreDiameterUm: number;
  claddingDiameterUm: number;
  description: string;
  nominalAttenuation: Record<number, number>; // wavelength -> dB/km
  dispersionPsNmKm?: number; // at 1550nm
  typicalMinBendRadiusMm: number;
}

export type WavelengthNm = 850 | 1310 | 1490 | 1550 | 1625;

export interface ConnectorSpec {
  id: string;
  name: string;
  polish: 'APC' | 'UPC' | 'PC';
  typicalLossDb: number;
  returnLossDb: number; // e.g. -65 for APC, -50 for UPC
  colorCode: string; // Green for APC, Blue for UPC
}

export interface SplitterSpec {
  id: string;
  ratio: string;
  typicalLossDb: number;
  maxLossDb: number;
}

export interface LinkParameters {
  lengthKm: number;
  fiberStandardId: FiberStandardId;
  wavelengthNm: WavelengthNm;
  fusionSplices: number;
  fusionSpliceLossDb: number;
  mechanicalSplices: number;
  mechanicalSpliceLossDb: number;
  connectorPairs: number;
  connectorTypeId: string;
  splitterRatioId: string;
  systemMarginDb: number;
  txPowerDbm: number;
  rxSensitivityDbm: number;
  rxSaturationDbm: number;
}

export interface LinkCalculationResult {
  fiberLossDb: number;
  spliceLossDb: number;
  connectorLossDb: number;
  splitterLossDb: number;
  marginDb: number;
  totalLinkLossDb: number;
  maxAllowedLossDb: number;
  receivedPowerDbm: number;
  opticalPowerMarginDb: number;
  status: 'PASS' | 'MARGINAL' | 'FAIL';
  statusReason: string;
  attenuationRateDbKm: number;
  dispersionPs: number;
}

export type OtdrEventType =
  | 'launch_connector'
  | 'fusion_splice'
  | 'mechanical_splice'
  | 'connector_pair'
  | 'macrobend'
  | 'fiber_end'
  | 'fiber_cut';

export interface OtdrEvent {
  id: string;
  distanceKm: number;
  type: OtdrEventType;
  lossDb: number;
  reflectanceDb?: number; // e.g. -45 dB
  cumulativeLossDb: number;
  notes?: string;
  wavelengthDependent?: boolean; // macrobends lose significantly more at 1550/1625 than 1310
  lossAt1550Db?: number;
}

export interface TracePoint {
  distanceKm: number;
  powerDb: number;
}

export interface FiberColorSpec {
  number: number;
  name: string;
  hex: string;
  textClass: string;
  borderClass: string;
}

export interface ColorDecodingResult {
  coreNumber: number;
  totalCores: number;
  fibersPerTube: number;
  tubeNumber: number;
  tubeColor: FiberColorSpec;
  fiberInTubeNumber: number;
  fiberColor: FiberColorSpec;
  trayNumber: number;
  traySlot: number;
  standard: 'TIA-598-C' | 'IEC-60304';
}

export interface CwdmChannel {
  channel: number;
  wavelengthNm: number;
  band: string;
  frequencyThz: number;
  waterPeakRisk: boolean;
}

export interface DwdmChannel {
  channel: string;
  frequencyThz: number;
  wavelengthNm: number;
  band: string;
}

export interface DiagnosticGuide {
  id: string;
  title: string;
  symptom: string;
  likelyCauses: string[];
  recommendedTool: 'OTDR' | 'Power Meter & Light Source' | 'VFL (Visual Fault Locator)' | 'Fiber Scope (IEC 61300-3-35)';
  remediationSteps: string[];
  severity: 'CRITICAL' | 'WARNING' | 'NOTICE';
}

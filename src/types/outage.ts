import { OltSiteId, PortRecord } from './olt';

export type BreakSeverity = 'CRITICAL_CUT' | 'HIGH_LOSS_BEND' | 'DEGRADED_SPLICE' | 'INTERMITTENT';

export interface FiberWaypoint {
  id: string;
  name: string;
  type: 'OLT' | 'MANHOLE' | 'POLE' | 'HANDHOLE' | 'SPLICE_CLOSURE' | 'FAT' | 'ODF';
  lat: number;
  lng: number;
  cumulativeDistanceMeters: number;
  notes?: string;
}

export interface CableBreakIncident {
  id: string;
  siteId: OltSiteId;
  boardNumber: number;
  portNumber: number;
  coreId: string;
  severity: BreakSeverity;
  faultDistanceMeters: number; // Optical distance from OLT
  opticalRefractiveIndex: number; // Standard ITU-T G.652.D SMF = 1.4682
  slackFactorPercent: number; // e.g. 5% extra optical length in slack loops
  estimatedCoordinates: {
    lat: number;
    lng: number;
    accuracyMeters: number;
  };
  nearestAsset: {
    name: string;
    type: string;
    distanceMeters: number;
    direction: 'TOWARDS_OLT' | 'TOWARDS_CUSTOMER' | 'AT_ASSET';
  };
  suspectedCause: string;
  affectedCustomersCount: number;
  affectedCircuits: string[];
  reportedTime: string;
  status: 'INVESTIGATING' | 'DISPATCHED' | 'SPLICING' | 'RESOLVED';
  remediationPlan: string[];
}

export interface BreakSimulationScenario {
  id: string;
  title: string;
  siteId: OltSiteId;
  boardNumber: number;
  portNumber: number;
  coreId: string;
  targetLocation: string;
  faultDistanceMeters: number;
  severity: BreakSeverity;
  suspectedCause: string;
  description: string;
}

import { FiberWaypoint, CableBreakIncident, BreakSeverity } from '../types/outage';
import { OltSite, PortRecord } from '../types/olt';
import { calculateDistanceMeters } from './oltValidation';

export const ITU_G652D_REFRACTIVE_INDEX = 1.4682;
export const SPEED_OF_LIGHT_MS = 299792458; // m/s

/**
 * Calculates one-way optical distance from OTDR pulse round-trip transit time (nanoseconds)
 * Formula: d = (c * delta_t) / (2 * n)
 */
export function calculateOtdrDistanceMeters(
  roundTripTimeNs: number,
  refractiveIndex: number = ITU_G652D_REFRACTIVE_INDEX
): number {
  if (roundTripTimeNs <= 0) return 0;
  const timeSeconds = roundTripTimeNs * 1e-9;
  const distance = (SPEED_OF_LIGHT_MS * timeSeconds) / (2 * refractiveIndex);
  return Number(distance.toFixed(1));
}

/**
 * Converts measured optical fiber distance to estimated physical ground/trench distance
 * by accounting for cable helix / slack coils (typically 5% to 8% in telecom distribution).
 */
export function opticalToPhysicalDistance(opticalMeters: number, slackFactorPercent: number = 5): number {
  const factor = 1 + slackFactorPercent / 100;
  return Number((opticalMeters / factor).toFixed(1));
}

/**
 * Interpolates geographic GPS coordinate along a line or waypoint path
 * given distance from start.
 */
export function interpolateRouteCoordinates(
  startLat: number,
  startLng: number,
  endLat: number,
  endLng: number,
  opticalBreakDistanceMeters: number,
  totalSpanMeters: number,
  slackFactorPercent: number = 5
): { lat: number; lng: number; physicalDistanceMeters: number } {
  const physicalDistance = opticalToPhysicalDistance(opticalBreakDistanceMeters, slackFactorPercent);

  // If total span is zero or invalid, return start
  if (totalSpanMeters <= 0) {
    return { lat: startLat, lng: startLng, physicalDistanceMeters: 0 };
  }

  // Fraction along the route (clamped between 0 and 1)
  const ratio = Math.max(0, Math.min(1, physicalDistance / totalSpanMeters));

  const lat = startLat + ratio * (endLat - startLat);
  const lng = startLng + ratio * (endLng - startLng);

  return {
    lat: Number(lat.toFixed(6)),
    lng: Number(lng.toFixed(6)),
    physicalDistanceMeters: physicalDistance,
  };
}

/**
 * Generates synthetic intermediate waypoints (manholes, handholes, poles)
 * along a cable span between OLT and FAT location.
 */
export function generateSpanWaypoints(
  site: OltSite,
  record: PortRecord
): FiberWaypoint[] {
  const totalMeters = calculateDistanceMeters(
    site.baseCoordinates.lat,
    site.baseCoordinates.lng,
    record.coordinates.lat,
    record.coordinates.lng
  );

  const waypoints: FiberWaypoint[] = [
    {
      id: `wp_${site.id}_olt`,
      name: `${site.name} Central Office ODF Rack`,
      type: 'OLT',
      lat: site.baseCoordinates.lat,
      lng: site.baseCoordinates.lng,
      cumulativeDistanceMeters: 0,
      notes: 'Optical Line Terminal Main Distribution Frame',
    },
  ];

  // If span is more than 300 meters, create intermediate handholes/manholes
  const stepCount = Math.max(1, Math.min(6, Math.floor(totalMeters / 400)));
  for (let i = 1; i <= stepCount; i++) {
    const fraction = i / (stepCount + 1);
    const lat = site.baseCoordinates.lat + fraction * (record.coordinates.lat - site.baseCoordinates.lat);
    const lng = site.baseCoordinates.lng + fraction * (record.coordinates.lng - site.baseCoordinates.lng);
    const dist = Math.round(fraction * totalMeters);

    const isManhole = i % 2 === 1;
    waypoints.push({
      id: `wp_${site.code}_hh_${i}`,
      name: isManhole ? `Manhole MH-0${i} (${site.code} Route)` : `Handhole HH-0${i} (Slack Coil 30m)`,
      type: isManhole ? 'MANHOLE' : 'HANDHOLE',
      lat: Number(lat.toFixed(6)),
      lng: Number(lng.toFixed(6)),
      cumulativeDistanceMeters: dist,
      notes: isManhole ? 'Underground concrete utility vault' : 'Pedestal roadside fiber closure with slack loop',
    });
  }

  // Final destination FAT/ODF
  waypoints.push({
    id: `wp_${record.id}_end`,
    name: record.locationName,
    type: 'FAT',
    lat: record.coordinates.lat,
    lng: record.coordinates.lng,
    cumulativeDistanceMeters: totalMeters,
    notes: `Splitter cabinet (${record.splitRatio})`,
  });

  return waypoints;
}

/**
 * Identifies the nearest physical asset / landmark to the estimated break
 */
export function findNearestAssetToBreak(
  breakPhysicalMeters: number,
  waypoints: FiberWaypoint[]
): {
  asset: FiberWaypoint;
  distanceDeltaMeters: number;
  direction: 'TOWARDS_OLT' | 'TOWARDS_CUSTOMER' | 'AT_ASSET';
  description: string;
} {
  if (waypoints.length === 0) {
    throw new Error('No waypoints provided');
  }

  let nearest = waypoints[0];
  let minDiff = Math.abs(breakPhysicalMeters - nearest.cumulativeDistanceMeters);

  for (const wp of waypoints) {
    const diff = Math.abs(breakPhysicalMeters - wp.cumulativeDistanceMeters);
    if (diff < minDiff) {
      minDiff = diff;
      nearest = wp;
    }
  }

  let direction: 'TOWARDS_OLT' | 'TOWARDS_CUSTOMER' | 'AT_ASSET' = 'AT_ASSET';
  let description = `Directly at ${nearest.name}`;

  const delta = Math.round(breakPhysicalMeters - nearest.cumulativeDistanceMeters);

  if (Math.abs(delta) < 5) {
    direction = 'AT_ASSET';
    description = `Within 5m of ${nearest.name}`;
  } else if (delta > 0) {
    direction = 'TOWARDS_CUSTOMER';
    description = `${delta}m past ${nearest.name} (heading toward customer closure)`;
  } else {
    direction = 'TOWARDS_OLT';
    description = `${Math.abs(delta)}m before ${nearest.name} (closer to OLT Central Office)`;
  }

  return {
    asset: nearest,
    distanceDeltaMeters: Math.abs(delta),
    direction,
    description,
  };
}

/**
 * Estimates number of affected subscribers and circuits based on port split ratio
 */
export function estimateAffectedSubscribers(splitRatio: string): number {
  if (splitRatio === '1:128') return 128;
  if (splitRatio === '1:64') return 64;
  if (splitRatio === '1:32') return 32;
  if (splitRatio === '1:16') return 16;
  if (splitRatio === '1:8') return 8;
  if (splitRatio === '1:4') return 4;
  if (splitRatio === '1:2') return 2;
  return 1; // Direct point to point circuit
}

/**
 * Synthesizes an emergency diagnostic and remediation plan based on break severity and distance
 */
export function generateRemediationPlan(
  severity: BreakSeverity,
  distanceMeters: number,
  locationDescription: string
): string[] {
  const km = (distanceMeters / 1000).toFixed(2);

  if (severity === 'CRITICAL_CUT') {
    return [
      `Dispatch mobile optical emergency splice van to km ${km} marker near ${locationDescription}.`,
      'Deploy VFL (Visual Fault Locator, 650nm Red Laser) at nearest handhole to confirm break point visually.',
      'Check local municipal civil works permits for road excavation, trenching, or water/power line strikes in that radius.',
      'Prepare 48/96-fiber mechanical inline closure, fiber cleaver (<0.5° angle), and arc fusion splicer.',
      'Verify fiber core TIA-598 color code alignment before fusing buffer tubes.',
      'Re-run OTDR bidirectional trace at 1310nm and 1550nm to ensure splice loss < 0.05 dB across all pairs.',
    ];
  }

  if (severity === 'HIGH_LOSS_BEND') {
    return [
      `Inspect cable routing cassette and slack coil at km ${km} marker near ${locationDescription}.`,
      'Open pedestal enclosure and inspect fiber buffer tubes for pinching, zip-tie overtightening, or minimum bend radius violation (< 30mm for G.652.D).',
      'Compare OTDR trace: macrobend loss at 1550nm/1625nm is typically 1.5–4.0 dB higher than at 1310nm.',
      'Loosen cable ties, gently unbend the kinked buffer tube, and replace zip-ties with hook-and-loop velcro wraps.',
      'Confirm Rx power returns to nominal range (-18 to -22 dBm) on OLT telemetry.',
    ];
  }

  return [
    `Perform OTDR trace validation and clean connector ferrule at ${locationDescription}.`,
    'Inspect ferrule endface with digital inspection probe (IEC 61300-3-35).',
    'Dry clean optical bulkhead and patch cord with single-actuation one-click cleaner.',
  ];
}

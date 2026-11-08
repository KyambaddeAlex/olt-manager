import { OLT_SITES } from '../data/oltSites';
import { OltSiteId, PortRecord } from '../types/olt';

function parseCoordinates(value: unknown, fallback: { lat: number; lng: number }) {
  if (typeof value !== 'string') return { lat: fallback.lat, lng: fallback.lng, source: 'DEFAULT' as const };
  const matches = value.match(/-?\d+(?:\.\d+)?/g);
  if (!matches || matches.length < 2) return { lat: fallback.lat, lng: fallback.lng, source: 'DEFAULT' as const };
  const lat = Number(matches[0]);
  const lng = Number(matches[1]);
  if (!Number.isFinite(lat) || !Number.isFinite(lng) || Math.abs(lat) > 90 || Math.abs(lng) > 180) {
    return { lat: fallback.lat, lng: fallback.lng, source: 'DEFAULT' as const };
  }
  return { lat, lng, source: 'MANUAL' as const };
}

export function normalizeLegacyRecords(siteId: OltSiteId, data: unknown): PortRecord[] {
  const site = OLT_SITES.find((item) => item.id === siteId);
  if (!site || !data || typeof data !== 'object') return [];
  return Object.entries(data as Record<string, Record<string, unknown>>).flatMap<PortRecord>(([id, value]) => {
    const boardNumber = Number(value.board);
    const portNumber = Number(value.port);
    if (!Number.isInteger(boardNumber) || !Number.isInteger(portNumber)) return [];
    const coordinates = parseCoordinates(value.coordinates, site.baseCoordinates);
    const timestamp = typeof value.lastUpdate === 'string' ? value.lastUpdate : new Date(0).toISOString();
    return [{
      id,
      siteId,
      boardNumber,
      portNumber,
      coreId: typeof value.coreId === 'string' ? value.coreId : '',
      locationName: typeof value.locationName === 'string' ? value.locationName : 'Location not recorded',
      coordinates,
      status: 'ACTIVE',
      ponType: 'GPON',
      splitRatio: '1:32',
      technicianName: typeof value.technicianName === 'string' ? value.technicianName : undefined,
      notes: typeof value.notes === 'string' ? value.notes : undefined,
      lastUpdated: timestamp,
    }];
  });
}

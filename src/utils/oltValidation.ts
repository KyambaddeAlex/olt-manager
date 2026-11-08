import { OltValidationErrors, PortRecord, SiteStatistics } from '../types/olt';

export function getFiberCoreNumberForPort(boardNumber: number, portNumber: number): number {
  return (boardNumber - 1) * 16 + portNumber + 1;
}

export interface RecordValidationInput {
  boardNumber: number | string;
  portNumber: number | string;
  coreId: string;
  locationName: string;
  lat: number | string;
  lng: number | string;
  opticalPowerRxDbm?: number | string;
  opticalPowerTxDbm?: number | string;
}

export function validateOltRecordInput(input: RecordValidationInput): {
  isValid: boolean;
  errors: OltValidationErrors;
  sanitized?: {
    boardNumber: number;
    portNumber: number;
    coreId: string;
    coreNumber?: number;
    locationName: string;
    lat: number;
    lng: number;
    opticalPowerRxDbm?: number;
    opticalPowerTxDbm?: number;
  };
} {
  const errors: OltValidationErrors = {};

  // Board Validation: 1 to 8
  const boardNum = typeof input.boardNumber === 'string' ? parseInt(input.boardNumber, 10) : input.boardNumber;
  if (isNaN(boardNum) || !Number.isInteger(boardNum)) {
    errors.boardNumber = 'Board number must be an integer between 1 and 8.';
  } else if (boardNum < 1 || boardNum > 8) {
    errors.boardNumber = 'OLT subrack only has boards 1 through 8.';
  }

  // Port Validation: 0 to 15
  const portNum = typeof input.portNumber === 'string' ? parseInt(input.portNumber, 10) : input.portNumber;
  if (isNaN(portNum) || !Number.isInteger(portNum)) {
    errors.portNumber = 'Port number must be an integer between 0 and 15.';
  } else if (portNum < 0 || portNum > 15) {
    errors.portNumber = 'PON line card has 16 ports numbered 0 through 15.';
  }

  // Core ID Validation
  const trimmedCoreId = (input.coreId || '').trim();
  if (!trimmedCoreId) {
    errors.coreId = 'Fiber Core ID is required (e.g., Core 01 or C-24).';
  } else if (trimmedCoreId.length > 50) {
    errors.coreId = 'Core ID exceeds maximum length of 50 characters.';
  }

  // Location Name Validation
  const trimmedLocation = (input.locationName || '').trim();
  if (!trimmedLocation) {
    errors.locationName = 'Location name or FAT/ODF cabinet is required.';
  } else if (trimmedLocation.length > 120) {
    errors.locationName = 'Location name cannot exceed 120 characters.';
  }

  // Coordinate Validation
  const latNum = typeof input.lat === 'string' ? parseFloat(input.lat.trim()) : input.lat;
  const lngNum = typeof input.lng === 'string' ? parseFloat(input.lng.trim()) : input.lng;

  if (input.lat === '' || input.lat === undefined || isNaN(latNum)) {
    errors.lat = 'Latitude is required as a valid decimal number.';
  } else if (latNum < -90 || latNum > 90) {
    errors.lat = 'Latitude must be between -90.0° and +90.0°.';
  }

  if (input.lng === '' || input.lng === undefined || isNaN(lngNum)) {
    errors.lng = 'Longitude is required as a valid decimal number.';
  } else if (lngNum < -180 || lngNum > 180) {
    errors.lng = 'Longitude must be between -180.0° and +180.0°.';
  }

  // Optional Optical Power Validations
  let parsedRx: number | undefined;
  if (input.opticalPowerRxDbm !== undefined && input.opticalPowerRxDbm !== '') {
    const rx = typeof input.opticalPowerRxDbm === 'string' ? parseFloat(input.opticalPowerRxDbm) : input.opticalPowerRxDbm;
    if (isNaN(rx)) {
      errors.opticalPowerRxDbm = 'Rx Power must be a valid number in dBm.';
    } else if (rx < -50 || rx > 10) {
      errors.opticalPowerRxDbm = 'Rx Power must be between -50.0 and +10.0 dBm.';
    } else {
      parsedRx = rx;
    }
  }

  let parsedTx: number | undefined;
  if (input.opticalPowerTxDbm !== undefined && input.opticalPowerTxDbm !== '') {
    const tx = typeof input.opticalPowerTxDbm === 'string' ? parseFloat(input.opticalPowerTxDbm) : input.opticalPowerTxDbm;
    if (isNaN(tx)) {
      errors.opticalPowerTxDbm = 'Tx Power must be a valid number in dBm.';
    } else if (tx < -10 || tx > 20) {
      errors.opticalPowerTxDbm = 'Tx Power must be between -10.0 and +20.0 dBm.';
    } else {
      parsedTx = tx;
    }
  }

  const isValid = Object.keys(errors).length === 0;

  return {
    isValid,
    errors,
    sanitized: isValid
      ? {
          boardNumber: boardNum,
          portNumber: portNum,
          coreId: trimmedCoreId,
          coreNumber: parseCoreNumber(trimmedCoreId),
          locationName: trimmedLocation,
          lat: Number(latNum.toFixed(6)),
          lng: Number(lngNum.toFixed(6)),
          opticalPowerRxDbm: parsedRx !== undefined ? Number(parsedRx.toFixed(2)) : undefined,
          opticalPowerTxDbm: parsedTx !== undefined ? Number(parsedTx.toFixed(2)) : undefined,
        }
      : undefined,
  };
}

/**
 * Extracts integer fiber core number from strings like "Core 12", "C-05", "#33", "24"
 */
export function parseCoreNumber(coreIdStr: string): number | undefined {
  if (!coreIdStr) return undefined;
  const match = coreIdStr.match(/\d+/);
  if (match) {
    const num = parseInt(match[0], 10);
    return num > 0 ? num : undefined;
  }
  return undefined;
}

/**
 * Calculates port occupancy and health statistics
 */
export function calculateSiteStats(records: PortRecord[], totalChassisPorts: number = 128): SiteStatistics {
  const configured = records.length;
  let active = 0;
  let spare = 0;
  let fault = 0;
  let reserved = 0;
  let rxSum = 0;
  let rxCount = 0;

  for (const rec of records) {
    if (rec.status === 'ACTIVE') active++;
    else if (rec.status === 'SPARE') spare++;
    else if (rec.status === 'FAULT') fault++;
    else if (rec.status === 'RESERVED') reserved++;

    if (rec.opticalPowerRxDbm !== undefined && !isNaN(rec.opticalPowerRxDbm)) {
      rxSum += rec.opticalPowerRxDbm;
      rxCount++;
    }
  }

  const utilizationPercent = Math.min(100, Math.round((active / totalChassisPorts) * 100));
  const avgRxPowerDbm = rxCount > 0 ? Number((rxSum / rxCount).toFixed(2)) : undefined;

  return {
    totalConfigured: configured,
    totalActive: active,
    totalSpare: spare,
    totalFault: fault,
    totalReserved: reserved,
    utilizationPercent,
    avgRxPowerDbm,
  };
}

/**
 * Converts decimal coordinates to Degrees Minutes Seconds (DMS) string
 */
export function formatCoordinatesDms(lat: number, lng: number): string {
  const formatDmsPart = (val: number, posChar: string, negChar: string) => {
    const dir = val >= 0 ? posChar : negChar;
    const absVal = Math.abs(val);
    const deg = Math.floor(absVal);
    const minFloat = (absVal - deg) * 60;
    const min = Math.floor(minFloat);
    const sec = ((minFloat - min) * 60).toFixed(1);
    return `${deg}°${min}'${sec}"${dir}`;
  };

  return `${formatDmsPart(lat, 'N', 'S')}, ${formatDmsPart(lng, 'E', 'W')}`;
}

/**
 * Computes great-circle distance in meters between two coordinates via Haversine
 */
export function calculateDistanceMeters(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371e3; // Earth radius in meters
  const phi1 = (lat1 * Math.PI) / 180;
  const phi2 = (lat2 * Math.PI) / 180;
  const deltaPhi = ((lat2 - lat1) * Math.PI) / 180;
  const deltaLambda = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(deltaPhi / 2) * Math.sin(deltaPhi / 2) +
    Math.cos(phi1) * Math.cos(phi2) * Math.sin(deltaLambda / 2) * Math.sin(deltaLambda / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return Math.round(R * c);
}

/**
 * Generates an IEC/ITU telecom field patch cord tag
 * e.g. KIS-B02-P07-C24
 */
export function generateFieldLabelCode(
  siteCode: string,
  boardNumber: number,
  portNumber: number,
  coreId: string
): string {
  const code = (siteCode || 'OLT').toUpperCase().slice(0, 3);
  const b = `B0${boardNumber}`.slice(-3);
  const p = `P0${portNumber}`.slice(-3);
  const coreClean = coreId.replace(/[^a-zA-Z0-9]/g, '').toUpperCase().slice(0, 6) || 'C01';
  return `${code}-${b}-${p}-${coreClean}`;
}

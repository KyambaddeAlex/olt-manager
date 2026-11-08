import test from 'node:test';
import assert from 'node:assert/strict';
import {
  validateOltRecordInput,
  calculateSiteStats,
  formatCoordinatesDms,
  calculateDistanceMeters,
  generateFieldLabelCode,
  getFiberCoreNumberForPort,
  parseCoreNumber,
} from './oltValidation';
import { PortRecord } from '../types/olt';

test('validateOltRecordInput accepts valid record and sanitizes floats', () => {
  const result = validateOltRecordInput({
    boardNumber: '2',
    portNumber: '7',
    coreId: '  Core 24  ',
    locationName: '  FAT-04 Kansanga Junction  ',
    lat: '0.3012555',
    lng: '32.6085111',
    opticalPowerRxDbm: '-19.45',
    opticalPowerTxDbm: '3.2',
  });

  assert.equal(result.isValid, true);
  assert.equal(Object.keys(result.errors).length, 0);
  assert.ok(result.sanitized);
  assert.equal(result.sanitized.boardNumber, 2);
  assert.equal(result.sanitized.portNumber, 7);
  assert.equal(result.sanitized.coreId, 'Core 24');
  assert.equal(result.sanitized.coreNumber, 24);
  assert.equal(result.sanitized.locationName, 'FAT-04 Kansanga Junction');
  assert.equal(result.sanitized.lat, 0.301256);
  assert.equal(result.sanitized.lng, 32.608511);
  assert.equal(result.sanitized.opticalPowerRxDbm, -19.45);
  assert.equal(result.sanitized.opticalPowerTxDbm, 3.2);
});

test('validateOltRecordInput flags invalid board and port boundaries', () => {
  const result = validateOltRecordInput({
    boardNumber: 9, // only 1-8 allowed
    portNumber: 16, // only 0-15 allowed
    coreId: '',
    locationName: '',
    lat: 'invalid-lat',
    lng: 200, // out of range
  });

  assert.equal(result.isValid, false);
  assert.ok(result.errors.boardNumber?.includes('boards 1 through 8'));
  assert.ok(result.errors.portNumber?.includes('numbered 0 through 15'));
  assert.ok(result.errors.coreId?.includes('required'));
  assert.ok(result.errors.locationName?.includes('required'));
  assert.ok(result.errors.lat?.includes('valid decimal'));
  assert.ok(result.errors.lng?.includes('-180.0° and +180.0°'));
});

test('parseCoreNumber extracts correct number from varied formats', () => {
  assert.equal(parseCoreNumber('Core 12'), 12);
  assert.equal(parseCoreNumber('C-08'), 8);
  assert.equal(parseCoreNumber('Fiber #144'), 144);
  assert.equal(parseCoreNumber('NoNumber'), undefined);
});

test('getFiberCoreNumberForPort maps OLT board and port to sequential fiber cores', () => {
  assert.equal(getFiberCoreNumberForPort(1, 0), 1);
  assert.equal(getFiberCoreNumberForPort(2, 11), 28);
  assert.equal(getFiberCoreNumberForPort(8, 15), 128);
});

test('calculateSiteStats calculates utilization and fault counts correctly', () => {
  const dummyRecords: PortRecord[] = [
    {
      id: '1',
      siteId: 'kisugu',
      boardNumber: 1,
      portNumber: 0,
      coreId: 'Core 1',
      locationName: 'Loc 1',
      coordinates: { lat: 0, lng: 0 },
      status: 'ACTIVE',
      ponType: 'GPON',
      splitRatio: '1:32',
      opticalPowerRxDbm: -18.0,
      lastUpdated: '2026-11-06T00:00:00Z',
    },
    {
      id: '2',
      siteId: 'kisugu',
      boardNumber: 1,
      portNumber: 1,
      coreId: 'Core 2',
      locationName: 'Loc 2',
      coordinates: { lat: 0, lng: 0 },
      status: 'ACTIVE',
      ponType: 'GPON',
      splitRatio: '1:32',
      opticalPowerRxDbm: -20.0,
      lastUpdated: '2026-11-06T00:00:00Z',
    },
    {
      id: '3',
      siteId: 'kisugu',
      boardNumber: 1,
      portNumber: 2,
      coreId: 'Core 3',
      locationName: 'Loc 3',
      coordinates: { lat: 0, lng: 0 },
      status: 'FAULT',
      ponType: 'GPON',
      splitRatio: '1:32',
      opticalPowerRxDbm: -32.0,
      lastUpdated: '2026-11-06T00:00:00Z',
    },
    {
      id: '4',
      siteId: 'kisugu',
      boardNumber: 1,
      portNumber: 3,
      coreId: 'Core 4',
      locationName: 'Loc 4',
      coordinates: { lat: 0, lng: 0 },
      status: 'SPARE',
      ponType: 'GPON',
      splitRatio: '1:32',
      lastUpdated: '2026-11-06T00:00:00Z',
    },
  ];

  const stats = calculateSiteStats(dummyRecords, 128);
  assert.equal(stats.totalConfigured, 4);
  assert.equal(stats.totalActive, 2);
  assert.equal(stats.totalFault, 1);
  assert.equal(stats.totalSpare, 1);
  // 2 active out of 128 = 2% rounded
  assert.equal(stats.utilizationPercent, 2);
  // Avg of -18, -20, -32 = -23.33 dBm
  assert.equal(stats.avgRxPowerDbm, -23.33);
});

test('formatCoordinatesDms formats DMS string with direction markers', () => {
  const dms = formatCoordinatesDms(0.3012, 32.6085);
  assert.ok(dms.includes('N'));
  assert.ok(dms.includes('E'));
  assert.ok(dms.includes('0°18\''));
});

test('calculateDistanceMeters computes distance accurately between coordinates', () => {
  // Distance from Kisugu (0.3012, 32.6085) to Kansanga (0.3058, 32.6144) is ~820m
  const distance = calculateDistanceMeters(0.3012, 32.6085, 0.3058, 32.6144);
  assert.ok(distance > 700 && distance < 1000);
});

test('generateFieldLabelCode creates expected telecom tag format', () => {
  const label = generateFieldLabelCode('KIS', 2, 7, 'Core 24');
  assert.equal(label, 'KIS-B02-P07-CORE24');
});

import assert from 'node:assert/strict';
import test from 'node:test';
import { normalizeLegacyRecords } from './legacyRecordAdapter';

test('adapts existing OLT config records without changing their Firebase keys or values', () => {
  const records = normalizeLegacyRecords('kitintale', {
    '-P-existing-key': {
      board: '2',
      port: '7',
      coreId: 'Core 24',
      locationName: 'FAT-04',
      coordinates: '0.3168, 32.6372',
      lastUpdate: '2025-01-02T03:04:05.000Z',
    },
  });

  assert.equal(records.length, 1);
  assert.equal(records[0].id, '-P-existing-key');
  assert.equal(records[0].siteId, 'kitintale');
  assert.equal(records[0].boardNumber, 2);
  assert.equal(records[0].portNumber, 7);
  assert.equal(records[0].coreId, 'Core 24');
  assert.equal(records[0].coordinates.lat, 0.3168);
  assert.equal(records[0].coordinates.lng, 32.6372);
  assert.equal(records[0].lastUpdated, '2025-01-02T03:04:05.000Z');
});

test('uses site coordinates for old records with no usable coordinate fields', () => {
  const [record] = normalizeLegacyRecords('kisugu', {
    existing: { board: '1', port: '0', coreId: 'Core 1' },
  });

  assert.equal(record.coordinates.lat, 0.3012);
  assert.equal(record.coordinates.lng, 32.6085);
  assert.equal(record.coordinates.source, 'DEFAULT');
  assert.equal(record.locationName, 'Location not recorded');
});

test('ignores malformed legacy records instead of fabricating port assignments', () => {
  assert.deepEqual(normalizeLegacyRecords('kisugu', { invalid: { board: 'bad', port: '3' } }), []);
  assert.deepEqual(normalizeLegacyRecords('kisugu', null), []);
});

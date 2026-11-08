import test from 'node:test';
import assert from 'node:assert/strict';
import {
  calculateOtdrDistanceMeters,
  opticalToPhysicalDistance,
  interpolateRouteCoordinates,
  findNearestAssetToBreak,
  estimateAffectedSubscribers,
  ITU_G652D_REFRACTIVE_INDEX,
} from './outageMath';
import { FiberWaypoint } from '../types/outage';

test('calculateOtdrDistanceMeters accurately calculates fiber distance from pulse time', () => {
  // Round trip for 1000m (1km) in fiber (n = 1.4682)
  // t = 2 * d * n / c = 2 * 1000 * 1.4682 / 299792458 = 9.7947 microseconds = 9794.7 ns
  const distance = calculateOtdrDistanceMeters(9794.7, ITU_G652D_REFRACTIVE_INDEX);
  assert.ok(Math.abs(distance - 1000) < 1.0);
});

test('opticalToPhysicalDistance accounts for 5% cable slack loops', () => {
  // 1050 optical meters with 5% slack factor = 1000 physical trench meters
  const physical = opticalToPhysicalDistance(1050, 5);
  assert.equal(physical, 1000);
});

test('interpolateRouteCoordinates calculates correct midpoint GPS coordinate', () => {
  const startLat = 0.300000;
  const startLng = 32.600000;
  const endLat = 0.310000;
  const endLng = 32.620000;
  const totalSpanMeters = 2000;

  // At 50% distance (1050 optical meters with 5% slack = 1000 physical meters)
  const result = interpolateRouteCoordinates(startLat, startLng, endLat, endLng, 1050, totalSpanMeters, 5);
  assert.equal(result.physicalDistanceMeters, 1000);
  assert.equal(result.lat, 0.305000);
  assert.equal(result.lng, 32.610000);
});

test('findNearestAssetToBreak identifies nearest handhole and direction', () => {
  const waypoints: FiberWaypoint[] = [
    { id: '1', name: 'OLT Central', type: 'OLT', lat: 0, lng: 0, cumulativeDistanceMeters: 0 },
    { id: '2', name: 'Handhole HH-01', type: 'HANDHOLE', lat: 0, lng: 0, cumulativeDistanceMeters: 500 },
    { id: '3', name: 'Manhole MH-02', type: 'MANHOLE', lat: 0, lng: 0, cumulativeDistanceMeters: 1000 },
    { id: '4', name: 'FAT-04 Cabinet', type: 'FAT', lat: 0, lng: 0, cumulativeDistanceMeters: 1500 },
  ];

  // Break at 560 meters: 60m past Handhole HH-01
  const nearest = findNearestAssetToBreak(560, waypoints);
  assert.equal(nearest.asset.name, 'Handhole HH-01');
  assert.equal(nearest.distanceDeltaMeters, 60);
  assert.equal(nearest.direction, 'TOWARDS_CUSTOMER');
  assert.ok(nearest.description.includes('60m past Handhole HH-01'));
});

test('estimateAffectedSubscribers maps split ratios to subscriber counts', () => {
  assert.equal(estimateAffectedSubscribers('1:32'), 32);
  assert.equal(estimateAffectedSubscribers('1:64'), 64);
  assert.equal(estimateAffectedSubscribers('None'), 1);
});

import test from 'node:test';
import assert from 'node:assert/strict';
import { calculateLinkLoss, decodeFiberCore, generateOtdrTracePoints } from './fiberMath';
import { LinkParameters, OtdrEvent } from '../types/fiber';

test('calculateLinkLoss calculates accurate fiber loss and pass status', () => {
  const params: LinkParameters = {
    lengthKm: 20,
    fiberStandardId: 'g652d',
    wavelengthNm: 1550, // 0.20 dB/km nominal
    fusionSplices: 4,
    fusionSpliceLossDb: 0.05,
    mechanicalSplices: 0,
    mechanicalSpliceLossDb: 0.3,
    connectorPairs: 2,
    connectorTypeId: 'sc_apc', // 0.25 dB per pair
    splitterRatioId: 'none',
    systemMarginDb: 3.0,
    txPowerDbm: 2.0,
    rxSensitivityDbm: -28.0,
    rxSaturationDbm: 0.0,
  };

  const result = calculateLinkLoss(params);

  // Fiber loss: 20 * 0.20 = 4.0 dB
  assert.equal(result.fiberLossDb, 4.0);
  // Splice loss: 4 * 0.05 = 0.2 dB
  assert.equal(result.spliceLossDb, 0.2);
  // Connector loss: 2 * 0.25 = 0.5 dB
  assert.equal(result.connectorLossDb, 0.5);
  // Splitter loss: 0 dB
  assert.equal(result.splitterLossDb, 0);
  // Total loss = 4.0 + 0.2 + 0.5 + 0 + 3.0 = 7.7 dB
  assert.equal(result.totalLinkLossDb, 7.7);

  // Received power = 2.0 - (4.0 + 0.2 + 0.5) = -2.7 dBm
  assert.equal(result.receivedPowerDbm, -2.7);

  // Power margin = -2.7 - 3.0 - (-28.0) = 22.3 dB
  assert.equal(result.opticalPowerMarginDb, 22.3);
  assert.equal(result.status, 'PASS');
});

test('calculateLinkLoss flags budget deficit when link is too long', () => {
  const params: LinkParameters = {
    lengthKm: 120, // 120 * 0.35 = 42 dB loss at 1310nm
    fiberStandardId: 'g652d',
    wavelengthNm: 1310,
    fusionSplices: 10,
    fusionSpliceLossDb: 0.1,
    mechanicalSplices: 0,
    mechanicalSpliceLossDb: 0.3,
    connectorPairs: 4,
    connectorTypeId: 'sc_apc',
    splitterRatioId: '1:32', // 17 dB
    systemMarginDb: 3.0,
    txPowerDbm: 3.0,
    rxSensitivityDbm: -27.0, // max allowed loss = 30 dB
    rxSaturationDbm: -3.0,
  };

  const result = calculateLinkLoss(params);
  assert.equal(result.status, 'FAIL');
  assert.ok(result.opticalPowerMarginDb < 0);
});

test('calculateLinkLoss warns about receiver saturation if power is too high', () => {
  const params: LinkParameters = {
    lengthKm: 0.5,
    fiberStandardId: 'g652d',
    wavelengthNm: 1550,
    fusionSplices: 0,
    fusionSpliceLossDb: 0.05,
    mechanicalSplices: 0,
    mechanicalSpliceLossDb: 0.3,
    connectorPairs: 1,
    connectorTypeId: 'lc_upc',
    splitterRatioId: 'none',
    systemMarginDb: 0.0,
    txPowerDbm: 5.0,
    rxSensitivityDbm: -25.0,
    rxSaturationDbm: -2.0, // Max safe power
  };

  const result = calculateLinkLoss(params);
  // Received power is ~ 4.7 dBm which is > -2.0 dBm
  assert.equal(result.status, 'FAIL');
  assert.ok(result.statusReason.includes('Saturation'));
});

test('decodeFiberCore decodes TIA-598-C color codes accurately', () => {
  // Core 1 -> Tube 1 (Blue), Fiber 1 (Blue)
  const core1 = decodeFiberCore(1, 72, 12, 'TIA-598-C');
  assert.equal(core1.tubeNumber, 1);
  assert.equal(core1.tubeColor.name, 'Blue');
  assert.equal(core1.fiberInTubeNumber, 1);
  assert.equal(core1.fiberColor.name, 'Blue');

  // Core 12 -> Tube 1 (Blue), Fiber 12 (Aqua)
  const core12 = decodeFiberCore(12, 72, 12, 'TIA-598-C');
  assert.equal(core12.tubeNumber, 1);
  assert.equal(core12.tubeColor.name, 'Blue');
  assert.equal(core12.fiberInTubeNumber, 12);
  assert.equal(core12.fiberColor.name, 'Aqua');

  // Core 13 -> Tube 2 (Orange), Fiber 1 (Blue)
  const core13 = decodeFiberCore(13, 72, 12, 'TIA-598-C');
  assert.equal(core13.tubeNumber, 2);
  assert.equal(core13.tubeColor.name, 'Orange');
  assert.equal(core13.fiberInTubeNumber, 1);
  assert.equal(core13.fiberColor.name, 'Blue');

  // Core 43 -> Tube 4 (Brown), Fiber 7 (Red)
  const core43 = decodeFiberCore(43, 72, 12, 'TIA-598-C');
  assert.equal(core43.tubeNumber, 4);
  assert.equal(core43.tubeColor.name, 'Brown');
  assert.equal(core43.fiberInTubeNumber, 7);
  assert.equal(core43.fiberColor.name, 'Red');
  assert.equal(core43.trayNumber, 4);
});

test('generateOtdrTracePoints produces expected distance and power points', () => {
  const events: OtdrEvent[] = [
    { id: '1', distanceKm: 0, type: 'launch_connector', lossDb: 0.2, reflectanceDb: -40, cumulativeLossDb: 0.2 },
    { id: '2', distanceKm: 5, type: 'fusion_splice', lossDb: 0.08, cumulativeLossDb: 1.28 },
    { id: '3', distanceKm: 10, type: 'fiber_end', lossDb: 35, reflectanceDb: -14, cumulativeLossDb: 37 },
  ];

  const points = generateOtdrTracePoints(10, 0.2, events, 50, 1550);
  assert.ok(points.length > 50);
  assert.equal(points[0].distanceKm, 0);
  // Toward end of fiber, signal drops to noise floor
  const lastPoint = points[points.length - 1];
  assert.ok(lastPoint.powerDb < -35);
});

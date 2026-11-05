import test from 'node:test';
import assert from 'node:assert/strict';
import { canCompanionWalk, clampCompanion, companionBounds, companionFits, companionFootprint, companionManualBounds, companionRouteTip, companionSize, stepCompanion } from '../src/lib/morganaCompanion.ts';

test('pet footprint stays inside useful desktop area, clear of sidebar and topbar', () => {
  const viewport = { left: 0, top: 0, width: 1440, height: 900, contentLeft: 256, contentTop: 64 };
  const size = companionSize(viewport);
  const footprint = companionFootprint(viewport, size);
  const bounds = companionBounds(viewport, size);
  assert.ok(bounds.minX > 256);
  assert.ok(bounds.maxX + footprint.width <= 1430);
  assert.ok(bounds.maxY + footprint.height <= 890);
  assert.ok(bounds.minY >= 64);
  assert.equal(bounds.maxY - bounds.minY, 64);
  assert.deepEqual(clampCompanion({ x: -999, y: 9999 }, bounds), { x: bounds.minX, y: bounds.maxY });
});

test('resize, visual viewport offsets and keyboard height clamp an existing position', () => {
  const viewport = { left: 16, top: 80, width: 360, height: 290, contentLeft: 0, contentTop: 64 };
  const size = companionSize(viewport);
  const footprint = companionFootprint(viewport, size);
  const bounds = companionBounds(viewport, size);
  const position = clampCompanion({ x: 1300, y: 850 }, bounds);
  assert.ok(position.x >= 26 && position.x + footprint.width <= 366);
  assert.ok(position.y >= 90 && position.y + footprint.height <= 360);
});

test('walking turns at either boundary and never crosses the permitted strip', () => {
  const bounds = { minX: 20, maxX: 100, minY: 400, maxY: 460 };
  assert.deepEqual(stepCompanion({ x: 22, y: 420 }, -1, 12, bounds), { point: { x: 20, y: 420 }, direction: 1 });
  assert.deepEqual(stepCompanion({ x: 98, y: 420 }, 1, 12, bounds), { point: { x: 100, y: 420 }, direction: -1 });
  assert.deepEqual(stepCompanion({ x: 50, y: 420 }, 1, 3, bounds), { point: { x: 53, y: 420 }, direction: 1 });
});

test('every pause reason independently stops automatic walking', () => {
  const pauses = { hidden: false, dialogOpen: false, interacting: false, dragging: false, documentHidden: false, reducedMotion: false, focusMode: false, editing: false, userPaused: false, manuallyPositioned: false };
  assert.equal(canCompanionWalk(pauses), true);
  for (const reason of Object.keys(pauses)) assert.equal(canCompanionWalk({ ...pauses, [reason]: true }), false, reason);
});

test('manual placement can use the content area while automatic bounds remain near the footer', () => {
  const viewport = { left: 0, top: 0, width: 1440, height: 900, contentLeft: 256, contentTop: 64 };
  const size = companionSize(viewport);
  const manual = companionManualBounds(viewport, size);
  const walking = companionBounds(viewport, size);
  const point = clampCompanion({ x: 500, y: 180 }, manual);
  assert.equal(point.y, 180);
  assert.ok(point.y < walking.minY);
  assert.equal(manual.minY, 74);
  assert.equal(manual.maxY, walking.maxY);
});

test('pet is suppressed when its real footprint cannot fit below the topbar', () => {
  for (let height = 160; height <= 214; height++) {
    const viewport = { left: 0, top: 0, width: 390, height, contentLeft: 0, contentTop: 64 };
    assert.equal(companionFits(viewport, companionSize(viewport)), false, `height=${height}`);
  }
  const normal = { left: 0, top: 0, width: 390, height: 720, contentLeft: 0, contentTop: 64 };
  assert.equal(companionFits(normal, companionSize(normal)), true);
});

test('local route tips give honest guidance without inventing records or AI results', () => {
  assert.match(companionRouteTip('/tasks?status=pendente'), /próxima ação/);
  assert.match(companionRouteTip('/subjects/3'), /disciplina/);
  assert.match(companionRouteTip('/insights'), /histórico/);
  assert.equal(companionRouteTip('/subjects/3'), companionRouteTip('/subjects/44'));
});

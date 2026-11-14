import test from 'node:test';
import assert from 'node:assert/strict';

// Test implementation of the pure layout calculation functions
const LAYOUT_THRESHOLDS = {
  PHONE_MAX: 599,
  WIDE_MIN: 600,
  WIDE_MAX: 999,
  TABLET_MIN: 1000,
};

function getAutoLayout(width) {
  if (width >= LAYOUT_THRESHOLDS.TABLET_MIN) return 'tablet';
  if (width >= LAYOUT_THRESHOLDS.WIDE_MIN) return 'wide';
  return 'phone';
}

function computeEffectiveLayout(requested, width) {
  if (requested === 'tablet') {
    if (width >= LAYOUT_THRESHOLDS.TABLET_MIN) return 'tablet';
    if (width >= LAYOUT_THRESHOLDS.WIDE_MIN) return 'wide';
    return 'phone';
  }
  if (requested === 'wide') {
    if (width >= LAYOUT_THRESHOLDS.WIDE_MIN) return 'wide';
    return 'phone';
  }
  if (requested === 'phone') {
    return 'phone';
  }
  return getAutoLayout(width);
}

function isLayoutDowngraded(requested, effective) {
  if (requested === 'auto') return false;
  return requested !== effective;
}

function getDowngradeKey(requested, effective) {
  if (requested === 'auto' || requested === effective) return null;
  if (requested === 'tablet' && effective === 'phone') return 'settings.displayDowngradedTabletToPhone';
  if (requested === 'tablet' && effective === 'wide') return 'settings.displayDowngradedTabletToWide';
  if (requested === 'wide' && effective === 'phone') return 'settings.displayDowngradedWideToPhone';
  return null;
}

test('Layout Thresholds - Auto mode maps correctly to phone, wide, and tablet', () => {
  assert.equal(getAutoLayout(390), 'phone');
  assert.equal(getAutoLayout(430), 'phone');
  assert.equal(getAutoLayout(599), 'phone');
  assert.equal(getAutoLayout(600), 'wide');
  assert.equal(getAutoLayout(768), 'wide');
  assert.equal(getAutoLayout(999), 'wide');
  assert.equal(getAutoLayout(1000), 'tablet');
  assert.equal(getAutoLayout(1280), 'tablet');
  assert.equal(getAutoLayout(1920), 'tablet');
});

test('Phone Mode - Always evaluates to phone regardless of viewport width', () => {
  assert.equal(computeEffectiveLayout('phone', 390), 'phone');
  assert.equal(computeEffectiveLayout('phone', 768), 'phone');
  assert.equal(computeEffectiveLayout('phone', 1440), 'phone');
  assert.equal(isLayoutDowngraded('phone', 'phone'), false);
  assert.equal(getDowngradeKey('phone', 'phone'), null);
});

test('Wide Mode - Requires width >= 600px; downgrades to phone on < 600px', () => {
  // On narrow phone
  const narrowEff = computeEffectiveLayout('wide', 390);
  assert.equal(narrowEff, 'phone');
  assert.equal(isLayoutDowngraded('wide', narrowEff), true);
  assert.equal(getDowngradeKey('wide', narrowEff), 'settings.displayDowngradedWideToPhone');

  // On wide screen
  const wideEff = computeEffectiveLayout('wide', 760);
  assert.equal(wideEff, 'wide');
  assert.equal(isLayoutDowngraded('wide', wideEff), false);
  assert.equal(getDowngradeKey('wide', wideEff), null);

  // On tablet screen
  const desktopEff = computeEffectiveLayout('wide', 1280);
  assert.equal(desktopEff, 'wide');
  assert.equal(isLayoutDowngraded('wide', desktopEff), false);
});

test('Tablet Mode - Requires width >= 1000px; downgrades smoothly to wide or phone', () => {
  // On 390px mobile => downgrades to phone
  const phoneEff = computeEffectiveLayout('tablet', 390);
  assert.equal(phoneEff, 'phone');
  assert.equal(isLayoutDowngraded('tablet', phoneEff), true);
  assert.equal(getDowngradeKey('tablet', phoneEff), 'settings.displayDowngradedTabletToPhone');

  // On 768px tablet portrait => downgrades to wide
  const wideEff = computeEffectiveLayout('tablet', 768);
  assert.equal(wideEff, 'wide');
  assert.equal(isLayoutDowngraded('tablet', wideEff), true);
  assert.equal(getDowngradeKey('tablet', wideEff), 'settings.displayDowngradedTabletToWide');

  // On 1280px desktop => retains tablet
  const tabletEff = computeEffectiveLayout('tablet', 1280);
  assert.equal(tabletEff, 'tablet');
  assert.equal(isLayoutDowngraded('tablet', tabletEff), false);
  assert.equal(getDowngradeKey('tablet', tabletEff), null);
});

test('Auto Mode - Never flags as downgraded', () => {
  assert.equal(isLayoutDowngraded('auto', 'phone'), false);
  assert.equal(isLayoutDowngraded('auto', 'wide'), false);
  assert.equal(isLayoutDowngraded('auto', 'tablet'), false);
  assert.equal(getDowngradeKey('auto', 'phone'), null);
});

jest.mock('@/lib/supabase', () => ({ supabase: {} }));

import { haversineKm, calculateDelivery, validateDelivery, mapsLink, mapsNavLink } from '../delivery';

describe('haversineKm', () => {
  it('returns 0 for identical points', () => {
    expect(haversineKm(25.7388984, 82.6638101, 25.7388984, 82.6638101)).toBe(0);
  });
  it('matches a known ~100km separation (latitude degrees)', () => {
    // 1 degree of latitude ≈ 111.19 km
    const d = haversineKm(0, 0, 1, 0);
    expect(d).toBeGreaterThan(110);
    expect(d).toBeLessThan(113);
  });
  it('is symmetric', () => {
    const a = haversineKm(25.7, 82.6, 26.5, 83.1);
    const b = haversineKm(26.5, 83.1, 25.7, 82.6);
    expect(a).toBeCloseTo(b, 10);
  });
});

describe('calculateDelivery tiers (defaults: free ≤5km, paid ≤8km)', () => {
  // Shop origin: 25.7388984, 82.6638101
  const origin = { lat: 25.7388984, lng: 82.6638101 };

  it('free tier within 5km', () => {
    const info = calculateDelivery(origin.lat + 0.02, origin.lng); // ~2.2km
    expect(info.available).toBe(true);
    expect(info.tier.id).toBe('free');
    expect(info.charge).toBe(0);
    expect(info.distanceKm).toBeLessThan(5);
  });
  it('paid tier between 5-8km', () => {
    const info = calculateDelivery(origin.lat + 0.06, origin.lng); // ~6.7km
    expect(info.available).toBe(true);
    expect(info.tier.id).toBe('paid');
    expect(info.charge).toBe(30);
    expect(info.distanceKm).toBeGreaterThan(5);
    expect(info.distanceKm).toBeLessThan(8);
  });
  it('unavailable beyond 8km', () => {
    const info = calculateDelivery(origin.lat + 0.2, origin.lng); // ~22km
    expect(info.available).toBe(false);
    expect(info.tier.id).toBe('unavailable');
  });
  it('rounds distance to 1 decimal and includes maps links', () => {
    const info = calculateDelivery(origin.lat + 0.02, origin.lng);
    expect(Number.isInteger(info.distanceKm * 10)).toBe(true);
    expect(info.mapsLink).toContain('google.com/maps');
    expect(info.mapsNavLink).toContain(`${origin.lat},${origin.lng}`);
  });
});

describe('validateDelivery', () => {
  it('valid within range, reason null', () => {
    const r = validateDelivery(25.74, 82.66);
    expect(r.valid).toBe(true);
    expect(r.reason).toBeNull();
  });
  it('invalid out of range with Hinglish reason', () => {
    const r = validateDelivery(28.0, 82.66); // far away
    expect(r.valid).toBe(false);
    expect(r.reason).toContain('bahar');
    expect(r.reason).toContain('km');
  });
});

describe('maps helpers', () => {
  it('mapsLink builds dir link to destination', () => {
    expect(mapsLink(1.5, 2.5)).toBe('https://www.google.com/maps/dir/?api=1&destination=1.5,2.5');
  });
  it('mapsNavLink starts from shop origin', () => {
    const l = mapsNavLink(1.5, 2.5);
    expect(l).toContain('25.7388984,82.6638101');
    expect(l).toContain('1.5,2.5');
  });
});

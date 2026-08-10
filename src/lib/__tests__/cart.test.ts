import { lineKey, mergeCarts, cartCount, cartTotal } from '../cart';
import type { CartItem } from '../types';

const item = (over: Partial<CartItem>): CartItem => ({
  id: 'p1',
  name: 'Test',
  price: 100,
  qty: 1,
  ...over,
});

describe('lineKey', () => {
  it('uses explicit k when present', () => {
    expect(lineKey({ k: 'p1::2kg', id: 'p1', variant: '2kg' })).toBe('p1::2kg');
  });
  it('builds id::variant when variant present', () => {
    expect(lineKey({ id: 'p1', variant: '1kg' })).toBe('p1::1kg');
  });
  it('plain id for single-unit products', () => {
    expect(lineKey({ id: 'p1' })).toBe('p1');
    expect(lineKey({ id: 'p1', variant: null })).toBe('p1');
  });
  it('empty string for empty input', () => {
    expect(lineKey()).toBe('');
    expect(lineKey(null)).toBe('');
  });
});

describe('mergeCarts (guest → DB on login)', () => {
  it('keeps the higher quantity for same line', () => {
    const guest = [item({ id: 'p1', qty: 3 })];
    const db = [item({ id: 'p1', qty: 1 })];
    const merged = mergeCarts(guest, db);
    expect(merged).toHaveLength(1);
    expect(merged[0].qty).toBe(3);
  });

  it('prefers DB quantity when it is higher', () => {
    const guest = [item({ id: 'p1', qty: 1 })];
    const db = [item({ id: 'p1', qty: 5 })];
    expect(mergeCarts(guest, db)[0].qty).toBe(5);
  });

  it('appends new guest lines', () => {
    const guest = [item({ id: 'p1' }), item({ id: 'p2' })];
    const db = [item({ id: 'p3' })];
    const merged = mergeCarts(guest, db);
    expect(merged.map((i) => i.id).sort()).toEqual(['p1', 'p2', 'p3']);
  });

  it('handles multi-unit variants as separate lines', () => {
    const guest = [item({ id: 'p1', variant: '1kg', qty: 2 }), item({ id: 'p1', variant: '2kg', qty: 1 })];
    const db = [item({ id: 'p1', variant: '1kg', qty: 1 })];
    const merged = mergeCarts(guest, db);
    expect(merged).toHaveLength(2);
    expect(merged.find((i) => i.variant === '1kg')?.qty).toBe(2);
    expect(merged.find((i) => i.variant === '2kg')?.qty).toBe(1);
  });

  it('does not mutate inputs', () => {
    const guest = [item({ id: 'p1', qty: 3 })];
    const db = [item({ id: 'p1', qty: 1 })];
    mergeCarts(guest, db);
    expect(guest[0].qty).toBe(3);
    expect(db[0].qty).toBe(1);
  });

  it('empty guest → returns db lines', () => {
    const db = [item({ id: 'p1' })];
    expect(mergeCarts([], db)).toHaveLength(1);
  });
});

describe('cart totals', () => {
  it('count and total across variants', () => {
    const cart = [item({ id: 'p1', price: 50, qty: 2 }), item({ id: 'p2', price: 100, qty: 1 })];
    expect(cartCount(cart)).toBe(3);
    expect(cartTotal(cart)).toBe(200);
  });
  it('empty cart', () => {
    expect(cartCount([])).toBe(0);
    expect(cartTotal([])).toBe(0);
  });
});

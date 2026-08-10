import {
  calcDiscount,
  catEmoji,
  inr,
  distLabel,
  timeAgo,
  orderStatusMeta,
  paymentMethodLabel,
  isPhoneValid,
  isEmailValid,
  friendlyAuthError,
  passwordStrength,
  STRENGTH_LABELS,
  makeSessionId,
} from '../helpers';

describe('calcDiscount', () => {
  it('computes % off when original > selling', () => {
    expect(calcDiscount(75, 100)).toBe(25);
    expect(calcDiscount(50, 100)).toBe(50);
    expect(calcDiscount(1, 3)).toBe(67);
  });
  it('returns null when no discount', () => {
    expect(calcDiscount(100, 100)).toBeNull();
    expect(calcDiscount(120, 100)).toBeNull();
    expect(calcDiscount(100, null)).toBeNull();
    expect(calcDiscount(undefined, 100)).toBeNull();
  });
});

describe('catEmoji', () => {
  it('uses icon_emoji or falls back to basket', () => {
    expect(catEmoji({ icon_emoji: '🍎' })).toBe('🍎');
    expect(catEmoji({ icon_emoji: null })).toBe('🛒');
    expect(catEmoji(undefined)).toBe('🛒');
  });
});

describe('inr', () => {
  it('formats Indian numbering', () => {
    expect(inr(0)).toBe('₹0');
    expect(inr(1234)).toBe('₹1,234');
    expect(inr(123456)).toBe('₹1,23,456');
    expect(inr(null)).toBe('₹0');
    expect(inr(49.6)).toBe('₹50');
  });
});

describe('distLabel', () => {
  it('shows meters under 1km and km above', () => {
    expect(distLabel(0.45)).toBe('450 m');
    expect(distLabel(1)).toBe('1.0 km');
    expect(distLabel(2.34)).toBe('2.3 km');
  });
});

describe('timeAgo', () => {
  const now = Date.now();
  it('friendly Hinglish relative labels', () => {
    expect(timeAgo(new Date(now - 5_000).toISOString())).toBe('abhi abhi');
    expect(timeAgo(new Date(now - 90_000).toISOString())).toBe('1 min pehle');
    expect(timeAgo(new Date(now - 2 * 3_600_000).toISOString())).toBe('2 ghante pehle');
    expect(timeAgo(new Date(now - 3 * 86_400_000).toISOString())).toBe('3 din pehle');
  });
});

describe('orderStatusMeta', () => {
  it('maps known statuses and falls back safely', () => {
    expect(orderStatusMeta('delivered').emoji).toBe('🏠');
    expect(orderStatusMeta('nonsense')).toMatchObject({ label: 'nonsense', emoji: '📋' });
  });
});

describe('paymentMethodLabel', () => {
  it('maps methods and falls back to raw', () => {
    expect(paymentMethodLabel('cod')).toBe('Cash on Delivery');
    expect(paymentMethodLabel('upi')).toBe('UPI / QR');
    expect(paymentMethodLabel('razorpay')).toBe('Online (Razorpay)');
    expect(paymentMethodLabel('xyz')).toBe('xyz');
  });
});

describe('validators', () => {
  it('phone: Indian 10-digit starting 6-9', () => {
    expect(isPhoneValid('9876543210')).toBe(true);
    expect(isPhoneValid('98765 43210')).toBe(false);
    expect(isPhoneValid('5876543210')).toBe(false);
    expect(isPhoneValid('987654321')).toBe(false);
  });
  it('email: basic shape', () => {
    expect(isEmailValid('a@b.com')).toBe(true);
    expect(isEmailValid('not-an-email')).toBe(false);
  });
});

describe('friendlyAuthError', () => {
  it('translates common Supabase errors to Hinglish', () => {
    expect(friendlyAuthError({ message: 'Invalid login credentials' })).toContain('galat');
    expect(friendlyAuthError({ message: 'Email not confirmed' })).toContain('verify');
    expect(friendlyAuthError({ message: 'User already registered' })).toContain('registered');
    expect(friendlyAuthError({ message: 'Password should be at least 6 characters' })).toContain('6');
    expect(friendlyAuthError(null)).toContain('Dobara try');
    expect(friendlyAuthError({ message: 'Unknown thing' })).toBe('Unknown thing');
  });
});

describe('passwordStrength', () => {
  it('scores 0-5 and labels align', () => {
    expect(passwordStrength('')).toBe(0);
    expect(passwordStrength('123456')).toBe(2); // length>=6 + digit
    expect(passwordStrength('Abcdef123!')).toBe(5);
    expect(STRENGTH_LABELS.length).toBe(6);
  });
});

describe('makeSessionId', () => {
  it('generates unique sess_ ids', () => {
    const a = makeSessionId();
    const b = makeSessionId();
    expect(a.startsWith('sess_')).toBe(true);
    expect(a).not.toBe(b);
  });
});

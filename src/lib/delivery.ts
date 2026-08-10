/**
 * delivery.ts — Smart Delivery Radius Engine (ported from the website's
 * delivery-radius.js + location-service.js). Haversine distance + tiered
 * delivery rules, driven LIVE by admin shop_settings.
 */
import { SHOP_ORIGIN } from './config';
import { supabase } from './supabase';
import type { DeliveryInfo } from './types';

const TIERS = [
  {
    id: 'free',
    maxKm: 5,
    charge: 0,
    label: 'FREE Delivery',
    emoji: '✅',
    eta: '20–35 minutes',
    available: true,
  },
  {
    id: 'paid',
    maxKm: 8,
    charge: 30,
    label: 'Delivery Available',
    emoji: '🚚',
    eta: '35–55 minutes',
    available: true,
  },
  {
    id: 'unavailable',
    maxKm: Infinity,
    charge: 0,
    label: 'Delivery Not Available',
    emoji: '❌',
    eta: null,
    available: false,
  },
];

function toRad(deg: number) {
  return (deg * Math.PI) / 180;
}

/** Haversine distance in km */
export function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) * Math.sin(dLng / 2);
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export const mapsLink = (lat: number, lng: number) =>
  `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`;
export const mapsNavLink = (lat: number, lng: number) =>
  `https://www.google.com/maps/dir/${SHOP_ORIGIN.lat},${SHOP_ORIGIN.lng}/${lat},${lng}`;

/** Load live delivery radius/charge from shop_settings (id=1) — like the site */
export async function loadDeliveryConfig(): Promise<void> {
  try {
    const { data } = await supabase
      .from('shop_settings')
      .select('delivery_radius,delivery_charge')
      .eq('id', 1)
      .maybeSingle();
    if (!data) return;
    const radius = Number(data.delivery_radius);
    const charge = Number(data.delivery_charge);
    const paid = TIERS.find((t) => t.id === 'paid');
    const free = TIERS.find((t) => t.id === 'free');
    if (radius > 0 && paid) {
      paid.maxKm = radius;
      if (free) free.maxKm = Math.min(free.maxKm, radius);
    }
    if (!Number.isNaN(charge) && charge >= 0 && paid) paid.charge = charge;
  } catch {
    // keep defaults
  }
}

export function calculateDelivery(lat: number, lng: number): DeliveryInfo {
  const raw = haversineKm(SHOP_ORIGIN.lat, SHOP_ORIGIN.lng, lat, lng);
  const dist = Math.round(raw * 10) / 10;
  const tier = TIERS.find((t) => dist <= t.maxKm) || TIERS[TIERS.length - 1];
  return {
    distanceKm: dist,
    distanceRaw: raw,
    charge: tier.charge,
    available: tier.available,
    tier,
    label: tier.label,
    emoji: tier.emoji,
    eta: tier.eta,
    mapsLink: mapsLink(lat, lng),
    mapsNavLink: mapsNavLink(lat, lng),
  };
}

export function validateDelivery(lat: number, lng: number): { valid: boolean; reason: string | null; info: DeliveryInfo } {
  const info = calculateDelivery(lat, lng);
  if (!info.available) {
    return {
      valid: false,
      reason: `Aapka location hamari delivery range se bahar hai (${info.distanceKm} km).`,
      info,
    };
  }
  return { valid: true, reason: null, info };
}

/** Reverse geocode via OpenStreetMap Nominatim (free, no key) */
export async function reverseGeocode(
  lat: number,
  lng: number
): Promise<{ line1: string; city: string; pincode: string } | null> {
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`,
      { headers: { 'Accept-Language': 'en,hi' } }
    );
    if (!res.ok) return null;
    const data = await res.json();
    const a = data.address || {};
    const line1Parts = [a.house_number, a.road || a.pedestrian || a.neighbourhood, a.suburb || a.locality].filter(Boolean);
    return {
      line1: line1Parts.join(', ') || data.display_name || '',
      city: a.city || a.town || a.village || a.county || '',
      pincode: a.postcode || '',
    };
  } catch {
    return null;
  }
}

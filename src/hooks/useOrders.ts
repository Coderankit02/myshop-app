/**
 * useOrders — order creation (create_order RPC with legacy fallback),
 * history, details, reorder. Full port of the website's orders.js.
 */
import { useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { useCart } from '@/context/CartContext';
import type { CartItem, Order, OrderItem, OrderSummary, Product } from '@/lib/types';

export interface CreateOrderOpts {
  cart: CartItem[];
  total: number;
  address: { name: string; phone: string; line1: string; line2?: string; city: string; pincode: string };
  paymentMethod: string;
  promoCode?: string | null;
  discount?: number;
  latitude?: number | null;
  longitude?: number | null;
  distance_km?: number | null;
  delivery_charge?: number;
  delivery_status?: string;
  maps_link?: string | null;
  maps_nav_link?: string | null;
  location_accuracy?: number | null;
}

export interface CreateOrderResult {
  orderId: string;
  orderNumber: string;
  subtotal?: number;
  discount?: number;
  finalAmount?: number;
  blocked?: boolean;
}

function genOrderNumber(): string {
  const yr = new Date().getFullYear();
  const rnd = Math.floor(100000 + Math.random() * 900000);
  return `RK-${yr}-${rnd}`;
}

async function checkUserBlocked(userId?: string | null): Promise<boolean> {
  if (!userId) return false;
  try {
    const { data } = await supabase.from('profiles').select('is_blocked').eq('id', userId).single();
    return data?.is_blocked === true;
  } catch {
    return false;
  }
}

async function incrementCouponUsage(promoCode?: string | null) {
  if (!promoCode) return;
  try {
    await supabase.rpc('increment_coupon_usage', { p_code: promoCode });
  } catch {
    // best-effort
  }
}

async function decrementStock(cartItems: CartItem[]) {
  for (const item of cartItems) {
    if (!item?.id || !item?.qty) continue;
    try {
      const { error } = await supabase.rpc('decrement_stock', { p_product_id: item.id, p_qty: item.qty });
      if (error && (String(error.code) === '42883' || String(error.code) === 'PGRST202')) {
        const { data: prod } = await supabase.from('products').select('id,stock_quantity').eq('id', item.id).single();
        if (prod) {
          const newQty = Math.max(0, (prod.stock_quantity || 0) - item.qty);
          await supabase
            .from('products')
            .update({ stock_quantity: newQty, updated_at: new Date().toISOString() })
            .eq('id', item.id);
        }
      }
    } catch {
      // best-effort
    }
  }
}

/** Legacy direct-insert path (used only when create_order RPC is missing) */
async function legacyCreateOrder(userId: string | null, opts: CreateOrderOpts): Promise<CreateOrderResult | null> {
  const { cart, total, address, paymentMethod, promoCode = null, discount = 0 } = opts;
  const orderNumber = genOrderNumber();
  const locationFields =
    opts.latitude != null
      ? {
          latitude: opts.latitude,
          longitude: opts.longitude,
          distance_km: opts.distance_km ?? null,
          delivery_charge: opts.delivery_charge || 0,
          delivery_status: opts.delivery_status || 'unknown',
          maps_link: opts.maps_link || null,
          maps_nav_link: opts.maps_nav_link || null,
          location_accuracy: opts.location_accuracy ?? null,
        }
      : { delivery_charge: 0, delivery_status: 'unknown' };
  const finalAmount = Math.max(0, total - discount + (locationFields.delivery_charge || 0));

  const { data: order, error: oErr } = await supabase
    .from('orders')
    .insert({
      user_id: userId || null,
      order_number: orderNumber,
      status: 'pending',
      payment_method: paymentMethod,
      payment_status: 'pending',
      subtotal: total,
      discount,
      promo_code: promoCode,
      final_amount: finalAmount,
      delivery_name: address.name,
      delivery_phone: address.phone,
      delivery_line1: address.line1,
      delivery_line2: address.line2 || '',
      delivery_city: address.city || 'Prayagraj',
      delivery_pincode: address.pincode || '',
      ...locationFields,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .select()
    .single();
  if (oErr) return null;

  const items = cart.map((item) => ({
    order_id: order.id,
    product_id: item.id,
    name: item.name,
    unit: item.unit,
    emoji: item.e,
    category: item.cat || 'General',
    price: item.price,
    old_price: item.old || null,
    qty: item.qty,
    line_total: item.price * item.qty,
  }));
  const { error: iErr } = await supabase.from('order_items').insert(items);
  if (iErr) console.error('[Orders] legacy items:', iErr.message);

  await decrementStock(cart);
  if (promoCode) await incrementCouponUsage(promoCode);

  return { orderId: order.id, orderNumber };
}

/** Main createOrder — server-side verified via create_order RPC (mirror orders.js) */
export async function createOrder(userId: string | null, opts: CreateOrderOpts): Promise<CreateOrderResult | null> {
  const { cart, address, paymentMethod, promoCode = null } = opts;
  if (!cart?.length) return null;

  const isBlocked = await checkUserBlocked(userId);
  if (isBlocked) return { blocked: true, orderId: '', orderNumber: '' };

  try {
    const { data, error } = await supabase.rpc('create_order', {
      p_user_id: userId || null,
      p_cart: cart.map((i) => ({ id: i.id, qty: i.qty, e: i.e || null, unit: i.unit || i.variant || null })),
      p_address: {
        name: address.name,
        phone: address.phone,
        line1: address.line1,
        line2: address.line2 || '',
        city: address.city || 'Prayagraj',
        pincode: address.pincode || '',
      },
      p_payment_method: paymentMethod,
      p_promo_code: promoCode || null,
      p_latitude: opts.latitude ?? null,
      p_longitude: opts.longitude ?? null,
      p_distance_km: opts.distance_km ?? null,
      p_delivery_charge: opts.delivery_charge || 0,
      p_delivery_status: opts.delivery_status || 'unknown',
      p_maps_link: opts.maps_link || null,
      p_maps_nav_link: opts.maps_nav_link || null,
      p_location_accuracy: opts.location_accuracy ?? null,
    });

    if (error) {
      if (String(error.code) === '42883' || String(error.code) === 'PGRST202') {
        return await legacyCreateOrder(userId, opts);
      }
      console.error('[Orders] createOrder rpc:', error.message);
      return null;
    }
    return {
      orderId: data.order_id,
      orderNumber: data.order_number,
      subtotal: data.subtotal,
      discount: data.discount,
      finalAmount: data.final_amount,
    };
  } catch (e: any) {
    console.error('[Orders] createOrder exception:', e?.message || e);
    return null;
  }
}

export async function loadOrderHistory(userId: string | null, limit = 30): Promise<OrderSummary[]> {
  if (!userId) return [];
  const { data, error } = await supabase
    .from('orders')
    .select('id, order_number, status, payment_method, payment_status, final_amount, created_at')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(limit);
  if (error) return [];
  return (data || []) as OrderSummary[];
}

export async function getOrderDetails(orderId: string): Promise<Order | null> {
  if (!orderId) return null;
  const { data: order, error: oErr } = await supabase.from('orders').select('*').eq('id', orderId).single();
  if (oErr) return null;
  const { data: items } = await supabase.from('order_items').select('*').eq('order_id', orderId);
  return { ...order, items: (items || []) as OrderItem[] } as Order;
}

/** Subscribe to live order status updates (admin changes reflect instantly) */
export function subscribeToOrder(orderId: string, onChange: (order: Order) => void): () => void {
  const ch = supabase
    .channel(`order-rt-${orderId}`)
    .on(
      'postgres_changes',
      { event: 'UPDATE', schema: 'public', table: 'orders', filter: `id=eq.${orderId}` },
      async (payload) => {
        const fresh = await getOrderDetails(orderId);
        if (fresh) onChange(fresh);
      }
    )
    .subscribe();
  return () => {
    supabase.removeChannel(ch);
  };
}

/** Reorder — merge mode with fresh prices + stock cap (mirror orders.js reorder) */
export function useReorder() {
  const { addToCart } = useCart();

  const reorder = useCallback(
    async (order: Order): Promise<CartItem[]> => {
      const items = order.items || [];
      if (!items.length) return [];
      const ids = items.map((i) => i.product_id).filter(Boolean);

      let freshPrices: Record<string, any> = {};
      if (ids.length) {
        const { data: fresh } = await supabase
          .from('products')
          .select('id,name,selling_price,unit_value,is_active,stock_quantity,units,product_images(image_url,is_default,sort_order)')
          .in('id', ids);
        (fresh || []).forEach((p: any) => {
          freshPrices[p.id] = p;
        });
      }

      const products = items.map((i) => {
        const fresh = freshPrices[i.product_id || ''];
        const savedUnit = i.unit || '';
        const unitMatch =
          fresh?.units && Array.isArray(fresh.units)
            ? fresh.units.find((u: any) => String(u.label || '') === savedUnit)
            : null;
        const stock = unitMatch
          ? typeof unitMatch.stock === 'number'
            ? unitMatch.stock
            : fresh?.stock_quantity ?? 0
          : fresh
          ? fresh.stock_quantity ?? 0
          : 0;
        const imgs = (fresh?.product_images || []).slice().sort((a: any, b: any) => a.sort_order - b.sort_order);
        const img = (imgs.find((x: any) => x.is_default) || imgs[0])?.image_url || null;
        return {
          id: i.product_id || '',
          name: fresh?.name || i.name,
          unit: unitMatch ? unitMatch.label : fresh?.unit_value || i.unit,
          variant: unitMatch ? unitMatch.label : null,
          price: unitMatch ? unitMatch.price : fresh?.selling_price ?? i.price,
          old: unitMatch?.mrp ?? i.old_price,
          e: i.emoji,
          cat: i.category,
          image: img,
          qty: i.qty || 1,
          _unavailable: !fresh || !fresh.is_active || stock <= 0,
          _stock: stock,
        } as CartItem & { _unavailable: boolean; _stock: number };
      });

      for (const p of products) {
        if (p._unavailable) continue;
        const qty = Math.min(p.qty, Math.max(p._stock, 1));
        const { _unavailable, _stock, ...clean } = p as any;
        for (let q = 0; q < qty; q++) await addToCart(clean);
      }
      return products;
    },
    [addToCart]
  );

  return { reorder };
}

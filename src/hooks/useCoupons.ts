/**
 * useCoupons — coupon validation (full port of the website's useCouponValidator).
 * Checks: active, expiry, usage limit, min order, customer/product/category targeting.
 */
import { useCallback, useState } from 'react';
import { supabase } from '@/lib/supabase';
import type { CouponValidation } from '@/lib/types';

export function useCouponValidator() {
  const [checking, setChecking] = useState(false);

  const validate = useCallback(
    async (code: string, orderTotal: number, ctx: { userId?: string | null; productIds?: string[] } = {}): Promise<CouponValidation> => {
      const clean = (code || '').trim().toUpperCase();
      if (!clean) return { valid: false, reason: 'Coupon code daalein' };
      setChecking(true);
      const { data, error } = await supabase
        .from('coupons')
        .select('*')
        .eq('code', clean)
        .eq('is_active', true)
        .maybeSingle();
      setChecking(false);

      if (error || !data) return { valid: false, reason: 'Coupon code valid nahi hai' };
      if (data.expiry_date && new Date(data.expiry_date) < new Date(new Date().toDateString()))
        return { valid: false, reason: 'Coupon expire ho chuka hai' };
      if (data.usage_limit != null && (data.used_count || 0) >= data.usage_limit)
        return { valid: false, reason: 'Coupon ki usage limit khatam ho gayi' };
      if (data.min_order && orderTotal < data.min_order)
        return { valid: false, reason: `Minimum order ₹${data.min_order} hona chahiye` };

      // ── Targeting (customer / product / category specific) ──
      const customerIds = data.customer_ids || [];
      if (customerIds.length) {
        if (!ctx.userId || !customerIds.includes(ctx.userId))
          return { valid: false, reason: 'Ye coupon aapke account ke liye nahi hai' };
      }
      const productIds = ctx.productIds || [];
      const catIds: string[] = [];
      if ((data.product_ids || []).length || (data.category_ids || []).length) {
        if (!productIds.length)
          return { valid: false, reason: 'Ye coupon specific products ke liye hai — cart mein kuch daalein' };
        if ((data.category_ids || []).length) {
          const { data: prods } = await supabase.from('products').select('id,category_id').in('id', productIds);
          (prods || []).forEach((p: any) => {
            if (p.category_id) catIds.push(p.category_id);
          });
        }
        const inProducts = (data.product_ids || []).length
          ? productIds.some((id) => (data.product_ids || []).includes(id))
          : true;
        const inCats = (data.category_ids || []).length ? catIds.some((id) => (data.category_ids || []).includes(id)) : true;
        if (!inProducts || !inCats) return { valid: false, reason: 'Ye coupon aapke cart ke items par nahi chalta' };
      }

      const discount =
        data.discount_type === 'percent' ? Math.round(orderTotal * (data.discount_value / 100)) : data.discount_value;
      const finalDiscount = Math.min(discount, orderTotal);
      return { valid: true, code: data.code, discount: finalDiscount, coupon: data };
    },
    []
  );

  return { validate, checking };
}

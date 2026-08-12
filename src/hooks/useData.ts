/**
 * useData.ts — data hooks ported from the website's dataHooks.js.
 * Same queries + client-side enrichment (discount, primary_image).
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { calcDiscount } from '@/lib/helpers';
import type { Banner, Category, Product, Review } from '@/lib/types';

export interface EnrichedProduct extends Product {
  discount: number | null;
  images: NonNullable<Product['product_images']>;
  primary_image: string | null;
}

function enrichProduct(p: Product): EnrichedProduct {
  const imgs = (p.product_images || []).slice().sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0));
  return {
    ...p,
    discount: calcDiscount(p.selling_price, p.original_price),
    images: imgs,
    primary_image: (imgs.find((i) => i.is_default) || imgs[0])?.image_url || null,
  };
}

/* ── Categories ─────────────────────────────────────────── */
export function useCategories() {
  const [cats, setCats] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const fetch = useCallback(async () => {
    const { data } = await supabase
      .from('categories')
      .select('*,category_images(id,image_url,is_default,sort_order)')
      .eq('is_active', true)
      .order('sort_order');
    const enriched = (data || []).map((c: any) => {
      const imgs = (c.category_images || []).slice().sort((a: any, b: any) => a.sort_order - b.sort_order);
      const defImg = imgs.find((i: any) => i.is_default) || imgs[0];
      return { ...c, display_image: defImg?.image_url || c.image_url || null };
    });
    setCats(enriched);
    setLoading(false);
  }, []);
  useEffect(() => {
    fetch();
  }, [fetch]);
  return { cats, loading, refetch: fetch };
}

/* ── Banners ───────────────────────────────────────────── */
export function useBanners() {
  const [banners, setBanners] = useState<Banner[]>([]);
  const [loading, setLoading] = useState(true);
  const fetch = useCallback(async () => {
    const { data } = await supabase.from('banners').select('*').eq('is_active', true).order('sort_order');
    setBanners(data || []);
    setLoading(false);
  }, []);
  useEffect(() => {
    fetch();
  }, [fetch]);
  return { banners, loading, refetch: fetch };
}

/* ── Products (category / featured / search / pagination) ─ */
export function useProducts(options: {
  categoryId?: string | null;
  featured?: boolean;
  search?: string;
  page?: number;
  pageSize?: number;
  enabled?: boolean;
}) {
  const { categoryId, featured, search, page = 1, pageSize = 24, enabled = true } = options;
  const [products, setProducts] = useState<EnrichedProduct[]>([]);
  const [loading, setLoading] = useState(enabled);
  const [total, setTotal] = useState(0);
  const loadId = useRef(0);
  // Pagination append: page 1 reset, page 2+ same query par append karo
  const querySigRef = useRef('');

  const fetch = useCallback(async () => {
    const fid = ++loadId.current;
    setLoading(true);
    try {
      let q = supabase
        .from('products')
        .select('*,categories(id,name,slug),product_images(id,image_url,is_default,sort_order)', { count: 'exact' })
        .eq('is_active', true)
        .order('created_at', { ascending: false });
      if (categoryId && categoryId !== 'all') q = q.eq('category_id', categoryId);
      if (featured) q = q.eq('is_featured', true);
      if (search && search.trim().length > 1) {
        // double-quote wrap (PostgREST) — parentheses wale names safe
        q = q.or(`name.ilike."%${search.trim()}%",description.ilike."%${search.trim()}%"`);
      }
      const from = (page - 1) * pageSize;
      q = q.range(from, from + pageSize - 1);
      const { data, count } = await q;
      if (fid !== loadId.current) return;
      const sig = `${categoryId}|${featured}|${search}|${pageSize}`;
      const sameQuery = querySigRef.current === sig;
      querySigRef.current = sig;
      // Page 1 ya query change → replace; page 2+ same query → append
      setProducts((prev) => {
        const fresh = (data || []).map(enrichProduct);
        if (page <= 1 || !sameQuery) return fresh;
        const seen = new Set(prev.map((p) => p.id));
        return [...prev, ...fresh.filter((p) => !seen.has(p.id))];
      });
      setTotal(count || 0);
    } catch {
      if (fid === loadId.current) setProducts([]);
    } finally {
      if (fid === loadId.current) setLoading(false);
    }
  }, [categoryId, featured, search, page, pageSize]);

  useEffect(() => {
    if (!enabled) {
      setLoading(false);
      return;
    }
    fetch();
  }, [fetch, enabled]);

  return { products, loading, total, totalPages: Math.ceil(total / pageSize), refetch: fetch };
}

/* ── Search (debounced, mirror useSearch) ──────────────── */
export function useSearch(query: string, active: boolean) {
  const [results, setResults] = useState<EnrichedProduct[]>([]);
  const [loading, setLoading] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!active || !query || query.trim().length < 2) {
      setResults([]);
      return;
    }
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(async () => {
      setLoading(true);
      const { data } = await supabase
        .from('products')
        .select('*,categories(name),product_images(id,image_url,is_default,sort_order)')
        .eq('is_active', true)
        .or(`name.ilike."%${query.trim()}%",description.ilike."%${query.trim()}%"`)
        .limit(40);
      setResults((data || []).map(enrichProduct));
      setLoading(false);
    }, 350);
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, [query, active]);

  return { results, loading };
}

/* ── Homepage premium sections (single query, mirror useHomeSections) ── */
export interface HomeSections {
  flash: EnrichedProduct[];
  deals: EnrichedProduct[];
  bestSellers: EnrichedProduct[];
  newArrivals: EnrichedProduct[];
}
export function useHomeSections() {
  const [sections, setSections] = useState<HomeSections>({ flash: [], deals: [], bestSellers: [], newArrivals: [] });
  const [loading, setLoading] = useState(true);
  const fetch = useCallback(async () => {
    try {
      const { data } = await supabase
        .from('products')
        .select('*,categories(id,name,slug),product_images(id,image_url,is_default,sort_order)')
        .eq('is_active', true)
        .order('is_featured', { ascending: false })
        .order('created_at', { ascending: false })
        .limit(80);
      const enriched = (data || []).map(enrichProduct);
      const inStock = enriched.filter((p) => (p.stock_quantity ?? 0) > 0);
      const flaggedFlash = inStock.filter((p) => p.is_flash_sale);
      const flashSource = flaggedFlash.length ? flaggedFlash : inStock.filter((p) => (p.discount ?? 0) >= 20);
      setSections({
        flash: flashSource.sort((a, b) => (b.discount ?? 0) - (a.discount ?? 0)).slice(0, 8),
        deals: inStock.filter((p) => (p.discount ?? 0) > 0).sort((a, b) => (b.discount ?? 0) - (a.discount ?? 0)).slice(0, 8),
        bestSellers: (
          inStock.filter((p) => p.is_bestseller || p.is_trending).length
            ? [...inStock.filter((p) => p.is_bestseller || p.is_trending), ...inStock]
            : inStock
        ).slice(0, 8),
        newArrivals: (enriched.some((p) => p.is_new_arrival) ? enriched.filter((p) => p.is_new_arrival) : enriched)
          .sort((a, b) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime())
          .slice(0, 8),
      });
    } catch {
      // keep previous
    }
    setLoading(false);
  }, []);
  useEffect(() => {
    fetch();
  }, [fetch]);
  return { sections, loading, refetch: fetch };
}

/* ── Homepage builder config (mirror useHomepageConfig) ── */
export type HomeSectionItem =
  | string
  | { key: string; ad_strip_id: string | null; category_id: string | null; enabled: boolean };

export const DEFAULT_HOMEPAGE_SECTIONS: HomeSectionItem[] = [
  'hero',
  'flash_sale',
  'today_deals',
  'categories',
  'featured',
  'best_sellers',
  'new_arrivals',
  'category_sections',
  'why_choose_us',
  'reviews',
  'download_app',
  'newsletter',
  'how_it_works',
];

export function useHomepageConfig() {
  const [sections, setSections] = useState<HomeSectionItem[]>(DEFAULT_HOMEPAGE_SECTIONS);
  const fetch = useCallback(async () => {
    try {
      // Saare rows (enabled + disabled) — aggregate fallback ko pata ho ki kis
      // category ka apna row hai. Rendering index.tsx me enabled filter karta hai.
      const { data, error } = await supabase
        .from('homepage_sections')
        .select('section_key,enabled,sort_order,ad_strip_id,category_id')
        .order('sort_order');
      if (!error && data && data.length)
        setSections(
          data.map((s) => ({
            key: s.section_key,
            ad_strip_id: s.ad_strip_id || null,
            category_id: s.category_id || null,
            enabled: s.enabled !== false,
          }))
        );
      else setSections(DEFAULT_HOMEPAGE_SECTIONS);
    } catch {
      setSections(DEFAULT_HOMEPAGE_SECTIONS);
    }
  }, []);
  useEffect(() => {
    fetch();
  }, [fetch]);
  return { sections, refetch: fetch };
}

/* ── Homepage Ad Strips (auto-scroll images, no text/dots) ── */
export interface AdStrip {
  id: string;
  title: string;
  position: number;
  images: { id: string; image_url: string; link_type: 'none' | 'category' | 'product'; link_value: string | null; sort_order: number }[];
}
export function useAdStrips() {
  const [strips, setStrips] = useState<AdStrip[]>([]);
  const [loading, setLoading] = useState(true);
  const fetch = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('homepage_ad_sections')
        .select('id,title,position,homepage_ad_images(id,image_url,link_type,link_value,sort_order)')
        .eq('is_active', true)
        .order('position', { ascending: true });
      if (error) return;
      const out = (data || [])
        .map((s: any) => ({
          id: s.id,
          title: s.title,
          position: s.position,
          images: (s.homepage_ad_images || []).sort((a: any, b: any) => a.sort_order - b.sort_order),
        }))
        .filter((s) => s.images.length > 0);
      setStrips(out);
    } catch {
      // keep []
    }
    setLoading(false);
  }, []);
  useEffect(() => {
    fetch();
  }, [fetch]);
  return { strips, loading, refetch: fetch };
}

/* ── Customer reviews (approved only, mirror useReviews) ── */
export function useReviews() {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const fetch = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('reviews')
        .select('customer_name,rating,comment,admin_reply,products(name)')
        .eq('status', 'approved')
        .order('created_at', { ascending: false })
        .limit(12);
      if (!error) setReviews((data || []) as unknown as Review[]);
    } catch {
      // keep []
    }
    setLoading(false);
  }, []);
  useEffect(() => {
    fetch();
  }, [fetch]);
  return { reviews, loading, refetch: fetch };
}

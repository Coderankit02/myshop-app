/**
 * types.ts — shared data types (mirror the Supabase schema used by the site)
 */

export interface Category {
  id: string;
  name: string;
  slug?: string | null;
  icon_emoji?: string | null;
  image_url?: string | null;
  is_active?: boolean;
  sort_order?: number;
  display_image?: string | null;
  category_images?: { id: string; image_url: string; is_default?: boolean; sort_order?: number }[];
}

export interface ProductImage {
  id: string;
  image_url: string;
  is_default?: boolean;
  sort_order?: number;
}

export interface ProductUnit {
  label: string;
  price: number;
  mrp?: number | null;
  stock?: number;
}

export interface Product {
  id: string;
  name: string;
  description?: string | null;
  selling_price: number;
  original_price?: number | null;
  stock_quantity?: number;
  unit_value?: string | null;
  category_id?: string | null;
  is_active?: boolean;
  is_featured?: boolean;
  is_flash_sale?: boolean;
  is_bestseller?: boolean;
  is_trending?: boolean;
  is_new_arrival?: boolean;
  created_at?: string;
  categories?: { id: string; name: string; slug?: string | null } | null;
  product_images?: ProductImage[];
  units?: ProductUnit[];
  // enriched (client-side)
  discount?: number | null;
  images?: ProductImage[];
  primary_image?: string | null;
}

export interface Banner {
  id: string;
  title: string;
  subtitle?: string | null;
  image_url?: string | null;
  bg_gradient?: string | null;
  button_text?: string | null;
  is_active?: boolean;
  sort_order?: number;
}

export interface ShopSettings {
  shop_name: string;
  contact: string;
  whatsapp: string;
  upi_id: string;
  delivery_radius: number;
  delivery_charge: number;
  open_time: string;
  close_time: string;
  logo_url: string;
  favicon_url: string;
  theme_color: string;
  social_facebook: string;
  social_instagram: string;
  social_whatsapp: string;
  social_youtube: string;
  footer_text: string;
  about_text: string;
  privacy_policy: string;
  terms_text: string;
  shipping_rules: string;
  announcement: string;
}

export interface CartItem {
  id: string;
  name: string;
  unit?: string | null;
  price: number;
  old?: number | null;
  e?: string | null;
  cat?: string | null;
  bg?: string | null;
  qty: number;
  image?: string | null;
  variant?: string | null;
  k?: string; // line key: id or `id::variant`
}

export interface Address {
  id: string;
  user_id: string;
  label: string;
  line1: string;
  line2?: string | null;
  city: string;
  pincode: string;
  is_default?: boolean;
  created_at?: string;
}

export interface OrderSummary {
  id: string;
  order_number: string;
  status: string;
  payment_method: string;
  payment_status: string;
  final_amount: number;
  created_at: string;
}

export interface OrderItem {
  id: string;
  order_id: string;
  product_id?: string | null;
  name: string;
  unit?: string | null;
  emoji?: string | null;
  category?: string | null;
  price: number;
  old_price?: number | null;
  qty: number;
  line_total: number;
}

export interface Order {
  id: string;
  order_number: string;
  user_id?: string | null;
  status: string;
  payment_method: string;
  payment_status: string;
  subtotal: number;
  discount: number;
  promo_code?: string | null;
  delivery_charge: number;
  final_amount: number;
  delivery_name?: string | null;
  delivery_phone?: string | null;
  delivery_line1?: string | null;
  delivery_line2?: string | null;
  delivery_city?: string | null;
  delivery_pincode?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  distance_km?: number | null;
  delivery_status?: string | null;
  admin_review_needed?: boolean;
  notes?: string | null;
  created_at: string;
  updated_at?: string;
  items?: OrderItem[];
}

export interface Review {
  customer_name?: string | null;
  rating?: number;
  comment?: string | null;
  admin_reply?: string | null;
  products?: { name?: string } | null;
}

export interface DeliveryInfo {
  distanceKm: number;
  distanceRaw: number;
  charge: number;
  available: boolean;
  tier: { id: string; maxKm: number; charge: number; label: string; emoji: string; eta: string | null; available: boolean };
  label: string;
  emoji: string;
  eta: string | null;
  mapsLink: string;
  mapsNavLink: string;
}

export interface CouponValidation {
  valid: boolean;
  reason?: string;
  code?: string;
  discount?: number;
  coupon?: Record<string, unknown>;
}

export type UserProfile = {
  id: string;
  name: string;
  email: string;
  phone?: string | null;
  avatar_url?: string | null;
  is_blocked?: boolean;
  created_at?: string | null;
};

export interface ChatMessage {
  id?: string;
  session_id: string;
  role: 'user' | 'assistant' | 'admin';
  content: string;
  created_at: string;
}

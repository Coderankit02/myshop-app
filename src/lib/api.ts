/**
 * api.ts — serverless API clients
 * Reuses the EXISTING myshop Vercel functions (no new backend):
 *   /api/razorpay-order   → server-side Razorpay order creation (+ total verify)
 *   /api/razorpay-verify  → payment signature verification (+ marks order paid)
 *   /api/chat             → Ananya AI (Gemini + Supabase product lookup)
 */
import { API_BASE } from './config';

async function post(path: string, body: unknown) {
  const res = await fetch(`${API_BASE}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  let data: any = null;
  try {
    data = await res.json();
  } catch {
    data = {};
  }
  return { ok: res.ok, status: res.status, data };
}

export interface RazorpayOrderPayload {
  amount: number; // paise
  receipt?: string;
  orderId: string; // Supabase order id — server verifies total from DB
  notes?: Record<string, string>;
}

export async function createRazorpayOrder(payload: RazorpayOrderPayload) {
  const { ok, status, data } = await post('/api/razorpay-order', {
    amount: payload.amount,
    receipt: payload.receipt,
    orderId: payload.orderId,
    notes: payload.notes,
  });
  if (!ok || !data?.orderId) {
    throw new Error(data?.error || `Razorpay order create failed (${status})`);
  }
  return { orderId: data.orderId, keyId: data.keyId, amount: data.amount, currency: data.currency || 'INR' };
}

export interface RazorpayVerifyPayload {
  orderId: string;
  orderNumber: string;
  razorpay_order_id: string;
  razorpay_payment_id: string;
  razorpay_signature: string;
  amount: number;
  userId?: string | null;
  customer_name: string;
  mobile: string;
}

export async function verifyRazorpayPayment(payload: RazorpayVerifyPayload) {
  const { data } = await post('/api/razorpay-verify', payload);
  return data as { verified?: boolean; error?: string };
}

/* ═══════════════════════════════════════════════════════
   ANANYA AI — /api/chat
   Same payload as the website widget: { message, sessionId,
   accessToken, history: [{role, content}] }
═══════════════════════════════════════════════════════ */
export interface ChatHistoryItem {
  role: 'user' | 'assistant';
  content: string;
}

export async function fetchAnanyaReply(opts: {
  message: string;
  sessionId: string | null;
  accessToken: string | null;
  history: ChatHistoryItem[];
}): Promise<{ reply: string }> {
  const res = await fetch(`${API_BASE}/api/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(opts),
  });
  let data: any = null;
  try {
    data = await res.json();
  } catch {
    data = {};
  }
  if (!res.ok && !data?.reply) throw new Error(`Chat backend error ${res.status}`);
  return { reply: data.reply || 'Sorry, abhi connect nahi ho pa raha 🙏' };
}

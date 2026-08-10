/**
 * payment.ts — Razorpay checkout service
 * Primary: native `razorpay-checkout` module (EAS production builds).
 * Fallback: WebView-based checkout (checkout.js) — works in Expo Go too.
 */
import { RAZORPAY_KEY_ID, STORE_NAME } from './config';

declare global {
  interface Window {
    ReactNativeWebView?: { postMessage: (msg: string) => void };
  }
}

export interface RazorpayOptions {
  amount: number; // paise
  order_id: string; // Razorpay order id
  currency?: string;
  description?: string;
  prefill?: { name?: string; contact?: string; email?: string };
  themeColor?: string;
}

export interface RazorpaySuccess {
  razorpay_payment_id: string;
  razorpay_order_id: string;
  razorpay_signature: string;
}

/**
 * Try the native razorpay-checkout module. Returns null when the native
 * module isn't available (Expo Go / missing prebuild) so callers can
 * fall back to the WebView checkout.
 */
export async function openNativeRazorpay(options: RazorpayOptions): Promise<RazorpaySuccess | null> {
  let mod: any;
  try {
    // Lazy require — keeps Expo Go from crashing on module resolution
    mod = require('razorpay-checkout');
  } catch {
    return null; // native module unavailable (Expo Go) → WebView fallback
  }
  const Checkout = mod?.default || mod;
  if (!Checkout || typeof Checkout.open !== 'function') return null;
  // Payment failure / cancellation REJECTS here — caller handles it. We only
  // fall back to WebView when the module itself is missing, never after a
  // real payment attempt (double payment sheet would be terrible UX).
  return (await Checkout.open({
    key: RAZORPAY_KEY_ID,
    amount: String(options.amount),
    currency: options.currency || 'INR',
    name: STORE_NAME,
    description: options.description || '',
    order_id: options.order_id,
    prefill: options.prefill || {},
    theme: { color: options.themeColor || '#15803D' },
    method: { netbanking: true, card: true, upi: true, wallet: true },
  })) as RazorpaySuccess;
}

/** HTML for the WebView fallback checkout (Razorpay checkout.js) */
export function razorpayWebViewHtml(options: RazorpayOptions): string {
  const opts = {
    key: RAZORPAY_KEY_ID,
    amount: options.amount,
    currency: options.currency || 'INR',
    name: STORE_NAME,
    description: options.description || '',
    order_id: options.order_id,
    prefill: options.prefill || {},
    theme: { color: options.themeColor || '#15803D' },
    modal: {
      ondismiss: () => {
        window.ReactNativeWebView && window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'dismiss' }));
      },
    },
    handler: (resp: any) => {
      window.ReactNativeWebView &&
        window.ReactNativeWebView.postMessage(
          JSON.stringify({
            type: 'success',
            payload: {
              razorpay_payment_id: resp.razorpay_payment_id,
              razorpay_order_id: resp.razorpay_order_id,
              razorpay_signature: resp.razorpay_signature,
            },
          })
        );
    },
  };
  return `<!DOCTYPE html>
<html>
<head>
<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1">
<script src="https://checkout.razorpay.com/v1/checkout.js"></script>
<style>body{margin:0;font-family:sans-serif}</style>
</head>
<body>
<script>
try {
  var options = ${JSON.stringify(opts)};
  var rzp = new Razorpay(options);
  rzp.on('payment.failed', function(resp){
    window.ReactNativeWebView.postMessage(JSON.stringify({type:'failed', error: resp.error}));
  });
  rzp.open();
} catch (e) {
  window.ReactNativeWebView.postMessage(JSON.stringify({type:'error', error: String(e)}));
}
</script>
</body>
</html>`;
}

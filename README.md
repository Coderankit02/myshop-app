# 🛒 Rinku Kirana Store — Android App (React Native / Expo)

Customer app for **https://rinkukiranastore.vercel.app** — full feature parity with the
website, rebuilt natively with **React Native (Expo SDK 57) + expo-router + Supabase**.

> Uses the **same Supabase project, same serverless APIs** (`/api/razorpay-order`,
> `/api/razorpay-verify`, `/api/chat`) — **no new backend was created.**

---

## ✨ Features (website ke saath 100% parity + improvements)

| Area | Details |
|---|---|
| 🏠 **Home** | Banners carousel, Flash Sale (countdown), Today's Deals, Categories rail, Featured/Best Sellers/New Arrivals, per-category sections, Reviews, Newsletter, How It Works — admin `homepage_sections` order respected |
| 🛍️ **Shop** | Search (debounced), category chips, sort (price ↑↓), "In stock only" filter, infinite scroll pagination |
| 📄 **Product** | Image gallery, **multi-unit variants** (1/2kg, 1kg…), discount badge, stock check, wishlist, related products |
| 🛒 **Cart** | Guest (AsyncStorage) + logged-in (Supabase `cart_items`) + **merge on login**, variant line-keys (`id::variant`) |
| 💳 **Checkout** | Saved addresses + add new, **GPS delivery-radius check** (Haversine + live admin settings), coupons (full validation: expiry/usage/targeting), **Razorpay online** (native module + WebView fallback), **UPI QR** (amount-embedded, screenshot + UTR verify), **COD** |
| 📦 **Orders** | History, **live status updates (realtime)**, order detail, reorder with fresh prices + stock cap |
| 🔔 **Price Alerts** | Product detail + wishlist par bell toggle (`price_alerts` table), price-drop / back-in-stock notification |
| 👤 **Account** | Profile edit (**avatar photo upload** — Cloudinary, site jaisa), addresses manage, wishlist (**Add All to Cart** + per-item price alerts), **Alerts** (`notifications` table, mark read), **Rewards & Referral** (loyalty points, ₹30 referral cashback, WhatsApp share), theme toggle (dark/light + admin theme color), logout, About/Terms/Privacy/Shipping pages |
| 📊 **Analytics** | Screen-view tracking → same `page_views` table (site analytics.js jaisa — visitor id + 30-min throttle), admin dashboard me app traffic bhi dikhti hai |
| ⏱️ **Orders (detail)** | **Status timeline** (Placed → Confirmed → Out for Delivery → Delivered, cancelled-aware) + **Buy Again** button delivered orders par |
| 🏪 **Store Info** | About Us / Privacy Policy / Terms / Delivery pages — shop_settings se LIVE (site footer jaisa), social links, Share App card (home `download_app` section ka native version) |
| 🌸 **Ananya AI** | Instant local FAQ intents → `/api/chat` (Gemini + Supabase product search), sessions saved to `ananya_chat_sessions/messages`, **live admin replies via realtime** |
| 🔔 **Push** | expo-notifications — client registration ready (server-side send documented below) |
| 🎨 **Design** | Poppins font, exact website color tokens (light + dark), admin `theme_color` accent |

---

## 📁 Structure

```
myshop-app/
├── app/ (src/app)            # expo-router routes
│   ├── (tabs)/               # Home · Shop · Cart · Orders · Account
│   ├── product/[id].tsx      # Product detail
│   ├── checkout.tsx          # Checkout (Razorpay/UPI/COD)
│   ├── order/[id].tsx        # Order detail (realtime)
│   ├── auth.tsx / forgot-password.tsx
│   ├── wishlist.tsx / addresses.tsx / profile.tsx
│   ├── notifications.tsx / rewards.tsx / info.tsx
│   └── support.tsx           # Ananya AI chat
├── src/
│   ├── lib/                  # supabase, api, payment, delivery, cloudinary, analytics, theme, helpers, config
│   ├── context/              # Theme, Toast, Auth, Cart, Settings, Wishlist, PriceAlert
│   ├── hooks/                # useData, useCoupons, useOrders, usePush
│   └── components/           # ProductCard, BannerCarousel, CategoryRail, UpiPayCard, …
├── app.json                  # app config (name, icons, android package)
├── eas.json                  # EAS build profiles
├── scripts/generate-icons.js # brand icons from website PWA icons (sharp)
└── .env                      # PUBLIC env vars (see .env.example)
```

---

## 🚀 Local Development

```bash
npm install
npx expo start          # QR scan karo Expo Go se (Android)
```

> **Note:** `razorpay-checkout` (native payment) + `react-native-webview` (fallback)
> ko **dev build** chahiye, Expo Go me nahi chalta. Expo Go me checkout ka
> **WebView fallback** automatic use hota hai. Full native payment test ke liye:

```bash
npx expo prebuild        # native android/ folder banao
npx expo run:android     # local Android build (Android Studio chahiye)
```

**Browser me preview** (bina phone ke dekhne ke liye):

```bash
npx expo start --web     # dev preview (http://localhost:8081)
npx expo export --platform web && npx serve dist   # production preview
```

> Web preview verified via puppeteer smoke test — home + shop live Supabase data
> se render hote hain, 0 console errors.

---

## 📦 Building the APK / AAB (EAS Cloud Build — is machine par kuch install nahi)

```bash
npm install -g eas-cli        # ek baar
eas login                     # aapka Expo account (free)

eas build --profile preview --platform android   # → installable APK (test ke liye)
eas build --profile production --platform android # → Play Store AAB (signed)
```

- Pehli baar build par EAS signing key generate karega — **key ko safe rakho** (yehi
  aapki app ki identity hai).
- Build progress: `eas build:list`

---

## 📱 Play Store Publish (step-by-step)

1. **Google Play Developer account** banao → https://play.google.com/console
   (ek baar ka **$25**).
2. `eas build --profile production --platform android` se signed **AAB** lo.
3. Play Console → **Create app** (name: Rinku Kirana Store, package:
   `com.rinkukiranastore.app`).
4. **Production → Create release** → AAB upload karo.
5. **Store listing** bharo:
   - Icon: 512×512 (website se: `../myshop/public/icons/icon-512.png`)
   - Screenshots: app ke screenshots (phone 5.5"–6.5")
   - Short description: "हर घर की पसंद — grocery, kirana aur daily essentials — fast delivery."
   - Category: **Shopping**
6. **Content rating** questionnaire + **Data safety** form bharo.
7. **Review request** → Google review ke baad app live! (usually 1–3 din)

---

## 🔔 Push Notifications (FCM setup — production ke liye zaroori)

> App me Android notification **small-icon** pehle se configured hai
> (`app.json` → `expo-notifications` plugin → `icon`), aur `default` channel
> `usePush.ts` me banaya jata hai — sirf `google-services.json` aur FCM key
> upload karna baki hai (niche steps).

Expo push Android production builds ke liye **Firebase Cloud Messaging (FCM)** chahiye:

1. https://console.firebase.google.com → project banao → **Add Android app**
   (package: `com.rinkukiranastore.app`) → `google-services.json` download karo
   aur **project root me rakh do**.
2. `app.json` me `android.googleServicesFile` add karo:
   ```json
   "android": {
     "package": "com.rinkukiranastore.app",
     "googleServicesFile": "./google-services.json"
   }
   ```
3. Re-build (EAS). Firebase → Project Settings → **Service Accounts** → Generate
   new private key → `eas credentials` me Android **FCM V1** key upload karo
   (ya EAS ko auto-handle karne do).
4. App already `expo-notifications` se device token register karti hai
   (`src/hooks/usePush.ts`) — token `AsyncStorage` me save hota hai.

**Server se send karna** (order status alerts ke liye — website ke `orderAlerts.js`
jaisa, sirf Expo Push API se):

```js
const { Expo } = require('expo-server-sdk');
const expo = new Expo();
await expo.sendPushNotificationsAsync([
  {
    to: 'ExponentPushToken[xxxx]',
    title: 'Order Confirmed ✅',
    body: 'Aapka order #RK-2026-123456 confirm ho gaya!',
    data: { orderId: '...' },
  },
]);
```

> Edge function / cron se admin ke order-update action par ye call karo. Device
> tokens ko ek `push_tokens` table me save karna ho to pehle DB schema dekhna
> (AGENTS.md rule: kabhi guess mat karo, pehle inspect).

---

## 💳 Razorpay — IMPORTANT

- App me abhi **TEST key** hai (`rzp_test_TLetzdnhKVTxvS` — `.env` me).
- Play Store release se pehle **LIVE key** chahiye:
  1. https://dashboard.razorpay.com → API Keys → Live keys on karo
  2. `myshop/.env` me `RAZORPAY_KEY_ID` / `RAZORPAY_KEY_SECRET` live se badlo
  3. Vercel (rinkukiranastore) ke env vars update karo + redeploy
  4. `myshop-app/.env` me `EXPO_PUBLIC_RAZORPAY_KEY_ID` live key daalo
- Payment flow website jaisa hi: server-side order create → verify (signature +
  amount DB se) — client kabhi decide nahi karta ki payment hui ya nahi.

---

## 🧪 Validation

```bash
npx tsc --noEmit          # TypeScript check (0 errors)
npm test                  # unit tests (36 tests — cart merge, delivery radius, helpers)
npx expo export --platform android   # Android bundle check
npx expo-doctor           # project health (20/20 ✓)
```

Unit tests (`src/lib/__tests__/`) cover the tricky business logic:

- **cart.test.ts** — line keys (`id` vs `id::variant`), guest→DB merge (higher qty wins,
  no input mutation), totals
- **delivery.test.ts** — Haversine accuracy, free/paid/unavailable tiers, Hinglish
  validation reason, maps links
- **helpers.test.ts** — discount %, INR formatting, phone/email validators, auth error
  translation, password strength

---

## ⚠️ Notes

- `.env` me sirf PUBLIC values hain (same jo website ke browser code me hain).
  `SUPABASE_SERVICE_ROLE_KEY` jaise secrets **kabhi** is repo me nahi aane chahiye.
- App icon / splash `scripts/generate-icons.js` se website ke PWA icons se bante hain
  (`npm i -D sharp` ek baar).
- Ananya AI chat history + sessions website ke saath **shared** hain (same tables) —
  admin ka Support page dono se replies dekh/kar sakta hai.

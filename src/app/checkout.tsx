/**
 * Checkout — full port of the website's CheckoutForm:
 * contact, saved addresses + add new, GPS delivery radius, coupon,
 * payment methods (Razorpay online / UPI QR verify / COD).
 */
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Location from 'expo-location';
import * as ImagePicker from 'expo-image-picker';
import { supabase } from '@/lib/supabase';
import { RAZORPAY_KEY_ID } from '@/lib/config';
import { useTheme } from '@/context/ThemeContext';
import { useAuth } from '@/context/AuthContext';
import { useCart } from '@/context/CartContext';
import { useSettings } from '@/context/SettingsContext';
import { useToast } from '@/context/ToastContext';
import { useCouponValidator } from '@/hooks/useCoupons';
import { createOrder, type CreateOrderOpts, type CreateOrderResult } from '@/hooks/useOrders';
import { createRazorpayOrder, verifyRazorpayPayment } from '@/lib/api';
import { openNativeRazorpay, razorpayWebViewHtml, type RazorpayOptions } from '@/lib/payment';
import { uploadScreenshot } from '@/lib/cloudinary';
import { calculateDelivery, loadDeliveryConfig, reverseGeocode } from '@/lib/delivery';
import { AppText } from '@/components/AppText';
import { PrimaryButton } from '@/components/PrimaryButton';
import { Field } from '@/components/Field';
import { UpiPayCard } from '@/components/UpiPayCard';
import { HeaderBar } from '@/components/HeaderBar';
import { inr, isPhoneValid, distLabel } from '@/lib/helpers';
import type { Address, DeliveryInfo } from '@/lib/types';
import { WebView } from 'react-native-webview';

type PayMethod = '' | 'razorpay' | 'upi' | 'cod';

export default function CheckoutScreen() {
  const { theme } = useTheme();
  const { user } = useAuth();
  const { cart, total, clearCart } = useCart();
  const { settings } = useSettings();
  const { showToast } = useToast();
  const router = useRouter();

  const { validate: validateCoupon, checking: couponChecking } = useCouponValidator();

  const [pay, setPay] = useState<PayMethod>('');
  const [f, setF] = useState({ name: user?.name || '', phone: user?.phone || '' });
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [loadingAddrs, setLoadingAddrs] = useState(true);
  const [selectedAddrId, setSelectedAddrId] = useState<string | null>(null);
  const [showNewForm, setShowNewForm] = useState(false);
  const [newAddr, setNewAddr] = useState({ label: 'Home', line1: '', line2: '', city: 'Jaunpur', pincode: '222001', is_default: false });
  const [savingAddr, setSavingAddr] = useState(false);
  const [phoneTouched, setPhoneTouched] = useState(false);
  const [placing, setPlacing] = useState(false);
  const [orderError, setOrderError] = useState('');
  const [orderInfo, setOrderInfo] = useState<{ orderId: string; orderNumber: string } | null>(null);

  // GPS / delivery
  const [locState, setLocState] = useState<'idle' | 'loading' | 'success' | 'denied' | 'error'>('idle');
  const [deliveryInfo, setDeliveryInfo] = useState<DeliveryInfo | null>(null);
  const [gpsPos, setGpsPos] = useState<{ lat: number; lng: number } | null>(null);

  // Coupon
  const [couponCode, setCouponCode] = useState('');
  const [appliedCoupon, setAppliedCoupon] = useState<{ code: string; discount: number } | null>(null);
  const [couponError, setCouponError] = useState('');
  const discount = appliedCoupon?.discount || 0;
  const deliveryCharge = deliveryInfo && deliveryInfo.available ? deliveryInfo.charge : 0;
  const finalAmount = Math.max(0, total - discount + deliveryCharge);

  // UPI verify phase — order UPI verification par hi create hota hai (site jaisa)
  const [phase, setPhase] = useState<'form' | 'upiVerify' | 'success'>('form');
  const [utr, setUtr] = useState('');
  const [screenshot, setScreenshot] = useState<{ uri: string } | null>(null);
  const [submittingVerify, setSubmittingVerify] = useState(false);
  const pendingUpiRef = useRef<CreateOrderOpts | null>(null);

  // Razorpay webview fallback
  const [webviewHtml, setWebviewHtml] = useState<string | null>(null);
  const rzpOrderRef = useRef<CreateOrderResult | null>(null);
  const rzpAmountRef = useRef(0);
  const rzpPending = useRef<{ resolve: (v: any) => void; reject: (e: any) => void } | null>(null);

  useEffect(() => {
    rzpOrderRef.current = null;
    rzpAmountRef.current = 0;
  }, [cart]);

  // Load saved addresses + profile
  useEffect(() => {
    let active = true;
    (async () => {
      if (!user) {
        setShowNewForm(false);
        setLoadingAddrs(false);
        return;
      }
      try {
        const [addrRes, profRes] = await Promise.all([
          supabase.from('addresses').select('*').eq('user_id', user.id).order('is_default', { ascending: false }).order('created_at', { ascending: false }),
          supabase.from('profiles').select('name,phone').eq('id', user.id).maybeSingle(),
        ]);
        if (!active) return;
        const addrs = (addrRes.data || []) as Address[];
        setAddresses(addrs);
        const def = addrs.find((a) => a.is_default) || addrs[0];
        if (def) {
          setSelectedAddrId(def.id);
          setShowNewForm(false);
        } else {
          setShowNewForm(true);
        }
        setF((prev) => ({ name: prev.name || profRes.data?.name || '', phone: prev.phone || profRes.data?.phone || '' }));
      } catch {
        if (active) setShowNewForm(true);
      } finally {
        if (active) setLoadingAddrs(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [user]);

  // GPS auto-trigger once an address is on screen (mirror CheckoutForm)
  useEffect(() => {
    if (loadingAddrs) return;
    if (!selectedAddrId && !showNewForm) return;
    if (locState !== 'idle') return;
    handleUseLocation();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loadingAddrs, selectedAddrId, showNewForm]);

  const handleUseLocation = useCallback(async () => {
    setLocState('loading');
    try {
      await loadDeliveryConfig();
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setLocState('denied');
        setDeliveryInfo(null);
        return;
      }
      const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      setGpsPos({ lat: pos.coords.latitude, lng: pos.coords.longitude });
      const info = calculateDelivery(pos.coords.latitude, pos.coords.longitude);
      setDeliveryInfo(info);
      setLocState('success');
      // Auto-fill address from reverse geocode if user hasn't picked one
      if (!selectedAddrId && !newAddr.line1) {
        const geo = await reverseGeocode(pos.coords.latitude, pos.coords.longitude);
        if (geo) {
          setNewAddr((prev) => ({ ...prev, line1: prev.line1 || geo.line1, city: prev.city || geo.city, pincode: prev.pincode || geo.pincode }));
          setShowNewForm(true);
        }
      }
    } catch {
      setLocState('error');
      setDeliveryInfo(null);
    }
  }, [selectedAddrId, newAddr.line1]);

  const isPhoneValid = /^[6-9]\d{9}$/.test(f.phone.trim());
  const selectedAddr = addresses.find((a) => a.id === selectedAddrId) || null;

  const saveNewAddress = async () => {
    if (!newAddr.line1.trim() || !newAddr.line2.trim() || !newAddr.city.trim() || !/^\d{6}$/.test(newAddr.pincode.trim())) {
      showToast('Address, landmark, city aur 6-digit pincode zaroori hai!');
      return;
    }
    if (!user) {
      showToast('Login zaroori hai!');
      return;
    }
    setSavingAddr(true);
    try {
      const { data, error } = await supabase
        .from('addresses')
        .insert({ ...newAddr, user_id: user.id, created_at: new Date().toISOString(), updated_at: new Date().toISOString() })
        .select()
        .single();
      if (error) throw error;
      if (newAddr.is_default) {
        await supabase.from('addresses').update({ is_default: false }).eq('user_id', user.id).neq('id', data.id);
      }
      setAddresses((prev) => [data, ...prev]);
      setSelectedAddrId(data.id);
      setShowNewForm(false);
      setNewAddr({ label: 'Home', line1: '', line2: '', city: 'Jaunpur', pincode: '222001', is_default: false });
      showToast('Address save ho gaya! 📍');
    } catch {
      showToast('Address save nahi hua. Dobara try karo.');
    } finally {
      setSavingAddr(false);
    }
  };

  const handleApplyCoupon = async () => {
    setCouponError('');
    const result = await validateCoupon(couponCode, total, { userId: user?.id, productIds: cart.map((i) => i.id) });
    if (!result.valid) {
      setCouponError(result.reason || 'Invalid coupon');
      setAppliedCoupon(null);
      return;
    }
    setAppliedCoupon({ code: result.code!, discount: result.discount! });
    showToast(`✅ Coupon applied — ${inr(result.discount!)} OFF`);
  };

  const buildOrderOpts = (paymentMethod: string): CreateOrderOpts => ({
    cart,
    total,
    address: {
      name: f.name.trim(),
      phone: f.phone.trim(),
      line1: selectedAddr?.line1 || '',
      line2: selectedAddr?.line2 || '',
      city: selectedAddr?.city || 'Jaunpur',
      pincode: selectedAddr?.pincode || '',
    },
    paymentMethod,
    promoCode: appliedCoupon?.code || null,
    discount,
    ...(deliveryInfo && gpsPos
      ? {
          latitude: gpsPos.lat,
          longitude: gpsPos.lng,
          distance_km: deliveryInfo.distanceKm,
          delivery_charge: deliveryInfo.charge || 0,
          delivery_status: deliveryInfo.tier.id,
          maps_link: deliveryInfo.mapsLink,
          maps_nav_link: deliveryInfo.mapsNavLink,
        }
      : {}),
  });

  // ── Razorpay online flow ─────────────────────────────────
  const handleRazorpay = async () => {
    setOrderError('');
    setPlacing(true);
    try {
      if (!RAZORPAY_KEY_ID) {
        setOrderError('⚠️ Online payment abhi setup nahi hua — UPI QR ya COD chunein.');
        setPlacing(false);
        return;
      }
      const wantAmount = Math.round(finalAmount * 100);
      let result = rzpAmountRef.current === wantAmount ? rzpOrderRef.current : null;
      if (!result) {
        result = await createOrder(user?.id || null, buildOrderOpts('razorpay'));
        if (!result || result.blocked) {
          setPlacing(false);
          setOrderError(result?.blocked ? 'Aapka account block hai — support se contact karein.' : '⚠️ Order save nahi hua. Dobara try karein.');
          return;
        }
        rzpOrderRef.current = { orderId: result.orderId, orderNumber: result.orderNumber };
        rzpAmountRef.current = wantAmount;
      }
      const rzpOrder = await createRazorpayOrder({
        amount: wantAmount,
        receipt: result.orderNumber,
        orderId: result.orderId,
        notes: { orderNumber: result.orderNumber, orderId: result.orderId },
      });

      const options: RazorpayOptions = {
        amount: rzpOrder.amount,
        order_id: rzpOrder.orderId,
        currency: rzpOrder.currency,
        description: `Order ${result.orderNumber}`,
        prefill: { name: f.name.trim(), contact: f.phone.trim(), email: user?.email || '' },
        themeColor: theme.primary,
      };

      const native = await openNativeRazorpay(options);
      if (native) {
        await verifyAndFinish(result.orderId, result.orderNumber, native);
      } else {
        // WebView fallback
        setWebviewHtml(razorpayWebViewHtml(options));
        await new Promise<void>((resolve, reject) => {
          rzpPending.current = { resolve, reject };
        });
      }
    } catch (e: any) {
      setPlacing(false);
      if (String(e?.code || '').includes('CANCELLED') || String(e?.message || '').includes('cancelled')) {
        showToast('Payment window band hua — order pending hai');
      } else {
        setOrderError('⚠️ Online payment mein error — UPI QR ya COD chunein.');
      }
    } finally {
      setPlacing(false);
    }
  };

  const verifyAndFinish = async (orderId: string, orderNumber: string, resp: any) => {
    setPlacing(true);
    const v = await verifyRazorpayPayment({
      orderId,
      orderNumber,
      razorpay_order_id: resp.razorpay_order_id,
      razorpay_payment_id: resp.razorpay_payment_id,
      razorpay_signature: resp.razorpay_signature,
      amount: finalAmount,
      userId: user?.id || null,
      customer_name: f.name.trim(),
      mobile: f.phone.trim(),
    });
    if (v.verified) {
      rzpOrderRef.current = null;
      rzpAmountRef.current = 0;
      await clearCart();
      setOrderInfo({ orderId, orderNumber });
      setPhase('success');
    } else {
      setPlacing(false);
      setOrderError('⚠️ Payment verify nahi hua — order pending hai, admin se confirm karwayein.');
    }
  };

  const handleWebViewMessage = (e: any) => {
    const pending = rzpPending.current;
    if (!pending) return;
    try {
      const msg = JSON.parse(e.nativeEvent.data);
      if (msg.type === 'success') {
        rzpPending.current = null;
        setWebviewHtml(null);
        const rzp = rzpOrderRef.current;
        if (rzp) verifyAndFinish(rzp.orderId, rzp.orderNumber, msg.payload);
        else pending.resolve(msg.payload);
      } else if (msg.type === 'dismiss' || msg.type === 'failed' || msg.type === 'error') {
        rzpPending.current = null;
        setWebviewHtml(null);
        pending.reject(new Error(msg.type));
      }
    } catch {
      rzpPending.current = null;
      setWebviewHtml(null);
      pending.reject(new Error('parse'));
    }
  };

  // ── Place order (COD / UPI entry) ────────────────────────
  const handlePlaceOrder = async () => {
    setPhoneTouched(true);
    setOrderError('');
    if (!f.name.trim()) {
      showToast('Naam zaroori hai!');
      return;
    }
    if (!isPhoneValid) {
      showToast('Sahi 10-digit mobile number daalein!');
      return;
    }
    if (!pay) {
      showToast('Payment method chunein!');
      return;
    }
    if (!selectedAddr) {
      showToast('Delivery address chunein ya add karein!');
      return;
    }
    if (pay === 'razorpay') {
      handleRazorpay();
      return;
    }
    if (pay === 'cod') {
      setPlacing(true);
      try {
        const result = await createOrder(user?.id || null, buildOrderOpts('cod'));
        if (!result || result.blocked) {
          setPlacing(false);
          setOrderError(result?.blocked ? 'Aapka account block hai — support se contact karein.' : '⚠️ Order save nahi hua. Dobara try karein.');
          return;
        }
        await clearCart();
        setOrderInfo({ orderId: result.orderId, orderNumber: result.orderNumber });
        setPhase('success');
      } catch {
        setPlacing(false);
        setOrderError('⚠️ Kuch galat ho gaya. Dobara try karein.');
      }
      return;
    }
    // UPI — QR screen dikhao; order SIRF verification submit par banta hai
    // (site ke CheckoutForm jaisa — abandoned UPI checkouts se stale orders nahi bante)
    pendingUpiRef.current = buildOrderOpts('upi');
    setPhase('upiVerify');
  };

  const handleSubmitVerification = async () => {
    const utrClean = utr.trim();
    if (!/^\d{12}$/.test(utrClean)) {
      showToast('Sahi 12-digit UTR / Transaction ID daalein');
      return;
    }
    if (!screenshot) {
      showToast('Payment screenshot upload karein');
      return;
    }
    const opts = pendingUpiRef.current;
    if (!opts) return;
    setSubmittingVerify(true);

    // Order abhi create hota hai (site ke handleSubmitVerification jaisa)
    const result = await createOrder(user?.id || null, opts);
    if (!result || result.blocked) {
      setSubmittingVerify(false);
      setOrderError(result?.blocked ? 'Aapka account block hai — support se contact karein.' : '⚠️ Order save nahi hua. Dobara try karein.');
      return;
    }
    const realOrderId = result.orderId;
    const realOrderNumber = result.orderNumber;

    const screenshotUrl = await uploadScreenshot(screenshot.uri, realOrderNumber);
    if (!screenshotUrl) {
      setSubmittingVerify(false);
      showToast('Screenshot upload fail hua');
      return;
    }
    const { error } = await supabase.from('payment_verifications').insert({
      user_id: user?.id || null,
      order_id: realOrderId,
      order_number: realOrderNumber,
      customer_name: f.name.trim(),
      mobile: f.phone.trim(),
      utr: utrClean,
      screenshot_url: screenshotUrl,
      amount: finalAmount,
      status: 'pending',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });
    setSubmittingVerify(false);
    if (error) {
      showToast('Verification submit nahi hua');
      return;
    }
    await clearCart();
    setOrderInfo({ orderId: realOrderId, orderNumber: realOrderNumber });
    setPhase('success');
  };

  const pickScreenshot = async () => {
    const res = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.7,
      allowsEditing: false,
    });
    if (!res.canceled && res.assets[0]) setScreenshot({ uri: res.assets[0].uri });
  };

  /* ── Success screen ─────────────────────────────────────── */
  if (phase === 'success' && orderInfo) {
    return (
      <SafeAreaView edges={['top', 'bottom']} style={{ flex: 1, backgroundColor: theme.pageBg, alignItems: 'center', justifyContent: 'center', padding: 24 }}>
        <View style={[styles.successIcon, { backgroundColor: theme.primaryLight }]}>
          <AppText style={{ fontSize: 44 }}>🎉</AppText>
        </View>
        <AppText variant="title" center style={{ marginTop: 16 }}>
          Order Confirm Ho Gaya!
        </AppText>
        <AppText variant="body" color={theme.gray} center style={{ marginTop: 8, lineHeight: 21 }}>
          Order #{orderInfo.orderNumber}
          {'\n'}
          {pay === 'cod'
            ? 'Cash on Delivery — order jaldi aayega 🚚'
            : pay === 'razorpay'
            ? 'Payment received — order processing ho raha hai ✅'
            : 'UPI payment verification ke baad order confirm hoga 📱'}
        </AppText>
        <PrimaryButton title="My Orders Dekhein →" onPress={() => router.replace('/orders')} style={{ marginTop: 24, alignSelf: 'stretch' }} />
        <PrimaryButton title="Home" variant="outline" onPress={() => router.replace('/')} style={{ marginTop: 10, alignSelf: 'stretch' }} />
      </SafeAreaView>
    );
  }

  /* ── UPI QR verify screen ───────────────────────────────── */
  if (phase === 'upiVerify') {
    return (
      <SafeAreaView edges={['top', 'bottom']} style={{ flex: 1, backgroundColor: theme.pageBg }}>
        <HeaderBar
          title="Payment Karein"
          subtitle={orderInfo ? `Order #${orderInfo.orderNumber}` : 'Order pending — verification ke baad confirm hoga'}
          onBack={() => setPhase('form')}
        />
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>
          <View style={{ alignItems: 'center' }}>
            <UpiPayCard total={finalAmount} upiId={settings.upi_id} />
          </View>
          <View style={[styles.verifyCard, { backgroundColor: theme.cardBg, borderColor: theme.border, marginTop: 16 }]}>
            <AppText variant="heading">🧾 Payment Verification</AppText>
            <Field
              label="UTR / Transaction ID"
              value={utr}
              onChangeText={(t) => setUtr(t.replace(/\s/g, ''))}
              placeholder="12-digit UTR number *"
              keyboardType="numeric"
              maxLength={12}
              hint="UTR aapke UPI app ke payment history mein milega (12 digit number)"
            />
            <Pressable onPress={pickScreenshot} style={[styles.uploadBox, { borderColor: theme.border, backgroundColor: screenshot ? theme.primaryLight : theme.light }]}>
              {screenshot ? (
                <Image source={{ uri: screenshot.uri }} style={{ width: 140, height: 110, borderRadius: 10 }} resizeMode="cover" />
              ) : (
                <View style={{ alignItems: 'center' }}>
                  <AppText style={{ fontSize: 30 }}>📷</AppText>
                  <AppText variant="bodyBold" style={{ marginTop: 6 }}>
                    Payment Screenshot Upload Karein
                  </AppText>
                  <AppText variant="caption" color={theme.gray}>
                    JPG/PNG • Max 5MB
                  </AppText>
                </View>
              )}
            </Pressable>
            <PrimaryButton
              title={submittingVerify ? 'Submitting…' : '✅ Verification Submit Karein'}
              loading={submittingVerify}
              onPress={handleSubmitVerification}
              style={{ marginTop: 8 }}
            />
          </View>
        </ScrollView>
      </SafeAreaView>
    );
  }

  /* ── WebView fallback (razorpay) ────────────────────────── */
  if (webviewHtml) {
    return (
      <SafeAreaView edges={['top', 'bottom']} style={{ flex: 1, backgroundColor: theme.pageBg }}>
        <HeaderBar title="Online Payment" subtitle="Razorpay" onBack={() => { setWebviewHtml(null); rzpPending.current?.reject(new Error('cancelled')); rzpPending.current = null; }} />
        <WebView source={{ html: webviewHtml }} onMessage={handleWebViewMessage} style={{ flex: 1 }} originWhitelist={['*']} />
      </SafeAreaView>
    );
  }

  /* ── Main checkout form ─────────────────────────────────── */
  return (
    <SafeAreaView edges={['top', 'bottom']} style={{ flex: 1, backgroundColor: theme.pageBg }}>
      <HeaderBar title="Checkout" subtitle={inr(total)} />
      {!user ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 }}>
          <AppText style={{ fontSize: 44 }}>🔐</AppText>
          <AppText variant="heading" center style={{ marginTop: 12 }}>
            Checkout ke liye login karein
          </AppText>
          <AppText variant="body" color={theme.gray} center style={{ marginTop: 6 }}>
            Online payment, addresses aur coupons sab login par available hain.
          </AppText>
          <PrimaryButton title="Login / Signup →" onPress={() => router.push('/auth')} style={{ marginTop: 20, alignSelf: 'stretch' }} />
        </View>
      ) : (
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>
          {/* Order summary */}
          <View style={[styles.card, { backgroundColor: theme.cardBg, borderColor: theme.border }]}>
            <AppText variant="heading" style={{ marginBottom: 8 }}>
              📋 Order Summary
            </AppText>
            {cart.slice(0, 4).map((i) => (
              <View key={i.k || i.id} style={styles.itemRow}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 }}>
                  {i.image ? (
                    <Image source={{ uri: i.image }} style={styles.itemThumb} />
                  ) : (
                    <View style={[styles.itemThumb, { backgroundColor: theme.light, alignItems: 'center', justifyContent: 'center' }]}>
                      <AppText style={{ fontSize: 16 }}>{i.e || '🛒'}</AppText>
                    </View>
                  )}
                  <AppText variant="body" numberOfLines={1} style={{ flex: 1 }}>
                    {i.name} ×{i.qty}
                  </AppText>
                </View>
                <AppText variant="bodyBold">{inr(i.price * i.qty)}</AppText>
              </View>
            ))}
            {cart.length > 4 && (
              <AppText variant="caption" color={theme.gray}>
                +{cart.length - 4} more items
              </AppText>
            )}

            {/* Coupon */}
            <View style={[styles.divider, { borderTopColor: theme.border }]} />
            {!appliedCoupon ? (
              <View style={{ flexDirection: 'row', gap: 8 }}>
                <TextInput
                  value={couponCode}
                  onChangeText={(t) => {
                    setCouponCode(t.toUpperCase());
                    setCouponError('');
                  }}
                  placeholder="Coupon code (e.g. WELCOME50)"
                  placeholderTextColor={theme.muted}
                  autoCapitalize="characters"
                  style={[styles.input, { backgroundColor: theme.light, borderColor: theme.border, color: theme.dark, flex: 1 }]}
                />
                <PrimaryButton
                  title={couponChecking ? '…' : 'Apply'}
                  variant="ghost"
                  disabled={couponChecking || !couponCode.trim()}
                  onPress={handleApplyCoupon}
                  style={{ paddingHorizontal: 18, minHeight: 46 }}
                />
              </View>
            ) : (
              <View style={[styles.appliedCoupon, { backgroundColor: theme.light }]}>
                <AppText variant="bodyBold">
                  🎟️ {appliedCoupon.code} applied — {inr(appliedCoupon.discount)} OFF
                </AppText>
                <Pressable onPress={() => { setAppliedCoupon(null); setCouponCode(''); setCouponError(''); }} hitSlop={8}>
                  <AppText variant="caption" color={theme.gray}>
                    ✕
                  </AppText>
                </Pressable>
              </View>
            )}
            {couponError ? (
              <AppText variant="caption" color={theme.red} style={{ marginTop: 4 }}>
                ⚠️ {couponError}
              </AppText>
            ) : null}

            {/* Totals */}
            <View style={[styles.divider, { borderTopColor: theme.border }]} />
            <BillRow label="Subtotal" value={inr(total)} theme={theme} />
            {discount > 0 && <BillRow label="Coupon Discount" value={`−${inr(discount)}`} color={theme.primary} theme={theme} />}
            {deliveryCharge > 0 && <BillRow label="Delivery Charge" value={inr(deliveryCharge)} theme={theme} />}
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 8 }}>
              <AppText variant="heading">Total</AppText>
              <AppText variant="heading" style={{ color: theme.primary }}>
                {inr(finalAmount)}
              </AppText>
            </View>
          </View>

          {/* Contact */}
          <View style={[styles.card, { backgroundColor: theme.cardBg, borderColor: theme.border }]}>
            <AppText variant="heading" style={{ marginBottom: 10 }}>
              🙋 Contact Details
            </AppText>
            <Field label="Aapka naam" value={f.name} onChangeText={(t) => setF({ ...f, name: t })} placeholder="Aapka naam *" />
            <Field
              label="Mobile number"
              value={f.phone}
              onChangeText={(t) => setF({ ...f, phone: t.replace(/\D/g, '').slice(0, 10) })}
              onBlur={() => setPhoneTouched(true)}
              placeholder="10-digit mobile number *"
              keyboardType="phone-pad"
              maxLength={10}
              error={phoneTouched && !isPhoneValid ? 'Sahi 10-digit mobile number daalein (jaise 9876543210)' : undefined}
            />
          </View>

          {/* Delivery address */}
          <View style={[styles.card, { backgroundColor: theme.cardBg, borderColor: theme.border }]}>
            <AppText variant="heading" style={{ marginBottom: 10 }}>
              📍 Delivery Address
            </AppText>

            {/* GPS */}
            {(selectedAddrId || showNewForm) && (
              <Pressable
                onPress={handleUseLocation}
                disabled={locState === 'loading'}
                style={[styles.gpsBtn, { backgroundColor: theme.primaryLight }]}>
                <AppText variant="bodyBold" color={theme.primaryDark}>
                  {locState === 'loading'
                    ? '⏳ Location detect ho rahi hai…'
                    : locState === 'success'
                    ? '✅ Location Detected — Tap to refresh'
                    : locState === 'denied'
                    ? '🔓 Retry Location Access'
                    : locState === 'error'
                    ? '⚠️ Retry Location'
                    : '📍 Use Current Location'}
                </AppText>
              </Pressable>
            )}

            {deliveryInfo && (
              <View style={[styles.deliveryCard, { backgroundColor: theme.light, borderColor: theme.border, marginTop: 10 }]}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                  <AppText style={{ fontSize: 24 }}>{deliveryInfo.emoji}</AppText>
                  <View style={{ flex: 1 }}>
                    <AppText variant="bodyBold">{deliveryInfo.label}</AppText>
                    <AppText variant="caption" color={deliveryInfo.available ? theme.gray : theme.red}>
                      {deliveryInfo.available
                        ? `Delivery charge: ${deliveryInfo.charge === 0 ? 'FREE' : inr(deliveryInfo.charge)}`
                        : 'Hum is location par deliver nahi karte.'}
                    </AppText>
                  </View>
                </View>
                <View style={styles.deliveryMeta}>
                  <Meta label="📍 Distance" value={distLabel(deliveryInfo.distanceKm)} theme={theme} />
                  {deliveryInfo.available && <Meta label="💰 Delivery" value={deliveryInfo.charge === 0 ? 'FREE' : inr(deliveryInfo.charge)} theme={theme} />}
                  {deliveryInfo.available && <Meta label="⏱️ ETA" value={deliveryInfo.eta || '—'} theme={theme} />}
                </View>
                {!deliveryInfo.available && (
                  <AppText variant="caption" color={theme.red} style={{ marginTop: 8 }}>
                    ❌ Aapka location delivery range se bahar hai — order admin verification ke baad confirm hoga.
                  </AppText>
                )}
              </View>
            )}

            {loadingAddrs ? (
              <ActivityIndicator color={theme.primary} style={{ marginVertical: 16 }} />
            ) : (
              <>
                {addresses.map((a) => (
                  <Pressable
                    key={a.id}
                    onPress={() => {
                      setSelectedAddrId(a.id);
                      setShowNewForm(false);
                    }}
                    style={[
                      styles.addrCard,
                      { borderColor: selectedAddrId === a.id ? theme.primary : theme.border, backgroundColor: selectedAddrId === a.id ? theme.primaryLight : 'transparent' },
                    ]}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                      <AppText variant="bodyBold">{a.label}</AppText>
                      {a.is_default && (
                        <View style={[styles.defaultTag, { backgroundColor: theme.primary }]}>
                          <AppText variant="tiny" color="#fff" style={{ fontWeight: '800' }}>
                            DEFAULT
                          </AppText>
                        </View>
                      )}
                    </View>
                    <AppText variant="caption" color={theme.gray} style={{ marginTop: 2 }}>
                      {a.line1}
                      {a.line2 ? `, ${a.line2}` : ''}
                      {'\n'}
                      {a.city}
                      {a.pincode ? ` - ${a.pincode}` : ''}
                    </AppText>
                  </Pressable>
                ))}
                {!showNewForm && (
                  <Pressable onPress={() => setShowNewForm(true)} style={[styles.addAddrBtn, { borderColor: theme.primary }]}>
                    <AppText variant="bodyBold" color={theme.primary}>
                      + Naya Address Add Karo
                    </AppText>
                  </Pressable>
                )}
              </>
            )}

            {showNewForm && (
              <View style={[styles.newAddrForm, { borderColor: theme.border }]}>
                <Field label="Label" value={newAddr.label} onChangeText={(t) => setNewAddr({ ...newAddr, label: t })} placeholder="Home/Office" />
                <Field label="Pura pata *" value={newAddr.line1} onChangeText={(t) => setNewAddr({ ...newAddr, line1: t })} placeholder="Ghar ka pura pata, gali, makaan no." />
                <Field label="Landmark *" value={newAddr.line2} onChangeText={(t) => setNewAddr({ ...newAddr, line2: t })} placeholder="Mohalla / Landmark" />
                <View style={{ flexDirection: 'row', gap: 10 }}>
                  <View style={{ flex: 1 }}>
                    <Field label="City *" value={newAddr.city} onChangeText={(t) => setNewAddr({ ...newAddr, city: t })} placeholder="City" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Field label="Pincode *" value={newAddr.pincode} onChangeText={(t) => setNewAddr({ ...newAddr, pincode: t.replace(/\D/g, '').slice(0, 6) })} placeholder="222001" keyboardType="number-pad" maxLength={6} />
                  </View>
                </View>
                <PrimaryButton title={savingAddr ? 'Saving…' : '💾 Address Save Karke Use Karo'} loading={savingAddr} onPress={saveNewAddress} />
                {addresses.length > 0 && (
                  <Pressable onPress={() => setShowNewForm(false)} style={{ paddingVertical: 10, alignItems: 'center' }}>
                    <AppText variant="captionBold" color={theme.gray}>
                      Cancel
                    </AppText>
                  </Pressable>
                )}
              </View>
            )}
            <Pressable onPress={() => router.push('/addresses')} style={{ paddingVertical: 8, alignItems: 'center' }}>
              <AppText variant="captionBold" color={theme.primary}>
                ✏️ Saare Addresses Manage Karo →
              </AppText>
            </Pressable>
          </View>

          {/* Payment method */}
          <View style={[styles.card, { backgroundColor: theme.cardBg, borderColor: theme.border }]}>
            <AppText variant="heading" style={{ marginBottom: 10 }}>
              💳 Payment Method
            </AppText>
            <View style={{ flexDirection: 'row', gap: 10 }}>
              {(
                [
                  { v: 'razorpay', icon: '💳', t: 'Online Payment', s: 'Card / UPI / NetBanking' },
                  { v: 'upi', icon: '📱', t: 'UPI / QR Code', s: 'Scan karke pay karo' },
                  { v: 'cod', icon: '💵', t: 'Cash on Delivery', s: 'Ghar pe cash dena' },
                ] as { v: PayMethod; icon: string; t: string; s: string }[]
              ).map((m) => (
                <Pressable
                  key={m.v}
                  onPress={() => setPay(m.v)}
                  style={[
                    styles.payCard,
                    { borderColor: pay === m.v ? theme.primary : theme.border, backgroundColor: pay === m.v ? theme.primaryLight : 'transparent' },
                  ]}>
                  <AppText style={{ fontSize: 22 }}>{m.icon}</AppText>
                  <AppText variant="captionBold" style={{ marginTop: 4 }}>
                    {m.t}
                  </AppText>
                  <AppText variant="tiny" color={theme.gray}>
                    {m.s}
                  </AppText>
                </Pressable>
              ))}
            </View>
            {pay === 'razorpay' && (
              <View style={[styles.infoStrip, { backgroundColor: theme.tintBlue.bg, borderColor: theme.tintBlue.border }]}>
                <AppText variant="caption" color={theme.tintBlue.text}>
                  🔒 Online payment Razorpay se — UPI, cards, netbanking. Payment confirm hote hi order confirm hoga.
                </AppText>
              </View>
            )}
          </View>

          {orderError ? (
            <View style={[styles.errorStrip, { backgroundColor: theme.tintRed.bg, borderColor: theme.tintRed.border }]}>
              <AppText variant="captionBold" color={theme.tintRed.text}>
                ⚠️ {orderError}
              </AppText>
            </View>
          ) : null}

          <PrimaryButton
            title={placing ? 'Process Ho Raha Hai…' : pay === 'razorpay' ? `💳 Pay Now • ${inr(finalAmount)}` : '📲 Order Confirm Karein'}
            loading={placing}
            onPress={handlePlaceOrder}
            style={{ marginTop: 8 }}
          />
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

function BillRow({ label, value, theme, color }: { label: string; value: string; theme: any; color?: string }) {
  return (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginVertical: 2 }}>
      <AppText variant="body" color={theme.gray}>
        {label}
      </AppText>
      <AppText variant="bodyBold" style={color ? { color } : undefined}>
        {value}
      </AppText>
    </View>
  );
}

function Meta({ label, value, theme }: { label: string; value: string; theme: any }) {
  return (
    <View style={{ flex: 1 }}>
      <AppText variant="tiny" color={theme.gray}>
        {label}
      </AppText>
      <AppText variant="captionBold">{value}</AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: 16, borderWidth: 1, padding: 14, marginBottom: 12 },
  itemRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 4 },
  itemThumb: { width: 30, height: 30, borderRadius: 8 },
  divider: { borderTopWidth: StyleSheet.hairlineWidth, marginVertical: 10 },
  input: { borderWidth: 1.5, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, fontSize: 13, fontFamily: 'Poppins_400Regular' },
  appliedCoupon: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10 },
  gpsBtn: { borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, alignItems: 'center' },
  deliveryCard: { borderRadius: 12, borderWidth: 1, padding: 12 },
  deliveryMeta: { flexDirection: 'row', marginTop: 10, gap: 8 },
  addrCard: { borderRadius: 12, borderWidth: 1.5, padding: 12, marginBottom: 8 },
  defaultTag: { borderRadius: 5, paddingHorizontal: 5, paddingVertical: 2 },
  addAddrBtn: { borderRadius: 12, borderWidth: 1.5, borderStyle: 'dashed', paddingVertical: 11, alignItems: 'center' },
  newAddrForm: { borderRadius: 12, borderWidth: 1.5, borderStyle: 'dashed', padding: 12, marginTop: 8 },
  payCard: { flex: 1, borderRadius: 14, borderWidth: 1.5, padding: 12, alignItems: 'center' },
  infoStrip: { borderRadius: 10, borderWidth: 1, padding: 10, marginTop: 10 },
  errorStrip: { borderRadius: 10, borderWidth: 1, padding: 12, marginBottom: 10 },
  verifyCard: { borderRadius: 16, borderWidth: 1, padding: 14 },
  uploadBox: { borderRadius: 12, borderWidth: 1.5, borderStyle: 'dashed', padding: 16, alignItems: 'center', marginBottom: 10 },
  successIcon: { width: 96, height: 96, borderRadius: 32, alignItems: 'center', justifyContent: 'center' },
});

/**
 * rewards.tsx — Rewards & Referral (site ka RewardsTab).
 * Points = delivered orders × 10, referral code RK + userId[:6],
 * loyalty levels (5/20/50 orders), WhatsApp share.
 */
import React, { useEffect, useState } from 'react';
import { Linking, Pressable, ScrollView, Share, StyleSheet, View } from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { SafeAreaView } from 'react-native-safe-area-context';
import { supabase } from '@/lib/supabase';
import { useTheme } from '@/context/ThemeContext';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import { AppText } from '@/components/AppText';
import { HeaderBar } from '@/components/HeaderBar';
import { inr } from '@/lib/helpers';

function loyaltyLevel(n: number): { label: string; color: string } {
  if (n >= 50) return { label: '🥇 Gold Member', color: '#F59E0B' };
  if (n >= 20) return { label: '🥈 Silver Member', color: '#94A3B8' };
  if (n >= 5) return { label: '🥉 Bronze Member', color: '#B45309' };
  return { label: '🌱 New Member', color: '#10B981' };
}

export default function RewardsScreen() {
  const { theme } = useTheme();
  const { user } = useAuth();
  const { showToast } = useToast();
  const [stats, setStats] = useState<{ total: number; delivered: number; savings: number } | null>(null);
  // Redeemable balance = earned (delivered×10) − already redeemed (server-computed)
  const [redeemable, setRedeemable] = useState<number | null>(null);

  useEffect(() => {
    let active = true;
    (async () => {
      if (!user) return;
      const { data } = await supabase
        .from('orders')
        .select('status,discount')
        .eq('user_id', user.id)
        .limit(100);
      if (!active) return;
      const orders = data || [];
      setStats({
        total: orders.length,
        delivered: orders.filter((o) => o.status === 'delivered').length,
        savings: orders.reduce((s, o) => s + (Number(o.discount) || 0), 0),
      });
      // Redeemable balance (server-side — tamper-proof)
      const r = await supabase.rpc('get_redeemable_points', { p_user_id: user.id });
      if (active) setRedeemable(Number(r.data) || 0);
    })();
    return () => {
      active = false;
    };
  }, [user]);

  const totalOrders = stats?.total || 0;
  const deliveredCount = stats?.delivered || 0;
  const pts = deliveredCount * 10;
  const savings = stats?.savings || 0;
  const refCode = 'RK' + (user?.id || '').slice(0, 6).toUpperCase();
  const nextTarget = totalOrders < 5 ? 5 : totalOrders < 20 ? 20 : 50;
  const progress = Math.min((totalOrders / nextTarget) * 100, 100);
  const loyalty = loyaltyLevel(totalOrders);

  const copyCode = async () => {
    await Clipboard.setStringAsync(refCode);
    showToast('Code copy ho gaya! 📋');
  };

  const shareReferral = async () => {
    const txt = `RK Grocery Mart par order karo!\nMera referral code: ${refCode}\nDono ko ₹30 cashback milega 🎉\nhttps://rinkukiranastore.vercel.app`;
    try {
      await Share.share({ title: 'RK Grocery Mart', message: txt });
    } catch {
      // fallback: WhatsApp
      Linking.openURL(`https://wa.me/?text=${encodeURIComponent(txt)}`).catch(() => showToast('Share nahi ho paya'));
    }
  };

  return (
    <SafeAreaView edges={['top', 'bottom']} style={{ flex: 1, backgroundColor: theme.pageBg }}>
      <HeaderBar title="Rewards & Referral ⭐" />
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>
        {/* Points hero */}
        <View style={[styles.hero, { backgroundColor: theme.primaryDark }]}>
          <AppText variant="caption" color="rgba(255,255,255,0.65)" style={{ fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 }}>
            Your Points
          </AppText>
          <AppText style={{ fontSize: 42, fontWeight: '900', color: '#fff', marginTop: 2 }}>
            {pts}
          </AppText>
          <AppText variant="caption" color="rgba(255,255,255,0.7)">
            Total Reward Points
          </AppText>
          <View style={styles.progressTrack}>
            <View style={[styles.progressFill, { width: `${progress}%` }]} />
          </View>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 6 }}>
            <AppText variant="tiny" style={{ color: loyalty.color, fontWeight: '700' }}>
              {loyalty.label}
            </AppText>
            <AppText variant="tiny" color="rgba(255,255,255,0.7)">
              {totalOrders}/{nextTarget} orders
            </AppText>
          </View>
          <View style={{ flexDirection: 'row', gap: 8, marginTop: 14 }}>
            {[
              [String(deliveredCount), 'Delivered'],
              [inr(savings), 'Total Saved'],
              [String(pts), 'Points'],
            ].map(([val, lbl]) => (
              <View key={lbl} style={styles.heroStat}>
                <AppText variant="bodyBold" color="#fff">
                  {val}
                </AppText>
                <AppText variant="tiny" color="rgba(255,255,255,0.65)">
                  {lbl}
                </AppText>
              </View>
            ))}
          </View>
        </View>

        {/* Redeemable card */}
        {redeemable !== null && redeemable > 0 && (
          <View style={[styles.redeemCard, { backgroundColor: theme.tintYellow.bg, borderColor: theme.tintYellow.border }]}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
              <View style={{ flex: 1 }}>
                <AppText variant="bodyBold" style={{ color: theme.tintYellow.text }}>
                  ⭐ Redeemable Points
                </AppText>
                <AppText variant="caption" style={{ color: theme.tintYellow.text, marginTop: 2 }}>
                  {redeemable} pts = {inr(Math.floor(redeemable / 10))} discount
                </AppText>
              </View>
              <AppText style={{ fontSize: 26, fontWeight: '900', color: theme.tintYellow.text }}>{redeemable}</AppText>
            </View>
            <AppText variant="caption" style={{ color: theme.tintYellow.text, marginTop: 8 }}>
              💡 Checkout par apply karo — 100 points = ₹10 OFF (coupon ke saath bhi chalega)
            </AppText>
          </View>
        )}

        {/* Referral card */}
        <View style={[styles.referCard, { backgroundColor: theme.tintOrange.bg, borderColor: theme.tintOrange.border }]}>
          <AppText variant="bodyBold" color={theme.tintOrange.text}>
            🎁 Dost ko refer karo, dono ko ₹30 cashback!
          </AppText>
          <View style={[styles.refCodeBox, { backgroundColor: theme.cardBg, borderColor: theme.tintOrange.border }]}>
            <AppText style={{ fontSize: 18, fontWeight: '900', color: theme.dark, letterSpacing: 3 }}>
              {refCode}
            </AppText>
            <Pressable onPress={copyCode} style={[styles.copyBtn, { backgroundColor: theme.orange }]}>
              <AppText variant="captionBold" color="#fff">
                📋 Copy
              </AppText>
            </Pressable>
          </View>
          <AppText variant="caption" color={theme.tintOrange.text}>
            Minimum order ₹199 • Ek baar per user
          </AppText>
          <Pressable onPress={shareReferral} style={[styles.waBtn, { backgroundColor: theme.red }]}>
            <AppText variant="bodyBold" color="#fff">
              💬 WhatsApp Par Share Karo
            </AppText>
          </Pressable>
        </View>

        {/* How points work */}
        <View style={[styles.infoCard, { backgroundColor: theme.cardBg, borderColor: theme.border }]}>
          <AppText variant="heading" style={{ marginBottom: 8 }}>
            Points Kaise Milenge? ℹ️
          </AppText>
          {[
            { i: '🛒', t: 'Order Karo', s: 'Har delivered order = 10 points', tint: theme.tintGreen },
            { i: '👥', t: 'Refer Karo', s: 'Dost ka pehla order = 50 bonus points', tint: theme.tintBlue },
            { i: '⭐', t: 'Redeem Karo', s: '100 points = ₹10 discount — checkout par apply karo', tint: theme.tintYellow },
          ].map((r) => (
            <View key={r.t} style={styles.infoRow}>
              <View style={[styles.infoIcon, { backgroundColor: r.tint.bg }]}>
                <AppText style={{ fontSize: 16 }}>{r.i}</AppText>
              </View>
              <View style={{ flex: 1 }}>
                <AppText variant="bodyBold">{r.t}</AppText>
                <AppText variant="caption" color={theme.muted} style={{ marginTop: 2 }}>
                  {r.s}
                </AppText>
              </View>
            </View>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  hero: { borderRadius: 20, padding: 20, marginBottom: 14 },
  progressTrack: { height: 7, borderRadius: 4, backgroundColor: 'rgba(255,255,255,0.15)', marginTop: 14, overflow: 'hidden' },
  progressFill: { height: 7, borderRadius: 4, backgroundColor: '#FFB800' },
  heroStat: {
    flex: 1,
    borderRadius: 12,
    paddingVertical: 10,
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
  },
  redeemCard: { borderRadius: 18, borderWidth: 1.5, padding: 16, marginBottom: 14 },
  referCard: { borderRadius: 18, borderWidth: 1.5, padding: 16, marginBottom: 14 },
  refCodeBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderRadius: 12,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginVertical: 12,
  },
  copyBtn: { borderRadius: 8, paddingHorizontal: 12, paddingVertical: 7 },
  waBtn: { borderRadius: 14, paddingVertical: 13, alignItems: 'center', marginTop: 10 },
  infoCard: { borderRadius: 18, borderWidth: 1, padding: 16 },
  infoRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 9 },
  infoIcon: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
});

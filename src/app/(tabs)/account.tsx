/**
 * Account — profile card + menu (orders, wishlist, addresses, Ananya AI,
 * theme toggle, logout). Login-gated.
 */
import React, { useEffect, useState } from 'react';
import { Image, Linking, Pressable, ScrollView, Share, StyleSheet, View } from 'react-native';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '@/context/ThemeContext';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import { useSettings } from '@/context/SettingsContext';
import { AppText } from '@/components/AppText';
import { PrimaryButton } from '@/components/PrimaryButton';

export default function AccountScreen() {
  const { theme, mode, toggleMode } = useTheme();
  const { user, signOut } = useAuth();
  const { showToast } = useToast();
  const { settings } = useSettings();
  const router = useRouter();

  const infoLinks = [
    { icon: '🏪', label: 'About Us', page: 'about' },
    { icon: '📜', label: 'Terms & Conditions', page: 'terms' },
    { icon: '🔒', label: 'Privacy Policy', page: 'privacy' },
    { icon: '🚚', label: 'Delivery & Shipping', page: 'shipping' },
  ];

  // Quick stats (orders / savings / points) — site overview hero jaisa
  const [stats, setStats] = useState<{ total: number; delivered: number; savings: number } | null>(null);
  useEffect(() => {
    let active = true;
    (async () => {
      if (!user) {
        setStats(null);
        return;
      }
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
    })();
    return () => {
      active = false;
    };
  }, [user]);

  const socials = [
    settings.social_facebook ? { icon: '📘', url: settings.social_facebook } : null,
    settings.social_instagram ? { icon: '📸', url: settings.social_instagram } : null,
    settings.social_youtube ? { icon: '▶️', url: settings.social_youtube } : null,
    settings.social_whatsapp
      ? {
          icon: '💬',
          url: settings.social_whatsapp.startsWith('http')
            ? settings.social_whatsapp
            : `https://wa.me/${settings.social_whatsapp.replace(/\D/g, '')}`,
        }
      : null,
  ].filter(Boolean) as { icon: string; url: string }[];

  const shareApp = async () => {
    try {
      await Share.share({
        message: `${settings.shop_name || 'Rinku Kirana Store'} — grocery, kirana aur daily essentials, fast delivery! ${settings.footer_text || 'हर घर की पसंद'}\n\nOrder karein: https://rinkukiranastore.vercel.app`,
      });
    } catch {
      // user dismissed share sheet — noop
    }
  };

  const menuItems = [
    { icon: '📦', label: 'My Orders', sub: 'Order history & status', onPress: () => router.push('/orders') },
    { icon: '🔔', label: 'Alerts', sub: 'Notifications & updates', onPress: () => router.push('/notifications') },
    { icon: '⭐', label: 'Rewards & Referral', sub: 'Points aur cashback', onPress: () => router.push('/rewards') },
    { icon: '❤️', label: 'My Wishlist', sub: 'Saved products', onPress: () => router.push('/wishlist') },
    { icon: '📍', label: 'My Addresses', sub: 'Delivery addresses manage karein', onPress: () => router.push('/addresses') },
    { icon: '👤', label: 'Profile', sub: 'Naam aur details update karein', onPress: () => router.push('/profile') },
    { icon: '🔒', label: 'Change Password', sub: 'Password update karein', onPress: () => router.push('/forgot-password') },
    { icon: '🌸', label: 'Ananya AI — Help & Support', sub: '24x7 AI assistant', onPress: () => router.push('/support') },
    {
      icon: mode === 'dark' ? '🌙' : '☀️',
      label: mode === 'dark' ? 'Dark Mode' : 'Light Mode',
      sub: 'Theme badlein',
      onPress: () => {
        toggleMode();
        showToast(mode === 'dark' ? 'Light mode on ☀️' : 'Dark mode on 🌙');
      },
    },
    { icon: '📣', label: 'Share the App', sub: 'Doston ko bhejein', onPress: shareApp },
  ];

  return (
    <SafeAreaView edges={['top']} style={{ flex: 1, backgroundColor: theme.pageBg }}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: 16, paddingBottom: 32 }}>
        <AppText variant="title" style={{ marginBottom: 14 }}>
          My Account 👤
        </AppText>

        {!user ? (
          <View style={[styles.loginCard, { backgroundColor: theme.cardBg, borderColor: theme.border }]}>
            <View style={[styles.avatarBig, { backgroundColor: theme.primaryLight }]}>
              <AppText style={{ fontSize: 30 }}>🙂</AppText>
            </View>
            <AppText variant="heading" center style={{ marginTop: 10 }}>
              Login Karein
            </AppText>
            <AppText variant="caption" color={theme.gray} center style={{ marginTop: 4 }}>
              Orders, wishlist, addresses aur coupons sab login par.
            </AppText>
            <PrimaryButton
              title="Login / Signup →"
              onPress={() => router.push('/auth')}
              style={{ marginTop: 16, alignSelf: 'stretch' }}
            />
          </View>
        ) : (
          <View style={[styles.profileCard, { backgroundColor: theme.cardBg, borderColor: theme.border }]}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
              {user.avatar_url ? (
                <Image source={{ uri: user.avatar_url }} style={styles.avatarBig} />
              ) : (
                <View style={[styles.avatarBig, { backgroundColor: theme.primary }]}>
                  <AppText variant="title" color="#fff">
                    {(user.name || 'U')[0]}
                  </AppText>
                </View>
              )}
              <View style={{ flex: 1 }}>
                <AppText variant="heading" numberOfLines={1}>
                  {user.name}
                </AppText>
                <AppText variant="caption" color={theme.gray} numberOfLines={1}>
                  {user.email}
                </AppText>
                {user.phone ? (
                  <AppText variant="caption" color={theme.gray}>
                    📱 {user.phone}
                  </AppText>
                ) : null}
              </View>
            </View>
          </View>
        )}

        {/* Quick stats — orders / savings / points (site overview hero jaisa) */}
        {user && stats && (
          <Pressable onPress={() => router.push('/rewards')} style={[styles.statsCard, { backgroundColor: theme.primaryDark }]}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 }}>
              <AppText variant="caption" color="rgba(255,255,255,0.7)">
                ⭐ Rewards
              </AppText>
              <AppText variant="caption" color="rgba(255,255,255,0.7)">
                View →
              </AppText>
            </View>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              {[
                [String(stats.total), 'Orders'],
                [String(stats.delivered), 'Delivered'],
                [`₹${stats.savings.toLocaleString('en-IN')}`, 'Saved'],
                [String(stats.delivered * 10), 'Points'],
              ].map(([val, lbl]) => (
                <View key={lbl} style={styles.statCell}>
                  <AppText variant="bodyBold" color="#fff">
                    {val}
                  </AppText>
                  <AppText variant="tiny" color="rgba(255,255,255,0.65)">
                    {lbl}
                  </AppText>
                </View>
              ))}
            </View>
          </Pressable>
        )}

        {/* Menu */}
        <View style={{ marginTop: 16 }}>
          {menuItems.map((m, i) => (
            <Pressable
              key={m.label}
              onPress={m.onPress}
              style={({ pressed }) => [
                styles.menuItem,
                {
                  backgroundColor: theme.cardBg,
                  borderColor: theme.border,
                  opacity: pressed ? 0.8 : 1,
                },
                i > 0 && { marginTop: 10 },
              ]}>
              <View style={[styles.menuIcon, { backgroundColor: theme.primaryLight }]}>
                <AppText style={{ fontSize: 18 }}>{m.icon}</AppText>
              </View>
              <View style={{ flex: 1 }}>
                <AppText variant="bodyBold">{m.label}</AppText>
                <AppText variant="caption" color={theme.gray}>
                  {m.sub}
                </AppText>
              </View>
              <AppText variant="bodyBold" color={theme.gray}>
                ›
              </AppText>
            </Pressable>
          ))}
        </View>

        {user && (
          <Pressable
            onPress={async () => {
              await signOut();
              showToast('Logout ho gaye. Phir milenge! 👋');
              router.replace('/');
            }}
            style={[styles.logoutBtn, { borderColor: theme.red }]}>
            <AppText variant="bodyBold" color={theme.red}>
              🚪 Logout
            </AppText>
          </Pressable>
        )}

        {/* Store Info (site footer links — About/Terms/Privacy/Shipping) */}
        <AppText variant="heading" style={{ marginTop: 22, marginBottom: 10 }}>
          Store Info ℹ️
        </AppText>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
          {infoLinks.map((l) => (
            <Pressable
              key={l.page}
              onPress={() => router.push({ pathname: '/info', params: { page: l.page } })}
              style={[styles.infoChip, { backgroundColor: theme.cardBg, borderColor: theme.border }]}>
              <AppText variant="caption" style={{ fontWeight: '700' }}>
                {l.icon} {l.label}
              </AppText>
            </Pressable>
          ))}
        </View>

        {/* Social links */}
        {socials.length > 0 && (
          <View style={{ marginTop: 18 }}>
            <AppText variant="caption" color={theme.gray} style={{ marginBottom: 8 }}>
              Follow karein:
            </AppText>
            <View style={{ flexDirection: 'row', gap: 10 }}>
              {socials.map((s) => (
                <Pressable
                  key={s.url}
                  onPress={() => Linking.openURL(s.url).catch(() => showToast('Link khul nahi paya'))}
                  style={[styles.socialBtn, { backgroundColor: theme.primaryLight, borderColor: theme.border }]}>
                  <AppText style={{ fontSize: 18 }}>{s.icon}</AppText>
                </Pressable>
              ))}
            </View>
          </View>
        )}

        {/* Store info footer */}
        <View style={{ alignItems: 'center', marginTop: 28 }}>
          <AppText variant="caption" color={theme.gray} center>
            Rinku Kirana Store • हर घर की पसंद
          </AppText>
          <AppText variant="tiny" color={theme.muted} style={{ marginTop: 4 }}>
            v1.0.0 — Made with ❤️
          </AppText>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  loginCard: { borderRadius: 20, borderWidth: 1, padding: 24, alignItems: 'center' },
  profileCard: { borderRadius: 20, borderWidth: 1, padding: 16 },
  avatarBig: { width: 62, height: 62, borderRadius: 31, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderRadius: 16,
    borderWidth: 1,
    padding: 14,
  },
  menuIcon: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  logoutBtn: {
    marginTop: 18,
    borderRadius: 16,
    borderWidth: 1.5,
    paddingVertical: 14,
    alignItems: 'center',
  },
  statsCard: { borderRadius: 20, padding: 16, marginTop: 16 },
  statCell: {
    flex: 1,
    borderRadius: 12,
    paddingVertical: 10,
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
  },
  infoChip: {
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 9,
  },
  socialBtn: {
    width: 42,
    height: 42,
    borderRadius: 21,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

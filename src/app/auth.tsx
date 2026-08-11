/**
 * Auth — Login / Signup (port of the website's AuthModal + auth pages).
 * Same Supabase calls, same friendly Hinglish error messages.
 */
import React, { useEffect, useRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '@/context/ThemeContext';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import { AppText } from '@/components/AppText';
import { Field } from '@/components/Field';
import { PrimaryButton } from '@/components/PrimaryButton';
import { friendlyAuthError, passwordStrength, STRENGTH_COLORS, STRENGTH_LABELS } from '@/lib/helpers';
import { signInWithProvider, useSocialProviders, GoogleIcon, FacebookIcon } from '@/lib/socialAuth';

type Mode = 'login' | 'signup';

export default function AuthScreen() {
  const { theme } = useTheme();
  const { signIn, signUp, session } = useAuth();
  const { showToast } = useToast();
  const router = useRouter();
  const socialStatus = useSocialProviders();
  // Social login ke baad (native deep-link ya web redirect) session set hote hi
  // screen auto-close ho jaye.
  const socialStartedRef = useRef(false);
  useEffect(() => {
    if (session && socialStartedRef.current) {
      socialStartedRef.current = false;
      showToast('Welcome back! 🎉');
      router.back();
    }
  }, [session, router, showToast]);

  const [mode, setMode] = useState<Mode>('login');

  // login state
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw] = useState(false);

  // signup state
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [suEmail, setSuEmail] = useState('');
  const [suPassword, setSuPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [terms, setTerms] = useState(false);
  const [emailSent, setEmailSent] = useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const strength = passwordStrength(suPassword);

  const handleLogin = async () => {
    setError(null);
    if (!email || !email.includes('@')) {
      setError('Sahi email address daalein!');
      return;
    }
    if (!password) {
      setError('Password daalein!');
      return;
    }
    setLoading(true);
    const { error: err } = await signIn(email, password);
    setLoading(false);
    if (err) {
      setError(friendlyAuthError(err));
      return;
    }
    showToast('Welcome back! 🎉');
    router.back();
  };

  const handleSocial = async (provider: 'google' | 'facebook') => {
    if (loading) return;
    setError(null);
    setLoading(true);
    socialStartedRef.current = true;
    const err = await signInWithProvider(provider);
    if (err) {
      socialStartedRef.current = false;
      setLoading(false);
      setError(err);
    }
    // Success (native): session effect fire hoga → auto close.
    // Success (web): page redirect hua tha — wapas aane par session effect close karega.
  };

  const handleSignup = async () => {
    setError(null);
    if (!firstName.trim()) {
      setError('Pehla naam daalein!');
      return;
    }
    if (!suEmail || !suEmail.includes('@')) {
      setError('Sahi email daalein!');
      return;
    }
    if (suPassword.length < 6) {
      setError('Password kam se kam 6 characters ka hona chahiye!');
      return;
    }
    if (suPassword !== confirm) {
      setError('Dono passwords match nahi kar rahe!');
      return;
    }
    if (!terms) {
      setError('Terms & Conditions accept karein!');
      return;
    }
    const fullName = [firstName.trim(), lastName.trim()].filter(Boolean).join(' ');
    setLoading(true);
    const { error: err, needsEmailConfirm } = await signUp({ name: fullName, email: suEmail, password: suPassword });
    setLoading(false);
    if (err) {
      setError(friendlyAuthError(err));
      return;
    }
    if (needsEmailConfirm) {
      setEmailSent(true);
      return;
    }
    showToast(`Welcome ${fullName}! Account ban gaya 🎉`);
    router.back();
  };

  return (
    <SafeAreaView edges={['top', 'bottom']} style={{ flex: 1, backgroundColor: theme.pageBg }}>
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: theme.border }]}>
        <Pressable onPress={() => router.back()} hitSlop={10} style={[styles.backBtn, { backgroundColor: theme.cardBg, borderColor: theme.border }]}>
          <AppText variant="bodyBold" style={{ fontSize: 16 }}>
            ‹
          </AppText>
        </Pressable>
        <AppText variant="title" style={{ flex: 1, textAlign: 'center' }}>
          {mode === 'login' ? '🔑 Login' : '✨ Signup'}
        </AppText>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: 20, paddingBottom: 40 }}>
        <View style={{ alignItems: 'center', marginBottom: 18 }}>
          <View style={[styles.logo, { backgroundColor: theme.primaryLight }]}>
            <AppText style={{ fontSize: 30 }}>🛒</AppText>
          </View>
          <AppText variant="heading" style={{ marginTop: 10 }}>
            RK Grocery Mart
          </AppText>
          <AppText variant="caption" color={theme.gray}>
            हर घर की पसंद
          </AppText>
        </View>

        {/* Tabs */}
        <View style={[styles.tabs, { backgroundColor: theme.light }]}>
          {(['login', 'signup'] as Mode[]).map((m) => (
            <Pressable
              key={m}
              onPress={() => {
                setMode(m);
                setError(null);
                setEmailSent(false);
              }}
              style={[styles.tab, { backgroundColor: mode === m ? theme.cardBg : 'transparent' }]}>
              <AppText variant="bodyBold" color={mode === m ? theme.primaryDark : theme.gray}>
                {m === 'login' ? '🔑 Login' : '✨ Signup'}
              </AppText>
            </Pressable>
          ))}
        </View>

        {error && (
          <View style={[styles.errorBox, { backgroundColor: theme.tintRed.bg, borderColor: theme.tintRed.border }]}>
            <AppText variant="captionBold" color={theme.tintRed.text}>
              ⚠️ {error}
            </AppText>
          </View>
        )}

        {mode === 'signup' && emailSent ? (
          <View style={{ alignItems: 'center', paddingVertical: 30 }}>
            <AppText style={{ fontSize: 44 }}>📧</AppText>
            <AppText variant="heading" center style={{ marginTop: 12 }}>
              Email Verify Karein!
            </AppText>
            <AppText variant="body" color={theme.gray} center style={{ marginTop: 8, lineHeight: 21 }}>
              <AppText variant="bodyBold">{suEmail}</AppText> par verification link bheja gaya hai.
              {'\n'}Link pe click karke wapas login karein.
            </AppText>
            <PrimaryButton
              title="🔑 Login Karo →"
              onPress={() => {
                setMode('login');
                setEmailSent(false);
              }}
              style={{ marginTop: 20, alignSelf: 'stretch' }}
            />
          </View>
        ) : mode === 'login' ? (
          <View style={{ marginTop: 8 }}>
            <Field
              label="Email"
              value={email}
              onChangeText={setEmail}
              placeholder="aapka@email.com"
              keyboardType="email-address"
              autoCapitalize="none"
            />
            <Field
              label="Password"
              value={password}
              onChangeText={setPassword}
              placeholder="Password"
              secureTextEntry={!showPw}
              rightIcon={
                <Pressable onPress={() => setShowPw((v) => !v)} hitSlop={8}>
                  <AppText variant="caption" color={theme.gray}>
                    {showPw ? '🙈' : '👁️'}
                  </AppText>
                </Pressable>
              }
            />
            <Pressable onPress={() => router.push('/forgot-password')} style={{ alignSelf: 'flex-end', marginBottom: 12 }}>
              <AppText variant="captionBold" color={theme.primary}>
                Bhool gaye?
              </AppText>
            </Pressable>
            <PrimaryButton title={loading ? 'Ek second…' : '🔑 Login Karo'} loading={loading} onPress={handleLogin} />
            <AppText variant="caption" color={theme.gray} center style={{ marginTop: 14 }}>
              Naya account?{' '}
              <AppText variant="captionBold" color={theme.primary} onPress={() => setMode('signup')}>
                Signup Karein →
              </AppText>
            </AppText>
            <SocialButtons status={socialStatus} loading={loading} onPress={handleSocial} theme={theme} />
          </View>
        ) : (
          <View style={{ marginTop: 8 }}>
            <View style={{ flexDirection: 'row', gap: 10 }}>
              <View style={{ flex: 1 }}>
                <Field label="Pehla naam" value={firstName} onChangeText={setFirstName} placeholder="Pehla naam" />
              </View>
              <View style={{ flex: 1 }}>
                <Field label="Aakhri naam" value={lastName} onChangeText={setLastName} placeholder="Aakhri naam" />
              </View>
            </View>
            <Field label="Email" value={suEmail} onChangeText={setSuEmail} placeholder="aapka@email.com" keyboardType="email-address" autoCapitalize="none" />
            <Field
              label="Password"
              value={suPassword}
              onChangeText={setSuPassword}
              placeholder="Naya strong password"
              secureTextEntry={!showPw}
              rightIcon={
                <Pressable onPress={() => setShowPw((v) => !v)} hitSlop={8}>
                  <AppText variant="caption" color={theme.gray}>
                    {showPw ? '🙈' : '👁️'}
                  </AppText>
                </Pressable>
              }
            />
            {suPassword.length > 0 && (
              <>
                <View style={{ flexDirection: 'row', gap: 4, marginBottom: 4 }}>
                  {[1, 2, 3, 4, 5].map((i) => (
                    <View
                      key={i}
                      style={[
                        styles.strengthSeg,
                        { backgroundColor: i <= strength ? STRENGTH_COLORS[strength] : theme.border },
                      ]}
                    />
                  ))}
                </View>
                <AppText variant="tiny" style={{ color: STRENGTH_COLORS[strength], marginBottom: 8 }}>
                  {STRENGTH_LABELS[strength]}
                </AppText>
              </>
            )}
            <Field label="Password dobara" value={confirm} onChangeText={setConfirm} placeholder="Password dobara" secureTextEntry={!showPw} />
            <Pressable onPress={() => setTerms((v) => !v)} style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 }}>
              <View
                style={[
                  styles.checkbox,
                  { borderColor: terms ? theme.primary : theme.border, backgroundColor: terms ? theme.primary : 'transparent' },
                ]}>
                {terms ? <AppText variant="tiny" color="#fff" style={{ fontWeight: '800' }}>✓</AppText> : null}
              </View>
              <AppText variant="caption" color={theme.gray} style={{ flex: 1 }}>
                Main Terms & Conditions aur Privacy Policy se agree karta/karti hoon.
              </AppText>
            </Pressable>
            <PrimaryButton title={loading ? 'Ek second…' : '🚀 Account Banao — Free!'} loading={loading} onPress={handleSignup} />
            <AppText variant="caption" color={theme.gray} center style={{ marginTop: 14 }}>
              Pehle se account hai?{' '}
              <AppText variant="captionBold" color={theme.primary} onPress={() => setMode('login')}>
                Login Karein →
              </AppText>
            </AppText>
            <SocialButtons status={socialStatus} loading={loading} onPress={handleSocial} theme={theme} />
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

/* ── Google / Facebook buttons (login + signup dono me) ─────────── */
function SocialButtons({
  status,
  loading,
  onPress,
  theme,
}: {
  status: { google: boolean; facebook: boolean };
  loading: boolean;
  onPress: (p: 'google' | 'facebook') => void;
  theme: any;
}) {
  const buttons = [
    { key: 'google' as const, label: 'Google se Login Karein', Icon: GoogleIcon },
    { key: 'facebook' as const, label: 'Facebook se Login Karein', Icon: FacebookIcon },
  ].filter((b) => status[b.key]);
  if (!buttons.length) return null;
  return (
    <View style={{ marginTop: 16 }}>
      <View style={styles.dividerRow}>
        <View style={[styles.dividerLine, { backgroundColor: theme.border }]} />
        <AppText variant="caption" color={theme.gray} style={{ marginHorizontal: 10 }}>
          ya
        </AppText>
        <View style={[styles.dividerLine, { backgroundColor: theme.border }]} />
      </View>
      {buttons.map(({ key, label, Icon }) => (
        <Pressable
          key={key}
          onPress={() => onPress(key)}
          disabled={loading}
          style={({ pressed }) => [
            styles.socialBtn,
            { backgroundColor: theme.cardBg, borderColor: theme.border, opacity: pressed ? 0.85 : 1 },
          ]}>
          <Icon />
          <AppText variant="bodyBold" color={theme.dark} style={{ flex: 1 }}>
            {label}
          </AppText>
        </Pressable>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  backBtn: { width: 36, height: 36, borderRadius: 12, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  logo: { width: 70, height: 70, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  tabs: { flexDirection: 'row', borderRadius: 14, padding: 4, marginBottom: 14 },
  tab: { flex: 1, borderRadius: 11, paddingVertical: 10, alignItems: 'center' },
  errorBox: { borderRadius: 12, borderWidth: 1, padding: 12, marginBottom: 12 },
  strengthSeg: { flex: 1, height: 4, borderRadius: 2 },
  checkbox: { width: 20, height: 20, borderRadius: 6, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center' },
  dividerRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  dividerLine: { flex: 1, height: StyleSheet.hairlineWidth },
  socialBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    borderRadius: 12,
    borderWidth: 1.5,
    paddingVertical: 12,
    paddingHorizontal: 14,
    marginBottom: 10,
  },
});

/**
 * Forgot Password — sends reset email via Supabase (same as website).
 * NOTE: reset link opens the website's reset-password page (email based).
 */
import React, { useState } from 'react';
import { View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '@/context/ThemeContext';
import { useAuth } from '@/context/AuthContext';
import { AppText } from '@/components/AppText';
import { Field } from '@/components/Field';
import { PrimaryButton } from '@/components/PrimaryButton';
import { HeaderBar } from '@/components/HeaderBar';
import { friendlyAuthError } from '@/lib/helpers';

export default function ForgotPasswordScreen() {
  const { theme } = useTheme();
  const { resetPassword } = useAuth();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [sent, setSent] = useState(false);

  const submit = async () => {
    setError('');
    if (!email || !email.includes('@')) {
      setError('Sahi email address daalein!');
      return;
    }
    setLoading(true);
    const { error: err } = await resetPassword(email);
    setLoading(false);
    if (err) {
      setError(friendlyAuthError(err));
      return;
    }
    setSent(true);
  };

  return (
    <SafeAreaView edges={['top', 'bottom']} style={{ flex: 1, backgroundColor: theme.pageBg }}>
      <HeaderBar title="Password Bhool Gaye?" />
      <View style={{ padding: 20 }}>
        {sent ? (
          <View style={{ alignItems: 'center', paddingVertical: 30 }}>
            <AppText style={{ fontSize: 44 }}>📧</AppText>
            <AppText variant="heading" center style={{ marginTop: 12 }}>
              Reset Link Bhej Diya!
            </AppText>
            <AppText variant="body" color={theme.gray} center style={{ marginTop: 8, lineHeight: 21 }}>
              <AppText variant="bodyBold">{email}</AppText> par password reset ka link bheja gaya hai.
              {'\n'}Inbox (aur spam) check karein.
            </AppText>
          </View>
        ) : (
          <>
            <AppText variant="body" color={theme.gray} style={{ marginBottom: 16, lineHeight: 21 }}>
              Apna email daalein — hum aapko password reset ka link bhej denge.
            </AppText>
            <Field label="Email" value={email} onChangeText={setEmail} placeholder="aapka@email.com" keyboardType="email-address" autoCapitalize="none" error={error || undefined} />
            <PrimaryButton title={loading ? 'Bhej rahe hain…' : '📩 Reset Link Bhejein'} loading={loading} onPress={submit} />
          </>
        )}
      </View>
    </SafeAreaView>
  );
}

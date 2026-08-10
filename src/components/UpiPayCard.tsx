/**
 * UpiPayCard — UPI QR payment card with real amount-embedded UPI deep link.
 * Port of the website's UpiPayCard.jsx (dynamic QR with quiet zone).
 */
import React from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import QRCode from 'react-native-qrcode-svg';
import { useTheme } from '@/context/ThemeContext';
import { AppText } from './AppText';
import { inr } from '@/lib/helpers';
import { STORE_NAME } from '@/lib/config';

interface UpiPayCardProps {
  total: number;
  upiId: string;
}

export function UpiPayCard({ total, upiId }: UpiPayCardProps) {
  const { theme } = useTheme();
  const id = (upiId || '').trim();
  const link =
    'upi://pay?pa=' +
    encodeURIComponent(id) +
    '&pn=' +
    encodeURIComponent(STORE_NAME) +
    '&am=' +
    encodeURIComponent(String(Math.max(0, Number(total) || 0))) +
    '&cu=INR' +
    '&tn=' +
    encodeURIComponent('Order Payment');

  return (
    <View style={[styles.card, { backgroundColor: theme.cardBg, shadowColor: theme.cardShadow.shadowColor, shadowOpacity: theme.cardShadow.shadowOpacity, shadowRadius: theme.cardShadow.shadowRadius, shadowOffset: theme.cardShadow.shadowOffset }]}>
      <View style={[styles.header, { backgroundColor: theme.primary }]}>
        <AppText variant="captionBold" color="#fff">
          🛒 {STORE_NAME}
        </AppText>
        <View style={styles.amountRow}>
          <AppText variant="caption" color="rgba(255,255,255,0.85)">
            Amount to pay
          </AppText>
          <AppText variant="title" color="#fff">
            {inr(total)}
          </AppText>
        </View>
      </View>

      <ScrollView style={{ maxHeight: 460 }} contentContainerStyle={styles.body}>
        <AppText variant="captionBold" color={theme.primaryDark} style={styles.secure}>
          🔒 100% Secure Payment — BHIM UPI
        </AppText>
        <View style={styles.bhimRow}>
          <AppText variant="label">BHIM</AppText>
          <View style={[styles.flag, { backgroundColor: '#FF9933' }]} />
          <AppText variant="label">UPI</AppText>
          <View style={[styles.flag, { backgroundColor: '#16A34A' }]} />
        </View>

        <View style={[styles.qrBox, { backgroundColor: theme.light, borderColor: theme.border }]}>
          <View style={styles.qrInner}>
            {id ? (
              <QRCode value={link} size={200} quietZone={10} ecl="M" />
            ) : (
              <AppText variant="caption" color={theme.gray} center>
                UPI ID setup nahi hua — manually pay karein
              </AppText>
            )}
          </View>
        </View>

        <AppText variant="caption" color={theme.gray} style={styles.mt}>
          📷 Kisi bhi UPI app se scan karein
        </AppText>
        <AppText variant="caption" color={theme.dark} center style={styles.mt}>
          💰 Amount <AppText variant="captionBold">{inr(total)}</AppText> QR mein pehle se set hai — bas scan karke pay karein
        </AppText>

        <View style={styles.appsRow}>
          {['GPay', 'Paytm', 'PhonePe', 'पे', 'BHIM'].map((a, i) => (
            <View key={i} style={[styles.appChip, { backgroundColor: theme.light, borderColor: theme.border }]}>
              <AppText variant="captionBold" style={{ fontSize: 11 }}>
                {a}
              </AppText>
            </View>
          ))}
        </View>

        <AppText variant="caption" color={theme.gray} style={styles.upiId}>
          🔒 UPI ID: {id || '—'}
        </AppText>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: 16, overflow: 'hidden', elevation: 3 },
  header: { paddingHorizontal: 16, paddingVertical: 14 },
  amountRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 6 },
  body: { padding: 16, alignItems: 'center' },
  secure: { marginBottom: 8 },
  bhimRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 12 },
  flag: { width: 8, height: 8, borderRadius: 1 },
  qrBox: {
    borderWidth: 1,
    borderRadius: 14,
    padding: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  qrInner: { backgroundColor: '#fff', borderRadius: 10, padding: 6, overflow: 'hidden' },
  mt: { marginTop: 10 },
  appsRow: { flexDirection: 'row', gap: 8, marginTop: 14 },
  appChip: {
    flex: 1,
    aspectRatio: 1,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  upiId: { marginTop: 12, textAlign: 'center' },
});

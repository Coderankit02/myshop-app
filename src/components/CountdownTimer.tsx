/**
 * CountdownTimer — flash sale countdown to midnight (like the site's FlashSale).
 */
import React, { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { AppText } from './AppText';

function pad(n: number) {
  return String(n).padStart(2, '0');
}

export function CountdownTimer({ compact = false }: { compact?: boolean }) {
  const [left, setLeft] = useState(() => msToMidnight());
  useEffect(() => {
    const t = setInterval(() => setLeft(msToMidnight()), 1000);
    return () => clearInterval(t);
  }, []);

  const h = Math.floor(left / 3.6e6);
  const m = Math.floor((left % 3.6e6) / 6e4);
  const s = Math.floor((left % 6e4) / 1e3);
  const chips = [
    { v: h, l: 'Hours' },
    { v: m, l: 'Min' },
    { v: s, l: 'Sec' },
  ];

  return (
    <View style={[styles.row, compact && { gap: 4 }]}>
      <AppText variant="caption" color="rgba(255,255,255,0.8)" style={styles.endsIn}>
        Ends in
      </AppText>
      {chips.map((c) => (
        <View key={c.l} style={[styles.chip, compact && { minWidth: 40, paddingHorizontal: 8 }]}>
          <AppText variant="label" color="#fff" style={styles.num}>
            {pad(c.v)}
          </AppText>
          <AppText variant="tiny" color="rgba(255,255,255,0.7)" style={styles.lbl}>
            {c.l}
          </AppText>
        </View>
      ))}
    </View>
  );
}

function msToMidnight(): number {
  const n = new Date();
  const e = new Date(n);
  e.setHours(24, 0, 0, 0);
  return Math.max(0, e.getTime() - n.getTime());
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  endsIn: { marginRight: 2 },
  chip: {
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 5,
    minWidth: 46,
    alignItems: 'center',
  },
  num: { fontSize: 14, fontVariant: ['tabular-nums'] },
  lbl: { textTransform: 'uppercase', letterSpacing: 0.4 },
});

/**
 * Addresses — manage saved delivery addresses (port of profile.js API).
 */
import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { supabase } from '@/lib/supabase';
import { useTheme } from '@/context/ThemeContext';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import { AppText } from '@/components/AppText';
import { Field } from '@/components/Field';
import { PrimaryButton } from '@/components/PrimaryButton';
import { EmptyState } from '@/components/EmptyState';
import { HeaderBar } from '@/components/HeaderBar';
import type { Address } from '@/lib/types';

export default function AddressesScreen() {
  const { theme } = useTheme();
  const { user } = useAuth();
  const { showToast } = useToast();
  const router = useRouter();

  const [addresses, setAddresses] = useState<Address[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Address | null>(null);
  const [form, setForm] = useState({ label: 'Home', line1: '', line2: '', city: 'Jaunpur', pincode: '222001', is_default: false });
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    if (!user) {
      setAddresses([]);
      setLoading(false);
      return;
    }
    const { data } = await supabase
      .from('addresses')
      .select('*')
      .eq('user_id', user.id)
      .order('is_default', { ascending: false })
      .order('created_at', { ascending: false });
    setAddresses(data || []);
    setLoading(false);
  }, [user]);

  useEffect(() => {
    load();
  }, [load]);

  if (!user) {
    return (
      <SafeAreaView edges={['top', 'bottom']} style={{ flex: 1, backgroundColor: theme.pageBg }}>
        <HeaderBar title="My Addresses" />
        <EmptyState icon="📍" title="Login karein" sub="Addresses save karne ke liye" cta="Login →" onCta={() => router.push('/auth')} />
      </SafeAreaView>
    );
  }

  const openNew = () => {
    setEditing(null);
    setForm({ label: 'Home', line1: '', line2: '', city: 'Jaunpur', pincode: '222001', is_default: false });
    setShowForm(true);
  };
  const openEdit = (a: Address) => {
    setEditing(a);
    setForm({ label: a.label, line1: a.line1, line2: a.line2 || '', city: a.city, pincode: a.pincode, is_default: !!a.is_default });
    setShowForm(true);
  };

  const save = async () => {
    if (!form.line1.trim() || !form.line2.trim() || !form.city.trim() || !/^\d{6}$/.test(form.pincode.trim())) {
      showToast('Address, landmark, city aur 6-digit pincode zaroori hai!');
      return;
    }
    setSaving(true);
    const payload = {
      label: form.label || 'Home',
      line1: form.line1,
      line2: form.line2,
      city: form.city,
      pincode: form.pincode,
      is_default: form.is_default,
      updated_at: new Date().toISOString(),
    };
    let savedId = editing?.id;
    if (editing) {
      const { error } = await supabase.from('addresses').update(payload).eq('id', editing.id).eq('user_id', user.id);
      if (error) {
        showToast('Update nahi hua');
        setSaving(false);
        return;
      }
    } else {
      const { data: inserted, error } = await supabase
        .from('addresses')
        .insert({ ...payload, user_id: user.id, created_at: new Date().toISOString() })
        .select('id')
        .single();
      if (error) {
        showToast('Save nahi hua');
        setSaving(false);
        return;
      }
      savedId = inserted?.id;
    }
    // Default flag: pehle saare unset, phir sirf isi address ko default banao
    if (form.is_default && savedId) {
      await supabase.from('addresses').update({ is_default: false }).eq('user_id', user.id);
      await supabase.from('addresses').update({ is_default: true }).eq('id', savedId).eq('user_id', user.id);
    }
    setSaving(false);
    setShowForm(false);
    setEditing(null);
    await load();
    showToast('Address save ho gaya! 📍');
  };

  const remove = async (a: Address) => {
    const { error } = await supabase.from('addresses').delete().eq('id', a.id).eq('user_id', user.id);
    if (error) return;
    if (a.is_default) {
      const { data: remaining } = await supabase.from('addresses').select('id').eq('user_id', user.id).order('created_at', { ascending: false }).limit(1);
      if (remaining?.length) {
        await supabase.from('addresses').update({ is_default: true }).eq('id', remaining[0].id).eq('user_id', user.id);
      }
    }
    await load();
    showToast('Address delete ho gaya');
  };

  const setDefault = async (a: Address) => {
    await supabase.from('addresses').update({ is_default: false }).eq('user_id', user.id);
    await supabase.from('addresses').update({ is_default: true }).eq('id', a.id).eq('user_id', user.id);
    await load();
  };

  return (
    <SafeAreaView edges={['top', 'bottom']} style={{ flex: 1, backgroundColor: theme.pageBg }}>
      <HeaderBar title="My Addresses" />
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>
        {loading ? (
          <ActivityIndicator color={theme.primary} style={{ marginVertical: 30 }} />
        ) : addresses.length === 0 && !showForm ? (
          <EmptyState icon="📍" title="Koi address nahi" sub="Naya address add karo" cta="+ Address Add Karo" onCta={openNew} />
        ) : (
          <>
            {addresses.map((a) => (
              <View key={a.id} style={[styles.card, { backgroundColor: theme.cardBg, borderColor: a.is_default ? theme.primary : theme.border }]}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <AppText variant="bodyBold">{a.label}</AppText>
                  {a.is_default && (
                    <View style={[styles.defaultTag, { backgroundColor: theme.primary }]}>
                      <AppText variant="tiny" color="#fff" style={{ fontWeight: '800' }}>
                        DEFAULT
                      </AppText>
                    </View>
                  )}
                  <View style={{ flex: 1 }} />
                  <Pressable onPress={() => remove(a)} hitSlop={8}>
                    <AppText variant="caption" color={theme.red}>
                      🗑
                    </AppText>
                  </Pressable>
                </View>
                <AppText variant="body" color={theme.text} style={{ marginTop: 4 }}>
                  {a.line1}
                  {a.line2 ? `, ${a.line2}` : ''}
                  {'\n'}
                  {a.city}
                  {a.pincode ? ` - ${a.pincode}` : ''}
                </AppText>
                <View style={{ flexDirection: 'row', gap: 10, marginTop: 10 }}>
                  <Pressable onPress={() => openEdit(a)} style={[styles.smallBtn, { backgroundColor: theme.primaryLight }]}>
                    <AppText variant="captionBold" color={theme.primaryDark}>
                      ✏️ Edit
                    </AppText>
                  </Pressable>
                  {!a.is_default && (
                    <Pressable onPress={() => setDefault(a)} style={[styles.smallBtn, { borderColor: theme.border, borderWidth: 1 }]}>
                      <AppText variant="captionBold" color={theme.gray}>
                        ⭐ Default
                      </AppText>
                    </Pressable>
                  )}
                </View>
              </View>
            ))}
            {!showForm && (
              <PrimaryButton title="+ Naya Address Add Karo" variant="outline" onPress={openNew} style={{ marginTop: 4 }} />
            )}
          </>
        )}

        {showForm && (
          <View style={[styles.formCard, { backgroundColor: theme.cardBg, borderColor: theme.border }]}>
            <AppText variant="heading" style={{ marginBottom: 10 }}>
              {editing ? '✏️ Address Edit' : '➕ Naya Address'}
            </AppText>
            <Field label="Label" value={form.label} onChangeText={(t) => setForm({ ...form, label: t })} placeholder="Home/Office" />
            <Field label="Pura pata *" value={form.line1} onChangeText={(t) => setForm({ ...form, line1: t })} placeholder="Ghar ka pura pata, gali, makaan no." />
            <Field label="Landmark *" value={form.line2} onChangeText={(t) => setForm({ ...form, line2: t })} placeholder="Mohalla / Landmark" />
            <View style={{ flexDirection: 'row', gap: 10 }}>
              <View style={{ flex: 1 }}>
                <Field label="City *" value={form.city} onChangeText={(t) => setForm({ ...form, city: t })} placeholder="City" />
              </View>
              <View style={{ flex: 1 }}>
                <Field label="Pincode *" value={form.pincode} onChangeText={(t) => setForm({ ...form, pincode: t.replace(/\D/g, '').slice(0, 6) })} placeholder="222001" keyboardType="number-pad" maxLength={6} />
              </View>
            </View>
            <Pressable onPress={() => setForm((f) => ({ ...f, is_default: !f.is_default }))} style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 }}>
              <View
                style={[
                  styles.checkbox,
                  { borderColor: form.is_default ? theme.primary : theme.border, backgroundColor: form.is_default ? theme.primary : 'transparent' },
                ]}>
                {form.is_default ? <AppText variant="tiny" color="#fff" style={{ fontWeight: '800' }}>✓</AppText> : null}
              </View>
              <AppText variant="caption" color={theme.gray}>
                Isse default address banayein
              </AppText>
            </Pressable>
            <PrimaryButton title={saving ? 'Saving…' : '💾 Save Address'} loading={saving} onPress={save} />
            <Pressable onPress={() => { setShowForm(false); setEditing(null); }} style={{ paddingVertical: 10, alignItems: 'center' }}>
              <AppText variant="captionBold" color={theme.gray}>
                Cancel
              </AppText>
            </Pressable>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: 16, borderWidth: 1.5, padding: 14, marginBottom: 12 },
  defaultTag: { borderRadius: 5, paddingHorizontal: 5, paddingVertical: 2 },
  smallBtn: { borderRadius: 10, paddingHorizontal: 12, paddingVertical: 7 },
  formCard: { borderRadius: 16, borderWidth: 1, padding: 14, marginTop: 4 },
  checkbox: { width: 20, height: 20, borderRadius: 6, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center' },
});

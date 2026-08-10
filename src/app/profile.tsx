/**
 * Profile — edit name / phone + avatar photo upload (mirror profile.js
 * updateProfile and the website's ProfileTab: Cloudinary avatar, preview,
 * member-since + user ID chip).
 */
import React, { useState } from 'react';
import { Image, Pressable, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import { useTheme } from '@/context/ThemeContext';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import { AppText } from '@/components/AppText';
import { Field } from '@/components/Field';
import { PrimaryButton } from '@/components/PrimaryButton';
import { HeaderBar } from '@/components/HeaderBar';
import { uploadAvatar } from '@/lib/cloudinary';
import { isPhoneValid } from '@/lib/helpers';

const memberSince = (d?: string | null): string => {
  if (!d) return '';
  const dt = new Date(d);
  if (isNaN(dt.getTime())) return '';
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return `${months[dt.getMonth()]} ${dt.getFullYear()}`;
};

export default function ProfileScreen() {
  const { theme } = useTheme();
  const { user, updateProfile } = useAuth();
  const { showToast } = useToast();
  const [name, setName] = useState(user?.name || '');
  const [phone, setPhone] = useState(user?.phone || '');
  const [saving, setSaving] = useState(false);
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [avatarMime, setAvatarMime] = useState('image/jpeg');

  const pickAvatar = async () => {
    const res = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.7,
      allowsEditing: true,
      aspect: [1, 1],
    });
    if (res.canceled || !res.assets[0]) return;
    setAvatarMime(res.assets[0].mimeType || 'image/jpeg');
    setAvatarPreview(res.assets[0].uri);
  };

  const save = async () => {
    if (!name.trim()) {
      showToast('Naam zaroori hai!');
      return;
    }
    if (phone && !isPhoneValid(phone)) {
      showToast('Sahi 10-digit mobile number daalein!');
      return;
    }
    setSaving(true);
    try {
      // Avatar upload (site jaisa — myshop/avatars/{userId}, Cloudinary)
      let avatar_url = user?.avatar_url || null;
      if (avatarPreview && user?.id) {
        setAvatarUploading(true);
        const url = await uploadAvatar(avatarPreview, user.id, avatarMime);
        if (!url) {
          showToast('⚠️ Photo upload fail — dobara try karein');
          setAvatarUploading(false);
          setSaving(false);
          return;
        }
        avatar_url = url;
        setAvatarUploading(false);
      }
      const ok = await updateProfile({ name: name.trim(), phone: phone.trim(), avatar_url });
      // Preview sirf SUCCESS par clear karo — nahi to user ki chuni photo kabhi
      // silently gayab nahi honi chahiye (review bug fix)
      if (ok) {
        setAvatarPreview(null);
        setAvatarMime('image/jpeg');
      }
      showToast(ok ? 'Profile update ho gaya ✅' : 'Update nahi hua. Dobara try karein.');
    } catch {
      setAvatarUploading(false);
      showToast('Update nahi hua. Dobara try karein.');
    } finally {
      setSaving(false);
    }
  };

  const avatarSource =
    avatarPreview || user?.avatar_url || null;

  return (
    <SafeAreaView edges={['top', 'bottom']} style={{ flex: 1, backgroundColor: theme.pageBg }}>
      <HeaderBar title="My Profile 👤" />
      <View style={{ padding: 20 }}>
        {/* Avatar — tap to change (site ke ProfileTab jaisa) */}
        <Pressable
          onPress={pickAvatar}
          disabled={avatarUploading}
          style={[styles.avatarCard, { backgroundColor: theme.light, borderColor: theme.border }]}>
          <View style={[styles.avatar, { backgroundColor: theme.primary }]}>
            {avatarSource ? (
              <Image source={{ uri: avatarSource }} style={styles.avatarImg} resizeMode="cover" />
            ) : (
              <AppText variant="title" color="#fff" style={{ fontSize: 28 }}>
                {(user?.name || 'U')[0]}
              </AppText>
            )}
          </View>
          <View style={{ flex: 1 }}>
            <AppText variant="bodyBold" style={{ color: theme.primaryDark }}>
              {avatarUploading ? '⏳ Upload ho raha hai…' : '📷 Photo Change Karo'}
            </AppText>
            <AppText variant="caption" color={theme.gray}>
              JPG, PNG • Max 5MB
            </AppText>
          </View>
        </Pressable>

        <AppText variant="caption" color={theme.gray} center style={{ marginTop: 6 }}>
          {user?.email}
        </AppText>

        <View style={{ height: 16 }} />

        <Field label="Naam" value={name} onChangeText={setName} placeholder="Aapka naam" />
        <Field label="Mobile number" value={phone} onChangeText={(t) => setPhone(t.replace(/\D/g, '').slice(0, 10))} placeholder="10-digit mobile (optional)" keyboardType="phone-pad" maxLength={10} />

        {/* Member since + ID (site ke ProfileTab jaisa) */}
        <View style={[styles.memberChip, { backgroundColor: theme.tintGreen.bg, borderColor: theme.tintGreen.border }]}>
          <AppText variant="caption" color={theme.tintGreen.text} style={{ lineHeight: 18 }}>
            📅 Member since: <AppText variant="captionBold" color={theme.tintGreen.text}>{memberSince(user?.created_at) || '—'}</AppText>
            {'\n'}🆔 ID: <AppText variant="caption" color={theme.tintGreen.text}>{user?.id?.slice(0, 8)}…</AppText>
          </AppText>
        </View>

        <PrimaryButton
          title={saving ? 'Saving…' : avatarPreview ? '💾 Photo ke Saath Save Karein' : '💾 Save Profile'}
          loading={saving}
          onPress={save}
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  avatarCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    borderRadius: 16,
    borderWidth: 1.5,
    padding: 14,
  },
  avatar: { width: 72, height: 72, borderRadius: 36, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  avatarImg: { width: '100%', height: '100%' },
  memberChip: { borderRadius: 12, borderWidth: 1.5, padding: 12, marginVertical: 12 },
});

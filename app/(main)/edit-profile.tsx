import { Fonts } from '@/constants/theme';
import { getUserProfile, updateUserProfile } from '@/services/auth';
import { auth } from '@/services/firebase';
import { FontAwesome6 } from '@expo/vector-icons';
import { router } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const C = {
  bg: '#F8FAFD',
  surface: '#FFFFFF',
  surfaceAlt: '#F2F5FA',
  primary: '#14213A',
  secondary: '#2A3F66',
  success: '#3F5A3A',
  successSoft: '#E2EAD9',
  danger: '#7A2E2E',
  dangerSoft: '#F9EFEC',
  textPrimary: '#14213A',
  textSecondary: '#4A5468',
  textMuted: '#6B7689',
  border: '#E3E9F2',
};

export default function EditProfileScreen() {
  const user = auth.currentUser;
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (!user?.uid) { setLoading(false); return; }
    getUserProfile(user.uid)
      .then((data) => {
        if (data) {
          setFullName(data.fullName || '');
          setPhone(data.phone || '');
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [user?.uid]);

  const handleSave = async () => {
    if (!user?.uid) return;
    if (!fullName.trim()) {
      setError('Full name cannot be empty.');
      setSuccess('');
      return;
    }
    setSaving(true);
    setError('');
    setSuccess('');
    try {
      await updateUserProfile(user.uid, { fullName, phone });
      setSuccess('Profile updated successfully.');
    } catch {
      setError('Could not update profile. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} hitSlop={8}>
            <FontAwesome6 name="arrow-left" size={16} color={C.primary} />
          </TouchableOpacity>
        </View>

        <View style={styles.hero}>
          <Text style={styles.eyebrow}>Account</Text>
          <Text style={styles.title}>Edit Profile</Text>
          <Text style={styles.subtitle}>Update your name and contact information.</Text>
        </View>

        {loading ? (
          <View style={styles.stateCard}>
            <ActivityIndicator color={C.secondary} />
          </View>
        ) : (
          <View style={styles.card}>
            {error ? (
              <View style={[styles.banner, { backgroundColor: C.dangerSoft }]}>
                <Text style={[styles.bannerText, { color: C.danger }]}>{error}</Text>
              </View>
            ) : null}
            {success ? (
              <View style={[styles.banner, { backgroundColor: C.successSoft }]}>
                <Text style={[styles.bannerText, { color: C.success }]}>{success}</Text>
              </View>
            ) : null}

            <View style={styles.fieldGroup}>
              <Text style={styles.label}>Full Name</Text>
              <TextInput
                value={fullName}
                onChangeText={(v) => { setFullName(v); setSuccess(''); setError(''); }}
                placeholder="Your full name"
                placeholderTextColor={C.textMuted}
                style={styles.input}
              />
            </View>

            <View style={styles.fieldGroup}>
              <Text style={styles.label}>Phone Number</Text>
              <TextInput
                value={phone}
                onChangeText={(v) => { setPhone(v); setSuccess(''); setError(''); }}
                placeholder="+233 XX XXX XXXX"
                placeholderTextColor={C.textMuted}
                keyboardType="phone-pad"
                style={styles.input}
              />
            </View>

            <View style={styles.fieldGroup}>
              <Text style={styles.label}>Email Address</Text>
              <View style={styles.readOnlyField}>
                <Text style={styles.readOnlyText}>{user?.email || '—'}</Text>
              </View>
              <Text style={styles.hint}>Email cannot be changed from the app.</Text>
            </View>

            <Pressable
              onPress={handleSave}
              disabled={saving}
              style={({ pressed }) => [styles.saveBtn, (saving || pressed) && styles.saveBtnDisabled]}
            >
              {saving
                ? <ActivityIndicator color="#fff" size="small" />
                : <Text style={styles.saveBtnText}>Save Changes</Text>
              }
            </Pressable>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.bg },
  scroll: { flex: 1 },
  content: { padding: 20, gap: 20, paddingBottom: 60 },

  header: { flexDirection: 'row', alignItems: 'center' },
  backBtn: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: C.surface, borderWidth: 1, borderColor: C.border,
    alignItems: 'center', justifyContent: 'center',
  },

  hero: { gap: 6 },
  eyebrow: {
    fontSize: 12, fontFamily: Fonts.sansSemiBold, color: C.secondary,
    textTransform: 'uppercase', letterSpacing: 0.8,
  },
  title: { fontSize: 34, lineHeight: 40, fontFamily: Fonts.displayBold, color: C.textPrimary },
  subtitle: { fontSize: 15, lineHeight: 24, fontFamily: Fonts.sans, color: C.textSecondary },

  stateCard: {
    backgroundColor: C.surface, borderRadius: 22, padding: 24,
    borderWidth: 1, borderColor: C.border, alignItems: 'center',
  },

  card: {
    backgroundColor: C.surface, borderRadius: 22, padding: 20,
    borderWidth: 1, borderColor: C.border, gap: 16,
  },
  banner: { borderRadius: 12, padding: 12 },
  bannerText: { fontSize: 13, lineHeight: 20, fontFamily: Fonts.sans },

  fieldGroup: { gap: 8 },
  label: { fontSize: 14, fontFamily: Fonts.sansSemiBold, color: C.textPrimary },
  hint: { fontSize: 12, lineHeight: 18, fontFamily: Fonts.sans, color: C.textMuted },
  input: {
    backgroundColor: C.surfaceAlt, borderWidth: 1, borderColor: C.border,
    borderRadius: 14, paddingHorizontal: 14, paddingVertical: 13,
    fontSize: 15, fontFamily: Fonts.sans, color: C.textPrimary,
  },
  readOnlyField: {
    backgroundColor: C.surfaceAlt, borderWidth: 1, borderColor: C.border,
    borderRadius: 14, paddingHorizontal: 14, paddingVertical: 13,
  },
  readOnlyText: { fontSize: 15, fontFamily: Fonts.sans, color: C.textMuted },

  saveBtn: {
    backgroundColor: C.primary, borderRadius: 16, paddingVertical: 15,
    alignItems: 'center', justifyContent: 'center', minHeight: 52,
  },
  saveBtnDisabled: { backgroundColor: '#CBD3E0' },
  saveBtnText: { fontSize: 15, fontFamily: Fonts.sansBold, color: '#FFFFFF' },
});

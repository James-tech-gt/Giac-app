import { C as TC, Fonts } from '@/constants/theme';
import { auth } from '@/services/firebase';
import { createCourseRegistration } from '@/services/firestore';
import { getUserProfile } from '@/services/auth';
import { FontAwesome6 } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const C = {
  bg: '#F8FAFD',
  surface: '#FFFFFF',
  surfaceAlt: '#F2F5FA',
  primary: '#14213A',
  secondary: '#2A3F66',
  success: '#2D6A4F',
  successSoft: '#E8F2EE',
  danger: '#7A2E2E',
  dangerSoft: '#F9EFEC',
  textPrimary: '#14213A',
  textSecondary: '#4A5468',
  textMuted: '#6B7689',
  border: '#E3E9F2',
};

const COURSES = [
  { id: 'pecadr' as const, label: 'PECADR', desc: 'Professional Executive Certificate in ADR' },
  { id: 'pemadr' as const, label: 'PEMADR', desc: 'Professional Executive Masters in ADR' },
];

export default function CourseRegistrationScreen() {
  const user = auth.currentUser;

  const scrollRef = useRef<ScrollView>(null);
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState(user?.email ?? '');
  const [phone, setPhone] = useState('');
  const [courseInterest, setCourseInterest] = useState<'pecadr' | 'pemadr'>('pecadr');
  const [busy, setBusy] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [banner, setBanner] = useState<string | null>(null);

  useEffect(() => {
    if (!user?.uid) return;
    getUserProfile(user.uid).then((profile) => {
      if (profile?.fullName) setFullName(profile.fullName);
      if (profile?.phone) setPhone(profile.phone);
    }).catch(() => {});
  }, [user?.uid]);

  function validate() {
    const e: Record<string, string> = {};
    if (!fullName.trim()) e.fullName = 'Full name is required.';
    if (!email.trim()) e.email = 'Email is required.';
    if (!phone.trim()) e.phone = 'Phone number is required.';
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  async function handleSubmit() {
    if (!validate()) {
      scrollRef.current?.scrollTo({ y: 0, animated: true });
      return;
    }
    if (!user?.uid) return;
    setBusy(true);
    try {
      await createCourseRegistration({
        userId: user.uid,
        fullName,
        email,
        phone,
        courseInterest,
      });
      router.replace('/(main)/home');
    } catch {
      setBanner('Could not submit your registration. Please try again.');
      scrollRef.current?.scrollTo({ y: 0, animated: true });
    } finally {
      setBusy(false);
    }
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
      <KeyboardAvoidingView
        style={styles.safe}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 20 : 0}
      >
        <ScrollView
          ref={scrollRef}
          style={styles.scroll}
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.header}>
            <Pressable onPress={() => router.back()} style={styles.backBtn} hitSlop={8}>
              <FontAwesome6 name="arrow-left" size={16} color={C.primary} />
            </Pressable>
          </View>

          <View style={styles.hero}>
            <Text style={styles.eyebrow}>Get Started</Text>
            <Text style={styles.title}>Register Your Course</Text>
            <Text style={styles.subtitle}>
              Register your course to access GIAC programmes and begin your learning journey.
            </Text>
          </View>

          {banner && (
            <View style={styles.errorBanner}>
              <FontAwesome6 name="circle-xmark" size={14} color={C.danger} />
              <Text style={styles.errorBannerText}>{banner}</Text>
            </View>
          )}

          {/* Course selection */}
          <View style={styles.section}>
            <Text style={styles.label}>Course of Interest</Text>
            <View style={styles.courseRow}>
              {COURSES.map((c) => (
                <Pressable
                  key={c.id}
                  onPress={() => setCourseInterest(c.id)}
                  style={[styles.courseChip, courseInterest === c.id && styles.courseChipActive]}
                >
                  <Text style={[styles.courseChipLabel, courseInterest === c.id && styles.courseChipLabelActive]}>
                    {c.label}
                  </Text>
                  <Text style={[styles.courseChipDesc, courseInterest === c.id && styles.courseChipDescActive]}>
                    {c.desc}
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>

          {/* Full name */}
          <View style={styles.section}>
            <Text style={styles.label}>Full Name</Text>
            <TextInput
              value={fullName}
              onChangeText={(v) => { setFullName(v); setErrors((e) => ({ ...e, fullName: '' })); }}
              placeholder="Your full name"
              placeholderTextColor={C.textMuted}
              style={[styles.input, errors.fullName ? styles.inputError : null]}
              editable={!busy}
            />
            {errors.fullName ? <Text style={styles.fieldError}>{errors.fullName}</Text> : null}
          </View>

          {/* Email */}
          <View style={styles.section}>
            <Text style={styles.label}>Email Address</Text>
            <TextInput
              value={email}
              onChangeText={(v) => { setEmail(v); setErrors((e) => ({ ...e, email: '' })); }}
              placeholder="Your email address"
              placeholderTextColor={C.textMuted}
              keyboardType="email-address"
              autoCapitalize="none"
              style={[styles.input, errors.email ? styles.inputError : null]}
              editable={!busy}
            />
            {errors.email ? <Text style={styles.fieldError}>{errors.email}</Text> : null}
          </View>

          {/* Phone */}
          <View style={styles.section}>
            <Text style={styles.label}>Phone Number</Text>
            <TextInput
              value={phone}
              onChangeText={(v) => { setPhone(v); setErrors((e) => ({ ...e, phone: '' })); }}
              placeholder="e.g. +233 24 000 0000"
              placeholderTextColor={C.textMuted}
              keyboardType="phone-pad"
              style={[styles.input, errors.phone ? styles.inputError : null]}
              editable={!busy}
            />
            {errors.phone ? <Text style={styles.fieldError}>{errors.phone}</Text> : null}
          </View>

          <View style={styles.noteCard}>
            <FontAwesome6 name="circle-info" size={13} color={C.secondary} />
            <Text style={styles.noteText}>
              After submitting, GIAC will review your registration and send you an admission letter with your student number.
            </Text>
          </View>

          <Pressable
            onPress={handleSubmit}
            disabled={busy}
            style={({ pressed }) => [styles.submitBtn, (pressed || busy) && styles.pressed]}
          >
            {busy
              ? <ActivityIndicator color="#fff" size="small" />
              : <>
                  <Text style={styles.submitBtnText}>Submit Registration</Text>
                  <FontAwesome6 name="arrow-right" size={14} color="#fff" />
                </>
            }
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>
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

  errorBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: '#F9EFEC', borderWidth: 1, borderColor: '#E8B8B8',
    borderRadius: 14, paddingHorizontal: 14, paddingVertical: 12,
  },
  errorBannerText: { flex: 1, fontSize: 13, fontFamily: Fonts.sansSemiBold, color: C.danger },

  section: { gap: 8 },
  label: { fontSize: 13, fontFamily: Fonts.sansSemiBold, color: C.textPrimary },

  courseRow: { flexDirection: 'row', gap: 10 },
  courseChip: {
    flex: 1, borderRadius: 16, borderWidth: 1, borderColor: C.border,
    backgroundColor: C.surface, padding: 14, gap: 4,
  },
  courseChipActive: { borderColor: C.secondary, backgroundColor: '#EEF2F9' },
  courseChipLabel: { fontSize: 15, fontFamily: Fonts.sansBold, color: C.textMuted },
  courseChipLabelActive: { color: C.secondary },
  courseChipDesc: { fontSize: 11, lineHeight: 16, fontFamily: Fonts.sans, color: C.textMuted },
  courseChipDescActive: { color: C.secondary },

  input: {
    backgroundColor: C.surface, borderWidth: 1, borderColor: C.border,
    borderRadius: 14, paddingHorizontal: 16, paddingVertical: 14,
    fontSize: 15, fontFamily: Fonts.sans, color: C.textPrimary,
  },
  inputError: { borderColor: '#E8B8B8' },
  fieldError: { fontSize: 12, fontFamily: Fonts.sans, color: C.danger },

  noteCard: {
    flexDirection: 'row', gap: 10, alignItems: 'flex-start',
    backgroundColor: '#EEF2F9', borderRadius: 14, padding: 14,
  },
  noteText: { flex: 1, fontSize: 13, lineHeight: 20, fontFamily: Fonts.sans, color: C.secondary },

  submitBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10,
    backgroundColor: C.primary, borderRadius: 16, paddingVertical: 16,
  },
  submitBtnText: { fontSize: 16, fontFamily: Fonts.sansBold, color: '#FFFFFF' },
  pressed: { opacity: 0.85 },
});

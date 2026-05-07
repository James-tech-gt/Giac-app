import { Fonts } from '@/constants/theme';
import { getUserProfile } from '@/services/auth';
import { auth } from '@/services/firebase';
import { Course, createApplication, getCourses } from '@/services/firestore';
import { FontAwesome6 } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  useWindowDimensions,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const C = {
  bg: '#F8FAFD',
  surface: '#FFFFFF',
  surfaceAlt: '#F2F5FA',
  primary: '#14213A',
  primarySoft: '#E8ECF4',
  secondary: '#2A3F66',
  accentSoft: '#F4ECD2',
  warning: '#8C6A1F',
  textPrimary: '#14213A',
  textSecondary: '#4A5468',
  textMuted: '#6B7689',
  border: '#E3E9F2',
  danger: '#7A2E2E',
  dangerSoft: '#F9EFEC',
};

type IconName = React.ComponentProps<typeof FontAwesome6>['name'];

type FormErrors = {
  fullName?: string;
  email?: string;
  phone?: string;
  courseId?: string;
};

const ADMISSION_STEPS: { icon: IconName; label: string }[] = [
  {
    icon: 'file-lines',
    label: '1. Express interest and receive a registration link or form.',
  },
  {
    icon: 'wallet',
    label: "2. Pay the required registration fee for the certificate or master's program.",
  },
  {
    icon: 'envelope-open',
    label: '3. Receive your admission letter after successful registration.',
  },
  {
    icon: 'circle-check',
    label: '4. Complete tuition payment for your selected program.',
  },
];

const ENTRY_REQUIREMENTS: { icon: IconName; label: string }[] = [
  {
    icon: 'book-open',
    label: "Certificate Program: minimum qualification is an SHS Certificate.",
  },
  {
    icon: 'graduation-cap',
    label: "Master's Program: minimum qualification is a degree.",
  },
  {
    icon: 'location-dot',
    label: 'Contact GIAC: Kasoa, Ghana | +233 24 687 2805 | +233 50 257 3336',
  },
  {
    icon: 'envelope',
    label: 'globalinstituteofadrcenter@gmail.com',
  },
  {
    icon: 'globe',
    label: 'www.giacghana.com',
  },
];

function formatCurrency(value?: number) {
  if (typeof value !== 'number') return 'Fee unavailable';
  return new Intl.NumberFormat('en-GH', {
    style: 'currency',
    currency: 'GHS',
    maximumFractionDigits: 0,
  }).format(value);
}

function Field({
  label,
  error,
  hint,
  children,
}: {
  label: string;
  error?: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <View style={styles.field}>
      <Text style={styles.fieldLabel}>{label}</Text>
      {children}
      {hint && !error ? <Text style={styles.fieldHint}>{hint}</Text> : null}
      {error ? <Text style={styles.fieldError}>{error}</Text> : null}
    </View>
  );
}

function Input({
  value,
  onChangeText,
  placeholder,
  multiline,
  keyboardType,
  autoCapitalize = 'sentences',
  error,
}: {
  value: string;
  onChangeText: (value: string) => void;
  placeholder: string;
  multiline?: boolean;
  keyboardType?: 'default' | 'email-address' | 'phone-pad';
  autoCapitalize?: 'none' | 'sentences' | 'words';
  error?: boolean;
}) {
  const [focused, setFocused] = useState(false);

  return (
    <TextInput
      value={value}
      onChangeText={onChangeText}
      placeholder={placeholder}
      placeholderTextColor={C.textMuted}
      keyboardType={keyboardType ?? 'default'}
      autoCapitalize={autoCapitalize}
      multiline={multiline}
      onFocus={() => setFocused(true)}
      onBlur={() => setFocused(false)}
      style={[
        styles.input,
        focused ? styles.inputFocused : null,
        multiline ? styles.inputMultiline : null,
        error ? styles.inputError : null,
      ]}
    />
  );
}

function SectionTitle({ icon, title }: { icon: IconName; title: string }) {
  return (
    <View style={styles.infoTitleRow}>
      <View style={styles.infoTitleIcon}>
        <FontAwesome6 name={icon} size={14} color={C.secondary} />
      </View>
      <Text style={styles.infoTitle}>{title}</Text>
    </View>
  );
}

export default function ApplicationScreen() {
  const { courseId } = useLocalSearchParams<{ courseId?: string }>();
  const user = auth.currentUser;
  const { width } = useWindowDimensions();
  const isCompact = width < 390;
  const horizontalPadding = width < 380 ? 16 : 20;

  const [courses, setCourses] = useState<Course[]>([]);
  const [loadingCourses, setLoadingCourses] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [errors, setErrors] = useState<FormErrors>({});
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [selectedCourseId, setSelectedCourseId] = useState('');
  const [message, setMessage] = useState('');

  useEffect(() => {
    let active = true;

    const loadData = async () => {
      try {
        const [courseData, profile] = await Promise.all([
          getCourses(),
          user?.uid ? getUserProfile(user.uid) : Promise.resolve(null),
        ]);

        if (!active) return;

        setCourses(courseData ?? []);
        setFullName(profile?.fullName || user?.displayName || '');
        setEmail(profile?.email || user?.email || '');
        setPhone(profile?.phone || '');
      } catch {
        if (active) {
          Alert.alert('Unable to load form', 'Please try again.');
        }
      } finally {
        if (active) {
          setLoadingCourses(false);
        }
      }
    };

    loadData();

    return () => {
      active = false;
    };
  }, [user?.displayName, user?.email, user?.uid]);

  useEffect(() => {
    if (!courseId || typeof courseId !== 'string') return;
    setSelectedCourseId(courseId);
  }, [courseId]);

  const selectedCourse = useMemo(
    () => courses.find((course) => course.id === selectedCourseId),
    [courses, selectedCourseId]
  );

  const validate = () => {
    const nextErrors: FormErrors = {};

    if (!fullName.trim()) nextErrors.fullName = 'Full name is required.';
    if (!email.trim()) nextErrors.email = 'Email address is required.';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      nextErrors.email = 'Enter a valid email address.';
    }
    if (!phone.trim()) nextErrors.phone = 'Phone number is required.';
    if (!selectedCourseId) nextErrors.courseId = 'Select a course to continue.';

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!user?.uid) {
      Alert.alert('Sign in required', 'Please sign in before submitting an application.');
      return;
    }

    if (!validate()) return;

    setSubmitting(true);

    try {
      await createApplication({
        userId: user.uid,
        courseId: selectedCourseId,
        courseTitle: selectedCourse?.title || 'Selected Course',
        courseProgram: selectedCourse?.program || '',
        courseDuration: selectedCourse?.duration || '',
        fullName,
        email,
        phone,
        message,
      });
      setSubmitted(true);
    } catch {
      Alert.alert('Submission failed', 'Please try again in a moment.');
    } finally {
      setSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
        <ScrollView contentContainerStyle={styles.successContainer} showsVerticalScrollIndicator={false}>
          <View style={styles.successIconWrap}>
            <FontAwesome6 name="circle-check" size={56} color="#2D6A4F" />
          </View>
          <Text style={styles.successTitle}>Application Submitted!</Text>
          <Text style={styles.successBody}>
            Your application for{' '}
            <Text style={styles.successBold}>{selectedCourse?.title ?? 'the selected program'}</Text>{' '}
            has been received. GIAC will review it and get back to you.
          </Text>
          <View style={styles.successCard}>
            <View style={styles.successRow}>
              <FontAwesome6 name="user" size={13} color="#2A3F66" />
              <Text style={styles.successMeta}>{fullName}</Text>
            </View>
            <View style={styles.successRow}>
              <FontAwesome6 name="envelope" size={13} color="#2A3F66" />
              <Text style={styles.successMeta}>{email}</Text>
            </View>
            <View style={styles.successRow}>
              <FontAwesome6 name="graduation-cap" size={13} color="#2A3F66" />
              <Text style={styles.successMeta}>{selectedCourse?.program} · {selectedCourse?.duration}</Text>
            </View>
          </View>
          <Pressable
            onPress={() => router.push('/(main)/application-status')}
            style={({ pressed }) => [styles.submitButton, pressed ? styles.pressed : null]}
          >
            <Text style={styles.submitButtonText}>Track My Application</Text>
          </Pressable>
          <Pressable
            onPress={() => router.push('/(main)/home')}
            style={({ pressed }) => [styles.secondaryBtn, pressed ? styles.pressed : null]}
          >
            <Text style={styles.secondaryBtnText}>Back to Home</Text>
          </Pressable>
        </ScrollView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[
          styles.content,
          {
            paddingHorizontal: horizontalPadding,
            paddingBottom: isCompact ? 120 : 132,
          },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.hero}>
          <Pressable onPress={() => router.back()} style={({ pressed }) => [styles.backButton, pressed ? styles.pressed : null]}>
            <FontAwesome6 name="arrow-left" size={14} color={C.secondary} />
            <Text style={styles.backButtonText}>Back</Text>
          </Pressable>
          <Text style={styles.heroEyebrow}>Application</Text>
          <Text style={[styles.heroTitle, isCompact ? styles.heroTitleCompact : null]}>
            Apply for Training
          </Text>
          <Text style={styles.heroDescription}>
            Complete this form on its own screen, then continue to your application status after submission.
          </Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Your Details</Text>
          <Field label="Full Name" error={errors.fullName}>
            <Input
              value={fullName}
              onChangeText={setFullName}
              placeholder="Enter your full name"
              autoCapitalize="words"
              error={Boolean(errors.fullName)}
            />
          </Field>
          <Field label="Email Address" error={errors.email}>
            <Input
              value={email}
              onChangeText={setEmail}
              placeholder="Enter your email address"
              keyboardType="email-address"
              autoCapitalize="none"
              error={Boolean(errors.email)}
            />
          </Field>
          <Field label="Phone Number" error={errors.phone}>
            <Input
              value={phone}
              onChangeText={setPhone}
              placeholder="Enter your phone number"
              keyboardType="phone-pad"
              error={Boolean(errors.phone)}
            />
          </Field>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Choose a Program</Text>
          {errors.courseId ? <Text style={styles.fieldError}>{errors.courseId}</Text> : null}
          {loadingCourses ? (
            <Text style={styles.placeholderText}>Loading available courses...</Text>
          ) : (
            <View style={styles.courseList}>
              {courses.map((course) => {
                const selected = selectedCourseId === course.id;
                return (
                  <Pressable
                    key={course.id}
                    onPress={() => setSelectedCourseId(course.id)}
                    style={({ pressed }) => [
                      styles.courseCard,
                      selected ? styles.courseCardSelected : null,
                      pressed ? styles.pressed : null,
                    ]}
                  >
                    <View style={styles.courseContent}>
                      <Text style={styles.courseTitle}>{course.title}</Text>
                      <Text style={styles.courseMeta}>
                        {course.program} · {course.duration}
                      </Text>
                      <Text style={styles.courseFee}>{formatCurrency(course.fees)}</Text>
                    </View>
                    <View style={[styles.radio, selected ? styles.radioSelected : null]}>
                      {selected ? <View style={styles.radioDot} /> : null}
                    </View>
                  </Pressable>
                );
              })}
            </View>
          )}
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Additional Note</Text>
          <Field label="Why are you applying?" hint="Optional">
            <Input
              value={message}
              onChangeText={setMessage}
              placeholder="Share a short note about your interest in the program."
              multiline
            />
          </Field>
          {selectedCourse ? (
            <View style={styles.summaryCard}>
              <Text style={styles.summaryLabel}>Selected program</Text>
              <Text style={styles.summaryTitle}>{selectedCourse.title}</Text>
              <Text style={styles.summaryMeta}>
                {selectedCourse.level} · {selectedCourse.schedule}
              </Text>
            </View>
          ) : null}
        </View>

        <View style={styles.infoCard}>
          <SectionTitle icon="list-ol" title="Admission Process" />
          {ADMISSION_STEPS.map((item) => (
            <View key={item.label} style={styles.infoRow}>
              <View style={styles.infoBadge}>
                <FontAwesome6 name={item.icon} size={13} color={C.secondary} />
              </View>
              <Text style={styles.infoItem}>{item.label}</Text>
            </View>
          ))}
        </View>

        <View style={styles.infoCard}>
          <SectionTitle icon="bullseye" title="Entry Requirements" />
          {ENTRY_REQUIREMENTS.map((item) => (
            <View key={item.label} style={styles.infoRow}>
              <View style={styles.infoBadge}>
                <FontAwesome6 name={item.icon} size={13} color={C.secondary} />
              </View>
              <Text style={styles.infoItem}>{item.label}</Text>
            </View>
          ))}
        </View>

        <Pressable
          onPress={handleSubmit}
          disabled={submitting}
          style={({ pressed }) => [
            styles.submitButton,
            submitting ? styles.buttonDisabled : null,
            pressed ? styles.pressed : null,
          ]}
        >
          {submitting ? (
            <View style={styles.loadingRow}>
              <ActivityIndicator color="#FFFFFF" size="small" />
              <Text style={styles.submitButtonText}>Submitting</Text>
            </View>
          ) : (
            <Text style={styles.submitButtonText}>Submit Application</Text>
          )}
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.bg },
  scroll: { flex: 1 },
  content: {
    paddingTop: 20,
    paddingBottom: 132,
    gap: 20,
  },
  hero: {
    backgroundColor: C.surface,
    borderRadius: 28,
    padding: 22,
    borderWidth: 1,
    borderColor: C.border,
    gap: 10,
  },
  backButton: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: C.surfaceAlt,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  backButtonText: {
    fontSize: 12,
    fontFamily: Fonts.sansSemiBold,
    color: C.secondary,
  },
  heroEyebrow: {
    fontSize: 13,
    fontFamily: Fonts.sansSemiBold,
    color: C.secondary,
    textTransform: 'uppercase',
    letterSpacing: 0.9,
  },
  heroTitle: {
    fontSize: 34,
    lineHeight: 40,
    fontFamily: Fonts.displayBold,
    color: C.textPrimary,
  },
  heroTitleCompact: {
    fontSize: 30,
    lineHeight: 34,
  },
  heroDescription: {
    fontSize: 16,
    lineHeight: 25,
    fontFamily: Fonts.sans,
    color: C.textSecondary,
  },
  card: {
    backgroundColor: C.surface,
    borderRadius: 22,
    padding: 18,
    borderWidth: 1,
    borderColor: C.border,
    gap: 14,
  },
  cardTitle: {
    fontSize: 18,
    fontFamily: Fonts.displaySemiBold,
    color: C.textPrimary,
  },
  field: {
    gap: 8,
  },
  fieldLabel: {
    fontSize: 14,
    fontFamily: Fonts.sansSemiBold,
    color: C.textPrimary,
  },
  fieldHint: {
    fontSize: 12,
    fontFamily: Fonts.sans,
    color: C.textMuted,
  },
  fieldError: {
    fontSize: 12,
    fontFamily: Fonts.sansSemiBold,
    color: C.danger,
  },
  input: {
    backgroundColor: C.surfaceAlt,
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 15,
    fontFamily: Fonts.sans,
    color: C.textPrimary,
  },
  inputFocused: {
    borderColor: C.secondary,
    backgroundColor: C.surface,
  },
  inputMultiline: {
    minHeight: 110,
    textAlignVertical: 'top',
  },
  inputError: {
    borderColor: C.danger,
    backgroundColor: C.dangerSoft,
  },
  courseList: {
    gap: 12,
  },
  courseCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: C.surfaceAlt,
    borderRadius: 18,
    padding: 14,
    borderWidth: 1,
    borderColor: C.border,
  },
  courseCardSelected: {
    backgroundColor: C.primarySoft,
    borderColor: C.secondary,
  },
  courseContent: {
    flex: 1,
    gap: 4,
  },
  courseTitle: {
    fontSize: 14,
    lineHeight: 20,
    fontFamily: Fonts.sansBold,
    color: C.textPrimary,
  },
  courseMeta: {
    fontSize: 12,
    fontFamily: Fonts.sans,
    color: C.textSecondary,
  },
  courseFee: {
    fontSize: 12,
    fontFamily: Fonts.sansSemiBold,
    color: C.secondary,
  },
  radio: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 1.5,
    borderColor: C.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioSelected: {
    borderColor: C.secondary,
  },
  radioDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: C.secondary,
  },
  summaryCard: {
    backgroundColor: C.primarySoft,
    borderRadius: 18,
    padding: 14,
    gap: 4,
  },
  summaryLabel: {
    fontSize: 11,
    fontFamily: Fonts.sansSemiBold,
    color: C.secondary,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  summaryTitle: {
    fontSize: 15,
    fontFamily: Fonts.sansBold,
    color: C.textPrimary,
  },
  summaryMeta: {
    fontSize: 13,
    fontFamily: Fonts.sans,
    color: C.textSecondary,
  },
  infoCard: {
    backgroundColor: C.primarySoft,
    borderRadius: 22,
    padding: 18,
    borderWidth: 1,
    borderColor: C.border,
    gap: 8,
  },
  infoTitle: {
    flex: 1,
    fontSize: 18,
    fontFamily: Fonts.displaySemiBold,
    color: C.textPrimary,
  },
  infoTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  infoTitleIcon: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  infoBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    marginTop: 1,
  },
  infoItem: {
    flex: 1,
    fontSize: 14,
    lineHeight: 22,
    fontFamily: Fonts.sans,
    color: C.textSecondary,
  },
  placeholderText: {
    fontSize: 14,
    lineHeight: 22,
    fontFamily: Fonts.sans,
    color: C.textMuted,
  },
  submitButton: {
    backgroundColor: C.primary,
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  submitButtonText: {
    fontSize: 14,
    fontFamily: Fonts.sansBold,
    color: '#FFFFFF',
  },
  loadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  buttonDisabled: {
    backgroundColor: '#CBD3E0',
  },
  pressed: {
    opacity: 0.92,
  },

  successContainer: {
    flexGrow: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 28,
    gap: 16,
  },
  successIconWrap: {
    marginBottom: 8,
  },
  successTitle: {
    fontSize: 28,
    fontFamily: Fonts.displayBold,
    color: '#14213A',
    textAlign: 'center',
  },
  successBody: {
    fontSize: 15,
    lineHeight: 24,
    fontFamily: Fonts.sans,
    color: '#4A5468',
    textAlign: 'center',
  },
  successBold: {
    fontFamily: Fonts.sansBold,
    color: '#14213A',
  },
  successCard: {
    width: '100%',
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E3E9F2',
    gap: 10,
    marginVertical: 4,
  },
  successRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  successMeta: {
    fontSize: 14,
    fontFamily: Fonts.sans,
    color: '#4A5468',
    flex: 1,
  },
  secondaryBtn: {
    width: '100%',
    borderRadius: 16,
    paddingVertical: 14,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E3E9F2',
    backgroundColor: '#FFFFFF',
  },
  secondaryBtnText: {
    fontSize: 14,
    fontFamily: Fonts.sansSemiBold,
    color: '#2A3F66',
  },
});

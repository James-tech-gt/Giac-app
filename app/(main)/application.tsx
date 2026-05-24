import { Fonts } from '@/constants/theme';
import { getUserProfile } from '@/services/auth';
import { auth } from '@/services/firebase';
import { Course, createApplication, getCourses } from '@/services/firestore';
import { uploadFile } from '@/services/storage';
import { FontAwesome6 } from '@expo/vector-icons';
import * as DocumentPicker from 'expo-document-picker';
import { router, useLocalSearchParams } from 'expo-router';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
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
  success: '#2D6A4F',
  successSoft: '#E8F2EE',
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
  location?: string;
  courseId?: string;
  educationLevel?: string;
  motivation?: string;
  paymentMode?: string;
  hasPaid?: string;
  transactionRef?: string;
  agreed?: string;
};

const EDUCATION_LEVELS = [
  'SHS / O-Level',
  'HND / Diploma',
  "Bachelor's Degree",
  "Master's Degree",
  'PhD',
  'Professional Certification',
  'Other',
];

const PAYMENT_MODES = ['MoMo', 'Bank Transfer', 'Other'];

const MOMO_DETAILS = [
  { network: 'MTN MoMo', number: '0554670757', name: 'Global Institute of ADR Center' },
  { network: 'Merchant (All Networks)', number: 'Merchant ID: 883031', name: 'Global Institute of ADR Center LTD' },
];

const BANK_DETAILS = {
  bankName: 'OMNIBSIC Bank',
  branch: 'Kasoa',
  accountName: 'Quansah John',
  accountNumber: '0010236622011',
};

function formatCurrency(value?: number) {
  if (typeof value !== 'number') return 'Fee TBC';
  return `GHC ${value.toLocaleString('en-GH')}`;
}

function Field({
  label,
  required,
  error,
  hint,
  children,
}: {
  label: string;
  required?: boolean;
  error?: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <View style={styles.field}>
      <Text style={styles.fieldLabel}>
        {label}
        {required ? <Text style={styles.required}> *</Text> : null}
      </Text>
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
  onChangeText: (v: string) => void;
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
        focused && styles.inputFocused,
        multiline && styles.inputMultiline,
        error && styles.inputError,
      ]}
    />
  );
}

function RadioGroup({
  options,
  value,
  onChange,
  error,
}: {
  options: string[];
  value: string;
  onChange: (v: string) => void;
  error?: boolean;
}) {
  return (
    <View style={[styles.radioGroup, error && styles.radioGroupError]}>
      {options.map((opt) => (
        <Pressable
          key={opt}
          onPress={() => onChange(opt)}
          style={({ pressed }) => [styles.radioRow, pressed && styles.pressed]}
        >
          <View style={[styles.radio, value === opt && styles.radioSelected]}>
            {value === opt ? <View style={styles.radioDot} /> : null}
          </View>
          <Text style={styles.radioLabel}>{opt}</Text>
        </Pressable>
      ))}
    </View>
  );
}

function ReviewRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.reviewRow}>
      <Text style={styles.reviewLabel}>{label}</Text>
      <Text style={styles.reviewValue}>{value || '—'}</Text>
    </View>
  );
}

function SectionTitle({ icon, title }: { icon: IconName; title: string }) {
  return (
    <View style={styles.sectionTitleRow}>
      <View style={styles.sectionTitleIcon}>
        <FontAwesome6 name={icon} size={14} color={C.secondary} />
      </View>
      <Text style={styles.sectionTitle}>{title}</Text>
    </View>
  );
}

export default function ApplicationScreen() {
  const { courseId } = useLocalSearchParams<{ courseId?: string }>();
  const user = auth.currentUser;
  const { width } = useWindowDimensions();
  const isCompact = width < 390;
  const horizontalPadding = width < 380 ? 16 : 20;

  const scrollRef = useRef<ScrollView>(null);
  const [courses, setCourses] = useState<Course[]>([]);
  const [loadingCourses, setLoadingCourses] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [errors, setErrors] = useState<FormErrors>({});

  // Personal details
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [whatsapp, setWhatsapp] = useState('');
  const [email, setEmail] = useState('');
  const [location, setLocation] = useState('');

  // Program
  const [selectedCourseId, setSelectedCourseId] = useState('');

  // Educational background
  const [educationLevel, setEducationLevel] = useState('');
  const [certificateLink, setCertificateLink] = useState('');
  const [certFileName, setCertFileName] = useState('');
  const [uploadingCert, setUploadingCert] = useState(false);
  const [certUploadProgress, setCertUploadProgress] = useState(0);
  const [areaOfStudy, setAreaOfStudy] = useState('');
  const [occupation, setOccupation] = useState('');
  const [organization, setOrganization] = useState('');

  // Motivation
  const [motivation, setMotivation] = useState('');

  // Payment & commitment
  const [paymentMode, setPaymentMode] = useState('');
  const [readyToProceed, setReadyToProceed] = useState('');
  const [hasPaid, setHasPaid] = useState(false);
  const [transactionRef, setTransactionRef] = useState('');
  const [receiptLink, setReceiptLink] = useState('');
  const [receiptFileName, setReceiptFileName] = useState('');
  const [uploadingReceipt, setUploadingReceipt] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [agreed, setAgreed] = useState(false);
  const [reviewing, setReviewing] = useState(false);

  useEffect(() => {
    let active = true;
    async function loadData() {
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
        if (active) Alert.alert('Unable to load form', 'Please try again.');
      } finally {
        if (active) setLoadingCourses(false);
      }
    }
    loadData();
    return () => { active = false; };
  }, [user?.uid, user?.displayName, user?.email]);

  useEffect(() => {
    if (courseId && typeof courseId === 'string') setSelectedCourseId(courseId);
  }, [courseId]);

  const selectedCourse = useMemo(
    () => courses.find((c) => c.id === selectedCourseId),
    [courses, selectedCourseId]
  );

  const handlePickCertificate = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['image/*', 'application/pdf'],
        copyToCacheDirectory: true,
      });
      if (result.canceled || !result.assets?.[0]) return;
      const file = result.assets[0];
      setUploadingCert(true);
      setCertUploadProgress(0);
      const path = `edu-proofs/${user!.uid}/${Date.now()}_${file.name}`;
      const url = await uploadFile(path, file.uri, setCertUploadProgress);
      setCertificateLink(url);
      setCertFileName(file.name);
    } catch {
      Alert.alert('Upload failed', 'Could not upload certificate. Please try again.');
    } finally {
      setUploadingCert(false);
    }
  };

  const handlePickReceipt = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['image/*', 'application/pdf'],
        copyToCacheDirectory: true,
      });
      if (result.canceled || !result.assets?.[0]) return;
      const file = result.assets[0];
      setUploadingReceipt(true);
      setUploadProgress(0);
      const path = `receipts/${user!.uid}/${Date.now()}_${file.name}`;
      const url = await uploadFile(path, file.uri, setUploadProgress);
      setReceiptLink(url);
      setReceiptFileName(file.name);
    } catch {
      Alert.alert('Upload failed', 'Could not upload receipt. Please try again.');
    } finally {
      setUploadingReceipt(false);
    }
  };

  const validate = () => {
    const e: FormErrors = {};
    if (!fullName.trim()) e.fullName = 'Full name is required.';
    if (!email.trim()) e.email = 'Email address is required.';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) e.email = 'Enter a valid email address.';
    if (!phone.trim()) e.phone = 'Phone number is required.';
    if (!location.trim()) e.location = 'Location is required.';
    if (!selectedCourseId) e.courseId = 'Please select a program.';
    if (!educationLevel) e.educationLevel = 'Please select your highest education level.';
    if (!motivation.trim()) e.motivation = 'Please tell us why you want to study ADR.';
    if (!paymentMode) e.paymentMode = 'Please select a payment mode.';
    if (paymentMode && paymentMode !== 'Other' && !hasPaid) e.hasPaid = 'Please confirm you have made payment before submitting.';
    if (paymentMode && paymentMode !== 'Other' && !transactionRef.trim()) e.transactionRef = 'Please enter your transaction / reference number.';
    if (!agreed) e.agreed = 'You must confirm the agreement to submit.';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleReview = () => {
    if (!user?.uid) {
      Alert.alert('Sign in required', 'Please sign in before submitting an application.');
      return;
    }
    if (!validate()) {
      scrollRef.current?.scrollTo({ y: 0, animated: true });
      return;
    }
    setReviewing(true);
  };

  const handleConfirmSubmit = async () => {
    setSubmitting(true);
    try {
      await createApplication({
        userId: user!.uid,
        courseId: selectedCourseId,
        courseTitle: selectedCourse?.title || '',
        courseProgram: selectedCourse?.program || '',
        courseDuration: selectedCourse?.duration || '',
        fullName, email, phone, whatsapp, location,
        educationLevel, certificateLink, areaOfStudy, occupation, organization,
        motivation, paymentMode, transactionRef, receiptLink,
      });
      setReviewing(false);
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
              <FontAwesome6 name="user" size={13} color={C.secondary} />
              <Text style={styles.successMeta}>{fullName}</Text>
            </View>
            <View style={styles.successRow}>
              <FontAwesome6 name="envelope" size={13} color={C.secondary} />
              <Text style={styles.successMeta}>{email}</Text>
            </View>
            <View style={styles.successRow}>
              <FontAwesome6 name="graduation-cap" size={13} color={C.secondary} />
              <Text style={styles.successMeta}>{selectedCourse?.program} · {selectedCourse?.duration}</Text>
            </View>
            <View style={styles.successRow}>
              <FontAwesome6 name="credit-card" size={13} color={C.secondary} />
              <Text style={styles.successMeta}>Payment via {paymentMode}</Text>
            </View>
          </View>
          <Pressable
            onPress={() => router.push('/(main)/application-status')}
            style={({ pressed }) => [styles.submitButton, pressed && styles.pressed]}
          >
            <Text style={styles.submitButtonText}>Track My Application</Text>
          </Pressable>
          <Pressable
            onPress={() => router.push('/(main)/home')}
            style={({ pressed }) => [styles.secondaryBtn, pressed && styles.pressed]}
          >
            <Text style={styles.secondaryBtnText}>Back to Home</Text>
          </Pressable>
        </ScrollView>
      </SafeAreaView>
    );
  }

  if (reviewing) {
    return (
      <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
        <ScrollView
          contentContainerStyle={[styles.content, { paddingHorizontal: horizontalPadding, paddingBottom: 140 }]}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.hero}>
            <Pressable onPress={() => setReviewing(false)} style={({ pressed }) => [styles.backButton, pressed && styles.pressed]}>
              <FontAwesome6 name="arrow-left" size={14} color={C.secondary} />
              <Text style={styles.backButtonText}>Back to Edit</Text>
            </Pressable>
            <Text style={styles.heroEyebrow}>Review & Confirm</Text>
            <Text style={[styles.heroTitle, isCompact && styles.heroTitleCompact]}>Check Your Details</Text>
            <Text style={styles.heroDescription}>
              Please review all your information carefully before submitting.
            </Text>
          </View>

          {/* Personal */}
          <View style={styles.reviewCard}>
            <Text style={styles.reviewSection}>Personal Details</Text>
            <ReviewRow label="Full Name" value={fullName} />
            <ReviewRow label="Phone" value={phone} />
            {whatsapp?.trim() ? <ReviewRow label="WhatsApp" value={whatsapp} /> : null}
            <ReviewRow label="Email" value={email} />
            <ReviewRow label="Location" value={location} />
          </View>

          {/* Program */}
          <View style={styles.reviewCard}>
            <Text style={styles.reviewSection}>Program</Text>
            <ReviewRow label="Course" value={selectedCourse?.title || selectedCourseId} />
            <ReviewRow label="Program" value={selectedCourse?.program || '—'} />
            <ReviewRow label="Duration" value={selectedCourse?.duration || '—'} />
            <ReviewRow label="Fee" value={formatCurrency(selectedCourse?.fees)} />
          </View>

          {/* Background */}
          <View style={styles.reviewCard}>
            <Text style={styles.reviewSection}>Educational Background</Text>
            <ReviewRow label="Education" value={educationLevel} />
            {certFileName ? <ReviewRow label="Certificate" value={certFileName} /> : null}
            {areaOfStudy?.trim() ? <ReviewRow label="Area of Study" value={areaOfStudy} /> : null}
            {occupation?.trim() ? <ReviewRow label="Occupation" value={occupation} /> : null}
            {organization?.trim() ? <ReviewRow label="Organisation" value={organization} /> : null}
          </View>

          {/* Motivation */}
          <View style={styles.reviewCard}>
            <Text style={styles.reviewSection}>Motivation</Text>
            <Text style={styles.reviewBody}>{motivation}</Text>
          </View>

          {/* Payment */}
          <View style={styles.reviewCard}>
            <Text style={styles.reviewSection}>Payment</Text>
            <ReviewRow label="Mode" value={paymentMode} />
            {transactionRef?.trim() ? <ReviewRow label="Transaction Ref" value={transactionRef.trim()} /> : null}
            {receiptLink?.trim() ? <ReviewRow label="Receipt" value={receiptFileName || 'Uploaded'} /> : null}
            <ReviewRow label="Payment confirmed" value="Yes — I have made payment" />
          </View>

          <Pressable
            onPress={handleConfirmSubmit}
            disabled={submitting}
            style={({ pressed }) => [styles.submitButton, submitting && styles.buttonDisabled, pressed && styles.pressed]}
          >
            {submitting ? (
              <View style={styles.loadingRow}>
                <ActivityIndicator color="#FFFFFF" size="small" />
                <Text style={styles.submitButtonText}>Submitting…</Text>
              </View>
            ) : (
              <Text style={styles.submitButtonText}>Confirm & Submit Application</Text>
            )}
          </Pressable>
          <Pressable
            onPress={() => setReviewing(false)}
            style={({ pressed }) => [styles.secondaryBtn, pressed && styles.pressed]}
          >
            <Text style={styles.secondaryBtnText}>Go Back & Edit</Text>
          </Pressable>
        </ScrollView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
      <KeyboardAvoidingView
        style={styles.safe}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 20 : 0}
      >
        <ScrollView
          ref={scrollRef}
          style={styles.scroll}
          contentContainerStyle={[styles.content, { paddingHorizontal: horizontalPadding, paddingBottom: isCompact ? 120 : 132 }]}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
        {/* Hero */}
        <View style={styles.hero}>
          <Pressable onPress={() => router.back()} style={({ pressed }) => [styles.backButton, pressed && styles.pressed]}>
            <FontAwesome6 name="arrow-left" size={14} color={C.secondary} />
            <Text style={styles.backButtonText}>Back</Text>
          </Pressable>
          <Text style={styles.heroEyebrow}>Application Form</Text>
          <Text style={[styles.heroTitle, isCompact && styles.heroTitleCompact]}>Apply for a Programme</Text>
          <Text style={styles.heroDescription}>
            Complete all sections below. Fields marked with <Text style={styles.required}>*</Text> are required.
          </Text>
        </View>

        {/* ── Section 1: Personal Details ── */}
        <View style={styles.card}>
          <SectionTitle icon="user" title="Personal Details" />
          <Field label="Full Name" required error={errors.fullName}>
            <Input value={fullName} onChangeText={setFullName} placeholder="Your full name" autoCapitalize="words" error={Boolean(errors.fullName)} />
          </Field>
          <Field label="Phone Number" required error={errors.phone}>
            <Input value={phone} onChangeText={setPhone} placeholder="e.g. +233 24 000 0000" keyboardType="phone-pad" error={Boolean(errors.phone)} />
          </Field>
          <Field label="WhatsApp Number" hint="Leave blank if same as phone">
            <Input value={whatsapp} onChangeText={setWhatsapp} placeholder="e.g. +233 24 000 0000" keyboardType="phone-pad" />
          </Field>
          <Field label="Email Address" required error={errors.email}>
            <Input value={email} onChangeText={setEmail} placeholder="you@example.com" keyboardType="email-address" autoCapitalize="none" error={Boolean(errors.email)} />
          </Field>
          <Field label="Location (City / Country)" required error={errors.location}>
            <Input value={location} onChangeText={setLocation} placeholder="e.g. Accra, Ghana" error={Boolean(errors.location)} />
          </Field>
        </View>

        {/* ── Section 2: Program Selection ── */}
        <View style={styles.card}>
          <SectionTitle icon="graduation-cap" title="Program Selection" />
          <Text style={styles.cardHint}>Which program are you applying for?</Text>
          {errors.courseId ? <Text style={styles.fieldError}>{errors.courseId}</Text> : null}
          {loadingCourses ? (
            <ActivityIndicator color={C.secondary} />
          ) : (
            <View style={styles.courseList}>
              {courses.map((course) => {
                const selected = selectedCourseId === course.id;
                return (
                  <Pressable
                    key={course.id}
                    onPress={() => setSelectedCourseId(course.id)}
                    style={({ pressed }) => [styles.courseCard, selected && styles.courseCardSelected, pressed && styles.pressed]}
                  >
                    <View style={styles.courseContent}>
                      <Text style={styles.courseTitle}>{course.title} ({course.program})</Text>
                      <Text style={styles.courseDuration}>{course.duration}</Text>
                      <Text style={styles.courseFee}>{formatCurrency(course.fees)}</Text>
                    </View>
                    <View style={[styles.radio, selected && styles.radioSelected]}>
                      {selected ? <View style={styles.radioDot} /> : null}
                    </View>
                  </Pressable>
                );
              })}
            </View>
          )}
        </View>

        {/* ── Section 3: Educational & Professional Background ── */}
        <View style={styles.card}>
          <SectionTitle icon="book-open" title="Educational / Professional Background" />
          <Field label="Highest Level of Education" required error={errors.educationLevel}>
            <RadioGroup options={EDUCATION_LEVELS} value={educationLevel} onChange={setEducationLevel} error={Boolean(errors.educationLevel)} />
          </Field>
          <Field label="Proof of Educational Certificate" hint="Upload a photo or PDF of your highest educational certificate.">
            <Pressable
              onPress={handlePickCertificate}
              disabled={uploadingCert}
              style={({ pressed }) => [styles.uploadBtn, certificateLink && styles.uploadBtnDone, pressed && styles.pressed]}
            >
              {uploadingCert ? (
                <View style={styles.uploadBtnInner}>
                  <ActivityIndicator size="small" color={C.secondary} />
                  <Text style={styles.uploadBtnText}>Uploading {Math.round(certUploadProgress * 100)}%…</Text>
                </View>
              ) : certificateLink ? (
                <View style={styles.uploadBtnInner}>
                  <FontAwesome6 name="circle-check" size={15} color={C.success} />
                  <Text style={[styles.uploadBtnText, { color: C.success }]} numberOfLines={1}>{certFileName || 'Certificate uploaded'}</Text>
                  <FontAwesome6 name="arrow-rotate-right" size={12} color={C.textMuted} />
                </View>
              ) : (
                <View style={styles.uploadBtnInner}>
                  <FontAwesome6 name="arrow-up-from-bracket" size={15} color={C.secondary} />
                  <Text style={styles.uploadBtnText}>Choose file (image or PDF)</Text>
                </View>
              )}
            </Pressable>
          </Field>
          <Field label="Area of Study / Profession">
            <Input value={areaOfStudy} onChangeText={setAreaOfStudy} placeholder="e.g. Law, Business, Engineering" />
          </Field>
          <Field label="Occupation">
            <Input value={occupation} onChangeText={setOccupation} placeholder="Your current job title or role" />
          </Field>
          <Field label="Organization">
            <Input value={organization} onChangeText={setOrganization} placeholder="Company, institution, or self-employed" />
          </Field>
        </View>

        {/* ── Section 4: Motivation ── */}
        <View style={styles.card}>
          <SectionTitle icon="lightbulb" title="Motivation" />
          <Field label="Why do you want to study ADR?" required error={errors.motivation}>
            <Input value={motivation} onChangeText={setMotivation} placeholder="Share your motivation for joining this program..." multiline error={Boolean(errors.motivation)} />
          </Field>
        </View>

        {/* ── Section 5: Program Fees ── */}
        <View style={styles.feesCard}>
          <SectionTitle icon="wallet" title="Program Fees" />
          <Text style={styles.feesNote}>
            All fees include registration and administrative costs.
          </Text>
          {courses.map((course) => (
            <View key={course.id} style={styles.feeRow}>
              <View style={styles.feeDot} />
              <Text style={styles.feeText}>
                {course.title} ({course.program}) — <Text style={styles.feeBold}>{formatCurrency(course.fees)}</Text> · {course.duration}
              </Text>
            </View>
          ))}
        </View>

        {/* ── Section 6: Payment & Commitment ── */}
        <View style={styles.card}>
          <SectionTitle icon="credit-card" title="Payment & Commitment" />

          {/* Payment notice */}
          <View style={styles.payNotice}>
            <FontAwesome6 name="triangle-exclamation" size={13} color="#A9822A" />
            <Text style={styles.payNoticeText}>
              At least 50% of the course fee must be paid before you can submit your application. Any outstanding balance must be cleared before the end of your course, or your access to materials, assignments, and tests will be restricted.
            </Text>
          </View>

          <Field label="Are you ready to proceed with registration?">
            <RadioGroup options={['Yes', 'No']} value={readyToProceed} onChange={setReadyToProceed} />
          </Field>
          <Field label="Preferred mode of payment" required error={errors.paymentMode}>
            <RadioGroup options={PAYMENT_MODES} value={paymentMode} onChange={(v) => { setPaymentMode(v); setHasPaid(false); setTransactionRef(''); setReceiptLink(''); }} error={Boolean(errors.paymentMode)} />
          </Field>

          {paymentMode === 'MoMo' ? (
            <View style={styles.payDetailsCard}>
              <View style={styles.payDetailsHeader}>
                <FontAwesome6 name="mobile-screen" size={14} color={C.secondary} />
                <Text style={styles.payDetailsTitle}>Send Payment via MoMo</Text>
              </View>
              {MOMO_DETAILS.map((m) => (
                <View key={m.network} style={styles.payDetailsRow}>
                  <Text style={styles.payDetailsNetwork}>{m.network}</Text>
                  <Text style={styles.payDetailsNumber}>{m.number}</Text>
                  <Text style={styles.payDetailsName}>{m.name}</Text>
                </View>
              ))}
              <Text style={styles.payDetailsNote}>Use your full name as the sender reference.</Text>
            </View>
          ) : null}

          {paymentMode === 'Bank Transfer' ? (
            <View style={styles.payDetailsCard}>
              <View style={styles.payDetailsHeader}>
                <FontAwesome6 name="building-columns" size={14} color={C.secondary} />
                <Text style={styles.payDetailsTitle}>Bank Transfer Details</Text>
              </View>
              <View style={styles.payDetailsRow}>
                <Text style={styles.payDetailsNetwork}>Bank</Text>
                <Text style={styles.payDetailsNumber}>{BANK_DETAILS.bankName}</Text>
              </View>
              <View style={styles.payDetailsRow}>
                <Text style={styles.payDetailsNetwork}>Branch</Text>
                <Text style={styles.payDetailsNumber}>{BANK_DETAILS.branch}</Text>
              </View>
              <View style={styles.payDetailsRow}>
                <Text style={styles.payDetailsNetwork}>Account Name</Text>
                <Text style={styles.payDetailsNumber}>{BANK_DETAILS.accountName}</Text>
              </View>
              <View style={styles.payDetailsRow}>
                <Text style={styles.payDetailsNetwork}>Account No.</Text>
                <Text style={styles.payDetailsNumber}>{BANK_DETAILS.accountNumber}</Text>
              </View>
              <Text style={styles.payDetailsNote}>Send your payment receipt to GIAC after transfer.</Text>
            </View>
          ) : null}

          {paymentMode && paymentMode !== 'Other' ? (
            <Pressable
              onPress={() => setHasPaid((v) => !v)}
              style={({ pressed }) => [styles.agreementRow, pressed && styles.pressed]}
            >
              <View style={[styles.checkbox, hasPaid && styles.checkboxChecked]}>
                {hasPaid ? <FontAwesome6 name="check" size={10} color="#FFFFFF" /> : null}
              </View>
              <Text style={styles.agreementText}>
                I confirm that I have made payment to GIAC using the details above.
              </Text>
            </Pressable>
          ) : null}
          {errors.hasPaid ? <Text style={styles.fieldError}>{errors.hasPaid}</Text> : null}

          {paymentMode && paymentMode !== 'Other' ? (
            <>
              <Field label="Transaction / Reference Number" required error={errors.transactionRef}
                hint="Copy the transaction ID from your MoMo SMS or bank confirmation.">
                <Input
                  value={transactionRef}
                  onChangeText={setTransactionRef}
                  placeholder="e.g. 1234567890"
                  autoCapitalize="none"
                  error={Boolean(errors.transactionRef)}
                />
              </Field>
              <Field label="Payment Receipt" hint="Optional — upload a screenshot or PDF of your payment confirmation.">
                <Pressable
                  onPress={handlePickReceipt}
                  disabled={uploadingReceipt}
                  style={({ pressed }) => [styles.uploadBtn, receiptLink && styles.uploadBtnDone, pressed && styles.pressed]}
                >
                  {uploadingReceipt ? (
                    <View style={styles.uploadBtnInner}>
                      <ActivityIndicator size="small" color={C.secondary} />
                      <Text style={styles.uploadBtnText}>Uploading {Math.round(uploadProgress * 100)}%…</Text>
                    </View>
                  ) : receiptLink ? (
                    <View style={styles.uploadBtnInner}>
                      <FontAwesome6 name="circle-check" size={15} color={C.success} />
                      <Text style={[styles.uploadBtnText, { color: C.success }]} numberOfLines={1}>{receiptFileName || 'Receipt uploaded'}</Text>
                      <FontAwesome6 name="arrow-rotate-right" size={12} color={C.textMuted} />
                    </View>
                  ) : (
                    <View style={styles.uploadBtnInner}>
                      <FontAwesome6 name="arrow-up-from-bracket" size={15} color={C.secondary} />
                      <Text style={styles.uploadBtnText}>Choose file (image or PDF)</Text>
                    </View>
                  )}
                </Pressable>
              </Field>
            </>
          ) : null}
        </View>

        {/* ── Section 7: Agreement ── */}
        <View style={styles.card}>
          <SectionTitle icon="file-signature" title="Agreement" />
          <Pressable
            onPress={() => setAgreed((v) => !v)}
            style={({ pressed }) => [styles.agreementRow, pressed && styles.pressed]}
          >
            <View style={[styles.checkbox, agreed && styles.checkboxChecked]}>
              {agreed ? <FontAwesome6 name="check" size={10} color="#FFFFFF" /> : null}
            </View>
            <Text style={styles.agreementText}>
              &quot;I confirm that the information provided is accurate and I am ready to enroll.&quot;
            </Text>
          </Pressable>
          {errors.agreed ? <Text style={styles.fieldError}>{errors.agreed}</Text> : null}
        </View>

        {/* Review & Submit */}
        <Pressable
          onPress={handleReview}
          style={({ pressed }) => [styles.submitButton, pressed && styles.pressed]}
        >
          <Text style={styles.submitButtonText}>Review My Application →</Text>
        </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.bg },
  scroll: { flex: 1 },
  content: { paddingTop: 20, paddingBottom: 132, gap: 20 },

  hero: {
    backgroundColor: C.surface, borderRadius: 28, padding: 22,
    borderWidth: 1, borderColor: C.border, gap: 10,
  },
  backButton: {
    alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: C.surfaceAlt, borderRadius: 999, paddingHorizontal: 12, paddingVertical: 8,
  },
  backButtonText: { fontSize: 12, fontFamily: Fonts.sansSemiBold, color: C.secondary },
  heroEyebrow: {
    fontSize: 13, fontFamily: Fonts.sansSemiBold, color: C.secondary,
    textTransform: 'uppercase', letterSpacing: 0.9,
  },
  heroTitle: { fontSize: 34, lineHeight: 40, fontFamily: Fonts.displayBold, color: C.textPrimary },
  heroTitleCompact: { fontSize: 30, lineHeight: 34 },
  heroDescription: { fontSize: 15, lineHeight: 24, fontFamily: Fonts.sans, color: C.textSecondary },

  card: {
    backgroundColor: C.surface, borderRadius: 22, padding: 18,
    borderWidth: 1, borderColor: C.border, gap: 16,
  },
  cardHint: { fontSize: 14, lineHeight: 22, fontFamily: Fonts.sans, color: C.textSecondary },

  sectionTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  sectionTitleIcon: {
    width: 30, height: 30, borderRadius: 15, alignItems: 'center', justifyContent: 'center',
    backgroundColor: C.primarySoft,
  },
  sectionTitle: { flex: 1, fontSize: 17, fontFamily: Fonts.displaySemiBold, color: C.textPrimary },

  field: { gap: 8 },
  fieldLabel: { fontSize: 14, fontFamily: Fonts.sansSemiBold, color: C.textPrimary },
  required: { color: C.danger },
  fieldHint: { fontSize: 12, fontFamily: Fonts.sans, color: C.textMuted },
  fieldError: { fontSize: 12, fontFamily: Fonts.sansSemiBold, color: C.danger },

  input: {
    backgroundColor: C.surfaceAlt, borderWidth: 1, borderColor: C.border,
    borderRadius: 16, paddingHorizontal: 16, paddingVertical: 14,
    fontSize: 15, fontFamily: Fonts.sans, color: C.textPrimary,
  },
  inputFocused: { borderColor: C.secondary, backgroundColor: C.surface },
  inputMultiline: { minHeight: 110, textAlignVertical: 'top' },
  inputError: { borderColor: C.danger, backgroundColor: C.dangerSoft },

  radioGroup: { gap: 10 },
  radioGroupError: { borderWidth: 1, borderColor: C.danger, borderRadius: 14, padding: 10 },
  radioRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  radio: {
    width: 22, height: 22, borderRadius: 11, borderWidth: 1.5,
    borderColor: C.border, alignItems: 'center', justifyContent: 'center',
    backgroundColor: C.surfaceAlt,
  },
  radioSelected: { borderColor: C.secondary },
  radioDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: C.secondary },
  radioLabel: { fontSize: 14, fontFamily: Fonts.sans, color: C.textPrimary, flex: 1 },

  courseList: { gap: 12 },
  courseCard: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: C.surfaceAlt, borderRadius: 18, padding: 14,
    borderWidth: 1, borderColor: C.border,
  },
  courseCardSelected: { backgroundColor: C.primarySoft, borderColor: C.secondary },
  courseContent: { flex: 1, gap: 4 },
  courseTitle: { fontSize: 14, lineHeight: 20, fontFamily: Fonts.sansBold, color: C.textPrimary, flexWrap: 'wrap', flexShrink: 1 },
  courseDuration: { fontSize: 12, fontFamily: Fonts.sans, color: C.textSecondary },
  courseFee: { fontSize: 13, fontFamily: Fonts.sansSemiBold, color: C.secondary },

  feesCard: {
    backgroundColor: C.primarySoft, borderRadius: 22, padding: 18,
    borderWidth: 1, borderColor: C.border, gap: 12,
  },
  feesNote: { fontSize: 14, lineHeight: 22, fontFamily: Fonts.sans, color: C.textSecondary },
  feeRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  feeDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: C.secondary, marginTop: 7 },
  feeText: { flex: 1, fontSize: 14, lineHeight: 22, fontFamily: Fonts.sans, color: C.textPrimary },
  feeBold: { fontFamily: Fonts.sansBold, color: C.secondary },

  agreementRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  checkbox: {
    width: 22, height: 22, borderRadius: 6, borderWidth: 1.5,
    borderColor: C.border, backgroundColor: C.surfaceAlt,
    alignItems: 'center', justifyContent: 'center', marginTop: 1,
  },
  checkboxChecked: { backgroundColor: C.secondary, borderColor: C.secondary },
  agreementText: {
    flex: 1, fontSize: 14, lineHeight: 22, fontFamily: Fonts.sans,
    color: C.textPrimary, fontStyle: 'italic',
  },

  submitButton: {
    backgroundColor: C.primary, borderRadius: 16,
    paddingVertical: 16, alignItems: 'center', justifyContent: 'center',
  },
  submitButtonText: { fontSize: 14, fontFamily: Fonts.sansBold, color: '#FFFFFF' },
  loadingRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  buttonDisabled: { backgroundColor: '#CBD3E0' },
  pressed: { opacity: 0.92 },
  secondaryBtn: {
    width: '100%', borderRadius: 16, paddingVertical: 14,
    alignItems: 'center', borderWidth: 1, borderColor: C.border, backgroundColor: C.surface,
  },
  secondaryBtnText: { fontSize: 14, fontFamily: Fonts.sansSemiBold, color: C.secondary },

  payNotice: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 10,
    backgroundColor: '#FFF8EC', borderRadius: 12, padding: 14,
    borderWidth: 1, borderColor: '#F0D080',
  },
  payNoticeText: { flex: 1, fontSize: 13, fontFamily: Fonts.sans, color: '#7A5A00', lineHeight: 19 },

  payDetailsCard: {
    backgroundColor: '#EEF3FB', borderRadius: 16, padding: 14,
    borderWidth: 1, borderColor: '#D0DCEE', gap: 10,
  },
  payDetailsHeader: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  payDetailsTitle: { fontSize: 14, fontFamily: Fonts.sansBold, color: C.secondary },
  payDetailsRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8, flexWrap: 'wrap' },
  payDetailsNetwork: { fontSize: 13, fontFamily: Fonts.sansSemiBold, color: C.textSecondary, flexShrink: 0 },
  payDetailsNumber: { fontSize: 14, fontFamily: Fonts.sansBold, color: C.textPrimary, flex: 1, textAlign: 'right', flexWrap: 'wrap' },
  payDetailsName: { fontSize: 12, fontFamily: Fonts.sans, color: C.textMuted, flex: 1, textAlign: 'right', flexWrap: 'wrap' },
  payDetailsNote: { fontSize: 12, fontFamily: Fonts.sans, color: C.textMuted, fontStyle: 'italic' },

  reviewCard: {
    backgroundColor: C.surface, borderRadius: 22, padding: 18,
    borderWidth: 1, borderColor: C.border, gap: 12,
  },
  reviewSection: { fontSize: 15, fontFamily: Fonts.displaySemiBold, color: C.textPrimary },
  reviewRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start',
    paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: C.border, gap: 12,
  },
  reviewLabel: { fontSize: 13, fontFamily: Fonts.sansSemiBold, color: C.textSecondary, flex: 1 },
  reviewValue: { fontSize: 13, fontFamily: Fonts.sans, color: C.textPrimary, flex: 2, textAlign: 'right', flexWrap: 'wrap' },
  reviewBody: { fontSize: 14, lineHeight: 22, fontFamily: Fonts.sans, color: C.textSecondary },

  uploadBtn: {
    backgroundColor: C.surfaceAlt, borderWidth: 1, borderColor: C.border,
    borderRadius: 16, paddingHorizontal: 16, paddingVertical: 14,
    borderStyle: 'dashed',
  },
  uploadBtnDone: {
    backgroundColor: C.successSoft, borderColor: '#A8D5C0', borderStyle: 'solid',
  },
  uploadBtnInner: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  uploadBtnText: { flex: 1, fontSize: 14, fontFamily: Fonts.sans, color: C.secondary },

  successContainer: {
    flexGrow: 1, alignItems: 'center', justifyContent: 'center', padding: 28, gap: 16,
  },
  successIconWrap: { marginBottom: 8 },
  successTitle: { fontSize: 28, fontFamily: Fonts.displayBold, color: C.textPrimary, textAlign: 'center' },
  successBody: { fontSize: 15, lineHeight: 24, fontFamily: Fonts.sans, color: C.textSecondary, textAlign: 'center' },
  successBold: { fontFamily: Fonts.sansBold, color: C.textPrimary },
  successCard: {
    width: '100%', backgroundColor: C.surface, borderRadius: 18, padding: 16,
    borderWidth: 1, borderColor: C.border, gap: 10, marginVertical: 4,
  },
  successRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  successMeta: { fontSize: 14, fontFamily: Fonts.sans, color: C.textSecondary, flex: 1 },
});

import { GoogleMark } from '@/components/google-mark';
import { C, Fonts } from '@/constants/theme';
import { canUseNativeGoogleSignIn, configureGoogleSignIn } from '@/services/google-signin';
import { FontAwesome6 } from '@expo/vector-icons';
import { GoogleSignin, isCancelledResponse, isSuccessResponse } from '@react-native-google-signin/google-signin';
import { router } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  Dimensions,
  Image,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { sendVerificationEmail, signUp, signUpWithGoogle } from '../../services/auth';

const useNativeDriver = Platform.OS !== 'web';

export default function SignupScreen() {
  const [dimensions, setDimensions] = useState(Dimensions.get('window'));

  useEffect(() => {
    configureGoogleSignIn();
    const sub = Dimensions.addEventListener('change', ({ window }) => setDimensions(window));
    return () => sub?.remove();
  }, []);

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showSignInHint, setShowSignInHint] = useState(false);
  const [agreed, setAgreed] = useState(false);
  const [focusedField, setFocusedField] = useState<string | null>(null);

  const scrollRef  = useRef<ScrollView>(null);
  const fadeAnim   = useRef(new Animated.Value(0)).current;
  const slideAnim  = useRef(new Animated.Value(24)).current;
  const shakeAnim  = useRef(new Animated.Value(0)).current;
  const checkScale = useRef(new Animated.Value(1)).current;

  const showError = (msg: string) => {
    setError(msg);
    shake();
    scrollRef.current?.scrollTo({ y: 0, animated: true });
  };

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim,  { toValue: 1, duration: 480, useNativeDriver }),
      Animated.spring(slideAnim, { toValue: 0, tension: 60, friction: 10, useNativeDriver }),
    ]).start();
  }, [fadeAnim, slideAnim]);

  const shake = () =>
    Animated.sequence([
      Animated.timing(shakeAnim, { toValue: 7,  duration: 55, useNativeDriver }),
      Animated.timing(shakeAnim, { toValue: -7, duration: 55, useNativeDriver }),
      Animated.timing(shakeAnim, { toValue: 5,  duration: 55, useNativeDriver }),
      Animated.timing(shakeAnim, { toValue: -5, duration: 55, useNativeDriver }),
      Animated.timing(shakeAnim, { toValue: 0,  duration: 55, useNativeDriver }),
    ]).start();

  const toggleAgreed = () => {
    Animated.sequence([
      Animated.timing(checkScale, { toValue: 0.8, duration: 80, useNativeDriver }),
      Animated.spring(checkScale, { toValue: 1, tension: 200, friction: 6, useNativeDriver }),
    ]).start();
    setAgreed(v => !v);
  };

  const getStrength = () => {
    if (!password) return { label: '', color: 'transparent', pct: 0 };
    if (password.length < 6) return { label: 'Weak', color: C.danger, pct: 25 };
    if (password.length < 10 || !/[A-Z]/.test(password) || !/[0-9]/.test(password))
      return { label: 'Fair', color: C.warning, pct: 55 };
    return { label: 'Strong', color: C.success, pct: 100 };
  };

  const validate = (): string | null => {
    if (!fullName.trim()) return 'Please enter your full name.';
    if (!email.trim() || !email.includes('@')) return 'Please enter a valid email address.';
    if (!password || password.length < 6) return 'Password must be at least 6 characters.';
    if (password !== confirmPassword) return 'Passwords do not match.';
    if (!agreed) return 'Please accept the Terms of Service to continue.';
    return null;
  };

  const handleSignup = async () => {
    const err = validate();
    if (err) { showError(err); return; }
    setLoading(true);
    setError('');
    setShowSignInHint(false);
    try {
      await signUp(email.trim(), password, { fullName: fullName.trim(), phone: phone.trim(), role: 'applicant' });
      sendVerificationEmail().catch(() => {});
      router.replace('/(main)/home');
    } catch (e: any) {
      const emailTaken = e.code === 'auth/email-already-in-use';
      const msg =
        ['auth/network-request-failed', 'auth/internal-error'].includes(e.code)
          ? 'No internet connection. Check your connection and try again.'
          : emailTaken
          ? 'An account already exists for this email address.'
          : e.code === 'auth/invalid-email'
          ? 'Please enter a valid email address.'
          : e.code === 'auth/weak-password'
          ? 'Password is too weak. Use at least 6 characters.'
          : 'Something went wrong. Please try again.';
      setShowSignInHint(emailTaken);
      showError(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignup = async () => {
    setLoading(true);
    setError('');
    try {
      if (!canUseNativeGoogleSignIn()) {
        await signUpWithGoogle('');
      } else {
        await GoogleSignin.hasPlayServices();
        const res = await GoogleSignin.signIn();
        if (isCancelledResponse(res)) return;
        if (!isSuccessResponse(res)) throw new Error('Google Sign-In failed.');
        const { idToken, user } = res.data;
        if (!idToken) throw new Error('No ID token returned.');
        await signUpWithGoogle(idToken, user.name || undefined);
      }
      router.replace('/(main)/home');
    } catch (e: any) {
      const msg =
        ['auth/network-request-failed', 'auth/internal-error'].includes(e.code)
          ? 'No internet connection. Check your connection and try again.'
          : e.code === 'auth/account-exists-with-different-credential'
          ? 'An account already exists for this email. Try signing in instead.'
          : 'Google sign-up failed. Please try again.';
      setShowSignInHint(e.code === 'auth/account-exists-with-different-credential');
      setError(msg);
      shake();
    } finally {
      setLoading(false);
    }
  };

  const strength = getStrength();
  const isFocused = (f: string) => focusedField === f;
  const inputStyle = (f: string) => [styles.input, isFocused(f) && styles.inputFocused];
  const hPad = dimensions.width < 380 ? 16 : 20;

  return (
    <KeyboardAvoidingView
      style={styles.root}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <StatusBar barStyle="dark-content" backgroundColor={C.bgWarm} />

      <ScrollView
        ref={scrollRef}
        contentContainerStyle={[styles.scroll, { paddingHorizontal: hPad }]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* ── Header ── */}
        <Animated.View style={[styles.header, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
          <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
            <FontAwesome6 name="arrow-left" size={12} color={C.secondary} />
            <Text style={styles.backText}>Back</Text>
          </TouchableOpacity>

          <Image
            source={require('../../assets/images/giac-bg.jpg')}
            style={styles.logoImage}
            resizeMode="contain"
          />
          <Text style={styles.overline}>Global Institute of ADR Center</Text>
          <Text style={styles.title}>Create your account</Text>
          <Text style={styles.lead}>Fill in your details to get started with GIAC.</Text>
        </Animated.View>

        {/* ── Error ── */}
        {error ? (
          <Animated.View style={[styles.errorBanner, { transform: [{ translateX: shakeAnim }] }]}>
            <View style={styles.errorDot} />
            <View style={{ flex: 1, gap: 6 }}>
              <Text style={styles.errorText}>{error}</Text>
              {showSignInHint && (
                <TouchableOpacity onPress={() => router.push('/(auth)/login')}>
                  <Text style={styles.errorSignInLink}>Sign in to your existing account →</Text>
                </TouchableOpacity>
              )}
            </View>
          </Animated.View>
        ) : null}

        {/* ── Form card ── */}
        <Animated.View
          style={[styles.card, { opacity: fadeAnim, transform: [{ translateY: slideAnim }, { translateX: shakeAnim }] }]}
        >
          <Text style={styles.cardTitle}>Personal details</Text>

          {/* Full name */}
          <View style={styles.field}>
            <Text style={styles.label}>Full name</Text>
            <TextInput
              style={inputStyle('name')}
              placeholder="John Doe"
              placeholderTextColor={C.textMuted}
              value={fullName}
              onChangeText={setFullName}
              autoCapitalize="words"
              returnKeyType="next"
              onFocus={() => setFocusedField('name')}
              onBlur={() => setFocusedField(null)}
            />
          </View>

          {/* Email */}
          <View style={styles.field}>
            <Text style={styles.label}>Email address</Text>
            <TextInput
              style={inputStyle('email')}
              placeholder="you@example.com"
              placeholderTextColor={C.textMuted}
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              keyboardType="email-address"
              returnKeyType="next"
              onFocus={() => setFocusedField('email')}
              onBlur={() => setFocusedField(null)}
            />
          </View>

          {/* Phone */}
          <View style={styles.field}>
            <View style={styles.labelRow}>
              <Text style={styles.label}>Phone number</Text>
            </View>
            <TextInput
              style={inputStyle('phone')}
              placeholder="+233 XX XXX XXXX"
              placeholderTextColor={C.textMuted}
              value={phone}
              onChangeText={setPhone}
              keyboardType="phone-pad"
              returnKeyType="next"
              onFocus={() => setFocusedField('phone')}
              onBlur={() => setFocusedField(null)}
            />
          </View>

          {/* Security divider */}
          <View style={styles.sectionDivider}>
            <View style={styles.sectionLine} />
            <Text style={styles.sectionLabel}>Security</Text>
            <View style={styles.sectionLine} />
          </View>

          {/* Password */}
          <View style={styles.field}>
            <Text style={styles.label}>Password</Text>
            <View style={[styles.passwordWrap, isFocused('password') && styles.inputFocused]}>
              <TextInput
                style={styles.passwordInput}
                placeholder="Min. 6 characters"
                placeholderTextColor={C.textMuted}
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPassword}
                returnKeyType="next"
                onFocus={() => setFocusedField('password')}
                onBlur={() => setFocusedField(null)}
              />
              <TouchableOpacity
                onPress={() => setShowPassword(v => !v)}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Text style={styles.toggleText}>{showPassword ? 'Hide' : 'Show'}</Text>
              </TouchableOpacity>
            </View>
            {password.length > 0 ? (
              <View style={styles.strengthRow}>
                <View style={styles.strengthTrack}>
                  <View style={[styles.strengthFill, { width: `${strength.pct}%` as any, backgroundColor: strength.color }]} />
                </View>
                <Text style={[styles.strengthLabel, { color: strength.color }]}>{strength.label}</Text>
              </View>
            ) : null}
          </View>

          {/* Confirm password */}
          <View style={styles.field}>
            <Text style={styles.label}>Confirm password</Text>
            <View style={[styles.passwordWrap, isFocused('confirm') && styles.inputFocused]}>
              <TextInput
                style={styles.passwordInput}
                placeholder="Re-enter password"
                placeholderTextColor={C.textMuted}
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                secureTextEntry={!showConfirm}
                returnKeyType="done"
                onSubmitEditing={handleSignup}
                onFocus={() => setFocusedField('confirm')}
                onBlur={() => setFocusedField(null)}
              />
              {confirmPassword.length > 0 ? (
                <View style={[styles.matchDot, { backgroundColor: confirmPassword === password ? C.success : C.danger }]} />
              ) : null}
              <TouchableOpacity
                onPress={() => setShowConfirm(v => !v)}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Text style={styles.toggleText}>{showConfirm ? 'Hide' : 'Show'}</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Terms */}
          <TouchableOpacity style={styles.termsRow} onPress={toggleAgreed} activeOpacity={0.7}>
            <Animated.View style={[styles.checkbox, agreed && styles.checkboxChecked, { transform: [{ scale: checkScale }] }]}>
              {agreed ? <View style={styles.checkmark} /> : null}
            </Animated.View>
            <Text style={styles.termsText}>
              I agree to GIAC&apos;s{' '}
              <Text style={styles.termsLink}>Terms of Service</Text>
              {' '}and{' '}
              <Text style={styles.termsLink}>Privacy Policy</Text>
            </Text>
          </TouchableOpacity>

          {/* Submit */}
          <TouchableOpacity
            style={[styles.primaryBtn, loading && styles.btnDisabled]}
            onPress={handleSignup}
            disabled={loading}
            activeOpacity={0.88}
          >
            {loading
              ? <ActivityIndicator color={C.textInverse} size="small" />
              : <Text style={styles.primaryBtnText}>Create account</Text>
            }
          </TouchableOpacity>

          {/* Divider */}
          <View style={styles.dividerRow}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>or</Text>
            <View style={styles.dividerLine} />
          </View>

          {/* Google */}
          <TouchableOpacity
            style={[styles.googleBtn, loading && styles.btnDisabled]}
            onPress={handleGoogleSignup}
            disabled={loading}
            activeOpacity={0.88}
          >
            {loading
              ? <ActivityIndicator color={C.textPrimary} size="small" />
              : (<>
                  <GoogleMark size={20} />
                  <Text style={styles.googleBtnText}>Sign up with Google</Text>
                </>)
            }
          </TouchableOpacity>
        </Animated.View>

        {/* Sign in link */}
        <Animated.View style={[styles.signInRow, { opacity: fadeAnim }]}>
          <Text style={styles.signInPrompt}>Already have an account?{' '}</Text>
          <TouchableOpacity onPress={() => router.push('/(auth)/login')}>
            <Text style={styles.signInLink}>Sign in</Text>
          </TouchableOpacity>
        </Animated.View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: C.bgWarm,
    width: '100%',
    ...Platform.select({ web: { minHeight: '100vh' as any } }),
  },
  scroll: {
    flexGrow: 1,
    paddingTop: 52,
    paddingBottom: 40,
    maxWidth: 480,
    alignSelf: 'center',
    width: '100%',
    gap: 20,
  },

  // ── Header ──────────────────────────────────────────────────
  header: { alignItems: 'center', gap: 8, paddingBottom: 4 },
  backBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    alignSelf: 'flex-start', marginBottom: 16,
  },
  backText: { fontSize: 13, fontFamily: Fonts.sans, color: C.secondary },
  logoImage: {
    width: 100,
    height: 100,
    borderRadius: 50,
    marginBottom: 4,
  },
  overline: {
    fontSize: 11, fontFamily: Fonts.sansBold,
    color: C.accentStrong, textTransform: 'uppercase',
    letterSpacing: 1.6, textAlign: 'center',
  },
  title: {
    fontSize: 30, lineHeight: 34,
    fontFamily: Fonts.displayBold,
    color: C.textStrong, textAlign: 'center',
  },
  lead: {
    fontSize: 14, lineHeight: 22,
    fontFamily: Fonts.sans,
    color: C.textSecondary, textAlign: 'center',
  },

  // ── Error ────────────────────────────────────────────────────
  errorBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: C.dangerSoft,
    borderWidth: 1, borderColor: C.danger,
    borderRadius: 12, paddingHorizontal: 14, paddingVertical: 11,
  },
  errorDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: C.danger },
  errorText: { fontSize: 13, fontFamily: Fonts.sans, color: C.danger, lineHeight: 19 },
  errorSignInLink: { fontSize: 13, fontFamily: Fonts.sansSemiBold, color: C.secondary },

  // ── Card ─────────────────────────────────────────────────────
  card: {
    backgroundColor: C.surface,
    borderRadius: 22, borderWidth: 1, borderColor: C.border,
    padding: 20, gap: 14,
  },
  cardTitle: { fontSize: 18, fontFamily: Fonts.displaySemiBold, color: C.textPrimary },

  // ── Fields ───────────────────────────────────────────────────
  field: { gap: 8 },
  labelRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  label: { fontSize: 14, fontFamily: Fonts.sansSemiBold, color: C.textPrimary },
  optionalTag: {
    fontSize: 11, fontFamily: Fonts.sans, color: C.textMuted,
    backgroundColor: C.surfaceAlt,
    paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6,
  },
  input: {
    backgroundColor: C.surfaceAlt,
    borderWidth: 1, borderColor: C.border,
    borderRadius: 14, paddingHorizontal: 16, paddingVertical: 13,
    fontSize: 15, fontFamily: Fonts.sans, color: C.textPrimary,
  },
  inputFocused: { borderColor: C.secondary, backgroundColor: C.surface },
  passwordWrap: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: C.surfaceAlt,
    borderWidth: 1, borderColor: C.border,
    borderRadius: 14, paddingHorizontal: 16, paddingVertical: 13,
  },
  passwordInput: {
    flex: 1, fontSize: 15, fontFamily: Fonts.sans,
    color: C.textPrimary, paddingVertical: 0,
  },
  toggleText: { fontSize: 12, fontFamily: Fonts.sansSemiBold, color: C.secondary, paddingLeft: 8 },
  matchDot: { width: 7, height: 7, borderRadius: 3.5, marginRight: 6 },

  // ── Password strength ────────────────────────────────────────
  strengthRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 4 },
  strengthTrack: { flex: 1, height: 3, backgroundColor: C.border, borderRadius: 2 },
  strengthFill: { height: 3, borderRadius: 2 },
  strengthLabel: { fontSize: 11, fontFamily: Fonts.sansSemiBold, minWidth: 40, textAlign: 'right' },

  // ── Section divider ──────────────────────────────────────────
  sectionDivider: { flexDirection: 'row', alignItems: 'center', gap: 10, marginVertical: 4 },
  sectionLine: { flex: 1, height: 1, backgroundColor: C.border },
  sectionLabel: {
    fontSize: 10, fontFamily: Fonts.sansSemiBold,
    color: C.textMuted, letterSpacing: 0.5, textTransform: 'uppercase',
  },

  // ── Terms ────────────────────────────────────────────────────
  termsRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, marginTop: 2 },
  checkbox: {
    width: 20, height: 20, borderRadius: 6,
    borderWidth: 1.5, borderColor: C.borderStrong,
    alignItems: 'center', justifyContent: 'center', marginTop: 1,
  },
  checkboxChecked: { backgroundColor: C.secondary, borderColor: C.secondary },
  checkmark: {
    width: 10, height: 6,
    borderLeftWidth: 2, borderBottomWidth: 2,
    borderColor: C.textInverse,
    transform: [{ rotate: '-45deg' }, { translateY: -1 }],
  },
  termsText: { flex: 1, fontSize: 12, fontFamily: Fonts.sans, color: C.textSecondary, lineHeight: 19 },
  termsLink: { fontFamily: Fonts.sansSemiBold, color: C.secondary },

  // ── Buttons ──────────────────────────────────────────────────
  primaryBtn: {
    backgroundColor: C.primary, borderRadius: 14,
    height: 52, alignItems: 'center', justifyContent: 'center',
  },
  btnDisabled: { opacity: 0.65 },
  primaryBtnText: { fontSize: 15, fontFamily: Fonts.sansBold, color: C.textInverse, letterSpacing: 0.2 },

  dividerRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  dividerLine: { flex: 1, height: 1, backgroundColor: C.border },
  dividerText: { fontSize: 12, fontFamily: Fonts.sans, color: C.textMuted },

  googleBtn: {
    flexDirection: 'row', backgroundColor: C.surface,
    borderRadius: 14, height: 52,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: C.borderStrong, gap: 10,
  },
  googleBtnText: { fontSize: 15, fontFamily: Fonts.sansSemiBold, color: C.textPrimary, letterSpacing: 0.2 },

  // ── Footer ───────────────────────────────────────────────────
  signInRow: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center' },
  signInPrompt: { fontSize: 14, fontFamily: Fonts.sans, color: C.textSecondary },
  signInLink: { fontSize: 14, fontFamily: Fonts.sansSemiBold, color: C.secondary },
});

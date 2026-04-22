import { router } from 'expo-router';
import React, { useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  Dimensions,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native';
import { signUp } from '../../services/auth';

const { width } = Dimensions.get('window');

export default function SignupScreen() {
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [agreed, setAgreed] = useState(false);

  const [focusedField, setFocusedField] = useState<string | null>(null);

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;
  const errorShake = useRef(new Animated.Value(0)).current;
  const checkScale = useRef(new Animated.Value(1)).current;

  React.useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 500, useNativeDriver: true }),
      Animated.spring(slideAnim, { toValue: 0, tension: 60, friction: 10, useNativeDriver: true }),
    ]).start();
  }, []);

  const shakeError = () => {
    Animated.sequence([
      Animated.timing(errorShake, { toValue: 8, duration: 60, useNativeDriver: true }),
      Animated.timing(errorShake, { toValue: -8, duration: 60, useNativeDriver: true }),
      Animated.timing(errorShake, { toValue: 6, duration: 60, useNativeDriver: true }),
      Animated.timing(errorShake, { toValue: -6, duration: 60, useNativeDriver: true }),
      Animated.timing(errorShake, { toValue: 0, duration: 60, useNativeDriver: true }),
    ]).start();
  };

  const toggleAgreed = () => {
    Animated.sequence([
      Animated.timing(checkScale, { toValue: 0.8, duration: 80, useNativeDriver: true }),
      Animated.spring(checkScale, { toValue: 1, tension: 200, friction: 6, useNativeDriver: true }),
    ]).start();
    setAgreed((prev) => !prev);
  };

  const getPasswordStrength = (): { label: string; color: string; width: string } => {
    if (password.length === 0) return { label: '', color: 'transparent', width: '0%' };
    if (password.length < 6) return { label: 'Weak', color: '#E24B4A', width: '25%' };
    if (password.length < 10 || !/[A-Z]/.test(password) || !/[0-9]/.test(password))
      return { label: 'Fair', color: '#EF9F27', width: '55%' };
    return { label: 'Strong', color: '#1D9E75', width: '100%' };
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
    const validationError = validate();
    if (validationError) {
      setError(validationError);
      shakeError();
      return;
    }

    setLoading(true);
    setError('');

    try {
      await signUp(email.trim(), password, {
        fullName: fullName.trim(),
        phone: phone.trim(),
        role: 'applicant',
      });
      router.replace('/(main)/home');
    } catch (err: any) {
      const msg =
        err.code === 'auth/email-already-in-use'
          ? 'An account with this email already exists.'
          : err.code === 'auth/invalid-email'
          ? 'Please enter a valid email address.'
          : err.code === 'auth/weak-password'
          ? 'Password is too weak. Use at least 6 characters.'
          : 'Something went wrong. Please try again.';
      setError(msg);
      shakeError();
    } finally {
      setLoading(false);
    }
  };

  const strength = getPasswordStrength();

  const inputStyle = (field: string) => [
    styles.inputWrapper,
    focusedField === field && styles.inputWrapperFocused,
  ];

  return (
    <KeyboardAvoidingView
      style={styles.root}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <StatusBar barStyle="light-content" backgroundColor="#0A1628" />

      <View style={styles.bgAccentTop} />
      <View style={styles.bgAccentBottom} />

      <ScrollView
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <Animated.View
          style={[styles.header, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}
        >
          <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
            <View style={styles.backArrow} />
            <Text style={styles.backText}>Back</Text>
          </TouchableOpacity>

          <View style={styles.miniLogo}>
            <View style={styles.mlTop} />
            <View style={styles.mlRow}>
              <View style={styles.mlBL} />
              <View style={styles.mlDiv} />
              <View style={styles.mlBR} />
            </View>
            <View style={styles.mlBase} />
          </View>
          <Text style={styles.brandName}>GIAC</Text>
          <Text style={styles.brandSub}>Create your account</Text>
        </Animated.View>

        {/* Step indicator */}
        <Animated.View
          style={[styles.stepRow, { opacity: fadeAnim }]}
        >
          <View style={styles.stepActive} />
          <View style={styles.stepDot} />
          <View style={styles.stepDot} />
        </Animated.View>

        {/* Card */}
        <Animated.View
          style={[
            styles.card,
            {
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }, { translateX: errorShake }],
            },
          ]}
        >
          <Text style={styles.cardTitle}>Personal details</Text>
          <Text style={styles.cardSubtitle}>Fill in your information to get started</Text>

          {/* Error */}
          {error ? (
            <View style={styles.errorBanner}>
              <View style={styles.errorDot} />
              <Text style={styles.errorText}>{error}</Text>
            </View>
          ) : null}

          {/* Full Name */}
          <View style={styles.fieldGroup}>
            <Text style={styles.label}>Full name</Text>
            <View style={inputStyle('name')}>
              <FieldIcon type="person" />
              <TextInput
                style={styles.input}
                placeholder="John Doe"
                placeholderTextColor="rgba(255,255,255,0.25)"
                value={fullName}
                onChangeText={setFullName}
                autoCapitalize="words"
                returnKeyType="next"
                onFocus={() => setFocusedField('name')}
                onBlur={() => setFocusedField(null)}
              />
            </View>
          </View>

          {/* Email */}
          <View style={styles.fieldGroup}>
            <Text style={styles.label}>Email address</Text>
            <View style={inputStyle('email')}>
              <FieldIcon type="email" />
              <TextInput
                style={styles.input}
                placeholder="you@example.com"
                placeholderTextColor="rgba(255,255,255,0.25)"
                value={email}
                onChangeText={setEmail}
                autoCapitalize="none"
                keyboardType="email-address"
                returnKeyType="next"
                onFocus={() => setFocusedField('email')}
                onBlur={() => setFocusedField(null)}
              />
            </View>
          </View>

          {/* Phone (optional) */}
          <View style={styles.fieldGroup}>
            <View style={styles.labelRow}>
              <Text style={styles.label}>Phone number</Text>
              <Text style={styles.optionalTag}>Optional</Text>
            </View>
            <View style={inputStyle('phone')}>
              <FieldIcon type="phone" />
              <TextInput
                style={styles.input}
                placeholder="+233 XX XXX XXXX"
                placeholderTextColor="rgba(255,255,255,0.25)"
                value={phone}
                onChangeText={setPhone}
                keyboardType="phone-pad"
                returnKeyType="next"
                onFocus={() => setFocusedField('phone')}
                onBlur={() => setFocusedField(null)}
              />
            </View>
          </View>

          {/* Divider */}
          <View style={styles.sectionDivider}>
            <View style={styles.sectionLine} />
            <Text style={styles.sectionLabel}>Security</Text>
            <View style={styles.sectionLine} />
          </View>

          {/* Password */}
          <View style={styles.fieldGroup}>
            <Text style={styles.label}>Password</Text>
            <View style={inputStyle('password')}>
              <FieldIcon type="lock" />
              <TextInput
                style={styles.input}
                placeholder="Min. 6 characters"
                placeholderTextColor="rgba(255,255,255,0.25)"
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPassword}
                returnKeyType="next"
                onFocus={() => setFocusedField('password')}
                onBlur={() => setFocusedField(null)}
              />
              <TouchableOpacity
                onPress={() => setShowPassword(!showPassword)}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Text style={styles.toggleText}>{showPassword ? 'Hide' : 'Show'}</Text>
              </TouchableOpacity>
            </View>

            {/* Strength meter */}
            {password.length > 0 && (
              <View style={styles.strengthContainer}>
                <View style={styles.strengthTrack}>
                  <View
                    style={[
                      styles.strengthFill,
                      { width: `${parseInt(strength.width)}%`, backgroundColor: strength.color },
                    ]}
                  />
                </View>
                <Text style={[styles.strengthLabel, { color: strength.color }]}>
                  {strength.label}
                </Text>
              </View>
            )}
          </View>

          {/* Confirm Password */}
          <View style={styles.fieldGroup}>
            <Text style={styles.label}>Confirm password</Text>
            <View style={inputStyle('confirm')}>
              <FieldIcon type="lock" />
              <TextInput
                style={styles.input}
                placeholder="Re-enter password"
                placeholderTextColor="rgba(255,255,255,0.25)"
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                secureTextEntry={!showConfirm}
                returnKeyType="done"
                onSubmitEditing={handleSignup}
                onFocus={() => setFocusedField('confirm')}
                onBlur={() => setFocusedField(null)}
              />
              {confirmPassword.length > 0 && (
                <View
                  style={[
                    styles.matchDot,
                    {
                      backgroundColor:
                        confirmPassword === password ? '#1D9E75' : '#E24B4A',
                    },
                  ]}
                />
              )}
              <TouchableOpacity
                onPress={() => setShowConfirm(!showConfirm)}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Text style={styles.toggleText}>{showConfirm ? 'Hide' : 'Show'}</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Terms checkbox */}
          <TouchableOpacity style={styles.termsRow} onPress={toggleAgreed} activeOpacity={0.7}>
            <Animated.View
              style={[
                styles.checkbox,
                agreed && styles.checkboxChecked,
                { transform: [{ scale: checkScale }] },
              ]}
            >
              {agreed && <View style={styles.checkmark} />}
            </Animated.View>
            <Text style={styles.termsText}>
              I agree to GIAC's{' '}
              <Text style={styles.termsLink}>Terms of Service</Text>
              {' '}and{' '}
              <Text style={styles.termsLink}>Privacy Policy</Text>
            </Text>
          </TouchableOpacity>

          {/* Submit button */}
          <TouchableOpacity
            style={[styles.submitBtn, loading && styles.submitBtnDisabled]}
            onPress={handleSignup}
            disabled={loading}
            activeOpacity={0.85}
          >
            {loading ? (
              <ActivityIndicator color="#0A1628" size="small" />
            ) : (
              <Text style={styles.submitBtnText}>Create account</Text>
            )}
          </TouchableOpacity>
        </Animated.View>

        {/* Sign in link */}
        <Animated.View style={[styles.signInRow, { opacity: fadeAnim }]}>
          <Text style={styles.signInPrompt}>Already have an account? </Text>
          <TouchableOpacity onPress={() => router.push('/(auth)/login')}>
            <Text style={styles.signInLink}>Sign in</Text>
          </TouchableOpacity>
        </Animated.View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

// ── Small inline icon component ──────────────────────────────────────
function FieldIcon({ type }: { type: 'email' | 'lock' | 'person' | 'phone' }) {
  const base: React.ComponentProps<typeof View>['style'] = {
    width: 16,
    height: 16,
    marginRight: 10,
    alignItems: 'center',
    justifyContent: 'center',
    opacity: 0.4,
  };

  if (type === 'email') {
    return (
      <View style={base}>
        <View style={{ width: 14, height: 10, borderWidth: 1.5, borderColor: '#fff', borderRadius: 2 }} />
        <View style={{ position: 'absolute', top: 0, left: 0, width: 0, height: 0, borderLeftWidth: 7, borderRightWidth: 7, borderTopWidth: 5, borderLeftColor: 'transparent', borderRightColor: 'transparent', borderTopColor: '#fff' }} />
      </View>
    );
  }
  if (type === 'lock') {
    return (
      <View style={base}>
        <View style={{ width: 11, height: 8, backgroundColor: '#fff', borderRadius: 2, marginTop: 3 }} />
        <View style={{ width: 7, height: 6, borderWidth: 1.5, borderColor: '#fff', borderBottomWidth: 0, borderRadius: 4, position: 'absolute', top: 0 }} />
      </View>
    );
  }
  if (type === 'person') {
    return (
      <View style={base}>
        <View style={{ width: 8, height: 8, borderRadius: 4, borderWidth: 1.5, borderColor: '#fff', marginBottom: 1 }} />
        <View style={{ width: 13, height: 6, borderWidth: 1.5, borderColor: '#fff', borderBottomWidth: 0, borderRadius: 7 }} />
      </View>
    );
  }
  // phone
  return (
    <View style={base}>
      <View style={{ width: 9, height: 13, borderWidth: 1.5, borderColor: '#fff', borderRadius: 2 }}>
        <View style={{ width: 3, height: 1.5, backgroundColor: '#fff', borderRadius: 1, alignSelf: 'center', marginTop: 9 }} />
      </View>
    </View>
  );
}

// ── Theme constants ──────────────────────────────────────────────────
const NAV = '#0A1628';
const BLUE = '#3B82F6';
const GOLD = '#C8A96B';
const CARD_BG = '#111E35';
const BORDER = 'rgba(255,255,255,0.1)';
const BORDER_FOCUS = 'rgba(59,130,246,0.5)';

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: NAV },

  bgAccentTop: {
    position: 'absolute', width: width * 0.9, height: width * 0.9,
    borderRadius: width * 0.45, borderWidth: 1,
    borderColor: 'rgba(59,130,246,0.07)', top: -width * 0.4, right: -width * 0.2,
  },
  bgAccentBottom: {
    position: 'absolute', width: width * 0.6, height: width * 0.6,
    borderRadius: width * 0.3, borderWidth: 1,
    borderColor: 'rgba(200,169,107,0.06)', bottom: -width * 0.1, left: -width * 0.1,
  },

  scroll: {
    flexGrow: 1, alignItems: 'center',
    paddingTop: 56, paddingBottom: 40, paddingHorizontal: 24,
  },

  // ── Header ──────────────────────────────────
  header: { alignItems: 'center', marginBottom: 16, width: '100%' },

  backBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    alignSelf: 'flex-start', marginBottom: 20,
  },
  backArrow: {
    width: 8, height: 8,
    borderLeftWidth: 2, borderBottomWidth: 2,
    borderColor: 'rgba(255,255,255,0.5)',
    transform: [{ rotate: '45deg' }],
  },
  backText: { fontSize: 13, color: 'rgba(255,255,255,0.5)' },

  miniLogo: {
    width: 38, height: 38,
    backgroundColor: 'rgba(59,130,246,0.12)',
    borderRadius: 10, borderWidth: 1,
    borderColor: 'rgba(59,130,246,0.25)',
    alignItems: 'center', justifyContent: 'center',
    gap: 3, marginBottom: 8, padding: 6,
  },
  mlTop: { width: 16, height: 2, backgroundColor: BLUE, borderRadius: 1 },
  mlRow: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  mlBL: { width: 6, height: 6, backgroundColor: 'rgba(59,130,246,0.5)', borderRadius: 2 },
  mlDiv: { width: 1.5, height: 10, backgroundColor: GOLD, borderRadius: 1 },
  mlBR: { width: 6, height: 6, backgroundColor: 'rgba(59,130,246,0.5)', borderRadius: 2 },
  mlBase: { width: 12, height: 2, backgroundColor: GOLD, borderRadius: 1 },

  brandName: {
    fontSize: 20, fontWeight: '800', color: '#fff',
    letterSpacing: 6, marginBottom: 2,
  },
  brandSub: { fontSize: 11, color: 'rgba(255,255,255,0.4)', letterSpacing: 0.3 },

  // ── Step indicator ──────────────────────────
  stepRow: {
    flexDirection: 'row', gap: 6, alignItems: 'center',
    marginBottom: 20,
  },
  stepActive: {
    width: 24, height: 6, borderRadius: 3, backgroundColor: BLUE,
  },
  stepDot: {
    width: 6, height: 6, borderRadius: 3,
    backgroundColor: 'rgba(255,255,255,0.15)',
  },

  // ── Card ────────────────────────────────────
  card: {
    width: '100%', backgroundColor: CARD_BG,
    borderRadius: 20, borderWidth: 1, borderColor: BORDER,
    padding: 24, marginBottom: 20,
  },
  cardTitle: { fontSize: 20, fontWeight: '700', color: '#fff', marginBottom: 4 },
  cardSubtitle: { fontSize: 13, color: 'rgba(255,255,255,0.4)', marginBottom: 22 },

  // ── Error ────────────────────────────────────
  errorBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: 'rgba(226,75,74,0.12)',
    borderWidth: 1, borderColor: 'rgba(226,75,74,0.3)',
    borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, marginBottom: 16,
  },
  errorDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#E24B4A' },
  errorText: { fontSize: 13, color: '#F09595', flex: 1, lineHeight: 18 },

  // ── Fields ───────────────────────────────────
  fieldGroup: { marginBottom: 14 },
  labelRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 7 },
  label: {
    fontSize: 11, fontWeight: '600', color: 'rgba(255,255,255,0.5)',
    letterSpacing: 0.5, marginBottom: 7, textTransform: 'uppercase',
  },
  optionalTag: {
    fontSize: 10, color: 'rgba(255,255,255,0.25)',
    backgroundColor: 'rgba(255,255,255,0.07)',
    paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6,
  },

  inputWrapper: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 12, borderWidth: 1, borderColor: BORDER,
    paddingHorizontal: 14, height: 50,
  },
  inputWrapperFocused: {
    borderColor: BORDER_FOCUS,
    backgroundColor: 'rgba(59,130,246,0.06)',
  },
  input: { flex: 1, fontSize: 14, color: '#FFFFFF', height: '100%', paddingVertical: 0 },
  toggleText: { fontSize: 11, color: BLUE, fontWeight: '500', paddingLeft: 6 },

  matchDot: { width: 7, height: 7, borderRadius: 3.5, marginRight: 4 },

  // ── Password strength ────────────────────────
  strengthContainer: {
    flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 7,
  },
  strengthTrack: {
    flex: 1, height: 3, backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 2,
  },
  strengthFill: { height: 3, borderRadius: 2 },
  strengthLabel: { fontSize: 11, fontWeight: '600', minWidth: 40, textAlign: 'right' },

  // ── Section divider ──────────────────────────
  sectionDivider: {
    flexDirection: 'row', alignItems: 'center', gap: 10, marginVertical: 16,
  },
  sectionLine: { flex: 1, height: 1, backgroundColor: 'rgba(255,255,255,0.08)' },
  sectionLabel: { fontSize: 10, color: 'rgba(255,255,255,0.3)', letterSpacing: 0.5, textTransform: 'uppercase' },

  // ── Terms checkbox ───────────────────────────
  termsRow: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 10,
    marginBottom: 20, marginTop: 4,
  },
  checkbox: {
    width: 20, height: 20, borderRadius: 6,
    borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.25)',
    alignItems: 'center', justifyContent: 'center', marginTop: 1,
    backgroundColor: 'transparent',
  },
  checkboxChecked: {
    backgroundColor: BLUE, borderColor: BLUE,
  },
  checkmark: {
    width: 10, height: 6,
    borderLeftWidth: 2, borderBottomWidth: 2,
    borderColor: '#fff',
    transform: [{ rotate: '-45deg' }, { translateY: -1 }],
  },
  termsText: { flex: 1, fontSize: 12, color: 'rgba(255,255,255,0.45)', lineHeight: 18 },
  termsLink: { color: GOLD, fontWeight: '600' },

  // ── Submit button ────────────────────────────
  submitBtn: {
    backgroundColor: BLUE, borderRadius: 12,
    height: 52, alignItems: 'center', justifyContent: 'center',
  },
  submitBtnDisabled: { opacity: 0.7 },
  submitBtnText: { fontSize: 15, fontWeight: '700', color: '#fff', letterSpacing: 0.3 },

  // ── Sign in link ─────────────────────────────
  signInRow: {
    flexDirection: 'row', justifyContent: 'center', alignItems: 'center',
  },
  signInPrompt: { fontSize: 13, color: 'rgba(255,255,255,0.4)' },
  signInLink: { fontSize: 13, fontWeight: '600', color: GOLD },
});

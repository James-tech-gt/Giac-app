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
    View,
} from 'react-native';
import { signIn } from '../../services/auth';

const { width } = Dimensions.get('window');

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [emailFocused, setEmailFocused] = useState(false);
  const [passwordFocused, setPasswordFocused] = useState(false);

  // Animation refs
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;
  const errorShake = useRef(new Animated.Value(0)).current;

  React.useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 500,
        useNativeDriver: true,
      }),
      Animated.spring(slideAnim, {
        toValue: 0,
        tension: 60,
        friction: 10,
        useNativeDriver: true,
      }),
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

  const handleLogin = async () => {
    if (!email.trim() || !password.trim()) {
      setError('Please enter your email and password.');
      shakeError();
      return;
    }

    setLoading(true);
    setError('');

    try {
      await signIn(email.trim(), password);
      router.replace('/(main)/home');
    } catch (err: any) {
      const msg =
        err.code === 'auth/user-not-found' || err.code === 'auth/wrong-password'
          ? 'Invalid email or password.'
          : err.code === 'auth/too-many-requests'
          ? 'Too many attempts. Please try again later.'
          : 'Something went wrong. Please try again.';
      setError(msg);
      shakeError();
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.root}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <StatusBar barStyle="light-content" backgroundColor="#0A1628" />

      {/* Background accents */}
      <View style={styles.bgAccentTop} />
      <View style={styles.bgAccentBottom} />

      <ScrollView
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Header / branding */}
        <Animated.View
          style={[
            styles.header,
            { opacity: fadeAnim, transform: [{ translateY: slideAnim }] },
          ]}
        >
          {/* Mini logo mark */}
          <View style={styles.miniLogo}>
            <View style={styles.miniIconTop} />
            <View style={styles.miniIconRow}>
              <View style={styles.miniBarLeft} />
              <View style={styles.miniDivider} />
              <View style={styles.miniBarRight} />
            </View>
            <View style={styles.miniBase} />
          </View>
          <Text style={styles.brandName}>GIAC</Text>
          <Text style={styles.brandSub}>Global Institute of ADR Center</Text>
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
          <Text style={styles.cardTitle}>Welcome back</Text>
          <Text style={styles.cardSubtitle}>Sign in to your account to continue</Text>

          {/* Error banner */}
          {error ? (
            <View style={styles.errorBanner}>
              <View style={styles.errorDot} />
              <Text style={styles.errorText}>{error}</Text>
            </View>
          ) : null}

          {/* Email field */}
          <View style={styles.fieldGroup}>
            <Text style={styles.label}>Email address</Text>
            <View
              style={[
                styles.inputWrapper,
                emailFocused && styles.inputWrapperFocused,
              ]}
            >
              {/* Email icon */}
              <View style={styles.inputIcon}>
                <View style={styles.iconEnvelope} />
                <View style={styles.iconEnvelopeFlap} />
              </View>
              <TextInput
                style={styles.input}
                placeholder="you@example.com"
                placeholderTextColor="rgba(255,255,255,0.25)"
                value={email}
                onChangeText={setEmail}
                autoCapitalize="none"
                keyboardType="email-address"
                returnKeyType="next"
                onFocus={() => setEmailFocused(true)}
                onBlur={() => setEmailFocused(false)}
              />
            </View>
          </View>

          {/* Password field */}
          <View style={styles.fieldGroup}>
            <View style={styles.labelRow}>
              <Text style={styles.label}>Password</Text>
              <TouchableOpacity onPress={() => setEmail('')}>
                <Text style={styles.forgotLink}>Forgot password?</Text>
              </TouchableOpacity>
            </View>
            <View
              style={[
                styles.inputWrapper,
                passwordFocused && styles.inputWrapperFocused,
              ]}
            >
              {/* Lock icon */}
              <View style={styles.inputIcon}>
                <View style={styles.iconLockBody} />
                <View style={styles.iconLockShackle} />
              </View>
              <TextInput
                style={styles.input}
                placeholder="••••••••"
                placeholderTextColor="rgba(255,255,255,0.25)"
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPassword}
                returnKeyType="done"
                onSubmitEditing={handleLogin}
                onFocus={() => setPasswordFocused(true)}
                onBlur={() => setPasswordFocused(false)}
              />
              <TouchableOpacity
                onPress={() => setShowPassword(!showPassword)}
                style={styles.eyeButton}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Text style={styles.eyeText}>{showPassword ? 'Hide' : 'Show'}</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Sign in button */}
          <TouchableOpacity
            style={[styles.signInBtn, loading && styles.signInBtnDisabled]}
            onPress={handleLogin}
            disabled={loading}
            activeOpacity={0.85}
          >
            {loading ? (
              <ActivityIndicator color="#0A1628" size="small" />
            ) : (
              <Text style={styles.signInBtnText}>Sign in</Text>
            )}
          </TouchableOpacity>

          {/* Divider */}
          <View style={styles.dividerRow}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>or</Text>
            <View style={styles.dividerLine} />
          </View>

          {/* Sign up CTA */}
          <View style={styles.signUpRow}>
            <Text style={styles.signUpPrompt}>Don't have an account? </Text>
            <TouchableOpacity onPress={() => router.push('/(auth)/signup')}>
              <Text style={styles.signUpLink}>Create one</Text>
            </TouchableOpacity>
          </View>
        </Animated.View>

        {/* Footer */}
        <Text style={styles.footer}>
          By signing in you agree to GIAC's Terms of Service
        </Text>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const NAV = '#0A1628';
const BLUE = '#3B82F6';
const GOLD = '#C8A96B';
const CARD_BG = '#111E35';
const BORDER = 'rgba(255,255,255,0.1)';
const BORDER_FOCUS = 'rgba(59,130,246,0.5)';

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: NAV,
  },

  bgAccentTop: {
    position: 'absolute',
    width: width * 0.9,
    height: width * 0.9,
    borderRadius: width * 0.45,
    borderWidth: 1,
    borderColor: 'rgba(59,130,246,0.07)',
    top: -width * 0.4,
    right: -width * 0.2,
  },
  bgAccentBottom: {
    position: 'absolute',
    width: width * 0.6,
    height: width * 0.6,
    borderRadius: width * 0.3,
    borderWidth: 1,
    borderColor: 'rgba(200,169,107,0.06)',
    bottom: -width * 0.1,
    left: -width * 0.1,
  },

  scroll: {
    flexGrow: 1,
    alignItems: 'center',
    paddingTop: 64,
    paddingBottom: 40,
    paddingHorizontal: 24,
  },

  // ── Header ──────────────────────────────────────────
  header: {
    alignItems: 'center',
    marginBottom: 32,
  },
  miniLogo: {
    width: 44,
    height: 44,
    backgroundColor: 'rgba(59,130,246,0.12)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(59,130,246,0.25)',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3,
    marginBottom: 10,
    padding: 8,
  },
  miniIconTop: {
    width: 18,
    height: 2,
    backgroundColor: BLUE,
    borderRadius: 1,
  },
  miniIconRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  miniBarLeft: {
    width: 7,
    height: 7,
    backgroundColor: 'rgba(59,130,246,0.5)',
    borderRadius: 2,
  },
  miniDivider: {
    width: 1.5,
    height: 11,
    backgroundColor: GOLD,
    borderRadius: 1,
  },
  miniBarRight: {
    width: 7,
    height: 7,
    backgroundColor: 'rgba(59,130,246,0.5)',
    borderRadius: 2,
  },
  miniBase: {
    width: 13,
    height: 2,
    backgroundColor: GOLD,
    borderRadius: 1,
  },
  brandName: {
    fontSize: 22,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 6,
    marginBottom: 4,
  },
  brandSub: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.45)',
    letterSpacing: 0.3,
  },

  // ── Card ─────────────────────────────────────────────
  card: {
    width: '100%',
    backgroundColor: CARD_BG,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: BORDER,
    padding: 24,
    marginBottom: 20,
  },
  cardTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  cardSubtitle: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.45)',
    marginBottom: 24,
  },

  // ── Error banner ─────────────────────────────────────
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(226,75,74,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(226,75,74,0.3)',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 16,
  },
  errorDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#E24B4A',
  },
  errorText: {
    fontSize: 13,
    color: '#F09595',
    flex: 1,
    lineHeight: 18,
  },

  // ── Fields ───────────────────────────────────────────
  fieldGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 12,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.55)',
    letterSpacing: 0.5,
    marginBottom: 8,
    textTransform: 'uppercase',
  },
  labelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  forgotLink: {
    fontSize: 12,
    color: BLUE,
    fontWeight: '500',
  },

  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: BORDER,
    paddingHorizontal: 14,
    height: 52,
  },
  inputWrapperFocused: {
    borderColor: BORDER_FOCUS,
    backgroundColor: 'rgba(59,130,246,0.06)',
  },

  // Simple icon shapes
  inputIcon: {
    width: 18,
    height: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
    opacity: 0.4,
  },
  iconEnvelope: {
    width: 16,
    height: 11,
    borderWidth: 1.5,
    borderColor: '#fff',
    borderRadius: 2,
  },
  iconEnvelopeFlap: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: 0,
    height: 0,
    borderLeftWidth: 8,
    borderRightWidth: 8,
    borderTopWidth: 6,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderTopColor: '#fff',
  },
  iconLockBody: {
    width: 12,
    height: 9,
    backgroundColor: '#fff',
    borderRadius: 2,
    marginTop: 3,
  },
  iconLockShackle: {
    width: 8,
    height: 7,
    borderWidth: 1.5,
    borderColor: '#fff',
    borderBottomWidth: 0,
    borderRadius: 4,
    position: 'absolute',
    top: 0,
  },

  input: {
    flex: 1,
    fontSize: 15,
    color: '#FFFFFF',
    height: '100%',
    paddingVertical: 0,
  },

  eyeButton: {
    paddingLeft: 8,
  },
  eyeText: {
    fontSize: 12,
    color: BLUE,
    fontWeight: '500',
  },

  // ── Sign in button ────────────────────────────────────
  signInBtn: {
    backgroundColor: BLUE,
    borderRadius: 12,
    height: 52,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
    marginBottom: 20,
  },
  signInBtnDisabled: {
    opacity: 0.7,
  },
  signInBtnText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: 0.3,
  },

  // ── Divider ───────────────────────────────────────────
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 20,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  dividerText: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.3)',
  },

  // ── Sign up ───────────────────────────────────────────
  signUpRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  signUpPrompt: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.45)',
  },
  signUpLink: {
    fontSize: 14,
    fontWeight: '600',
    color: GOLD,
  },

  // ── Footer ────────────────────────────────────────────
  footer: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.2)',
    textAlign: 'center',
    lineHeight: 16,
  },
});

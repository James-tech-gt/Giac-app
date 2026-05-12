import { GoogleMark } from '@/components/google-mark';
import { C, Fonts } from '@/constants/theme';
import { canUseNativeGoogleSignIn, configureGoogleSignIn } from '@/services/google-signin';
import { GoogleSignin, isCancelledResponse, isSuccessResponse } from '@react-native-google-signin/google-signin';
import { router } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import { FontAwesome6 } from '@expo/vector-icons';
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
import { resetPassword, signIn, signInWithGoogle } from '../../services/auth';

const useNativeDriver = Platform.OS !== 'web';

export default function LoginScreen() {
  const [dimensions, setDimensions] = useState(Dimensions.get('window'));

  useEffect(() => {
    configureGoogleSignIn();
    const sub = Dimensions.addEventListener('change', ({ window }) => setDimensions(window));
    return () => sub?.remove();
  }, []);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [resetSent, setResetSent] = useState(false);
  const [showSignUpHint, setShowSignUpHint] = useState(false);
  const [emailFocused, setEmailFocused] = useState(false);
  const [passwordFocused, setPasswordFocused] = useState(false);

  const fadeAnim  = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(24)).current;
  const shakeAnim = useRef(new Animated.Value(0)).current;

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

  const handleLogin = async () => {
    if (!email.trim() || !password.trim()) {
      setError('Please enter your email and password.');
      shake();
      return;
    }
    setLoading(true);
    setError('');
    setShowSignUpHint(false);
    try {
      await signIn(email.trim(), password);
      router.replace('/(main)/home');
    } catch (err: any) {
      const isNetwork = ['auth/network-request-failed', 'auth/internal-error'].includes(err.code) || err.message?.toLowerCase().includes('network');
      const isCredential = ['auth/user-not-found', 'auth/wrong-password', 'auth/invalid-credential', 'auth/invalid-login-credentials'].includes(err.code);
      const msg = isNetwork
        ? 'No internet connection. Check your connection and try again.'
        : isCredential
        ? "No account found for this email, or the password is incorrect."
        : err.code === 'auth/too-many-requests'
        ? 'Too many attempts. Please try again later.'
        : 'Something went wrong. Please try again.';
      setShowSignUpHint(isCredential);
      setError(msg);
      shake();
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async () => {
    if (!email.trim()) {
      setError('Enter your email address above, then tap Forgot password.');
      shake();
      return;
    }
    setLoading(true);
    setError('');
    try {
      await resetPassword(email.trim());
      setResetSent(true);
    } catch (err: any) {
      const msg =
        ['auth/network-request-failed', 'auth/internal-error'].includes(err.code)
          ? 'No internet connection. Check your connection and try again.'
          : 'Could not send reset email. Check the address and try again.';
      setError(msg);
      shake();
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setLoading(true);
    setError('');
    try {
      if (!canUseNativeGoogleSignIn()) {
        await signInWithGoogle('');
      } else {
        await GoogleSignin.hasPlayServices();
        const res = await GoogleSignin.signIn();
        if (isCancelledResponse(res)) return;
        if (!isSuccessResponse(res)) throw new Error('Google Sign-In failed.');
        const { idToken } = res.data;
        if (!idToken) throw new Error('No ID token returned.');
        await signInWithGoogle(idToken);
      }
      router.replace('/(main)/home');
    } catch (err: any) {
      const msg =
        ['auth/network-request-failed', 'auth/internal-error'].includes(err.code)
          ? 'No internet connection. Check your connection and try again.'
          : err.code === 'auth/no-account'
          ? 'No account found. Please sign up first.'
          : 'Google sign-in failed. Please try again.';
      setError(msg);
      shake();
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.root}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <StatusBar barStyle="dark-content" backgroundColor={C.bgWarm} />

      <ScrollView
        contentContainerStyle={[
          styles.scroll,
          { paddingHorizontal: dimensions.width < 380 ? 16 : 20 },
        ]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* ── Brand header ── */}
        <Animated.View style={[styles.header, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
          <Image
            source={require('../../assets/images/giac-bg.jpg')}
            style={styles.logoImage}
            resizeMode="contain"
          />
          <Text style={styles.overline}>Global Institute of ADR Center</Text>
          <Text style={styles.title}>Welcome back.</Text>
          <Text style={styles.lead}>
            Sign in to continue your ADR training, applications, and mediation requests.
          </Text>
        </Animated.View>

        {/* ── Error banner ── */}
        {error ? (
          <Animated.View style={[styles.errorBanner, { transform: [{ translateX: shakeAnim }] }]}>
            <View style={styles.errorDot} />
            <View style={{ flex: 1, gap: 6 }}>
              <Text style={styles.errorText}>{error}</Text>
              {showSignUpHint && (
                <TouchableOpacity onPress={() => router.push('/(auth)/signup')}>
                  <Text style={styles.errorSignUpLink}>Don't have an account? Sign up →</Text>
                </TouchableOpacity>
              )}
            </View>
          </Animated.View>
        ) : null}

        {/* ── Form card ── */}
        <Animated.View
          style={[
            styles.card,
            { opacity: fadeAnim, transform: [{ translateY: slideAnim }, { translateX: shakeAnim }] },
          ]}
        >
          {/* Email */}
          <View style={styles.field}>
            <Text style={styles.label}>Email address</Text>
            <TextInput
              style={[styles.input, emailFocused && styles.inputFocused]}
              placeholder="you@example.com"
              placeholderTextColor={C.textMuted}
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              keyboardType="email-address"
              returnKeyType="next"
              onFocus={() => setEmailFocused(true)}
              onBlur={() => setEmailFocused(false)}
            />
          </View>

          {/* Password */}
          <View style={styles.field}>
            <View style={styles.labelRow}>
              <Text style={styles.label}>Password</Text>
              <TouchableOpacity onPress={handleForgotPassword} disabled={loading}>
                <Text style={styles.forgotLink}>
                  {resetSent ? 'Reset email sent ✓' : 'Forgot password?'}
                </Text>
              </TouchableOpacity>
            </View>
            <View style={[styles.passwordWrap, passwordFocused && styles.inputFocused]}>
              <TextInput
                style={styles.passwordInput}
                placeholder="••••••••"
                placeholderTextColor={C.textMuted}
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPassword}
                returnKeyType="done"
                onSubmitEditing={handleLogin}
                onFocus={() => setPasswordFocused(true)}
                onBlur={() => setPasswordFocused(false)}
              />
              <TouchableOpacity
                onPress={() => setShowPassword(v => !v)}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Text style={styles.toggleText}>{showPassword ? 'Hide' : 'Show'}</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Sign in button */}
          <TouchableOpacity
            style={[styles.primaryBtn, loading && styles.btnDisabled]}
            onPress={handleLogin}
            disabled={loading}
            activeOpacity={0.88}
          >
            {loading
              ? <ActivityIndicator color={C.textInverse} size="small" />
              : <Text style={styles.primaryBtnText}>Sign in</Text>
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
            onPress={handleGoogleSignIn}
            disabled={loading}
            activeOpacity={0.88}
          >
            {loading
              ? <ActivityIndicator color={C.textPrimary} size="small" />
              : (<>
                  <GoogleMark size={20} />
                  <Text style={styles.googleBtnText}>Continue with Google</Text>
                </>)
            }
          </TouchableOpacity>
        </Animated.View>

        {/* ── Create account ── */}
        <View style={styles.signUpRow}>
          <Text style={styles.signUpPrompt}>New to GIAC?{' '}</Text>
          <TouchableOpacity onPress={() => router.push('/(auth)/signup')}>
            <Text style={styles.signUpLink}>Create an account</Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.footer}>By signing in you agree to GIAC&apos;s Terms of Service</Text>
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
    paddingTop: 60,
    paddingBottom: 40,
    maxWidth: 480,
    alignSelf: 'center',
    width: '100%',
    gap: 20,
  },

  // ── Brand header ────────────────────────────────────────────
  header: {
    alignItems: 'center',
    gap: 10,
    paddingBottom: 8,
  },
  logoImage: {
    width: 110,
    height: 110,
    borderRadius: 55,
    marginBottom: 6,
  },
  overline: {
    fontSize: 11,
    fontFamily: Fonts.sansBold,
    color: C.accentStrong,
    textTransform: 'uppercase',
    letterSpacing: 1.6,
    textAlign: 'center',
  },
  title: {
    fontSize: 36,
    lineHeight: 40,
    fontFamily: Fonts.displayBold,
    color: C.textStrong,
    textAlign: 'center',
  },
  lead: {
    fontSize: 15,
    lineHeight: 24,
    fontFamily: Fonts.sans,
    color: C.textSecondary,
    textAlign: 'center',
    maxWidth: 300,
  },

  // ── Error ────────────────────────────────────────────────────
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: C.dangerSoft,
    borderWidth: 1,
    borderColor: C.danger,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 11,
  },
  errorDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: C.danger,
  },
  errorText: {
    fontSize: 13,
    fontFamily: Fonts.sans,
    color: C.danger,
    lineHeight: 19,
  },
  errorSignUpLink: {
    fontSize: 13,
    fontFamily: Fonts.sansSemiBold,
    color: C.secondary,
  },

  // ── Card ─────────────────────────────────────────────────────
  card: {
    backgroundColor: C.surface,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: C.border,
    padding: 20,
    gap: 16,
  },

  // ── Fields ───────────────────────────────────────────────────
  field: {
    gap: 8,
  },
  label: {
    fontSize: 14,
    fontFamily: Fonts.sansSemiBold,
    color: C.textPrimary,
  },
  labelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  forgotLink: {
    fontSize: 13,
    fontFamily: Fonts.sansSemiBold,
    color: C.secondary,
  },
  input: {
    backgroundColor: C.surfaceAlt,
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 13,
    fontSize: 15,
    fontFamily: Fonts.sans,
    color: C.textPrimary,
  },
  inputFocused: {
    borderColor: C.secondary,
    backgroundColor: C.surface,
  },
  passwordWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: C.surfaceAlt,
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 13,
  },
  passwordInput: {
    flex: 1,
    fontSize: 15,
    fontFamily: Fonts.sans,
    color: C.textPrimary,
    paddingVertical: 0,
  },
  toggleText: {
    fontSize: 12,
    fontFamily: Fonts.sansSemiBold,
    color: C.secondary,
    paddingLeft: 8,
  },

  // ── Buttons ───────────────────────────────────────────────────
  primaryBtn: {
    backgroundColor: C.primary,
    borderRadius: 14,
    height: 52,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  btnDisabled: { opacity: 0.65 },
  primaryBtnText: {
    fontSize: 15,
    fontFamily: Fonts.sansBold,
    color: C.textInverse,
    letterSpacing: 0.2,
  },

  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: C.border,
  },
  dividerText: {
    fontSize: 12,
    fontFamily: Fonts.sans,
    color: C.textMuted,
  },

  googleBtn: {
    flexDirection: 'row',
    backgroundColor: C.surface,
    borderRadius: 14,
    height: 52,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: C.borderStrong,
    gap: 10,
  },
  googleBtnText: {
    fontSize: 15,
    fontFamily: Fonts.sansSemiBold,
    color: C.textPrimary,
    letterSpacing: 0.2,
  },

  // ── Footer ────────────────────────────────────────────────────
  signUpRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  signUpPrompt: {
    fontSize: 14,
    fontFamily: Fonts.sans,
    color: C.textSecondary,
  },
  signUpLink: {
    fontSize: 14,
    fontFamily: Fonts.sansSemiBold,
    color: C.secondary,
  },
  footer: {
    fontSize: 11,
    fontFamily: Fonts.sans,
    color: C.textMuted,
    textAlign: 'center',
    lineHeight: 16,
  },
});

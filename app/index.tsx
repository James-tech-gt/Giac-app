import { router } from 'expo-router';
import React, { useEffect, useRef } from 'react';
import {
    Animated,
    Dimensions,
    ImageBackground,
    StatusBar,
    StyleSheet,
    Text,
    View,
} from 'react-native';

const { width } = Dimensions.get('window');

export default function SplashScreen() {
  // Animation values
  const logoScale = useRef(new Animated.Value(0.6)).current;
  const logoOpacity = useRef(new Animated.Value(0)).current;
  const lineWidth = useRef(new Animated.Value(0)).current;
  const subtitleOpacity = useRef(new Animated.Value(0)).current;
  const taglineOpacity = useRef(new Animated.Value(0)).current;
  const dotScale1 = useRef(new Animated.Value(0)).current;
  const dotScale2 = useRef(new Animated.Value(0)).current;
  const dotScale3 = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Staggered animation sequence
    Animated.sequence([
      // 1. Logo fades + scales in
      Animated.parallel([
        Animated.spring(logoScale, {
          toValue: 1,
          tension: 60,
          friction: 8,
          useNativeDriver: true,
        }),
        Animated.timing(logoOpacity, {
          toValue: 1,
          duration: 600,
          useNativeDriver: true,
        }),
      ]),
      // 2. Divider line expands
      Animated.timing(lineWidth, {
        toValue: 1,
        duration: 500,
        useNativeDriver: true,
      }),
      // 3. Subtitle fades in
      Animated.timing(subtitleOpacity, {
        toValue: 1,
        duration: 400,
        useNativeDriver: true,
      }),
      // 4. Tagline fades in
      Animated.timing(taglineOpacity, {
        toValue: 1,
        duration: 400,
        useNativeDriver: true,
      }),
      // 5. Loading dots
      Animated.stagger(150, [
        Animated.spring(dotScale1, { toValue: 1, useNativeDriver: true }),
        Animated.spring(dotScale2, { toValue: 1, useNativeDriver: true }),
        Animated.spring(dotScale3, { toValue: 1, useNativeDriver: true }),
      ]),
    ]).start();

    // Navigate to auth after splash
    const timer = setTimeout(() => {
      router.replace('/(auth)/login');
    }, 3200);

    return () => clearTimeout(timer);
  }, []);

  return (
    <ImageBackground
      source={require('@/assets/images/giac-bg.jpg')}
      style={styles.container}
      resizeMode="center"
    >
      {/* Dark overlay */}
      <View style={styles.overlay} />
      
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />

      {/* Background geometric accent */}
      <View style={styles.bgCircleLarge} />
      <View style={styles.bgCircleSmall} />

      {/* Main content */}
      <View style={styles.centerContent}>

        {/* Logo mark */}
        <Animated.View
          style={[
            styles.logoContainer,
            {
              opacity: logoOpacity,
              transform: [{ scale: logoScale }],
            },
          ]}
        >
          {/* Logo icon — geometric shield / scales of justice abstraction */}
          <View style={styles.logoIcon}>
            <View style={styles.iconTop} />
            <View style={styles.iconRow}>
              <View style={styles.iconBarLeft} />
              <View style={styles.iconDivider} />
              <View style={styles.iconBarRight} />
            </View>
            <View style={styles.iconBase} />
          </View>

          {/* GIAC wordmark */}
          <Text style={styles.logoText}>GIAC</Text>
        </Animated.View>

        {/* Animated divider line */}
        <Animated.View
          style={[
            styles.dividerContainer,
            { transform: [{ scaleX: lineWidth }] },
          ]}
        >
          <View style={styles.divider} />
        </Animated.View>

        {/* Full name */}
        <Animated.Text style={[styles.subtitle, { opacity: subtitleOpacity }]}>
          Global Institute of ADR Center
        </Animated.Text>

        {/* Tagline */}
        <Animated.Text style={[styles.tagline, { opacity: taglineOpacity }]}>
          Resolve · Mediate · Transform
        </Animated.Text>
      </View>

      {/* Loading dots */}
      <View style={styles.dotsContainer}>
        <Animated.View style={[styles.dot, { transform: [{ scale: dotScale1 }] }]} />
        <Animated.View style={[styles.dot, { transform: [{ scale: dotScale2 }] }]} />
        <Animated.View style={[styles.dot, { transform: [{ scale: dotScale3 }] }]} />
      </View>

      {/* Footer */}
      <Text style={styles.footer}>Professional ADR Training & Services</Text>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Dark overlay for better contrast
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(10, 22, 40, 0.8)',
  },

  // Background decorative circles
  bgCircleLarge: {
    position: 'absolute',
    width: width * 1.1,
    height: width * 1.1,
    borderRadius: width * 0.55,
    borderWidth: 1,
    borderColor: 'rgba(59, 130, 246, 0.08)',
    top: -width * 0.3,
    left: -width * 0.05,
  },
  bgCircleSmall: {
    position: 'absolute',
    width: width * 0.7,
    height: width * 0.7,
    borderRadius: width * 0.35,
    borderWidth: 1,
    borderColor: 'rgba(59, 130, 246, 0.06)',
    bottom: -width * 0.1,
    right: -width * 0.1,
  },

  // Center content
  centerContent: {
    alignItems: 'center',
    paddingHorizontal: 40,
  },

  // Logo container
  logoContainer: {
    alignItems: 'center',
    marginBottom: 28,
  },

  // Geometric logo icon (scales / balance abstraction)
  logoIcon: {
    width: 72,
    height: 72,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(59, 130, 246, 0.12)',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(59, 130, 246, 0.3)',
    marginBottom: 16,
    padding: 14,
  },
  iconTop: {
    width: 28,
    height: 4,
    backgroundColor: '#3B82F6',
    borderRadius: 2,
    marginBottom: 6,
  },
  iconRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 6,
  },
  iconBarLeft: {
    width: 12,
    height: 12,
    backgroundColor: 'rgba(59, 130, 246, 0.5)',
    borderRadius: 3,
  },
  iconDivider: {
    width: 2,
    height: 18,
    backgroundColor: '#C8A96B',       // Gold accent
    borderRadius: 1,
  },
  iconBarRight: {
    width: 12,
    height: 12,
    backgroundColor: 'rgba(59, 130, 246, 0.5)',
    borderRadius: 3,
  },
  iconBase: {
    width: 20,
    height: 4,
    backgroundColor: '#C8A96B',
    borderRadius: 2,
  },

  // GIAC wordmark
  logoText: {
    fontSize: 42,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 10,
    includeFontPadding: false,
  },

  // Divider
  dividerContainer: {
    width: 180,
    marginBottom: 20,
  },
  divider: {
    height: 1,
    backgroundColor: '#C8A96B',       // Gold
    opacity: 0.7,
  },

  // Full institute name
  subtitle: {
    fontSize: 13,
    fontWeight: '400',
    color: 'rgba(255,255,255,0.65)',
    letterSpacing: 0.5,
    textAlign: 'center',
    marginBottom: 12,
    lineHeight: 20,
  },

  // Tagline
  tagline: {
    fontSize: 11,
    fontWeight: '600',
    color: '#C8A96B',
    letterSpacing: 3,
    textTransform: 'uppercase',
    textAlign: 'center',
  },

  // Loading indicator dots
  dotsContainer: {
    position: 'absolute',
    bottom: 100,
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#3B82F6',
    opacity: 0.8,
  },

  // Footer text
  footer: {
    position: 'absolute',
    bottom: 52,
    fontSize: 11,
    color: 'rgba(255,255,255,0.25)',
    letterSpacing: 0.3,
  },
});


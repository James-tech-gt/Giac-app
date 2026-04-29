import { router } from 'expo-router';
import React, { useEffect, useRef } from 'react';
import {
  Animated,
  Image,
  Platform,
  StatusBar,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';

const useNativeDriver = Platform.OS !== 'web';

export default function SplashScreen() {
  const { width, height } = useWindowDimensions();

  const logoScale       = useRef(new Animated.Value(0.6)).current;
  const logoOpacity     = useRef(new Animated.Value(0)).current;
  const lineWidth       = useRef(new Animated.Value(0)).current;
  const subtitleOpacity = useRef(new Animated.Value(0)).current;
  const taglineOpacity  = useRef(new Animated.Value(0)).current;
  const dotScale1       = useRef(new Animated.Value(0)).current;
  const dotScale2       = useRef(new Animated.Value(0)).current;
  const dotScale3       = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.sequence([
      Animated.parallel([
        Animated.spring(logoScale,   { toValue: 1, tension: 60, friction: 8, useNativeDriver }),
        Animated.timing(logoOpacity, { toValue: 1, duration: 700, useNativeDriver }),
      ]),
      Animated.timing(lineWidth,       { toValue: 1, duration: 500, useNativeDriver }),
      Animated.timing(subtitleOpacity, { toValue: 1, duration: 400, useNativeDriver }),
      Animated.timing(taglineOpacity,  { toValue: 1, duration: 400, useNativeDriver }),
      Animated.stagger(150, [
        Animated.spring(dotScale1, { toValue: 1, useNativeDriver }),
        Animated.spring(dotScale2, { toValue: 1, useNativeDriver }),
        Animated.spring(dotScale3, { toValue: 1, useNativeDriver }),
      ]),
    ]).start();

    const timer = setTimeout(() => router.replace('/(auth)/login'), 3200);
    return () => clearTimeout(timer);
  }, []);

  // The seal size — we want it large enough to fill the screen
  // but still look like a centered watermark, not a tiled image.
  // We take the larger of width/height so it always covers the screen.
  const sealSize = Math.max(width, height) * 1.1;

  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent={true} />

      {/*
       * GIAC seal — rendered as a plain Image positioned absolutely
       * dead-center behind everything.
       *
       * Why not ImageBackground?
       * On web, ImageBackground uses a <div> with background-image which
       * doesn't reliably center/cover across all viewport sizes.
       * Using an absolutely positioned Image gives us pixel-perfect
       * centering on mobile, tablet, and web desktop.
       */}
      <Image
        source={require('@/assets/images/giac-bg.jpg')}
        style={[
          styles.sealImage,
          {
            width: sealSize,
            height: sealSize,
            // Center it: offset by half its own size from the center
            top: height / 2 - sealSize / 2,
            left: width / 2 - sealSize / 2,
          },
        ]}
        resizeMode="contain"
      />

      {/* Dark navy overlay — turns the seal into a subtle watermark */}
      <View style={styles.overlay} />

      {/* Subtle decorative rings */}
      <View style={[styles.ring, {
        width: width * 1.1, height: width * 1.1,
        borderRadius: width * 0.55,
        top: -width * 0.3, left: -width * 0.05,
      }]} />
      <View style={[styles.ring, {
        width: width * 0.65, height: width * 0.65,
        borderRadius: width * 0.325,
        bottom: -width * 0.08, right: -width * 0.08,
        borderColor: 'rgba(200, 169, 107, 0.08)',
      }]} />

      {/* Centre content — always perfectly centred on any screen */}
      <View style={styles.center}>

        <Animated.View style={[
          styles.logoGroup,
          { opacity: logoOpacity, transform: [{ scale: logoScale }] },
        ]}>
          <Text style={styles.wordmark}>GIAC</Text>
        </Animated.View>

        {/* Gold expanding divider */}
        <Animated.View style={[styles.dividerWrap, { transform: [{ scaleX: lineWidth }] }]}>
          <View style={styles.dividerLine} />
        </Animated.View>

        <Animated.Text style={[styles.fullName, { opacity: subtitleOpacity }]}>
          Global Institute of ADR Center
        </Animated.Text>

        <Animated.Text style={[styles.tagline, { opacity: taglineOpacity }]}>
          Resolve · Mediate · Transform
        </Animated.Text>

      </View>

      {/* Loading dots */}
      <View style={[styles.dots, { bottom: height * 0.11 }]}>
        <Animated.View style={[styles.dot, { transform: [{ scale: dotScale1 }] }]} />
        <Animated.View style={[styles.dot, { transform: [{ scale: dotScale2 }] }]} />
        <Animated.View style={[styles.dot, { transform: [{ scale: dotScale3 }] }]} />
      </View>

      <Text style={[styles.footer, { bottom: height * 0.045 }]}>
        Professional ADR Training & Services
      </Text>
    </View>
  );
}

const BLUE = '#3B82F6';
const GOLD = '#C8A96B';
const NAVY = '#0A1628';

const styles = StyleSheet.create({
  // Full screen navy base
  root: {
    flex: 1,
    backgroundColor: NAVY,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',   // clips the seal if it extends beyond screen edges
  },

  // The GIAC seal — absolutely positioned dead center
  sealImage: {
    position: 'absolute',
    opacity: 0.18,        // subtle watermark effect — raise to 0.3 for more visible
  },

  // Navy overlay — darkens the seal further for text readability
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(10, 22, 40, 0.55)',
  },

  ring: {
    position: 'absolute',
    borderWidth: 1,
    borderColor: 'rgba(59, 130, 246, 0.07)',
  },

  center: {
    alignItems: 'center',
    paddingHorizontal: 40,
  },

  logoGroup: {
    alignItems: 'center',
    marginBottom: 24,
  },

  wordmark: {
    fontSize: 52,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 14,
    includeFontPadding: false,
  },

  dividerWrap: {
    width: 200,
    marginBottom: 18,
  },
  dividerLine: {
    height: 1,
    backgroundColor: GOLD,
    opacity: 0.7,
  },

  fullName: {
    fontSize: 13,
    fontWeight: '400',
    color: 'rgba(255,255,255,0.65)',
    letterSpacing: 0.4,
    textAlign: 'center',
    marginBottom: 10,
    lineHeight: 20,
  },

  tagline: {
    fontSize: 10,
    fontWeight: '600',
    color: GOLD,
    letterSpacing: 3.5,
    textTransform: 'uppercase',
    textAlign: 'center',
  },

  dots: {
    position: 'absolute',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: BLUE,
    opacity: 0.75,
  },

  footer: {
    position: 'absolute',
    fontSize: 11,
    color: 'rgba(255,255,255,0.25)',
    letterSpacing: 0.3,
  },
});

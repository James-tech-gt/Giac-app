import AsyncStorage from '@react-native-async-storage/async-storage';
import { Fonts } from '@/constants/theme';
import { FontAwesome6 } from '@expo/vector-icons';
import { router } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import {
  Animated,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const ONBOARDING_KEY = '@giac:onboarded';

const NAVY = '#0A1628';
const GOLD = '#C8A96B';
const SECONDARY = '#2A3F66';
const WHITE = '#FFFFFF';
const MUTED = 'rgba(255,255,255,0.55)';

const slides = [
  {
    id: '1',
    icon: 'scale-balanced' as const,
    eyebrow: 'Welcome to GIAC',
    title: 'Your ADR Training & Services Platform',
    body: 'The Global Institute of ADR Center equips individuals and organizations with world-class Alternative Dispute Resolution skills — mediation, arbitration, and negotiation.',
    accent: '#3B82F6',
  },
  {
    id: '2',
    icon: 'graduation-cap' as const,
    eyebrow: 'Get Certified',
    title: 'Apply, Learn & Earn a Recognized Certificate',
    body: "Browse our PECADR and Master's programs, submit your application, track your admissions status, and access materials once enrolled.",
    accent: GOLD,
  },
  {
    id: '3',
    icon: 'handshake' as const,
    eyebrow: 'Resolve Disputes',
    title: 'Expert Mediation & Arbitration Services',
    body: 'Submit a mediation or arbitration request directly from the app. An expert mediator will be assigned and you can track your case in real time.',
    accent: '#4CAF50',
  },
  {
    id: '4',
    icon: 'rocket' as const,
    eyebrow: "Ready?",
    title: 'Start Your ADR Journey Today',
    body: 'Create a free account or sign in to apply for training, request dispute resolution services, or continue your learning journey.',
    accent: GOLD,
  },
];

async function markOnboarded() {
  try {
    await AsyncStorage.setItem(ONBOARDING_KEY, '1');
  } catch {}
}

export default function OnboardingScreen() {
  const [activeIndex, setActiveIndex] = useState(0);
  const fadeAnim = useRef(new Animated.Value(1)).current;
  const slideAnim = useRef(new Animated.Value(0)).current;

  const slide = slides[activeIndex];
  const isLast = activeIndex === slides.length - 1;

  const animateTo = (nextIndex: number) => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 0, duration: 180, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: -20, duration: 180, useNativeDriver: true }),
    ]).start(() => {
      setActiveIndex(nextIndex);
      slideAnim.setValue(20);
      Animated.parallel([
        Animated.timing(fadeAnim, { toValue: 1, duration: 220, useNativeDriver: true }),
        Animated.timing(slideAnim, { toValue: 0, duration: 220, useNativeDriver: true }),
      ]).start();
    });
  };

  const goToNext = () => {
    if (activeIndex < slides.length - 1) {
      animateTo(activeIndex + 1);
    }
  };

  const goToSignIn = async () => {
    await markOnboarded();
    router.replace('/(auth)/login');
  };

  const goToSignUp = async () => {
    await markOnboarded();
    router.replace('/(auth)/signup');
  };

  const finish = goToSignIn;

  return (
    <SafeAreaView style={styles.root} edges={['top', 'bottom']}>
      {/* Top bar — always rendered to prevent layout shift */}
      <View style={styles.topBar}>
        <View style={styles.brandMark}>
          <Text style={styles.brandText}>GIAC</Text>
        </View>
        {!isLast ? (
          <Pressable
            onPress={finish}
            style={({ pressed }) => [styles.skipBtn, pressed && { opacity: 0.6 }]}
          >
            <Text style={styles.skipText}>Skip</Text>
          </Pressable>
        ) : (
          <View style={styles.skipBtn} />
        )}
      </View>

      {/* Slide content */}
      <Animated.View
        style={[
          styles.slideArea,
          { opacity: fadeAnim, transform: [{ translateY: slideAnim }] },
        ]}
      >
        <View style={[styles.iconRing, { borderColor: `${slide.accent}40` }]}>
          <View style={[styles.iconCircle, { backgroundColor: `${slide.accent}20` }]}>
            <FontAwesome6 name={slide.icon} size={40} color={slide.accent} />
          </View>
        </View>

        <Text style={[styles.eyebrow, { color: slide.accent }]}>{slide.eyebrow}</Text>
        <Text style={styles.title}>{slide.title}</Text>
        <Text style={styles.body}>{slide.body}</Text>
      </Animated.View>

      {/* Pagination dots */}
      <View style={styles.dotsRow}>
        {slides.map((_, i) => (
          <Pressable key={i} onPress={() => animateTo(i)}>
            <View
              style={[
                styles.dot,
                i === activeIndex ? styles.dotActive : styles.dotInactive,
              ]}
            />
          </Pressable>
        ))}
      </View>

      {/* CTA footer */}
      <View style={styles.footer}>
        {isLast ? (
          <View style={styles.lastBtnRow}>
            <Pressable
              onPress={goToSignIn}
              style={({ pressed }) => [styles.signInBtn, pressed && { opacity: 0.85 }]}
            >
              <Text style={styles.signInText}>Sign In</Text>
            </Pressable>
            <Pressable
              onPress={goToSignUp}
              style={({ pressed }) => [styles.getStartedBtn, pressed && { opacity: 0.85 }]}
            >
              <Text style={styles.getStartedText}>Create Account</Text>
              <FontAwesome6 name="arrow-right" size={13} color={NAVY} />
            </Pressable>
          </View>
        ) : (
          <Pressable
            onPress={goToNext}
            style={({ pressed }) => [styles.nextBtn, pressed && { opacity: 0.85 }]}
          >
            <Text style={styles.nextText}>Next</Text>
            <FontAwesome6 name="arrow-right" size={13} color={WHITE} />
          </Pressable>
        )}

        <Text style={styles.counter}>{activeIndex + 1} / {slides.length}</Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: NAVY,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingTop: 8,
    paddingBottom: 4,
  },
  brandMark: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: 'rgba(200,169,107,0.35)',
  },
  brandText: {
    fontSize: 13,
    fontFamily: Fonts.displayBold,
    color: GOLD,
    letterSpacing: 3,
  },
  skipBtn: {
    paddingHorizontal: 4,
    paddingVertical: 8,
    minWidth: 48,
    alignItems: 'flex-end',
  },
  skipText: {
    fontSize: 14,
    fontFamily: Fonts.sansSemiBold,
    color: MUTED,
  },
  slideArea: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 36,
    gap: 20,
  },
  iconRing: {
    width: 148,
    height: 148,
    borderRadius: 74,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  iconCircle: {
    width: 112,
    height: 112,
    borderRadius: 56,
    alignItems: 'center',
    justifyContent: 'center',
  },
  eyebrow: {
    fontSize: 11,
    fontFamily: Fonts.sansSemiBold,
    letterSpacing: 2.5,
    textTransform: 'uppercase',
  },
  title: {
    fontSize: 28,
    lineHeight: 36,
    fontFamily: Fonts.displayBold,
    color: WHITE,
    textAlign: 'center',
  },
  body: {
    fontSize: 15,
    lineHeight: 24,
    fontFamily: Fonts.sans,
    color: MUTED,
    textAlign: 'center',
  },
  dotsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 20,
  },
  dot: {
    height: 8,
    borderRadius: 4,
  },
  dotActive: {
    width: 28,
    backgroundColor: GOLD,
  },
  dotInactive: {
    width: 8,
    backgroundColor: 'rgba(255,255,255,0.25)',
  },
  footer: {
    paddingHorizontal: 24,
    paddingBottom: Platform.OS === 'android' ? 20 : 8,
    gap: 14,
    marginBottom: 8,
  },
  nextBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    backgroundColor: SECONDARY,
    borderRadius: 18,
    paddingVertical: 17,
  },
  nextText: {
    fontSize: 16,
    fontFamily: Fonts.sansBold,
    color: WHITE,
  },
  lastBtnRow: {
    flexDirection: 'row',
    gap: 12,
  },
  signInBtn: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 18,
    paddingVertical: 17,
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  signInText: {
    fontSize: 16,
    fontFamily: Fonts.sansBold,
    color: WHITE,
  },
  getStartedBtn: {
    flex: 1.6,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    backgroundColor: GOLD,
    borderRadius: 18,
    paddingVertical: 17,
  },
  getStartedText: {
    fontSize: 16,
    fontFamily: Fonts.sansBold,
    color: NAVY,
  },
  counter: {
    textAlign: 'center',
    fontSize: 12,
    fontFamily: Fonts.sans,
    color: 'rgba(255,255,255,0.2)',
  },
});

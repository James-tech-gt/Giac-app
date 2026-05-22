import { Fonts } from '@/constants/theme';
import { auth } from '@/services/firebase';
import { Course, getCourseById, subscribeUserRegistration } from '@/services/firestore';
import { FontAwesome6 } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
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
};

function formatCurrency(value?: number) {
  if (typeof value !== 'number') return 'Fee unavailable';
  return new Intl.NumberFormat('en-GH', {
    style: 'currency',
    currency: 'GHS',
    maximumFractionDigits: 0,
  }).format(value);
}

export default function CourseDetailsScreen() {
  const { courseId } = useLocalSearchParams<{ courseId?: string }>();
  const { width } = useWindowDimensions();
  const isCompact = width < 390;
  const horizontalPadding = width < 380 ? 16 : 20;
  const [course, setCourse] = useState<Course | null>(null);
  const [loading, setLoading] = useState(true);
  const [registration, setRegistration] = useState<{ status: string } | null>(null);
  const canApply = registration?.status === 'accepted';

  useEffect(() => {
    const user = auth.currentUser;
    if (!user?.uid) return;
    return subscribeUserRegistration(user.uid, setRegistration);
  }, []);

  useEffect(() => {
    let active = true;

    const loadCourse = async () => {
      if (!courseId || typeof courseId !== 'string') {
        if (active) setLoading(false);
        return;
      }

      try {
        const data = await getCourseById(courseId);
        if (active) {
          setCourse(data);
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };

    loadCourse();

    return () => {
      active = false;
    };
  }, [courseId]);

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
          <Text style={styles.heroEyebrow}>Course Details</Text>
          {loading ? (
            <View style={styles.loadingRow}>
              <ActivityIndicator color={C.secondary} size="small" />
              <Text style={styles.heroDescription}>Loading course details...</Text>
            </View>
          ) : course ? (
            <>
              <Text style={[styles.heroTitle, isCompact ? styles.heroTitleCompact : null]}>
                {course.title}
              </Text>
              <Text style={styles.heroDescription}>
                {course.description || 'No course description added yet.'}
              </Text>
            </>
          ) : (
            <Text style={styles.heroDescription}>We could not find that course.</Text>
          )}
        </View>

        {course ? (
          <>
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Program Summary</Text>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Program</Text>
                <Text style={styles.detailValue}>{course.program}</Text>
              </View>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Level</Text>
                <Text style={styles.detailValue}>{course.level}</Text>
              </View>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Duration</Text>
                <Text style={styles.detailValue}>{course.duration}</Text>
              </View>
              {course.platform ? (
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Platform</Text>
                  <Text style={styles.detailValue}>{course.platform}</Text>
                </View>
              ) : null}
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Schedule</Text>
                <Text style={styles.detailValue}>{course.schedule}</Text>
              </View>
              {course.practicalSessions ? (
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Practical</Text>
                  <Text style={styles.detailValue}>{course.practicalSessions}</Text>
                </View>
              ) : null}
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Fee</Text>
                <Text style={styles.detailValue}>{formatCurrency(course.fees)}</Text>
              </View>
              {course.idealFor ? (
                <View style={styles.noteBlock}>
                  <Text style={styles.noteTitle}>Ideal For</Text>
                  <Text style={styles.noteBody}>{course.idealFor}</Text>
                </View>
              ) : null}
            </View>

            {course.content?.length ? (
              <View style={styles.card}>
                <Text style={styles.cardTitle}>Course Content</Text>
                <View style={styles.contentList}>
                  {course.content.map((item) => (
                    <View key={item} style={styles.contentItem}>
                      <View style={styles.contentDot} />
                      <Text style={styles.contentText}>{item}</Text>
                    </View>
                  ))}
                </View>
              </View>
            ) : null}

            <Pressable
              onPress={() =>
                canApply
                  ? router.push({ pathname: '/(main)/application', params: { courseId: course.id } })
                  : null
              }
              style={({ pressed }) => [styles.brassButton, !canApply && styles.brassButtonDisabled, canApply && pressed ? styles.pressed : null]}
            >
              <Text style={[styles.brassButtonText, !canApply && { opacity: 0.5 }]}>
                {canApply ? 'Apply Now' : 'Register First'}
              </Text>
            </Pressable>
          </>
        ) : null}
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
  loadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
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
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 12,
  },
  detailLabel: {
    flex: 0.4,
    fontSize: 13,
    fontFamily: Fonts.sans,
    color: C.textMuted,
  },
  detailValue: {
    flex: 0.6,
    fontSize: 14,
    lineHeight: 21,
    fontFamily: Fonts.sansSemiBold,
    color: C.textPrimary,
    textAlign: 'right',
    flexWrap: 'wrap',
  },
  noteBlock: {
    gap: 6,
    marginTop: 4,
    backgroundColor: C.surfaceAlt,
    borderRadius: 16,
    padding: 14,
  },
  noteTitle: {
    fontSize: 12,
    fontFamily: Fonts.sansSemiBold,
    color: C.secondary,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  noteBody: {
    fontSize: 14,
    lineHeight: 22,
    fontFamily: Fonts.sans,
    color: C.textSecondary,
  },
  contentList: {
    gap: 10,
  },
  contentItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  contentDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginTop: 7,
    backgroundColor: C.secondary,
  },
  contentText: {
    flex: 1,
    fontSize: 14,
    lineHeight: 22,
    fontFamily: Fonts.sans,
    color: C.textSecondary,
  },
  brassButton: {
    backgroundColor: '#8C6A1F',
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  brassButtonDisabled: {
    opacity: 0.5,
  },
  brassButtonText: {
    fontSize: 14,
    fontFamily: Fonts.sansBold,
    color: '#FFFFFF',
  },
  pressed: {
    opacity: 0.92,
  },
});

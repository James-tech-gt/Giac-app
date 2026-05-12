import { Fonts } from '@/constants/theme';
import { auth } from '@/services/firebase';
import {
  Material,
  getApprovedApplications,
  resolveCourseFromReference,
  subscribeMaterials,
} from '@/services/firestore';
import { FontAwesome6 } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Linking,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const C = {
  bg: '#F8FAFD',
  surface: '#FFFFFF',
  primary: '#1F2A44',
  secondary: '#2E4A8A',
  secondarySoft: '#E9EEF8',
  accent: '#C8A96B',
  accentSoft: '#FAF5E9',
  success: '#2D6A4F',
  successSoft: '#E8F2EE',
  textPrimary: '#1F2A44',
  textSecondary: '#5A6478',
  textMuted: '#7A7F8A',
  border: '#E3E9F2',
};

const TYPE_ICONS: Record<string, React.ComponentProps<typeof FontAwesome6>['name']> = {
  pdf: 'file-pdf',
  video: 'play-circle',
  doc: 'file-word',
  link: 'link',
};

const TYPE_COLORS: Record<string, string> = {
  pdf: '#8F3D3D',
  video: '#2D6A4F',
  doc: '#2E4A8A',
  link: '#A9822A',
};

interface EnrolledCourse {
  courseId: string;
  courseLabel: string;
}

function groupByModule(materials: Material[]): Record<string, Material[]> {
  return materials.reduce<Record<string, Material[]>>((acc, mat) => {
    const key = mat.moduleTitle || mat.moduleId || 'General';
    if (!acc[key]) acc[key] = [];
    acc[key].push(mat);
    return acc;
  }, {});
}

export default function MaterialsScreen() {
  const user = auth.currentUser;
  const params = useLocalSearchParams<{ courseId?: string }>();

  const [enrolledCourses, setEnrolledCourses] = useState<EnrolledCourse[]>([]);
  const [selectedCourseId, setSelectedCourseId] = useState<string>(params.courseId ?? '');
  const [materials, setMaterials] = useState<Material[]>([]);
  const [loadingCourses, setLoadingCourses] = useState(true);
  const [loadingMaterials, setLoadingMaterials] = useState(false);

  // Load enrolled courses from approved applications
  useEffect(() => {
    let active = true;
    async function load() {
      if (!user?.uid) { if (active) setLoadingCourses(false); return; }
      try {
        const approved = await getApprovedApplications(user.uid);
        const courses = approved.map((app) => ({
          courseId: app.courseId,
          courseLabel: resolveCourseFromReference(app.courseId)?.program ?? app.courseId.toUpperCase(),
        }));
        if (active) {
          setEnrolledCourses(courses);
          setSelectedCourseId((currentCourseId) => currentCourseId || courses[0]?.courseId || '');
        }
      } finally {
        if (active) setLoadingCourses(false);
      }
    }
    load();
    return () => { active = false; };
  }, [user?.uid]);

  // Real-time materials listener
  useEffect(() => {
    if (!selectedCourseId) return;
    setLoadingMaterials(true);
    const unsub = subscribeMaterials(selectedCourseId, (data) => {
      setMaterials(data);
      setLoadingMaterials(false);
    });
    return unsub;
  }, [selectedCourseId]);

  const grouped = useMemo(() => groupByModule(materials), [materials]);
  const moduleGroups = Object.entries(grouped);

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} hitSlop={8}>
            <FontAwesome6 name="arrow-left" size={16} color={C.primary} />
          </TouchableOpacity>
        </View>

        {/* Hero */}
        <View style={styles.hero}>
          <Text style={styles.eyebrow}>Student Portal</Text>
          <Text style={styles.title}>Learning Materials</Text>
          <Text style={styles.subtitle}>
            Access your course modules, resources, and downloadable content.
          </Text>
        </View>

        {/* Course Selector */}
        {enrolledCourses.length > 1 && (
          <View style={styles.courseSelector}>
            {enrolledCourses.map((ec) => (
              <Pressable
                key={ec.courseId}
                onPress={() => setSelectedCourseId(ec.courseId)}
                style={[
                  styles.courseTab,
                  selectedCourseId === ec.courseId && styles.courseTabActive,
                ]}
              >
                <Text
                  style={[
                    styles.courseTabText,
                    selectedCourseId === ec.courseId && styles.courseTabTextActive,
                  ]}
                  numberOfLines={1}
                >
                  {ec.courseLabel}
                </Text>
              </Pressable>
            ))}
          </View>
        )}

        {loadingCourses ? (
          <View style={styles.centerCard}>
            <ActivityIndicator color={C.secondary} />
          </View>
        ) : enrolledCourses.length === 0 ? (
          <View style={styles.centerCard}>
            <FontAwesome6 name="book" size={28} color={C.textMuted} style={{ marginBottom: 8 }} />
            <Text style={styles.emptyTitle}>No enrolled courses</Text>
            <Text style={styles.emptyText}>
              You must be approved as a student to access materials.
            </Text>
          </View>
        ) : loadingMaterials ? (
          <View style={styles.centerCard}>
            <ActivityIndicator color={C.secondary} />
            <Text style={styles.loadingText}>Loading materials…</Text>
          </View>
        ) : moduleGroups.length > 0 ? (
          <View style={styles.modulesContainer}>
            {moduleGroups.map(([moduleTitle, mats]) => (
              <View key={moduleTitle} style={styles.moduleSection}>
                <Text style={styles.moduleTitle}>{moduleTitle}</Text>
                {mats.map((mat) => {
                  const iconName = TYPE_ICONS[mat.type] ?? 'file';
                  const iconColor = TYPE_COLORS[mat.type] ?? C.secondary;
                  return (
                    <View key={mat.id} style={styles.materialCard}>
                      <View style={[styles.materialIcon, { backgroundColor: `${iconColor}15` }]}>
                        <FontAwesome6 name={iconName} size={16} color={iconColor} />
                      </View>
                      <View style={styles.materialInfo}>
                        <Text style={styles.materialTitle}>{mat.title}</Text>
                        <Text style={styles.materialType}>{mat.type.toUpperCase()}</Text>
                      </View>
                      {mat.fileUrl ? (
                        <TouchableOpacity
                          style={styles.openBtn}
                          onPress={() => Linking.openURL(mat.fileUrl)}
                        >
                          <FontAwesome6 name="arrow-up-right-from-square" size={12} color={C.secondary} />
                          <Text style={styles.openBtnText}>Open</Text>
                        </TouchableOpacity>
                      ) : (
                        <View style={styles.unavailableTag}>
                          <Text style={styles.unavailableText}>Soon</Text>
                        </View>
                      )}
                    </View>
                  );
                })}
              </View>
            ))}
          </View>
        ) : (
          <View style={styles.centerCard}>
            <FontAwesome6 name="folder-open" size={28} color={C.textMuted} style={{ marginBottom: 8 }} />
            <Text style={styles.emptyTitle}>No materials yet</Text>
            <Text style={styles.emptyText}>
              Materials will appear here once your instructor uploads them.
            </Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.bg },
  scroll: { flex: 1 },
  content: { padding: 20, gap: 20, paddingBottom: 40 },

  header: { flexDirection: 'row', alignItems: 'center' },
  backBtn: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: C.surface, borderWidth: 1, borderColor: C.border,
    alignItems: 'center', justifyContent: 'center',
  },

  hero: { gap: 6 },
  eyebrow: {
    fontSize: 12, fontFamily: Fonts.sansSemiBold, color: C.secondary,
    textTransform: 'uppercase', letterSpacing: 0.8,
  },
  title: { fontSize: 36, lineHeight: 42, fontFamily: Fonts.displayBold, color: C.textPrimary },
  subtitle: { fontSize: 15, lineHeight: 24, fontFamily: Fonts.sans, color: C.textSecondary },

  courseSelector: { flexDirection: 'row', gap: 8 },
  courseTab: {
    flex: 1, paddingVertical: 8, paddingHorizontal: 12, borderRadius: 10,
    backgroundColor: C.surface, borderWidth: 1, borderColor: C.border, alignItems: 'center',
  },
  courseTabActive: { backgroundColor: C.secondary, borderColor: C.secondary },
  courseTabText: { fontSize: 13, fontFamily: Fonts.sansSemiBold, color: C.textMuted },
  courseTabTextActive: { color: C.surface },

  centerCard: {
    backgroundColor: C.surface, borderRadius: 20, padding: 28,
    borderWidth: 1, borderColor: C.border, alignItems: 'center', gap: 8,
  },
  emptyTitle: { fontSize: 16, fontFamily: Fonts.sansBold, color: C.textPrimary, textAlign: 'center' },
  emptyText: { fontSize: 14, lineHeight: 22, fontFamily: Fonts.sans, color: C.textMuted, textAlign: 'center' },
  loadingText: { fontSize: 14, fontFamily: Fonts.sans, color: C.textMuted, marginTop: 8 },

  noticeCard: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 10,
    backgroundColor: C.secondarySoft, borderRadius: 14, padding: 14,
  },
  noticeText: { flex: 1, fontSize: 14, lineHeight: 20, fontFamily: Fonts.sans, color: C.secondary },

  modulesContainer: { gap: 16 },
  moduleSection: { gap: 8 },
  moduleTitle: { fontSize: 14, fontFamily: Fonts.sansSemiBold, color: C.textSecondary, marginLeft: 4 },

  materialCard: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: C.surface, borderRadius: 14, padding: 14,
    borderWidth: 1, borderColor: C.border,
  },
  materialIcon: {
    width: 40, height: 40, borderRadius: 10, alignItems: 'center', justifyContent: 'center',
  },
  moduleNumber: { fontSize: 13, fontFamily: Fonts.sansBold, color: C.secondary },
  materialInfo: { flex: 1, gap: 2 },
  materialTitle: { fontSize: 14, fontFamily: Fonts.sansSemiBold, color: C.textPrimary },
  materialType: { fontSize: 11, fontFamily: Fonts.sans, color: C.textMuted },

  openBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingHorizontal: 10, paddingVertical: 6,
    borderRadius: 8, borderWidth: 1, borderColor: C.secondary,
  },
  openBtnText: { fontSize: 12, fontFamily: Fonts.sansSemiBold, color: C.secondary },

  unavailableTag: {
    paddingHorizontal: 8, paddingVertical: 4,
    borderRadius: 6, backgroundColor: C.border,
  },
  unavailableText: { fontSize: 11, fontFamily: Fonts.sans, color: C.textMuted },
});

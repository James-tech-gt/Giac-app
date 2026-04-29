import { router } from 'expo-router';
import React from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

// ─── Palette ────────────────────────────────────────────────────────────────
const C = {
  bg: '#F0F3FA',
  surface: '#FFFFFF',
  surfaceAlt: '#F7F9FD',
  primary: '#1A5FD4',
  primaryMid: '#2970E8',
  primarySoft: '#E8F0FD',
  primaryDeep: '#0F3F96',
  accent: '#0DAFB8',
  accentSoft: '#E0F7F8',
  success: '#12A05C',
  successSoft: '#E4F7EE',
  warning: '#E07A18',
  warningSoft: '#FEF0E0',
  textPrimary: '#111827',
  textSecondary: '#4B5B78',
  textMuted: '#8594AF',
  border: '#DDE3EF',
  borderLight: '#EDF0F8',
  shadow: '#101E4014',
};

// ─── Quick Stat ─────────────────────────────────────────────────────────────
type StatProps = { label: string; value: string; color: string; bg: string };
function Stat({ label, value, color, bg }: StatProps) {
  return (
    <View style={[styles.stat, { backgroundColor: bg }]}>
      <Text style={[styles.statValue, { color }]}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

// ─── Section Header ──────────────────────────────────────────────────────────
function SectionHeader({ title, sub }: { title: string; sub?: string }) {
  return (
    <View style={styles.sectionHeader}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {sub && <Text style={styles.sectionSub}>{sub}</Text>}
    </View>
  );
}

// ─── Primary Action Card ─────────────────────────────────────────────────────
type ActionCardProps = {
  icon: string;
  title: string;
  description: string;
  label: string;
  badge?: string;
  accent: string;
  accentSoft: string;
  onPress: () => void;
};
function ActionCard({
  icon,
  title,
  description,
  label,
  badge,
  accent,
  accentSoft,
  onPress,
}: ActionCardProps) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.actionCard, pressed && styles.pressed]}
    >
      <View style={styles.actionCardTop}>
        <View style={[styles.iconCircle, { backgroundColor: accentSoft }]}>
          <Text style={[styles.iconText, { color: accent }]}>{icon}</Text>
        </View>
        {badge && (
          <View style={[styles.badge, { backgroundColor: accentSoft }]}>
            <Text style={[styles.badgeText, { color: accent }]}>{badge}</Text>
          </View>
        )}
      </View>
      <Text style={styles.actionCardTitle}>{title}</Text>
      <Text style={styles.actionCardDesc}>{description}</Text>
      <View style={styles.actionCardFooter}>
        <Text style={[styles.actionCardLabel, { color: accent }]}>{label}</Text>
        <Text style={[styles.chevron, { color: accent }]}>→</Text>
      </View>
    </Pressable>
  );
}

// ─── Compact Course Row ──────────────────────────────────────────────────────
type CourseRowProps = { title: string; level: string; tag: string; progress?: number };
function CourseRow({ title, level, tag, progress }: CourseRowProps) {
  return (
    <View style={styles.courseRow}>
      <View style={styles.courseThumb}>
        <Text style={styles.courseThumbText}>{tag}</Text>
      </View>
      <View style={styles.courseInfo}>
        <Text style={styles.courseTitle} numberOfLines={1}>{title}</Text>
        <Text style={styles.courseLevel}>{level}</Text>
        {progress !== undefined && (
          <View style={styles.progressBar}>
            <View style={[styles.progressFill, { width: `${progress}%` as any }]} />
          </View>
        )}
      </View>
      <Pressable style={styles.courseBtn}>
        <Text style={styles.courseBtnText}>View</Text>
      </Pressable>
    </View>
  );
}

// ─── Announcement Row ────────────────────────────────────────────────────────
type AnnouncementProps = { title: string; detail: string; time: string; urgent?: boolean };
function Announcement({ title, detail, time, urgent }: AnnouncementProps) {
  return (
    <View style={styles.announcement}>
      <View style={[styles.announceDot, urgent && styles.announceDotUrgent]} />
      <View style={styles.announceBody}>
        <View style={styles.announceTopRow}>
          <Text style={styles.announceTitle}>{title}</Text>
          <Text style={styles.announceTime}>{time}</Text>
        </View>
        <Text style={styles.announceDetail}>{detail}</Text>
      </View>
    </View>
  );
}

// ─── Main Screen ─────────────────────────────────────────────────────────────
export default function HomeScreen() {
  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Hero Header ── */}
        <View style={styles.hero}>
          <View style={styles.heroLeft}>
            <Text style={styles.heroEyebrow}>Good morning 👋</Text>
            <Text style={styles.heroName}>Kwame Asante</Text>
            <View style={styles.rolePill}>
              <View style={styles.roleDot} />
              <Text style={styles.roleText}>ADR Trainee · Cohort 4</Text>
            </View>
          </View>
          <Pressable style={styles.avatar}>
            <Text style={styles.avatarText}>KA</Text>
          </Pressable>
        </View>

        {/* ── Quick Stats ── */}
        <View style={styles.statsRow}>
          <Stat label="Courses" value="3" color={C.primary} bg={C.primarySoft} />
          <Stat label="Pending" value="1" color={C.warning} bg={C.warningSoft} />
          <Stat label="Completed" value="2" color={C.success} bg={C.successSoft} />
          <Stat label="Days Left" value="14" color={C.accent} bg={C.accentSoft} />
        </View>

        {/* ── Quick Actions ── */}
        <SectionHeader title="Quick Actions" />
        <View style={styles.actionGrid}>
          <ActionCard
            icon="🎓"
            title="Explore Courses"
            description="Browse GIAC training programs and continue your ADR journey."
            label="View all courses"
            badge="New"
            accent={C.primary}
            accentSoft={C.primarySoft}
            onPress={() => router.push('/(main)/courses')}
          />
          <ActionCard
            icon="📋"
            title="Apply for Training"
            description="Start or track your GIAC program application."
            label="Begin application"
            accent={C.accent}
            accentSoft={C.accentSoft}
            onPress={() => router.push('/(applicant)/apply')}
          />
          <ActionCard
            icon="⚖️"
            title="Request Mediation"
            description="Submit a professional ADR mediation service request."
            label="Request service"
            accent={C.success}
            accentSoft={C.successSoft}
            onPress={() => router.push('/(client)/request-mediation')}
          />
        </View>

        {/* ── My Courses ── */}
        <SectionHeader title="My Courses" sub="3 enrolled" />
        <View style={styles.card}>
          <CourseRow
            tag="ADR"
            title="Foundations of Alternative Dispute Resolution"
            level="Beginner · 12 modules"
            progress={65}
          />
          <View style={styles.divider} />
          <CourseRow
            tag="MED"
            title="Mediation Theory & Practice"
            level="Intermediate · 8 modules"
            progress={30}
          />
          <View style={styles.divider} />
          <CourseRow
            tag="ARB"
            title="Arbitration Procedures"
            level="Advanced · 10 modules"
          />
          <Pressable
            onPress={() => router.push('/(main)/courses')}
            style={styles.viewAllBtn}
          >
            <Text style={styles.viewAllText}>View all courses  →</Text>
          </Pressable>
        </View>

        {/* ── Application Status ── */}
        <SectionHeader title="Application Status" />
        <View style={styles.card}>
          <View style={styles.appStatusRow}>
            <View style={styles.appStatusLeft}>
              <Text style={styles.appStatusTitle}>Cohort 5 Application</Text>
              <Text style={styles.appStatusSub}>Submitted Apr 10, 2025</Text>
            </View>
            <View style={[styles.statusBadge, { backgroundColor: C.warningSoft }]}>
              <Text style={[styles.statusBadgeText, { color: C.warning }]}>Pending</Text>
            </View>
          </View>
          <View style={styles.appStepsRow}>
            {['Submitted', 'Review', 'Interview', 'Decision'].map((step, i) => (
              <React.Fragment key={step}>
                <View style={styles.appStep}>
                  <View style={[
                    styles.appStepDot,
                    i < 2 ? styles.appStepDotDone : i === 2 ? styles.appStepDotActive : styles.appStepDotPending
                  ]} />
                  <Text style={[
                    styles.appStepLabel,
                    i === 2 && { color: C.primary, fontWeight: '600' }
                  ]}>{step}</Text>
                </View>
                {i < 3 && <View style={[styles.appStepLine, i < 1 && styles.appStepLineDone]} />}
              </React.Fragment>
            ))}
          </View>
        </View>

        {/* ── Announcements ── */}
        <SectionHeader title="Announcements" />
        <View style={styles.card}>
          <Announcement
            title="Cohort 5 applications now open"
            detail="Apply before May 15 to secure your spot in the next ADR training cohort."
            time="2h ago"
            urgent
          />
          <View style={styles.divider} />
          <Announcement
            title="Orientation materials available"
            detail="Registered trainees can now access orientation documents and study resources."
            time="Yesterday"
          />
          <View style={styles.divider} />
          <Announcement
            title="Mediation session rescheduled"
            detail="The scheduled session for Apr 28 has been moved to May 2, 2025."
            time="2 days ago"
          />
        </View>

        <View style={{ height: 24 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.bg },
  scroll: { flex: 1 },
  content: { flexGrow: 1, paddingHorizontal: 20, paddingTop: 20, paddingBottom: 32 },

  // Hero
  hero: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  heroLeft: { gap: 4 },
  heroEyebrow: { fontSize: 14, color: C.textMuted, fontWeight: '500' },
  heroName: { fontSize: 26, fontWeight: '800', color: C.textPrimary, letterSpacing: -0.4 },
  rolePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: C.primarySoft,
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
  },
  roleDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: C.primary },
  roleText: { fontSize: 12, fontWeight: '600', color: C.primary },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: C.primaryDeep,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: { fontSize: 15, fontWeight: '700', color: '#FFFFFF' },

  // Stats
  statsRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 24,
  },
  stat: {
    flex: 1,
    borderRadius: 16,
    paddingVertical: 12,
    paddingHorizontal: 8,
    alignItems: 'center',
    gap: 3,
  },
  statValue: { fontSize: 22, fontWeight: '800', letterSpacing: -0.5 },
  statLabel: { fontSize: 11, fontWeight: '500', color: C.textMuted },

  // Section header
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    marginBottom: 12,
    marginTop: 4,
  },
  sectionTitle: { fontSize: 18, fontWeight: '700', color: C.textPrimary, letterSpacing: -0.2 },
  sectionSub: { fontSize: 13, color: C.textMuted, fontWeight: '500' },

  // Action cards
  actionGrid: { gap: 12, marginBottom: 24 },
  actionCard: {
    backgroundColor: C.surface,
    borderRadius: 20,
    padding: 18,
    borderWidth: 1,
    borderColor: C.border,
    shadowColor: C.shadow,
    shadowOpacity: 1,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 6 },
    elevation: 3,
    gap: 8,
  },
  pressed: { opacity: 0.9, transform: [{ scale: 0.99 }] },
  actionCardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  iconCircle: {
    width: 44,
    height: 44,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconText: { fontSize: 22 },
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
  },
  badgeText: { fontSize: 11, fontWeight: '700', letterSpacing: 0.2 },
  actionCardTitle: { fontSize: 17, fontWeight: '700', color: C.textPrimary, letterSpacing: -0.2 },
  actionCardDesc: { fontSize: 14, lineHeight: 21, color: C.textSecondary },
  actionCardFooter: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingTop: 4 },
  actionCardLabel: { fontSize: 13, fontWeight: '700' },
  chevron: { fontSize: 14, fontWeight: '700' },

  // Card base
  card: {
    backgroundColor: C.surface,
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: C.border,
    shadowColor: C.shadow,
    shadowOpacity: 1,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 6 },
    elevation: 3,
    marginBottom: 20,
  },
  divider: { height: 1, backgroundColor: C.borderLight, marginVertical: 12 },

  // Course rows
  courseRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  courseThumb: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: C.primarySoft,
    justifyContent: 'center',
    alignItems: 'center',
    flexShrink: 0,
  },
  courseThumbText: { fontSize: 11, fontWeight: '800', color: C.primary, letterSpacing: 0.3 },
  courseInfo: { flex: 1, gap: 3 },
  courseTitle: { fontSize: 14, fontWeight: '700', color: C.textPrimary },
  courseLevel: { fontSize: 12, color: C.textMuted },
  progressBar: {
    height: 4,
    backgroundColor: C.borderLight,
    borderRadius: 2,
    marginTop: 5,
    overflow: 'hidden',
  },
  progressFill: { height: 4, backgroundColor: C.primary, borderRadius: 2 },
  courseBtn: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 10,
    backgroundColor: C.primarySoft,
  },
  courseBtnText: { fontSize: 12, fontWeight: '700', color: C.primary },
  viewAllBtn: { marginTop: 14, alignItems: 'center', paddingVertical: 4 },
  viewAllText: { fontSize: 14, fontWeight: '600', color: C.primary },

  // Application status
  appStatusRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  appStatusLeft: { gap: 3 },
  appStatusTitle: { fontSize: 15, fontWeight: '700', color: C.textPrimary },
  appStatusSub: { fontSize: 12, color: C.textMuted },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  statusBadgeText: { fontSize: 12, fontWeight: '700' },
  appStepsRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  appStep: { alignItems: 'center', gap: 5 },
  appStepDot: { width: 14, height: 14, borderRadius: 7 },
  appStepDotDone: { backgroundColor: C.primary },
  appStepDotActive: { backgroundColor: C.warning, borderWidth: 3, borderColor: C.warningSoft },
  appStepDotPending: { backgroundColor: C.border },
  appStepLine: { flex: 1, height: 2, backgroundColor: C.border, marginBottom: 18 },
  appStepLineDone: { backgroundColor: C.primary },
  appStepLabel: { fontSize: 10, fontWeight: '500', color: C.textMuted },

  // Announcements
  announcement: { flexDirection: 'row', gap: 12, alignItems: 'flex-start' },
  announceDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: C.border,
    marginTop: 5,
    flexShrink: 0,
  },
  announceDotUrgent: { backgroundColor: C.primary },
  announceBody: { flex: 1, gap: 4 },
  announceTopRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  announceTitle: { fontSize: 14, fontWeight: '700', color: C.textPrimary, flex: 1 },
  announceTime: { fontSize: 11, color: C.textMuted, marginLeft: 8 },
  announceDetail: { fontSize: 13, lineHeight: 20, color: C.textSecondary },
});

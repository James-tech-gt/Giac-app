import { Fonts } from '@/constants/theme';
import { auth } from '@/services/firebase';
import {
  Assignment,
  AssignmentSubmissionInput,
  getApprovedApplications,
  getAssignments,
  submitAssignment,
} from '@/services/firestore';
import { FontAwesome6 } from '@expo/vector-icons';
import { router } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
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
  success: '#2D6A4F',
  successSoft: '#E8F2EE',
  warning: '#A9822A',
  warningSoft: '#F8F2E2',
  danger: '#8F3D3D',
  dangerSoft: '#F5E8E8',
  textPrimary: '#1F2A44',
  textSecondary: '#5A6478',
  textMuted: '#7A7F8A',
  border: '#E3E9F2',
};

type Tab = 'pending' | 'submitted' | 'graded';

function formatDeadline(timestamp: unknown): { label: string; overdue: boolean } {
  if (!timestamp) return { label: 'No deadline set', overdue: false };
  const date =
    typeof timestamp === 'object' &&
    timestamp !== null &&
    'toDate' in timestamp &&
    typeof (timestamp as any).toDate === 'function'
      ? (timestamp as any).toDate()
      : new Date(timestamp as any);
  if (isNaN(date.getTime())) return { label: 'Unknown', overdue: false };
  const now = new Date();
  const overdue = date < now;
  return {
    label: date.toLocaleDateString('en-GB', {
      day: 'numeric', month: 'short', year: 'numeric',
    }),
    overdue,
  };
}

function StatusPill({ status }: { status: Assignment['status'] }) {
  const map = {
    pending: { label: 'Pending', bg: C.warningSoft, color: C.warning },
    submitted: { label: 'Submitted', bg: C.secondarySoft, color: C.secondary },
    graded: { label: 'Graded', bg: C.successSoft, color: C.success },
  };
  const t = map[status];
  return (
    <View style={[styles.pill, { backgroundColor: t.bg }]}>
      <Text style={[styles.pillText, { color: t.color }]}>{t.label}</Text>
    </View>
  );
}

function ActionButton({
  kind,
  label,
  onPress,
}: {
  kind: 'primary' | 'secondary';
  label: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.actionButton,
        kind === 'primary' ? styles.actionButtonPrimary : styles.actionButtonSecondary,
        pressed ? styles.pressed : null,
      ]}
    >
      <Text
        style={[
          styles.actionButtonText,
          kind === 'primary' ? styles.actionButtonTextPrimary : styles.actionButtonTextSecondary,
        ]}
      >
        {label}
      </Text>
    </Pressable>
  );
}

export default function AssignmentsScreen() {
  const user = auth.currentUser;
  const [activeTab, setActiveTab] = useState<Tab>('pending');
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [submissionText, setSubmissionText] = useState('');

  useEffect(() => {
    let active = true;
    async function load() {
      if (!user?.uid) { if (active) setLoading(false); return; }
      try {
        const approved = await getApprovedApplications(user.uid);
        if (approved.length === 0) { if (active) setLoading(false); return; }

        const allAssignments = await Promise.all(
          approved.map((application) => getAssignments(user.uid, application.courseId))
        );
        const mergedAssignments = allAssignments
          .flat()
          .filter((assignment, index, array) => array.findIndex((item) => item.id === assignment.id) === index)
          .sort((left, right) => {
            const leftTime =
              typeof left.deadline === 'object' &&
              left.deadline !== null &&
              'toDate' in left.deadline &&
              typeof (left.deadline as { toDate: () => Date }).toDate === 'function'
                ? (left.deadline as { toDate: () => Date }).toDate().getTime()
                : 0;
            const rightTime =
              typeof right.deadline === 'object' &&
              right.deadline !== null &&
              'toDate' in right.deadline &&
              typeof (right.deadline as { toDate: () => Date }).toDate === 'function'
                ? (right.deadline as { toDate: () => Date }).toDate().getTime()
                : 0;
            return leftTime - rightTime;
          });
        if (active) setAssignments(mergedAssignments);
      } finally {
        if (active) setLoading(false);
      }
    }
    load();
    return () => { active = false; };
  }, [user?.uid]);

  const filtered = assignments.filter((a) => a.status === activeTab);
  const pendingCount = assignments.filter((a) => a.status === 'pending').length;
  const submittedCount = assignments.filter((a) => a.status === 'submitted').length;
  const gradedCount = assignments.filter((a) => a.status === 'graded').length;

  async function handleSubmit(assignment: Assignment) {
    if (!submissionText.trim()) {
      Alert.alert('Empty submission', 'Please enter your response before submitting.');
      return;
    }
    if (!user?.uid) return;
    setSubmitting(assignment.id);
    try {
      const input: AssignmentSubmissionInput = {
        assignmentId: assignment.id,
        userId: user.uid,
        courseId: assignment.courseId,
        submissionText,
      };
      await submitAssignment(input);
      setAssignments((prev) =>
        prev.map((a) =>
          a.id === assignment.id ? { ...a, status: 'submitted', submissionText } : a
        )
      );
      setExpandedId(null);
      setSubmissionText('');
      Alert.alert('Submitted!', 'Your assignment has been submitted successfully. Your instructor or admin can now review it.');
    } catch {
      Alert.alert('Error', 'Could not submit. Please try again.');
    } finally {
      setSubmitting(null);
    }
  }

  const TABS: { key: Tab; label: string }[] = [
    { key: 'pending', label: 'Pending' },
    { key: 'submitted', label: 'Submitted' },
    { key: 'graded', label: 'Graded' },
  ];

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
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
          <Text style={styles.title}>Assignments</Text>
          <Text style={styles.subtitle}>
            View, complete, and track your course assignments.
          </Text>
          <View style={styles.heroMetaRow}>
            <View style={[styles.heroChip, { backgroundColor: C.warningSoft }]}>
              <Text style={[styles.heroChipText, { color: C.warning }]}>Pending {pendingCount}</Text>
            </View>
            <View style={[styles.heroChip, { backgroundColor: C.secondarySoft }]}>
              <Text style={[styles.heroChipText, { color: C.secondary }]}>Submitted {submittedCount}</Text>
            </View>
            <View style={[styles.heroChip, { backgroundColor: C.successSoft }]}>
              <Text style={[styles.heroChipText, { color: C.success }]}>Graded {gradedCount}</Text>
            </View>
          </View>
          <View style={styles.heroActionRow}>
            <ActionButton kind="primary" label="Back to Dashboard" onPress={() => router.push('/(student)/dashboard')} />
            <ActionButton kind="secondary" label="Open Materials" onPress={() => router.push('/(student)/materials')} />
          </View>
        </View>

        {/* Tabs */}
        <View style={styles.tabs}>
          {TABS.map((tab) => {
            const count = assignments.filter((a) => a.status === tab.key).length;
            return (
              <Pressable
                key={tab.key}
                onPress={() => setActiveTab(tab.key)}
                style={[styles.tab, activeTab === tab.key && styles.tabActive]}
              >
                <Text style={[styles.tabText, activeTab === tab.key && styles.tabTextActive]}>
                  {tab.label}
                </Text>
                {count > 0 && (
                  <View style={[styles.tabBadge, activeTab === tab.key && styles.tabBadgeActive]}>
                    <Text style={[styles.tabBadgeText, activeTab === tab.key && styles.tabBadgeTextActive]}>
                      {count}
                    </Text>
                  </View>
                )}
              </Pressable>
            );
          })}
        </View>

        {/* Content */}
        {loading ? (
          <View style={styles.centerCard}>
            <ActivityIndicator color={C.secondary} />
          </View>
        ) : filtered.length === 0 ? (
          <View style={styles.centerCard}>
            <FontAwesome6
              name={activeTab === 'graded' ? 'star' : 'clipboard-check'}
              size={28}
              color={C.textMuted}
              style={{ marginBottom: 8 }}
            />
            <Text style={styles.emptyTitle}>
              {activeTab === 'pending'
                ? 'No pending assignments'
                : activeTab === 'submitted'
                ? 'No submitted assignments'
                : 'No graded assignments yet'}
            </Text>
            <Text style={styles.emptyText}>
              {activeTab === 'pending'
                ? 'All caught up! Check back when your instructor posts new tasks.'
                : activeTab === 'submitted'
                ? 'Submit a pending assignment to see it here.'
                : 'Grades will appear here once your instructor reviews your work.'}
            </Text>
          </View>
        ) : (
          <View style={styles.list}>
            {filtered.map((assignment) => {
              const dl = formatDeadline(assignment.deadline);
              const isExpanded = expandedId === assignment.id;
              return (
                <View key={assignment.id} style={styles.card}>
                  <View style={styles.cardTop}>
                    <View style={styles.cardTopLeft}>
                      <Text style={styles.cardTitle}>{assignment.title}</Text>
                      <Text style={styles.courseMeta}>{assignment.courseId.toUpperCase()}</Text>
                      <Text
                        style={[styles.deadline, dl.overdue && styles.deadlineOverdue]}
                      >
                        <FontAwesome6
                          name="clock"
                          size={11}
                          color={dl.overdue ? C.danger : C.textMuted}
                        />{' '}
                        Due: {dl.label}
                        {dl.overdue ? ' · Overdue' : ''}
                      </Text>
                    </View>
                    <StatusPill status={assignment.status} />
                  </View>

                  <Text style={styles.description} numberOfLines={isExpanded ? undefined : 2}>
                    {assignment.description}
                  </Text>

                  {assignment.status === 'graded' && (
                    <View style={styles.gradeRow}>
                      <View style={[styles.gradeBox, { backgroundColor: C.successSoft }]}>
                        <Text style={styles.gradeLabel}>Score</Text>
                        <Text style={styles.gradeValue}>
                          {assignment.grade ?? '—'}/{assignment.maxGrade}
                        </Text>
                      </View>
                      {assignment.feedback ? (
                        <View style={[styles.feedbackBox, { backgroundColor: C.secondarySoft }]}>
                          <Text style={styles.feedbackLabel}>Feedback</Text>
                          <Text style={styles.feedbackText}>{assignment.feedback}</Text>
                        </View>
                      ) : null}
                    </View>
                  )}

                  {assignment.status === 'submitted' && assignment.submissionText && (
                    <View style={styles.submittedBox}>
                      <Text style={styles.submittedLabel}>Your submission</Text>
                      <Text style={styles.submittedText} numberOfLines={3}>
                        {assignment.submissionText}
                      </Text>
                    </View>
                  )}

                  {assignment.status === 'pending' && (
                    <>
                      <TouchableOpacity
                        onPress={() => {
                          setExpandedId(isExpanded ? null : assignment.id);
                          setSubmissionText('');
                        }}
                        style={[styles.submitToggle, isExpanded ? styles.submitToggleActive : null]}
                      >
                        <FontAwesome6
                          name={isExpanded ? 'chevron-up' : 'pen-to-square'}
                          size={12}
                          color={C.secondary}
                        />
                        <Text style={styles.submitToggleText}>
                          {isExpanded ? 'Cancel' : 'Write submission'}
                        </Text>
                      </TouchableOpacity>

                      {isExpanded && (
                        <View style={styles.submitForm}>
                          <TextInput
                            style={styles.textArea}
                            placeholder="Type your submission here…"
                            placeholderTextColor={C.textMuted}
                            multiline
                            numberOfLines={5}
                            value={submissionText}
                            onChangeText={setSubmissionText}
                            textAlignVertical="top"
                          />
                          <TouchableOpacity
                            style={styles.submitBtn}
                            onPress={() => handleSubmit(assignment)}
                            disabled={submitting === assignment.id}
                          >
                            {submitting === assignment.id ? (
                              <ActivityIndicator color={C.surface} size="small" />
                            ) : (
                              <Text style={styles.submitBtnText}>Submit Assignment</Text>
                            )}
                          </TouchableOpacity>
                        </View>
                      )}
                    </>
                  )}
                </View>
              );
            })}
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
  heroMetaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginTop: 6,
  },
  heroChip: {
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  heroChipText: {
    fontSize: 13,
    fontFamily: Fonts.sansBold,
  },
  heroActionRow: {
    gap: 10,
    marginTop: 4,
  },
  actionButton: {
    minHeight: 50,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 18,
    paddingVertical: 14,
  },
  actionButtonPrimary: {
    backgroundColor: C.primary,
  },
  actionButtonSecondary: {
    backgroundColor: C.surface,
    borderWidth: 1,
    borderColor: C.border,
  },
  actionButtonText: {
    fontSize: 14,
    fontFamily: Fonts.sansBold,
  },
  actionButtonTextPrimary: {
    color: C.surface,
  },
  actionButtonTextSecondary: {
    color: C.secondary,
  },

  tabs: { flexDirection: 'row', gap: 8 },
  tab: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 14, paddingVertical: 8, borderRadius: 10,
    backgroundColor: C.surface, borderWidth: 1, borderColor: C.border,
  },
  tabActive: { backgroundColor: C.secondary, borderColor: C.secondary },
  tabText: { fontSize: 13, fontFamily: Fonts.sansSemiBold, color: C.textMuted },
  tabTextActive: { color: C.surface },
  tabBadge: {
    minWidth: 18, height: 18, borderRadius: 9,
    backgroundColor: C.border, alignItems: 'center', justifyContent: 'center',
    paddingHorizontal: 4,
  },
  tabBadgeActive: { backgroundColor: 'rgba(255,255,255,0.25)' },
  tabBadgeText: { fontSize: 10, fontFamily: Fonts.sansBold, color: C.textSecondary },
  tabBadgeTextActive: { color: C.surface },

  centerCard: {
    backgroundColor: C.surface, borderRadius: 20, padding: 28,
    borderWidth: 1, borderColor: C.border, alignItems: 'center', gap: 8,
  },
  emptyTitle: { fontSize: 16, fontFamily: Fonts.sansBold, color: C.textPrimary, textAlign: 'center' },
  emptyText: { fontSize: 14, lineHeight: 22, fontFamily: Fonts.sans, color: C.textMuted, textAlign: 'center' },

  list: { gap: 14 },
  card: {
    backgroundColor: C.surface, borderRadius: 20, padding: 18,
    borderWidth: 1, borderColor: C.border, gap: 12,
  },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10 },
  cardTopLeft: { flex: 1, gap: 4 },
  cardTitle: { fontSize: 16, fontFamily: Fonts.sansBold, color: C.textPrimary },
  courseMeta: { fontSize: 11, fontFamily: Fonts.sansSemiBold, color: C.secondary, letterSpacing: 0.4 },
  deadline: { fontSize: 13, fontFamily: Fonts.sans, color: C.textMuted },
  deadlineOverdue: { color: C.danger },
  description: { fontSize: 14, lineHeight: 22, fontFamily: Fonts.sans, color: C.textSecondary },

  pill: { borderRadius: 999, paddingHorizontal: 10, paddingVertical: 4 },
  pillText: { fontSize: 11, fontFamily: Fonts.sansSemiBold },

  gradeRow: { gap: 10 },
  gradeBox: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    borderRadius: 12, padding: 12,
  },
  gradeLabel: { fontSize: 13, fontFamily: Fonts.sansSemiBold, color: C.success },
  gradeValue: { fontSize: 18, fontFamily: Fonts.sansBold, color: C.success },
  feedbackBox: { borderRadius: 12, padding: 12, gap: 4 },
  feedbackLabel: { fontSize: 12, fontFamily: Fonts.sansSemiBold, color: C.secondary },
  feedbackText: { fontSize: 14, lineHeight: 20, fontFamily: Fonts.sans, color: C.textSecondary },

  submittedBox: {
    backgroundColor: C.secondarySoft, borderRadius: 12, padding: 12, gap: 4,
  },
  submittedLabel: { fontSize: 12, fontFamily: Fonts.sansSemiBold, color: C.secondary },
  submittedText: { fontSize: 14, lineHeight: 20, fontFamily: Fonts.sans, color: C.textSecondary },

  submitToggle: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    alignSelf: 'flex-start', paddingHorizontal: 14, paddingVertical: 10,
    borderRadius: 999, backgroundColor: C.surface, borderWidth: 1, borderColor: C.border,
  },
  submitToggleActive: {
    backgroundColor: C.secondarySoft,
    borderColor: C.secondary,
  },
  submitToggleText: { fontSize: 14, fontFamily: Fonts.sansSemiBold, color: C.secondary },

  submitForm: { gap: 10 },
  textArea: {
    backgroundColor: C.bg, borderWidth: 1, borderColor: C.border,
    borderRadius: 12, padding: 12, minHeight: 120,
    fontSize: 14, fontFamily: Fonts.sans, color: C.textPrimary,
  },
  submitBtn: {
    backgroundColor: C.primary, borderRadius: 16,
    paddingVertical: 14, alignItems: 'center',
  },
  submitBtnText: { fontSize: 15, fontFamily: Fonts.sansSemiBold, color: C.surface },
  pressed: {
    opacity: 0.92,
  },
});

import { Fonts } from '@/constants/theme';
import { auth } from '@/services/firebase';
import {
  Test,
  TestGrade,
  TestSubmissionInput,
  getApprovedApplications,
  submitTest,
  subscribeStudentTestGrades,
  subscribeTests,
} from '@/services/firestore';
import { FontAwesome6 } from '@expo/vector-icons';
import { router } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Linking,
  Platform,
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

type Tab = 'upcoming' | 'submitted' | 'results';

function formatDate(timestamp: unknown): string {
  if (!timestamp) return 'TBD';
  const date =
    typeof timestamp === 'object' &&
    timestamp !== null &&
    'toDate' in timestamp &&
    typeof (timestamp as any).toDate === 'function'
      ? (timestamp as any).toDate()
      : new Date(timestamp as any);
  if (isNaN(date.getTime())) return 'TBD';
  return date.toLocaleDateString('en-GB', {
    weekday: 'short', day: 'numeric', month: 'short', year: 'numeric',
  });
}

function getTestStatus(test: Test) {
  if (test.status === 'upcoming') return { label: 'Upcoming', bg: C.secondarySoft, color: C.secondary };
  if (test.status === 'submitted') return { label: 'Submitted', bg: C.warningSoft, color: C.warning };
  if (test.status === 'missed') return { label: 'Missed', bg: C.dangerSoft, color: C.danger };
  const passed = test.score != null && test.score >= test.passMark;
  return {
    label: passed ? 'Passed' : 'Failed',
    bg: passed ? C.successSoft : C.dangerSoft,
    color: passed ? C.success : C.danger,
  };
}

function ScoreBar({ score, total, pass }: { score: number; total: number; pass: number }) {
  const pct = Math.min((score / total) * 100, 100);
  const passed = score >= pass;
  return (
    <View style={styles.scoreBarContainer}>
      <View style={styles.scoreBarTrack}>
        <View
          style={[
            styles.scoreBarFill,
            { width: `${pct}%`, backgroundColor: passed ? C.success : C.danger },
          ]}
        />
        <View style={[styles.passLine, { left: `${(pass / total) * 100}%` }]} />
      </View>
      <View style={styles.scoreBarLabels}>
        <Text style={styles.scoreBarText}>
          <Text style={{ color: passed ? C.success : C.danger, fontFamily: Fonts.sansBold }}>
            {score}/{total}
          </Text>
          {' '}marks
        </Text>
        <Text style={[styles.passFailTag, { color: passed ? C.success : C.danger }]}>
          {passed ? 'Passed' : 'Failed'} (pass mark: {pass})
        </Text>
      </View>
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

export default function TestsScreen() {
  const user = auth.currentUser;
  const [activeTab, setActiveTab] = useState<Tab>('upcoming');
  const [tests, setTests] = useState<Test[]>([]);
  const [testGrades, setTestGrades] = useState<TestGrade[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [submissionText, setSubmissionText] = useState('');
  const [attachmentDraft, setAttachmentDraft] = useState('');
  const [submittingId, setSubmittingId] = useState<string | null>(null);
  const [studentName, setStudentName] = useState('');
  const [studentEmail, setStudentEmail] = useState('');

  useEffect(() => {
    if (!user?.uid) { setLoading(false); return; }
    let active = true;
    const unsubscribers: (() => void)[] = [];

    getApprovedApplications(user.uid).then((approved) => {
      if (!active) return;
      if (approved.length === 0) { setLoading(false); return; }
      const primary = approved[0];
      setStudentName(primary.fullName?.trim() || user.displayName || '');
      setStudentEmail(primary.email?.trim() || user.email || '');

      const perCourse: Record<string, Test[]> = {};

      approved.forEach((app) => {
        perCourse[app.courseId] = [];
        const unsub = subscribeTests(user.uid!, app.courseId, (data) => {
          perCourse[app.courseId] = data;
          const merged = Object.values(perCourse)
            .flat()
            .filter((t, i, arr) => arr.findIndex((x) => x.id === t.id) === i);
          if (active) { setTests(merged); setLoading(false); }
        });
        unsubscribers.push(unsub);
      });
    }).catch(() => { if (active) setLoading(false); });

    return () => { active = false; unsubscribers.forEach((u) => u()); };
  }, [user?.uid, user?.displayName, user?.email]);

  useEffect(() => {
    if (!user?.uid) return;
    return subscribeStudentTestGrades(user.uid, setTestGrades);
  }, [user?.uid]);

  function getGradeForTest(testId: string): TestGrade | undefined {
    return testGrades.find((g) => g.testId === testId);
  }

  async function handleSubmit(test: Test) {
    const draft = submissionText.trim();
    const attachmentLink = attachmentDraft.trim();
    if (!draft && !attachmentLink) {
      Alert.alert('Nothing to submit', 'Enter a response, paste a share link, or do both before submitting.');
      return;
    }
    if (!user?.uid) return;
    setSubmittingId(test.id);
    try {
      const input: TestSubmissionInput = {
        testId: test.id,
        userId: user.uid,
        courseId: test.courseId,
        submissionText: draft,
        attachmentLink,
        studentName: studentName || user.displayName || '',
        studentEmail: studentEmail || user.email || '',
      };
      await submitTest(input);
      setTests((prev) =>
        prev.map((item) =>
          item.id === test.id
            ? {
                ...item,
                status: 'submitted',
                submissionText: draft,
                attachmentLink,
              }
            : item
        )
      );
      setExpandedId(null);
      setSubmissionText('');
      setAttachmentDraft('');
      Alert.alert('Submitted!', 'Your test response has been submitted successfully. Admin can now review it.');
    } catch {
      Alert.alert('Error', 'Could not submit your test response. Please try again.');
    } finally {
      setSubmittingId(null);
    }
  }

  const upcoming = tests.filter((t) => t.status === 'upcoming');
  const submitted = tests.filter((t) => t.status === 'submitted');
  const results = [
    ...tests.filter((t) => t.status === 'graded' || t.status === 'completed' || t.status === 'missed'),
    ...tests.filter((t) => t.status === 'submitted' && !!getGradeForTest(t.id)),
  ].filter((t, i, arr) => arr.findIndex((x) => x.id === t.id) === i);

  const TABS: { key: Tab; label: string; count: number }[] = [
    { key: 'upcoming', label: 'Upcoming', count: upcoming.length },
    { key: 'submitted', label: 'Submitted', count: submitted.length },
    { key: 'results', label: 'Results', count: results.length },
  ];

  const displayed =
    activeTab === 'upcoming' ? upcoming : activeTab === 'submitted' ? submitted : results;

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
      <KeyboardAvoidingView
        style={styles.safe}
        behavior={Platform.OS === 'ios' ? 'padding' : Platform.OS === 'android' ? 'height' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 20 : 0}
      >
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
          <Text style={styles.title}>Tests & Exams</Text>
          <Text style={styles.subtitle}>
            View upcoming examinations and review your past results.
          </Text>
          <View style={styles.heroActionRow}>
            <ActionButton kind="primary" label="Back to Dashboard" onPress={() => router.push('/(student)/dashboard')} />
            <ActionButton kind="secondary" label="Open Materials" onPress={() => router.push('/(student)/materials')} />
          </View>
        </View>

        {/* Summary row */}
        {!loading && tests.length > 0 && (
          <View style={styles.summaryRow}>
            <View style={[styles.summaryCard, { backgroundColor: C.secondarySoft }]}>
              <Text style={styles.summaryNum}>{upcoming.length}</Text>
              <Text style={styles.summaryLabel}>Upcoming</Text>
            </View>
            <View style={[styles.summaryCard, { backgroundColor: C.warningSoft }]}>
              <Text style={[styles.summaryNum, { color: C.warning }]}>
                {submitted.length}
              </Text>
              <Text style={[styles.summaryLabel, { color: C.warning }]}>Submitted</Text>
            </View>
            <View style={[styles.summaryCard, { backgroundColor: C.successSoft }]}>
              <Text style={[styles.summaryNum, { color: C.success }]}>
                {results.filter((t) => {
                  const grade = getGradeForTest(t.id);
                  const score = grade?.score ?? t.score;
                  return score != null && score >= t.passMark;
                }).length}
              </Text>
              <Text style={[styles.summaryLabel, { color: C.success }]}>Passed</Text>
            </View>
          </View>
        )}

        {/* Tabs */}
        <View style={styles.tabs}>
          {TABS.map((tab) => (
            <Pressable
              key={tab.key}
              onPress={() => setActiveTab(tab.key)}
              style={[styles.tab, activeTab === tab.key && styles.tabActive]}
            >
              <Text style={[styles.tabText, activeTab === tab.key && styles.tabTextActive]}>
                {tab.label}
              </Text>
              {tab.count > 0 && (
                <View style={[styles.tabBadge, activeTab === tab.key && styles.tabBadgeActive]}>
                  <Text style={[styles.tabBadgeText, activeTab === tab.key && styles.tabBadgeTextActive]}>
                    {tab.count}
                  </Text>
                </View>
              )}
            </Pressable>
          ))}
        </View>

        {/* Content */}
        {loading ? (
          <View style={styles.centerCard}>
            <ActivityIndicator color={C.secondary} />
          </View>
        ) : displayed.length === 0 ? (
          <View style={styles.centerCard}>
            <FontAwesome6
              name={activeTab === 'upcoming' ? 'calendar' : 'chart-bar'}
              size={28}
              color={C.textMuted}
              style={{ marginBottom: 8 }}
            />
            <Text style={styles.emptyTitle}>
              {activeTab === 'upcoming'
                ? 'No upcoming tests'
                : activeTab === 'submitted'
                ? 'No submitted tests yet'
                : 'No test results yet'}
            </Text>
            <Text style={styles.emptyText}>
              {activeTab === 'upcoming'
                ? 'Your instructor has not scheduled any tests yet. Check back soon.'
                : activeTab === 'submitted'
                ? 'Submit an upcoming test and it will appear here while it waits for grading.'
                : 'Completed test results will appear here after admin reviews your submission.'}
            </Text>
          </View>
        ) : (
          <View style={styles.list}>
            {displayed.map((test) => {
              const grade = getGradeForTest(test.id);
              const effectiveScore = grade?.score ?? test.score;
              const effectiveTotal = grade?.totalMarks ?? test.totalMarks;
              const effectivePass = grade?.passMark ?? test.passMark;
              const isGraded = effectiveScore != null;
              const displayStatus = isGraded ? 'graded' : test.status;
              const ts = getTestStatus({ ...test, status: displayStatus, score: effectiveScore });
              const isExpanded = expandedId === test.id;
              return (
              <View key={test.id} style={styles.card}>
                <View style={styles.cardTop}>
                  <View style={styles.cardTopLeft}>
                    <Text style={styles.cardTitle}>{test.title}</Text>
                    <Text style={styles.cardDate}>
                      <FontAwesome6 name="calendar" size={11} color={C.textMuted} />{' '}
                      {formatDate(test.scheduledDate)}
                    </Text>
                  </View>
                  <View style={[styles.statusPill, { backgroundColor: ts.bg }]}>
                    <View style={[styles.statusDot, { backgroundColor: ts.color }]} />
                    <Text style={[styles.statusPillText, { color: ts.color }]}>{ts.label}</Text>
                  </View>
                </View>

                {test.description ? (
                  <Text style={styles.description}>{test.description}</Text>
                ) : null}

                <View style={styles.metaRow}>
                  <View style={styles.metaItem}>
                    <FontAwesome6 name="clock" size={12} color={C.textMuted} />
                    <Text style={styles.metaText}>{test.durationMinutes} min</Text>
                  </View>
                  <View style={styles.metaItem}>
                    <FontAwesome6 name="star" size={12} color={C.textMuted} />
                    <Text style={styles.metaText}>{effectiveTotal} marks</Text>
                  </View>
                  <View style={styles.metaItem}>
                    <FontAwesome6 name="check-circle" size={12} color={C.textMuted} />
                    <Text style={styles.metaText}>Pass: {effectivePass}</Text>
                  </View>
                </View>

                {isGraded && (
                  <ScoreBar score={effectiveScore!} total={effectiveTotal} pass={effectivePass} />
                )}

                {test.status === 'submitted' && test.submissionText ? (
                  <View style={styles.submittedCard}>
                    <Text style={styles.submittedLabel}>Your submission</Text>
                    <Text style={styles.submittedText}>{test.submissionText}</Text>
                  </View>
                ) : null}

                {test.status !== 'upcoming' && test.attachmentLink ? (
                  <Pressable onPress={() => Linking.openURL(test.attachmentLink!)} style={styles.linkCard}>
                    <Text style={styles.submittedLabel}>Attached file link</Text>
                    <Text style={styles.submittedText}>{test.attachmentLink}</Text>
                  </Pressable>
                ) : null}

                {grade?.feedback ? (
                  <View style={styles.feedbackCard}>
                    <Text style={styles.feedbackLabel}>Instructor Feedback</Text>
                    <Text style={styles.feedbackText}>{grade.feedback}</Text>
                  </View>
                ) : null}

                {test.status === 'upcoming' ? (
                  <>
                    <TouchableOpacity
                      onPress={() => {
                        setExpandedId(isExpanded ? null : test.id);
                        setSubmissionText('');
                        setAttachmentDraft('');
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

                    {isExpanded ? (
                      <View style={styles.submitForm}>
                        <TextInput
                          style={styles.textArea}
                          placeholder="Type your test answer or response here..."
                          placeholderTextColor={C.textMuted}
                          multiline
                          numberOfLines={5}
                          value={submissionText}
                          onChangeText={setSubmissionText}
                          textAlignVertical="top"
                        />
                        <TextInput
                          style={styles.linkInput}
                          placeholder="PDF/DOC share link"
                          placeholderTextColor={C.textMuted}
                          value={attachmentDraft}
                          onChangeText={setAttachmentDraft}
                          autoCapitalize="none"
                          keyboardType="url"
                        />
                        <TouchableOpacity
                          style={styles.submitBtn}
                          onPress={() => handleSubmit(test)}
                          disabled={submittingId === test.id}
                        >
                          {submittingId === test.id ? (
                            <ActivityIndicator color={C.surface} size="small" />
                          ) : (
                            <Text style={styles.submitBtnText}>Submit Test</Text>
                          )}
                        </TouchableOpacity>
                      </View>
                    ) : null}
                  </>
                ) : null}
              </View>
              );
            })}
          </View>
        )}
        </ScrollView>
      </KeyboardAvoidingView>
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
  heroActionRow: {
    gap: 10,
    marginTop: 6,
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

  summaryRow: { flexDirection: 'row', gap: 10, flexWrap: 'wrap' },
  summaryCard: {
    flex: 1, minWidth: 100, borderRadius: 14, padding: 14, alignItems: 'center', gap: 4,
  },
  summaryNum: {
    fontSize: 24, fontFamily: Fonts.displayBold, color: C.secondary,
  },
  summaryLabel: { fontSize: 12, fontFamily: Fonts.sansSemiBold, color: C.secondary },

  tabs: { flexDirection: 'row', gap: 8 },
  tab: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 16, paddingVertical: 9, borderRadius: 10,
    backgroundColor: C.surface, borderWidth: 1, borderColor: C.border,
  },
  tabActive: { backgroundColor: C.secondary, borderColor: C.secondary },
  tabText: { fontSize: 13, fontFamily: Fonts.sansSemiBold, color: C.textMuted },
  tabTextActive: { color: C.surface },
  tabBadge: {
    minWidth: 18, height: 18, borderRadius: 9,
    backgroundColor: C.border, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 4,
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
  cardTop: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10,
  },
  cardTopLeft: { flex: 1, gap: 4 },
  cardTitle: { fontSize: 16, fontFamily: Fonts.sansBold, color: C.textPrimary },
  cardDate: { fontSize: 13, fontFamily: Fonts.sans, color: C.textMuted },
  description: { fontSize: 14, lineHeight: 22, fontFamily: Fonts.sans, color: C.textSecondary },

  statusPill: { flexDirection: 'row', alignItems: 'center', gap: 6, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 4 },
  statusDot: { width: 6, height: 6, borderRadius: 3 },
  statusPillText: { fontSize: 11, fontFamily: Fonts.sansSemiBold },

  metaRow: { flexDirection: 'row', gap: 16 },
  metaItem: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  metaText: { fontSize: 13, fontFamily: Fonts.sans, color: C.textMuted },

  scoreBarContainer: { gap: 8 },
  scoreBarTrack: {
    height: 8, backgroundColor: C.border, borderRadius: 999, position: 'relative',
  },
  scoreBarFill: { height: '100%', borderRadius: 999 },
  passLine: {
    position: 'absolute', top: 0, bottom: 0, width: 2, backgroundColor: '#1F2A44',
  },
  scoreBarLabels: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
  },
  scoreBarText: { fontSize: 14, fontFamily: Fonts.sans, color: C.textSecondary },
  passFailTag: { fontSize: 13, fontFamily: Fonts.sansSemiBold },
  pressed: {
    opacity: 0.92,
  },
  submittedCard: {
    backgroundColor: C.warningSoft,
    borderRadius: 14,
    padding: 12,
    gap: 4,
  },
  submittedLabel: {
    fontSize: 11,
    fontFamily: Fonts.sansSemiBold,
    color: C.warning,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  submittedText: {
    fontSize: 14,
    lineHeight: 21,
    fontFamily: Fonts.sans,
    color: C.textSecondary,
  },
  linkCard: {
    backgroundColor: C.warningSoft,
    borderRadius: 14,
    padding: 12,
    gap: 4,
  },
  feedbackCard: {
    backgroundColor: C.successSoft,
    borderRadius: 14,
    padding: 12,
    gap: 4,
  },
  feedbackLabel: {
    fontSize: 11,
    fontFamily: Fonts.sansSemiBold,
    color: C.success,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  feedbackText: {
    fontSize: 14,
    lineHeight: 21,
    fontFamily: Fonts.sans,
    color: C.textSecondary,
  },
  submitToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    alignSelf: 'flex-start',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 999,
    backgroundColor: C.surface,
    borderWidth: 1,
    borderColor: C.border,
  },
  submitToggleActive: {
    backgroundColor: C.secondarySoft,
    borderColor: C.secondary,
  },
  submitToggleText: {
    fontSize: 14,
    fontFamily: Fonts.sansSemiBold,
    color: C.secondary,
  },
  submitForm: { gap: 10 },
  textArea: {
    backgroundColor: C.bg,
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 12,
    padding: 12,
    minHeight: 120,
    fontSize: 14,
    fontFamily: Fonts.sans,
    color: C.textPrimary,
  },
  linkInput: {
    backgroundColor: C.bg,
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 14,
    fontFamily: Fonts.sans,
    color: C.textPrimary,
  },
  submitBtn: {
    backgroundColor: C.primary,
    borderRadius: 16,
    paddingVertical: 14,
    alignItems: 'center',
  },
  submitBtnText: {
    fontSize: 15,
    fontFamily: Fonts.sansSemiBold,
    color: C.surface,
  },
});

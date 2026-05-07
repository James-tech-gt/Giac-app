import { AccessGate } from '@/components/access-gate';
import { C, Fonts } from '@/constants/theme';
import {
  AdminAssignment,
  AdminNotification,
  Announcement,
  Application,
  Material,
  Service,
  Test,
  approveApplication,
  createAdminAssignment,
  createAdminTest,
  createAnnouncement,
  createMaterial,
  deleteMaterial,
  gradeAssignmentSubmission,
  gradeTestSubmission,
  markAdminNotificationsRead,
  rejectApplication,
  subscribeAdminAssignments,
  subscribeAdminNotifications,
  subscribeAdminTests,
  subscribeAllApplications,
  subscribeAllMaterials,
  subscribeAllServices,
  subscribeAnnouncements,
  updateServiceRequest,
} from '@/services/firestore';
import { FontAwesome6 } from '@expo/vector-icons';
import * as DocumentPicker from 'expo-document-picker';
import { router } from 'expo-router';
import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Linking,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  useWindowDimensions,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

type AdminView = 'overview' | 'admissions' | 'cases' | 'announcements' | 'materials' | 'assignments' | 'tests';

type StatusTone = {
  bg: string;
  color: string;
  dot: string;
  label: string;
};

function formatDate(timestamp: unknown) {
  if (!timestamp) return '—';
  const date =
    typeof timestamp === 'object' &&
    timestamp !== null &&
    'toDate' in timestamp &&
    typeof (timestamp as { toDate: () => Date }).toDate === 'function'
      ? (timestamp as { toDate: () => Date }).toDate()
      : new Date(timestamp as string | number | Date);

  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

function formatTimeAgo(timestamp: unknown) {
  if (!timestamp) return '';
  const date =
    typeof timestamp === 'object' &&
    timestamp !== null &&
    'toDate' in timestamp &&
    typeof (timestamp as { toDate: () => Date }).toDate === 'function'
      ? (timestamp as { toDate: () => Date }).toDate()
      : new Date(timestamp as string | number | Date);
  if (Number.isNaN(date.getTime())) return '';
  const diff = Date.now() - date.getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return formatDate(timestamp);
}

function isValidHttpUrl(value: string) {
  try {
    const url = new URL(value);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
}

function isValidDateInput(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const parsed = new Date(`${value}T00:00:00`);
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
}

function getUrlHostLabel(value: string) {
  try {
    return new URL(value).hostname.replace(/^www\./, '');
  } catch {
    return 'Invalid link';
  }
}

function getApplicationTone(status: Application['status']): StatusTone {
  if (status === 'approved') {
    return { label: 'Approved', color: C.success, bg: C.successSoft, dot: C.success };
  }

  if (status === 'rejected') {
    return { label: 'Rejected', color: C.danger, bg: C.dangerSoft, dot: C.danger };
  }

  return { label: 'Pending review', color: C.warning, bg: C.warningSoft, dot: C.warning };
}

function getServiceTone(status: Service['status']): StatusTone {
  if (status === 'completed') {
    return { label: 'Completed', color: C.success, bg: C.successSoft, dot: C.success };
  }

  if (status === 'in-progress') {
    return { label: 'In progress', color: C.secondary, bg: C.primarySoft, dot: C.secondary };
  }

  return { label: 'Submitted', color: C.secondary, bg: '#E8ECF4', dot: C.secondary };
}

function StatusChip({ tone }: { tone: StatusTone }) {
  return (
    <View style={[styles.statusChip, { backgroundColor: tone.bg }]}>
      <View style={[styles.statusDot, { backgroundColor: tone.dot }]} />
      <Text style={[styles.statusChipText, { color: tone.color }]}>{tone.label}</Text>
    </View>
  );
}

function MetaChip({
  icon,
  label,
  subtle,
}: {
  icon?: React.ComponentProps<typeof FontAwesome6>['name'];
  label: string;
  subtle?: boolean;
}) {
  return (
    <View style={[styles.metaChip, subtle ? styles.metaChipSubtle : null]}>
      {icon ? <FontAwesome6 name={icon} size={11} color={C.secondary} /> : null}
      <Text style={styles.metaChipText}>{label}</Text>
    </View>
  );
}

function SectionButton({
  active,
  count,
  icon,
  label,
  onPress,
}: {
  active: boolean;
  count?: number;
  icon: React.ComponentProps<typeof FontAwesome6>['name'];
  label: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.sectionButton,
        active ? styles.sectionButtonActive : null,
        pressed ? styles.pressed : null,
      ]}
    >
      <View style={styles.sectionButtonCopy}>
        <FontAwesome6
          name={icon}
          size={14}
          color={active ? C.textInverse : C.secondary}
        />
        <Text style={[styles.sectionButtonLabel, active ? styles.sectionButtonLabelActive : null]}>
          {label}
        </Text>
      </View>
      {typeof count === 'number' ? (
        <View style={[styles.sectionButtonBadge, active ? styles.sectionButtonBadgeActive : null]}>
          <Text style={[styles.sectionButtonBadgeText, active ? styles.sectionButtonBadgeTextActive : null]}>
            {count}
          </Text>
        </View>
      ) : null}
    </Pressable>
  );
}

function SummaryCard({
  accent,
  label,
  value,
  helper,
  icon,
}: {
  accent: string;
  helper: string;
  icon: React.ComponentProps<typeof FontAwesome6>['name'];
  label: string;
  value: string;
}) {
  return (
    <View style={styles.summaryCard}>
      <View style={[styles.summaryIcon, { backgroundColor: accent }]}>
        <FontAwesome6 name={icon} size={14} color={C.textInverse} />
      </View>
      <Text style={styles.summaryValue}>{value}</Text>
      <Text style={styles.summaryLabel}>{label}</Text>
      <Text style={styles.summaryHelper}>{helper}</Text>
    </View>
  );
}

function EmptyState({
  icon,
  title,
  body,
}: {
  body: string;
  icon: React.ComponentProps<typeof FontAwesome6>['name'];
  title: string;
}) {
  return (
    <View style={styles.emptyState}>
      <View style={styles.emptyStateIcon}>
        <FontAwesome6 name={icon} size={18} color={C.secondary} />
      </View>
      <Text style={styles.emptyStateTitle}>{title}</Text>
      <Text style={styles.emptyStateBody}>{body}</Text>
    </View>
  );
}

function ApplicationCard({
  application,
  busy,
  onApprove,
  onReject,
}: {
  application: Application;
  busy: boolean;
  onApprove: () => void;
  onReject: (feedback: string) => void;
}) {
  const tone = getApplicationTone(application.status);
  const [rejecting, setRejecting] = useState(false);
  const [feedback, setFeedback] = useState('');

  return (
    <View style={styles.panelCard}>
      <View style={styles.panelHeaderRow}>
        <View style={styles.panelHeaderCopy}>
          <Text style={styles.panelTitle}>{application.fullName?.trim() || 'Unknown applicant'}</Text>
          <Text style={styles.panelSubtitle}>{application.email?.trim() || application.userId}</Text>
        </View>
        <StatusChip tone={tone} />
      </View>

      <View style={styles.metaWrap}>
        <MetaChip label={application.courseProgram || 'Program pending'} />
        <MetaChip label={application.courseDuration || 'Duration unavailable'} subtle />
        <MetaChip
          icon="calendar"
          label={`Submitted ${formatDate(application.submittedAt)}`}
          subtle
        />
      </View>

      <View style={styles.detailsCard}>
        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Course</Text>
          <Text style={styles.detailValue}>{application.courseTitle || '—'}</Text>
        </View>
        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Phone</Text>
          <Text style={styles.detailValue}>{application.phone?.trim() || '—'}</Text>
        </View>
      </View>

      {application.feedback?.trim() ? (
        <View style={styles.noteBlock}>
          <Text style={styles.noteLabel}>Applicant note / latest feedback</Text>
          <Text style={styles.noteBody}>{application.feedback.trim()}</Text>
        </View>
      ) : null}

      {application.status === 'pending' ? (
        rejecting ? (
          <View style={styles.editorCard}>
            <Text style={styles.editorLabel}>Rejection feedback</Text>
            <TextInput
              value={feedback}
              onChangeText={setFeedback}
              placeholder="State the reason and next step for the applicant..."
              placeholderTextColor={C.textMuted}
              multiline
              editable={!busy}
              style={styles.textArea}
              textAlignVertical="top"
            />
            <View style={styles.buttonRow}>
              <Pressable
                onPress={() => {
                  if (busy) return;
                  setRejecting(false);
                  setFeedback('');
                }}
                style={({ pressed }) => [styles.secondaryButton, pressed ? styles.pressed : null]}
              >
                <Text style={styles.secondaryButtonText}>Cancel</Text>
              </Pressable>
              <Pressable
                onPress={() => onReject(feedback)}
                disabled={busy}
                style={({ pressed }) => [
                  styles.dangerButton,
                  (busy || pressed) ? styles.pressed : null,
                ]}
              >
                {busy ? (
                  <ActivityIndicator size="small" color={C.textInverse} />
                ) : (
                  <Text style={styles.dangerButtonText}>Reject</Text>
                )}
              </Pressable>
            </View>
          </View>
        ) : (
          <View style={styles.buttonRow}>
            <Pressable
              onPress={onApprove}
              disabled={busy}
              style={({ pressed }) => [
                styles.primaryButton,
                (busy || pressed) ? styles.pressed : null,
              ]}
            >
              {busy ? (
                <ActivityIndicator size="small" color={C.textInverse} />
              ) : (
                <Text style={styles.primaryButtonText}>Approve</Text>
              )}
            </Pressable>
            <Pressable
              onPress={() => setRejecting(true)}
              disabled={busy}
              style={({ pressed }) => [
                styles.dangerButton,
                (busy || pressed) ? styles.pressed : null,
              ]}
            >
              <Text style={styles.dangerButtonText}>Reject</Text>
            </Pressable>
          </View>
        )
      ) : (
        <View style={styles.outcomeBar}>
          <Text style={styles.outcomeBarText}>
            {application.status === 'approved'
              ? `Approved ${formatDate(application.decidedAt)}`
              : `Rejected ${formatDate(application.decidedAt)}`}
          </Text>
        </View>
      )}
    </View>
  );
}

function CaseCard({
  busy,
  onSave,
  service,
}: {
  busy: boolean;
  onSave: (updates: { mediatorAssigned?: string; status?: Service['status'] }) => void;
  service: Service;
}) {
  const tone = getServiceTone(service.status);
  const [mediatorAssigned, setMediatorAssigned] = useState(service.mediatorAssigned ?? '');
  const [status, setStatus] = useState<Service['status']>(service.status);

  useEffect(() => {
    setMediatorAssigned(service.mediatorAssigned ?? '');
    setStatus(service.status);
  }, [service.mediatorAssigned, service.status]);

  return (
    <View style={styles.panelCard}>
      <View style={styles.panelHeaderRow}>
        <View style={styles.panelHeaderCopy}>
          <Text style={styles.panelTitle}>
            {service.serviceType === 'arbitration' ? 'Arbitration request' : 'Mediation request'}
          </Text>
          <Text style={styles.panelSubtitle}>Client ID: {service.userId}</Text>
        </View>
        <StatusChip tone={tone} />
      </View>

      <View style={styles.metaWrap}>
        <MetaChip label={service.category || 'Uncategorized case'} />
        <MetaChip icon="calendar" label={`Opened ${formatDate(service.createdAt)}`} subtle />
      </View>

      <View style={styles.detailsCard}>
        <Text style={styles.noteLabel}>Case details</Text>
        <Text style={styles.noteBody}>{service.caseDetails?.trim() || 'No case summary was provided.'}</Text>
      </View>

      <View style={styles.fieldGroup}>
        <Text style={styles.fieldLabel}>Assigned mediator / officer</Text>
        <TextInput
          value={mediatorAssigned}
          onChangeText={setMediatorAssigned}
          placeholder="Enter assigned mediator or officer"
          placeholderTextColor={C.textMuted}
          style={styles.input}
        />
      </View>

      <View style={styles.fieldGroup}>
        <Text style={styles.fieldLabel}>Case status</Text>
        <View style={styles.statusSelectorRow}>
          {(['submitted', 'in-progress', 'completed'] as Service['status'][]).map((option) => {
            const optionTone = getServiceTone(option);
            const selected = status === option;
            return (
              <Pressable
                key={option}
                onPress={() => setStatus(option)}
                style={({ pressed }) => [
                  styles.selectorChip,
                  selected ? { backgroundColor: optionTone.bg, borderColor: optionTone.color } : null,
                  pressed ? styles.pressed : null,
                ]}
              >
                <Text
                  style={[
                    styles.selectorChipText,
                    selected ? { color: optionTone.color } : null,
                  ]}
                >
                  {optionTone.label}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      <View style={styles.buttonRow}>
        <Pressable
          onPress={() => onSave({ mediatorAssigned, status })}
          disabled={busy}
          style={({ pressed }) => [
            styles.primaryButton,
            (busy || pressed) ? styles.pressed : null,
          ]}
        >
          {busy ? (
            <ActivityIndicator size="small" color={C.textInverse} />
          ) : (
            <Text style={styles.primaryButtonText}>Save Case Update</Text>
          )}
        </Pressable>
      </View>
    </View>
  );
}

function AnnouncementListCard({ announcements }: { announcements: Announcement[] }) {
  if (announcements.length === 0) {
    return (
      <EmptyState
        icon="bullhorn"
        title="No announcements yet"
        body="Publish your first operational update and it will appear here for the whole platform."
      />
    );
  }

  return (
    <View style={styles.feedCard}>
      {announcements.slice(0, 5).map((announcement, index) => (
        <React.Fragment key={announcement.id}>
          <View style={styles.feedRow}>
            <View
              style={[
                styles.feedMarker,
                { backgroundColor: announcement.urgent ? C.warning : C.secondary },
              ]}
            />
            <View style={styles.feedCopy}>
              <View style={styles.feedTopRow}>
                <Text style={styles.feedTitle}>{announcement.title}</Text>
                <Text style={styles.feedTime}>{formatDate(announcement.createdAt)}</Text>
              </View>
              <Text style={styles.feedBody}>{announcement.detail}</Text>
            </View>
          </View>
          {index < Math.min(announcements.length, 5) - 1 ? <View style={styles.feedDivider} /> : null}
        </React.Fragment>
      ))}
    </View>
  );
}

export default function AdminScreen() {
  return (
    <AccessGate requirement="admin">
      <AdminPanel />
    </AccessGate>
  );
}

function AdminPanel() {
  const { width } = useWindowDimensions();
  const horizontalPadding = width < 380 ? 16 : 20;
  const isWide = width >= 900;
  const isCompactMaterialsLayout = width < 720;

  const [activeView, setActiveView] = useState<AdminView>('overview');

  const [applications, setApplications] = useState<Application[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);

  const [adminNotifications, setAdminNotifications] = useState<AdminNotification[]>([]);
  const [markingRead, setMarkingRead] = useState(false);
  const [admissionsMsg, setAdmissionsMsg] = useState<{ text: string; kind: 'success' | 'error' } | null>(null);
  const [admissionsTab, setAdmissionsTab] = useState<'pending' | 'decided'>('pending');
  const [decidedFilter, setDecidedFilter] = useState<'all' | 'approved' | 'rejected'>('all');
  const [decidedDropdownOpen, setDecidedDropdownOpen] = useState(false);

  // Materials
  const [materials, setMaterials] = useState<Material[]>([]);
  const [matTitle, setMatTitle] = useState('');
  const [matModule, setMatModule] = useState('');
  const [matCourse, setMatCourse] = useState('pecadr');
  const [matType, setMatType] = useState<Material['type']>('link');
  const [matUrl, setMatUrl] = useState('');
  const [matSaving, setMatSaving] = useState(false);
  const [matMsg, setMatMsg] = useState<{ text: string; kind: 'success' | 'error' } | null>(null);

  // Assignments
  const [adminAssignments, setAdminAssignments] = useState<AdminAssignment[]>([]);
  const [asnTab, setAsnTab] = useState<'create' | 'grade'>('create');
  const [asnTitle, setAsnTitle] = useState('');
  const [asnDesc, setAsnDesc] = useState('');
  const [asnDeadline, setAsnDeadline] = useState('');
  const [asnMaxGrade, setAsnMaxGrade] = useState('100');
  const [asnCourse, setAsnCourse] = useState('pecadr');
  const [asnSaving, setAsnSaving] = useState(false);
  const [asnMsg, setAsnMsg] = useState<{ text: string; kind: 'success' | 'error' } | null>(null);
  const [gradingKey, setGradingKey] = useState<string | null>(null);
  const [gradeValue, setGradeValue] = useState('');
  const [gradeFeedback, setGradeFeedback] = useState('');
  const [gradingSaving, setGradingSaving] = useState(false);

  // Tests
  const [adminTests, setAdminTests] = useState<Test[]>([]);
  const [testTab, setTestTab] = useState<'create' | 'grade'>('create');
  const [testTitle, setTestTitle] = useState('');
  const [testDesc, setTestDesc] = useState('');
  const [testDate, setTestDate] = useState('');
  const [testDuration, setTestDuration] = useState('60');
  const [testTotal, setTestTotal] = useState('100');
  const [testPass, setTestPass] = useState('50');
  const [testCourse, setTestCourse] = useState('pecadr');
  const [testSaving, setTestSaving] = useState(false);
  const [testMsg, setTestMsg] = useState<{ text: string; kind: 'success' | 'error' } | null>(null);
  const [gradingTestKey, setGradingTestKey] = useState<string | null>(null);
  const [testStudentId, setTestStudentId] = useState('');
  const [testScore, setTestScore] = useState('');
  const [testFeedback, setTestFeedback] = useState('');
  const [testGradingSaving, setTestGradingSaving] = useState(false);

  const [busyApplicationId, setBusyApplicationId] = useState<string | null>(null);
  const [busyServiceId, setBusyServiceId] = useState<string | null>(null);
  const [announcementTitle, setAnnouncementTitle] = useState('');
  const [announcementDetail, setAnnouncementDetail] = useState('');
  const [announcementUrgent, setAnnouncementUrgent] = useState(false);
  const [savingAnnouncement, setSavingAnnouncement] = useState(false);
  const [announcementError, setAnnouncementError] = useState('');
  const [announcementSuccess, setAnnouncementSuccess] = useState('');

  useEffect(() => subscribeAllApplications(setApplications), []);
  useEffect(() => subscribeAllServices(setServices), []);
  useEffect(() => subscribeAnnouncements(setAnnouncements), []);
  useEffect(() => subscribeAdminNotifications(setAdminNotifications), []);
  useEffect(() => subscribeAllMaterials(setMaterials), []);
  useEffect(() => subscribeAdminAssignments(setAdminAssignments), []);
  useEffect(() => subscribeAdminTests(setAdminTests), []);

  const applicationCounts = useMemo(() => {
    return {
      approved: applications.filter((item) => item.status === 'approved').length,
      pending: applications.filter((item) => item.status === 'pending').length,
      rejected: applications.filter((item) => item.status === 'rejected').length,
      total: applications.length,
    };
  }, [applications]);

  const serviceCounts = useMemo(() => {
    return {
      completed: services.filter((item) => item.status === 'completed').length,
      inProgress: services.filter((item) => item.status === 'in-progress').length,
      submitted: services.filter((item) => item.status === 'submitted').length,
      total: services.length,
    };
  }, [services]);

  const pendingApplications = useMemo(
    () => applications.filter((a) => a.status === 'pending'),
    [applications]
  );

  const decidedApplications = useMemo(
    () =>
      applications
        .filter((a) => a.status !== 'pending')
        .sort((a, b) => {
          const aTime = typeof a.decidedAt?.toDate === 'function' ? a.decidedAt.toDate().getTime() : new Date(a.decidedAt ?? 0).getTime();
          const bTime = typeof b.decidedAt?.toDate === 'function' ? b.decidedAt.toDate().getTime() : new Date(b.decidedAt ?? 0).getTime();
          return bTime - aTime;
        }),
    [applications]
  );

  const actionableCases = useMemo(
    () => services.filter((item) => item.status !== 'completed'),
    [services]
  );

  const materialsForSelectedCourse = useMemo(() => {
    return materials
      .filter((item) => item.courseId === matCourse)
      .sort((a, b) => {
        const left =
          typeof a.uploadDate === 'object' &&
          a.uploadDate !== null &&
          'toDate' in a.uploadDate &&
          typeof (a.uploadDate as { toDate: () => Date }).toDate === 'function'
            ? (a.uploadDate as { toDate: () => Date }).toDate().getTime()
            : 0;
        const right =
          typeof b.uploadDate === 'object' &&
          b.uploadDate !== null &&
          'toDate' in b.uploadDate &&
          typeof (b.uploadDate as { toDate: () => Date }).toDate === 'function'
            ? (b.uploadDate as { toDate: () => Date }).toDate().getTime()
            : 0;
        return right - left || a.order - b.order;
      });
  }, [materials, matCourse]);

  const handleApprove = async (application: Application) => {
    setBusyApplicationId(application.id);
    setAdmissionsMsg(null);
    try {
      await approveApplication(application.id, application.userId, application.courseTitle);
      setAdmissionsMsg({
        text: `${application.fullName || 'Applicant'} has been approved. Their account is now upgraded to student.`,
        kind: 'success',
      });
    } catch {
      setAdmissionsMsg({ text: 'Could not approve the application. Please try again.', kind: 'error' });
    } finally {
      setBusyApplicationId(null);
    }
  };

  const handleReject = async (application: Application, feedback: string) => {
    setBusyApplicationId(application.id);
    setAdmissionsMsg(null);
    try {
      await rejectApplication(application.id, feedback, application.userId, application.courseTitle);
      setAdmissionsMsg({ text: `Application has been rejected.`, kind: 'success' });
    } catch {
      setAdmissionsMsg({ text: 'Could not reject the application. Please try again.', kind: 'error' });
    } finally {
      setBusyApplicationId(null);
    }
  };

  const handleSaveCase = async (
    service: Service,
    updates: { mediatorAssigned?: string; status?: Service['status'] }
  ) => {
    setBusyServiceId(service.id);
    try {
      await updateServiceRequest(service.id, updates);
    } catch {
      Alert.alert('Error', 'Could not update the ADR case right now. Please try again.');
    } finally {
      setBusyServiceId(null);
    }
  };


  const handleCreateMaterial = async () => {
    if (!matTitle.trim() || !matModule.trim()) {
      setMatMsg({ text: 'Title and module are required.', kind: 'error' });
      return;
    }
    const normalizedUrl = matUrl.trim();
    if (!normalizedUrl) {
      setMatMsg({ text: 'Paste a URL before saving.', kind: 'error' });
      return;
    }
    if (!isValidHttpUrl(normalizedUrl)) {
      setMatMsg({ text: 'Enter a valid http(s) URL for this material.', kind: 'error' });
      return;
    }
    setMatSaving(true);
    setMatMsg(null);
    try {
      const moduleTitle = matModule.trim();
      const title = matTitle.trim();
      const nextOrder = materials.filter((m) => m.courseId === matCourse).length + 1;
      const createdMaterial = await createMaterial({
        courseId: matCourse,
        moduleTitle,
        title,
        type: matType,
        fileUrl: normalizedUrl,
        order: nextOrder,
      });
      setMaterials((prev) => [
        createdMaterial,
        ...prev.filter((item) => item.id !== createdMaterial.id),
      ]);
      setMatTitle(''); setMatModule(''); setMatUrl(''); setMatType('link');
      setMatMsg({ text: `"${createdMaterial.title}" published successfully and added below.`, kind: 'success' });
    } catch {
      setMatMsg({ text: 'Could not save material. Please try again.', kind: 'error' });
    } finally {
      setMatSaving(false);
    }
  };

  const handleDeleteMaterial = async (id: string) => {
    try { await deleteMaterial(id); }
    catch { Alert.alert('Error', 'Could not delete material.'); }
  };

  const handleOpenMaterialLink = async (url: string) => {
    try {
      await Linking.openURL(url);
    } catch {
      Alert.alert('Error', 'Could not open this material link.');
    }
  };

  const handleCreateAssignment = async () => {
    if (!asnTitle.trim() || !asnDesc.trim() || !asnDeadline.trim()) {
      setAsnMsg({ text: 'Title, description, and deadline are required.', kind: 'error' });
      return;
    }
    if (!isValidDateInput(asnDeadline.trim())) {
      setAsnMsg({ text: 'Deadline must be a real date in YYYY-MM-DD format.', kind: 'error' });
      return;
    }
    const maxGrade = parseInt(asnMaxGrade, 10);
    if (!Number.isInteger(maxGrade) || maxGrade <= 0) {
      setAsnMsg({ text: 'Max grade must be a whole number greater than 0.', kind: 'error' });
      return;
    }
    setAsnSaving(true);
    setAsnMsg(null);
    try {
      await createAdminAssignment({
        courseId: asnCourse,
        title: asnTitle.trim(),
        description: asnDesc.trim(),
        deadlineIso: asnDeadline.trim(),
        maxGrade,
      });
      setAsnTitle(''); setAsnDesc(''); setAsnDeadline(''); setAsnMaxGrade('100');
      setAsnMsg({ text: 'Assignment created successfully.', kind: 'success' });
    } catch {
      setAsnMsg({ text: 'Could not create assignment. Please try again.', kind: 'error' });
    } finally {
      setAsnSaving(false);
    }
  };

  const handleGradeSubmission = async (assignment: AdminAssignment, userId: string) => {
    const grade = parseInt(gradeValue, 10);
    if (isNaN(grade) || grade < 0 || grade > assignment.maxGrade) {
      setAsnMsg({ text: `Grade must be between 0 and ${assignment.maxGrade}.`, kind: 'error' });
      return;
    }
    setGradingSaving(true);
    setAsnMsg(null);
    try {
      await gradeAssignmentSubmission(assignment.id, userId, grade, gradeFeedback.trim(), assignment.title);
      setGradingKey(null); setGradeValue(''); setGradeFeedback('');
      setAsnMsg({ text: 'Submission graded and student notified.', kind: 'success' });
    } catch {
      setAsnMsg({ text: 'Could not save grade. Please try again.', kind: 'error' });
    } finally {
      setGradingSaving(false);
    }
  };

  const handleCreateTest = async () => {
    if (!testTitle.trim() || !testDesc.trim() || !testDate.trim()) {
      setTestMsg({ text: 'Title, description, and date are required.', kind: 'error' });
      return;
    }
    setTestSaving(true);
    setTestMsg(null);
    try {
      await createAdminTest({
        courseId: testCourse,
        title: testTitle.trim(),
        description: testDesc.trim(),
        scheduledDateIso: testDate.trim(),
        durationMinutes: parseInt(testDuration, 10) || 60,
        totalMarks: parseInt(testTotal, 10) || 100,
        passMark: parseInt(testPass, 10) || 50,
      });
      setTestTitle(''); setTestDesc(''); setTestDate('');
      setTestMsg({ text: 'Test scheduled successfully.', kind: 'success' });
    } catch {
      setTestMsg({ text: 'Could not create test. Please try again.', kind: 'error' });
    } finally {
      setTestSaving(false);
    }
  };

  const handleGradeTest = async (test: Test) => {
    const score = parseInt(testScore, 10);
    if (!testStudentId.trim()) { setTestMsg({ text: 'Student ID is required.', kind: 'error' }); return; }
    if (isNaN(score) || score < 0 || score > test.totalMarks) {
      setTestMsg({ text: `Score must be between 0 and ${test.totalMarks}.`, kind: 'error' });
      return;
    }
    setTestGradingSaving(true);
    setTestMsg(null);
    try {
      await gradeTestSubmission(test.id, testStudentId.trim(), score, testFeedback.trim(), test.title, test.courseId, test.totalMarks, test.passMark);
      setGradingTestKey(null); setTestStudentId(''); setTestScore(''); setTestFeedback('');
      setTestMsg({ text: 'Test graded and student notified.', kind: 'success' });
    } catch {
      setTestMsg({ text: 'Could not save grade. Please try again.', kind: 'error' });
    } finally {
      setTestGradingSaving(false);
    }
  };

  const handleMarkAllRead = async () => {
    if (markingRead || adminNotifications.length === 0) return;
    setMarkingRead(true);
    try {
      await markAdminNotificationsRead(adminNotifications.map((n) => n.id));
    } catch {
      Alert.alert('Error', 'Could not mark notifications as read. Please try again.');
    } finally {
      setMarkingRead(false);
    }
  };

  const handlePublishAnnouncement = async () => {
    if (!announcementTitle.trim() || !announcementDetail.trim()) {
      setAnnouncementError('Please provide both a title and detail before publishing.');
      setAnnouncementSuccess('');
      return;
    }

    setSavingAnnouncement(true);
    setAnnouncementError('');
    setAnnouncementSuccess('');

    try {
      await createAnnouncement({
        title: announcementTitle,
        detail: announcementDetail,
        urgent: announcementUrgent,
      });
      setAnnouncementTitle('');
      setAnnouncementDetail('');
      setAnnouncementUrgent(false);
      setAnnouncementSuccess('Announcement published successfully.');
    } catch {
      setAnnouncementError('Could not publish the announcement. Please try again.');
    } finally {
      setSavingAnnouncement(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[
          styles.content,
          { paddingHorizontal: horizontalPadding, paddingBottom: 132 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.topBar}>
          <Pressable onPress={() => router.back()} style={({ pressed }) => [styles.backPill, pressed ? styles.pressed : null]}>
            <FontAwesome6 name="arrow-left" size={12} color={C.secondary} />
            <Text style={styles.backPillText}>Back</Text>
          </Pressable>
        </View>

        <View style={styles.hero}>
          <Text style={styles.heroEyebrow}>Admin Operations</Text>
          <Text style={styles.heroTitle}>Control Center</Text>
          <Text style={styles.heroDescription}>
            Review admissions, direct ADR case flow, publish institute updates, and keep the platform moving from one workspace.
          </Text>

          <View style={styles.statusRail}>
            <StatusChip tone={getApplicationTone('approved')} />
            <StatusChip tone={getApplicationTone('pending')} />
            <StatusChip tone={getApplicationTone('rejected')} />
            <StatusChip tone={getServiceTone('submitted')} />
          </View>

          <View style={styles.metaWrap}>
            <MetaChip label={`${applicationCounts.total} applications`} />
            <MetaChip label={`${serviceCounts.total} ADR requests`} />
            <MetaChip label={`${announcements.length} announcements`} subtle />
            <MetaChip icon="shield-halved" label="Administrator" subtle />
          </View>
        </View>

        <View style={styles.sectionNav}>
          <SectionButton
            active={activeView === 'overview'}
            count={adminNotifications.length > 0 ? adminNotifications.length : undefined}
            icon="chart-line"
            label="Overview"
            onPress={() => setActiveView('overview')}
          />
          <SectionButton
            active={activeView === 'admissions'}
            count={applicationCounts.pending}
            icon="user-graduate"
            label="Admissions"
            onPress={() => setActiveView('admissions')}
          />
          <SectionButton
            active={activeView === 'cases'}
            count={actionableCases.length}
            icon="scale-balanced"
            label="ADR Cases"
            onPress={() => setActiveView('cases')}
          />
          <SectionButton
            active={activeView === 'announcements'}
            icon="bullhorn"
            label="Announcements"
            onPress={() => setActiveView('announcements')}
          />
          <SectionButton
            active={activeView === 'materials'}
            count={materials.length > 0 ? materials.length : undefined}
            icon="book-open"
            label="Materials"
            onPress={() => setActiveView('materials')}
          />
          <SectionButton
            active={activeView === 'assignments'}
            count={adminAssignments.length > 0 ? adminAssignments.length : undefined}
            icon="file-pen"
            label="Assignments"
            onPress={() => setActiveView('assignments')}
          />
          <SectionButton
            active={activeView === 'tests'}
            count={adminTests.length > 0 ? adminTests.length : undefined}
            icon="clipboard-list"
            label="Tests"
            onPress={() => setActiveView('tests')}
          />
        </View>

        {activeView === 'overview' ? (
          <>
            {adminNotifications.length > 0 ? (
              <View style={styles.notifCard}>
                <View style={styles.notifHeaderRow}>
                  <View style={{ flex: 1, gap: 2 }}>
                    <Text style={styles.notifTitle}>New Submissions</Text>
                    <Text style={styles.notifSubtitle}>{adminNotifications.length} unread</Text>
                  </View>
                  <Pressable
                    onPress={handleMarkAllRead}
                    disabled={markingRead}
                    style={({ pressed }) => [styles.notifMarkBtn, (markingRead || pressed) ? styles.pressed : null]}
                  >
                    {markingRead ? (
                      <ActivityIndicator size="small" color={C.secondary} />
                    ) : (
                      <Text style={styles.notifMarkBtnText}>Mark all read</Text>
                    )}
                  </Pressable>
                </View>
                {adminNotifications.map((notif, index) => (
                  <React.Fragment key={notif.id}>
                    <View style={styles.notifRow}>
                      <View style={[styles.notifDot, { backgroundColor: notif.type === 'application' ? C.warning : C.secondary }]} />
                      <View style={{ flex: 1, gap: 2 }}>
                        <Text style={styles.notifMessage}>{notif.message}</Text>
                        <Text style={styles.notifTime}>{formatTimeAgo(notif.createdAt)}</Text>
                      </View>
                    </View>
                    {index < adminNotifications.length - 1 ? <View style={styles.feedDivider} /> : null}
                  </React.Fragment>
                ))}
              </View>
            ) : null}

            <View style={[styles.summaryGrid, isWide ? styles.summaryGridWide : null]}>
              <SummaryCard
                accent={C.warning}
                icon="hourglass-half"
                label="Pending Admissions"
                value={`${applicationCounts.pending}`}
                helper="Applications awaiting admin review"
              />
              <SummaryCard
                accent={C.success}
                icon="check"
                label="Approved Students"
                value={`${applicationCounts.approved}`}
                helper="Applicants moved into the student journey"
              />
              <SummaryCard
                accent={C.secondary}
                icon="scale-balanced"
                label="Active ADR Cases"
                value={`${serviceCounts.submitted + serviceCounts.inProgress}`}
                helper="Submitted and in-progress disputes"
              />
              <SummaryCard
                accent={C.accentStrong}
                icon="bullhorn"
                label="Published Updates"
                value={`${announcements.length}`}
                helper="Announcements visible across the platform"
              />
            </View>

            <View style={[styles.dualGrid, isWide ? styles.dualGridWide : null]}>
              <View style={[styles.workspaceCard, isWide ? styles.workspaceCardWide : null]}>
                <Text style={styles.workspaceTitle}>Admissions Queue</Text>
                <Text style={styles.workspaceBody}>
                  Prioritize pending applicants, communicate decisions quickly, and move successful applicants into the student role.
                </Text>
                <View style={styles.workspaceMetricRow}>
                  <MetaChip label={`${applicationCounts.pending} pending`} />
                  <MetaChip label={`${applicationCounts.rejected} rejected`} subtle />
                </View>
                <Pressable
                  onPress={() => setActiveView('admissions')}
                  style={({ pressed }) => [styles.primaryButton, pressed ? styles.pressed : null]}
                >
                  <Text style={styles.primaryButtonText}>Open Admissions</Text>
                </Pressable>
              </View>

              <View style={[styles.workspaceCard, isWide ? styles.workspaceCardWide : null]}>
                <Text style={styles.workspaceTitle}>ADR Case Desk</Text>
                <Text style={styles.workspaceBody}>
                  Assign mediators, move requests into active handling, and close completed disputes with clear status updates.
                </Text>
                <View style={styles.workspaceMetricRow}>
                  <MetaChip label={`${serviceCounts.submitted} submitted`} />
                  <MetaChip label={`${serviceCounts.inProgress} in progress`} subtle />
                </View>
                <Pressable
                  onPress={() => setActiveView('cases')}
                  style={({ pressed }) => [styles.primaryButton, pressed ? styles.pressed : null]}
                >
                  <Text style={styles.primaryButtonText}>Open Case Desk</Text>
                </Pressable>
              </View>
            </View>

            <View style={[styles.dualGrid, isWide ? styles.dualGridWide : null]}>
              <View style={[styles.workspaceCard, isWide ? styles.workspaceCardWide : null]}>
                <Text style={styles.workspaceTitle}>Latest Announcements</Text>
                <Text style={styles.workspaceBody}>
                  Publish institute notices, admissions updates, and urgent operational messages.
                </Text>
                <AnnouncementListCard announcements={announcements} />
              </View>

              <View style={[styles.workspaceCard, isWide ? styles.workspaceCardWide : null]}>
                <Text style={styles.workspaceTitle}>Admin Scope</Text>
                <Text style={styles.workspaceBody}>
                  This mobile admin workspace now owns admissions, ADR case handling, and announcements. User management, course authoring, and deeper reporting should be the next admin slices we build.
                </Text>
                <View style={styles.iconBadgeRow}>
                  <View style={[styles.iconBadge, { backgroundColor: C.primarySoft }]}>
                    <FontAwesome6 name="book-open" size={16} color={C.secondary} />
                  </View>
                  <View style={[styles.iconBadge, { backgroundColor: C.warningSoft }]}>
                    <FontAwesome6 name="file-pen" size={16} color={C.warning} />
                  </View>
                  <View style={[styles.iconBadge, { backgroundColor: C.successSoft }]}>
                    <FontAwesome6 name="user-graduate" size={16} color={C.success} />
                  </View>
                  <View style={[styles.iconBadge, { backgroundColor: '#E8ECF4' }]}>
                    <FontAwesome6 name="scale-balanced" size={16} color={C.secondary} />
                  </View>
                </View>
              </View>
            </View>
          </>
        ) : null}

        {activeView === 'admissions' ? (
          <>
            {/* Tab switcher */}
            <View style={styles.admissionsTabRow}>
              <Pressable
                onPress={() => setAdmissionsTab('pending')}
                style={({ pressed }) => [
                  styles.admissionsTabBtn,
                  admissionsTab === 'pending' ? styles.admissionsTabBtnActive : null,
                  pressed ? styles.pressed : null,
                ]}
              >
                <Text style={[styles.admissionsTabText, admissionsTab === 'pending' ? styles.admissionsTabTextActive : null]}>
                  Pending
                </Text>
                {applicationCounts.pending > 0 ? (
                  <View style={[styles.admissionsTabBadge, admissionsTab === 'pending' ? styles.admissionsTabBadgeActive : null]}>
                    <Text style={[styles.admissionsTabBadgeText, admissionsTab === 'pending' ? styles.admissionsTabBadgeTextActive : null]}>
                      {applicationCounts.pending}
                    </Text>
                  </View>
                ) : null}
              </Pressable>
              <Pressable
                onPress={() => setAdmissionsTab('decided')}
                style={({ pressed }) => [
                  styles.admissionsTabBtn,
                  admissionsTab === 'decided' ? styles.admissionsTabBtnActive : null,
                  pressed ? styles.pressed : null,
                ]}
              >
                <Text style={[styles.admissionsTabText, admissionsTab === 'decided' ? styles.admissionsTabTextActive : null]}>
                  Decided
                </Text>
                {decidedApplications.length > 0 ? (
                  <View style={[styles.admissionsTabBadge, admissionsTab === 'decided' ? styles.admissionsTabBadgeActive : null]}>
                    <Text style={[styles.admissionsTabBadgeText, admissionsTab === 'decided' ? styles.admissionsTabBadgeTextActive : null]}>
                      {decidedApplications.length}
                    </Text>
                  </View>
                ) : null}
              </Pressable>
            </View>

            {admissionsMsg ? (
              <View style={[styles.banner, { backgroundColor: admissionsMsg.kind === 'success' ? C.successSoft : C.dangerSoft }]}>
                <Text style={[styles.bannerText, { color: admissionsMsg.kind === 'success' ? C.success : C.danger }]}>
                  {admissionsMsg.text}
                </Text>
              </View>
            ) : null}

            {admissionsTab === 'pending' ? (
              pendingApplications.length > 0 ? (
                <View style={styles.stack}>
                  {pendingApplications.map((application) => (
                    <ApplicationCard
                      key={application.id}
                      application={application}
                      busy={busyApplicationId === application.id}
                      onApprove={() => handleApprove(application)}
                      onReject={(feedback) => handleReject(application, feedback)}
                    />
                  ))}
                </View>
              ) : (
                <EmptyState
                  icon="circle-check"
                  title="Queue is clear"
                  body="No pending applications. All submitted applications have been reviewed."
                />
              )
            ) : (
              <>
                {/* Filter dropdown */}
                <View>
                  <Pressable
                    onPress={() => setDecidedDropdownOpen((v) => !v)}
                    style={({ pressed }) => [styles.filterTrigger, pressed ? styles.pressed : null]}
                  >
                    <FontAwesome6 name="filter" size={13} color={C.secondary} />
                    <Text style={styles.filterTriggerText}>
                      {decidedFilter === 'all' ? 'All decisions' : decidedFilter === 'approved' ? 'Approved only' : 'Rejected only'}
                    </Text>
                    <FontAwesome6 name={decidedDropdownOpen ? 'chevron-up' : 'chevron-down'} size={11} color={C.textMuted} />
                  </Pressable>
                  {decidedDropdownOpen ? (
                    <View style={styles.filterDropdown}>
                      {([
                        { value: 'all', label: 'All decisions' },
                        { value: 'approved', label: 'Approved only' },
                        { value: 'rejected', label: 'Rejected only' },
                      ] as const).map((opt) => (
                        <Pressable
                          key={opt.value}
                          onPress={() => { setDecidedFilter(opt.value); setDecidedDropdownOpen(false); }}
                          style={({ pressed }) => [
                            styles.filterOption,
                            decidedFilter === opt.value ? styles.filterOptionActive : null,
                            pressed ? styles.pressed : null,
                          ]}
                        >
                          <Text style={[styles.filterOptionText, decidedFilter === opt.value ? styles.filterOptionTextActive : null]}>
                            {opt.label}
                          </Text>
                          {decidedFilter === opt.value ? (
                            <FontAwesome6 name="check" size={12} color={C.secondary} />
                          ) : null}
                        </Pressable>
                      ))}
                    </View>
                  ) : null}
                </View>

                {(() => {
                  const filtered = decidedFilter === 'all'
                    ? decidedApplications
                    : decidedApplications.filter((a) => a.status === decidedFilter);
                  return filtered.length > 0 ? (
                    <View style={styles.stack}>
                      {filtered.map((application) => (
                        <ApplicationCard
                          key={application.id}
                          application={application}
                          busy={busyApplicationId === application.id}
                          onApprove={() => handleApprove(application)}
                          onReject={(feedback) => handleReject(application, feedback)}
                        />
                      ))}
                    </View>
                  ) : (
                    <EmptyState
                      icon="folder-open"
                      title={decidedFilter === 'all' ? 'No decided applications yet' : `No ${decidedFilter} applications`}
                      body={decidedFilter === 'all'
                        ? 'Approved and rejected applications will appear here once you action them.'
                        : `Switch to "All decisions" to see other outcomes.`}
                    />
                  );
                })()}
              </>
            )}
          </>
        ) : null}

        {activeView === 'cases' ? (
          actionableCases.length > 0 ? (
            <View style={styles.stack}>
              {actionableCases.map((service) => (
                <CaseCard
                  key={service.id}
                  service={service}
                  busy={busyServiceId === service.id}
                  onSave={(updates) => handleSaveCase(service, updates)}
                />
              ))}
            </View>
          ) : (
            <EmptyState
              icon="scale-balanced"
              title="No active ADR work"
              body="All ADR requests are completed or no service requests have been submitted yet."
            />
          )
        ) : null}

        {activeView === 'materials' ? (
          <>
            {matMsg ? (
              <View style={[styles.banner, { backgroundColor: matMsg.kind === 'success' ? C.successSoft : C.dangerSoft }]}>
                <Text style={[styles.bannerText, { color: matMsg.kind === 'success' ? C.success : C.danger }]}>{matMsg.text}</Text>
              </View>
            ) : null}

            <View style={[styles.workspaceCard, styles.materialsWorkspaceCard]}>
              <Text style={styles.workspaceTitle}>Upload Material</Text>

              <View style={styles.fieldGroup}>
                <Text style={styles.fieldLabel}>Course</Text>
                <View style={styles.statusSelectorRow}>
                  {(['pecadr', 'pemadr'] as const).map((c) => (
                    <Pressable key={c} onPress={() => setMatCourse(c)}
                      style={({ pressed }) => [styles.selectorChip, matCourse === c ? { backgroundColor: C.primarySoft, borderColor: C.secondary } : null, pressed ? styles.pressed : null]}>
                      <Text style={[styles.selectorChipText, matCourse === c ? { color: C.secondary } : null]}>{c.toUpperCase()}</Text>
                    </Pressable>
                  ))}
                </View>
              </View>

              <View style={styles.fieldGroup}>
                <Text style={styles.fieldLabel}>Module / Section</Text>
                <TextInput value={matModule} onChangeText={setMatModule} placeholder="e.g. Introduction to ADR" placeholderTextColor={C.textMuted} style={styles.input} />
              </View>

              <View style={styles.fieldGroup}>
                <Text style={styles.fieldLabel}>Title</Text>
                <TextInput value={matTitle} onChangeText={setMatTitle} placeholder="e.g. Week 1 Reading" placeholderTextColor={C.textMuted} style={styles.input} />
              </View>

              <View style={styles.fieldGroup}>
                <Text style={styles.fieldLabel}>Type</Text>
                <View style={styles.statusSelectorRow}>
                  {(['pdf', 'doc', 'video', 'link'] as Material['type'][]).map((t) => (
                    <Pressable key={t} onPress={() => { setMatType(t); setMatUrl(''); }}
                      style={({ pressed }) => [styles.selectorChip, matType === t ? { backgroundColor: C.primarySoft, borderColor: C.secondary } : null, pressed ? styles.pressed : null]}>
                      <Text style={[styles.selectorChipText, matType === t ? { color: C.secondary } : null]}>{t.toUpperCase()}</Text>
                    </Pressable>
                  ))}
                </View>
              </View>

              <View style={styles.fieldGroup}>
                <Text style={styles.fieldLabel}>URL</Text>
                <TextInput
                  value={matUrl}
                  onChangeText={setMatUrl}
                  placeholder="Paste a link (Google Drive, YouTube, Dropbox, website…)"
                  placeholderTextColor={C.textMuted}
                  style={[styles.input, styles.materialUrlInput]}
                  autoCapitalize="none"
                  autoCorrect={false}
                />
              </View>

              <Pressable onPress={handleCreateMaterial} disabled={matSaving}
                style={({ pressed }) => [styles.primaryButton, (matSaving || pressed) ? styles.pressed : null]}>
                {matSaving ? <ActivityIndicator size="small" color={C.textInverse} /> : <Text style={styles.primaryButtonText}>Save Material</Text>}
              </Pressable>
            </View>

            <View style={styles.workspaceCard}>
              <View style={[styles.materialsHeaderRow, isCompactMaterialsLayout ? styles.materialsHeaderRowStacked : null]}>
                <View style={styles.panelHeaderCopy}>
                  <Text style={styles.workspaceTitle}>Published Materials</Text>
                </View>
                <View style={styles.materialsHeaderChipWrap}>
                  <MetaChip icon="folder-tree" label={`${materialsForSelectedCourse.length} published`} subtle />
                </View>
              </View>

              <Text style={styles.materialSectionTitle}>
                Published Materials for {matCourse.toUpperCase()} ({materialsForSelectedCourse.length})
              </Text>
              {materialsForSelectedCourse.length === 0 ? (
                <EmptyState icon="book-open" title="No materials yet" body="Save a material above and it will appear here for this course." />
              ) : (
                <View style={styles.stack}>
                  {materialsForSelectedCourse.map((mat) => (
                    <View key={mat.id} style={styles.materialRecordCard}>
                      <View style={styles.materialRecordTopRow}>
                        <View style={[styles.matTypeTag, { backgroundColor: mat.type === 'pdf' ? '#E8ECF4' : mat.type === 'video' ? C.warningSoft : C.primarySoft }]}>
                          <Text style={styles.matTypeText}>{mat.type.toUpperCase()}</Text>
                        </View>
                        <View style={styles.materialRecordActions}>
                          <Pressable onPress={() => handleOpenMaterialLink(mat.fileUrl)} style={({ pressed }) => [styles.materialActionBtn, pressed ? styles.pressed : null]}>
                            <FontAwesome6 name="arrow-up-right-from-square" size={12} color={C.secondary} />
                            <Text style={styles.materialActionBtnText}>Open</Text>
                          </Pressable>
                          <Pressable onPress={() => handleDeleteMaterial(mat.id)} style={({ pressed }) => [styles.deleteBtn, pressed ? styles.pressed : null]}>
                            <FontAwesome6 name="trash" size={13} color={C.danger} />
                          </Pressable>
                        </View>
                      </View>

                      <Text style={styles.matTitle}>{mat.title}</Text>
                      <Text style={styles.matMeta}>{mat.moduleTitle || 'General'} · Uploaded {formatTimeAgo(mat.uploadDate) || formatDate(mat.uploadDate)}</Text>

                      <View style={styles.materialMetaRow}>
                        <MetaChip icon="graduation-cap" label={mat.courseId.toUpperCase()} subtle />
                        <MetaChip icon="link" label={getUrlHostLabel(mat.fileUrl)} subtle />
                      </View>
                    </View>
                  ))}
                </View>
              )}
            </View>
          </>
        ) : null}

        {activeView === 'assignments' ? (
          <>
            <View style={styles.tabRow}>
              <Pressable onPress={() => setAsnTab('create')} style={[styles.tabBtn, asnTab === 'create' ? styles.tabBtnActive : null]}>
                <Text style={[styles.tabBtnText, asnTab === 'create' ? styles.tabBtnTextActive : null]}>Create</Text>
              </Pressable>
              <Pressable onPress={() => setAsnTab('grade')} style={[styles.tabBtn, asnTab === 'grade' ? styles.tabBtnActive : null]}>
                <Text style={[styles.tabBtnText, asnTab === 'grade' ? styles.tabBtnTextActive : null]}>
                  Grade Submissions
                </Text>
              </Pressable>
            </View>

            {asnMsg ? (
              <View style={[styles.banner, { backgroundColor: asnMsg.kind === 'success' ? C.successSoft : C.dangerSoft }]}>
                <Text style={[styles.bannerText, { color: asnMsg.kind === 'success' ? C.success : C.danger }]}>{asnMsg.text}</Text>
              </View>
            ) : null}

            {asnTab === 'create' ? (
              <View style={styles.workspaceCard}>
                <Text style={styles.workspaceTitle}>New Assignment</Text>

                <View style={styles.fieldGroup}>
                  <Text style={styles.fieldLabel}>Course</Text>
                  <View style={styles.statusSelectorRow}>
                    {(['pecadr', 'pemadr'] as const).map((c) => (
                      <Pressable key={c} onPress={() => setAsnCourse(c)}
                        style={({ pressed }) => [styles.selectorChip, asnCourse === c ? { backgroundColor: C.primarySoft, borderColor: C.secondary } : null, pressed ? styles.pressed : null]}>
                        <Text style={[styles.selectorChipText, asnCourse === c ? { color: C.secondary } : null]}>{c.toUpperCase()}</Text>
                      </Pressable>
                    ))}
                  </View>
                </View>

                <View style={styles.fieldGroup}>
                  <Text style={styles.fieldLabel}>Title</Text>
                  <TextInput value={asnTitle} onChangeText={setAsnTitle} placeholder="e.g. Case Analysis — Week 2" placeholderTextColor={C.textMuted} style={styles.input} />
                </View>

                <View style={styles.fieldGroup}>
                  <Text style={styles.fieldLabel}>Description / Instructions</Text>
                  <TextInput value={asnDesc} onChangeText={setAsnDesc} placeholder="Explain what students must submit..." placeholderTextColor={C.textMuted} multiline textAlignVertical="top" style={styles.textArea} />
                </View>

                <View style={styles.fieldGroup}>
                  <Text style={styles.fieldLabel}>Deadline (YYYY-MM-DD)</Text>
                  <TextInput value={asnDeadline} onChangeText={setAsnDeadline} placeholder="2025-12-31" placeholderTextColor={C.textMuted} style={styles.input} />
                </View>

                <View style={styles.fieldGroup}>
                  <Text style={styles.fieldLabel}>Max Grade</Text>
                  <TextInput value={asnMaxGrade} onChangeText={setAsnMaxGrade} keyboardType="numeric" placeholder="100" placeholderTextColor={C.textMuted} style={styles.input} />
                </View>

                <Pressable onPress={handleCreateAssignment} disabled={asnSaving}
                  style={({ pressed }) => [styles.primaryButton, (asnSaving || pressed) ? styles.pressed : null]}>
                  {asnSaving ? <ActivityIndicator size="small" color={C.textInverse} /> : <Text style={styles.primaryButtonText}>Create Assignment</Text>}
                </Pressable>
              </View>
            ) : (
              adminAssignments.length === 0 ? (
                <EmptyState icon="file-pen" title="No assignments yet" body="Create an assignment first, then students' submissions will appear here." />
              ) : (
                <View style={styles.stack}>
                  {adminAssignments.map((asn) => (
                    <View key={asn.id} style={styles.panelCard}>
                      <View style={styles.panelHeaderRow}>
                        <View style={styles.panelHeaderCopy}>
                          <Text style={styles.panelTitle}>{asn.title}</Text>
                          <Text style={styles.panelSubtitle}>{asn.courseId} · max {asn.maxGrade} pts · {asn.submissions.length} submission{asn.submissions.length !== 1 ? 's' : ''}</Text>
                        </View>
                      </View>

                      {asn.submissions.length === 0 ? (
                        <View style={[styles.banner, { backgroundColor: C.surfaceAlt }]}>
                          <Text style={[styles.bannerText, { color: C.textMuted }]}>No submissions yet.</Text>
                        </View>
                      ) : (
                        asn.submissions.map((sub) => {
                          const key = `${asn.id}__${sub.userId}`;
                          const isGrading = gradingKey === key;
                          return (
                            <View key={sub.userId} style={styles.subCard}>
                              <View style={styles.subHeaderRow}>
                                <View style={{ flex: 1, gap: 2 }}>
                                  <Text style={styles.subUserId}>Student: {sub.userId}</Text>
                                  <Text style={styles.subMeta}>{formatDate(sub.submittedAt)} · {sub.status === 'graded' ? `Graded: ${sub.grade}/${asn.maxGrade}` : 'Awaiting grade'}</Text>
                                </View>
                                {sub.status !== 'graded' ? (
                                  <Pressable onPress={() => { setGradingKey(key); setGradeValue(''); setGradeFeedback(''); }}
                                    style={({ pressed }) => [styles.gradeBtn, pressed ? styles.pressed : null]}>
                                    <Text style={styles.gradeBtnText}>Grade</Text>
                                  </Pressable>
                                ) : null}
                              </View>

                              {sub.text ? (
                                <View style={styles.subTextCard}>
                                  <Text style={styles.noteLabel}>Submission</Text>
                                  <Text style={styles.noteBody}>{sub.text}</Text>
                                </View>
                              ) : null}

                              {sub.feedback ? (
                                <View style={[styles.subTextCard, { backgroundColor: C.successSoft }]}>
                                  <Text style={[styles.noteLabel, { color: C.success }]}>Feedback given</Text>
                                  <Text style={styles.noteBody}>{sub.feedback}</Text>
                                </View>
                              ) : null}

                              {isGrading ? (
                                <View style={styles.gradeForm}>
                                  <View style={styles.fieldGroup}>
                                    <Text style={styles.fieldLabel}>Grade (0–{asn.maxGrade})</Text>
                                    <TextInput value={gradeValue} onChangeText={setGradeValue} keyboardType="numeric" placeholder="e.g. 85" placeholderTextColor={C.textMuted} style={styles.input} />
                                  </View>
                                  <View style={styles.fieldGroup}>
                                    <Text style={styles.fieldLabel}>Feedback</Text>
                                    <TextInput value={gradeFeedback} onChangeText={setGradeFeedback} placeholder="Optional feedback for the student..." placeholderTextColor={C.textMuted} multiline textAlignVertical="top" style={styles.textArea} />
                                  </View>
                                  <View style={styles.buttonRow}>
                                    <Pressable onPress={() => setGradingKey(null)} style={({ pressed }) => [styles.secondaryButton, pressed ? styles.pressed : null]}>
                                      <Text style={styles.secondaryButtonText}>Cancel</Text>
                                    </Pressable>
                                    <Pressable onPress={() => handleGradeSubmission(asn, sub.userId)} disabled={gradingSaving}
                                      style={({ pressed }) => [styles.primaryButton, (gradingSaving || pressed) ? styles.pressed : null]}>
                                      {gradingSaving ? <ActivityIndicator size="small" color={C.textInverse} /> : <Text style={styles.primaryButtonText}>Save Grade</Text>}
                                    </Pressable>
                                  </View>
                                </View>
                              ) : null}
                            </View>
                          );
                        })
                      )}
                    </View>
                  ))}
                </View>
              )
            )}
          </>
        ) : null}

        {activeView === 'tests' ? (
          <>
            <View style={styles.tabRow}>
              <Pressable onPress={() => setTestTab('create')} style={[styles.tabBtn, testTab === 'create' ? styles.tabBtnActive : null]}>
                <Text style={[styles.tabBtnText, testTab === 'create' ? styles.tabBtnTextActive : null]}>Schedule Test</Text>
              </Pressable>
              <Pressable onPress={() => setTestTab('grade')} style={[styles.tabBtn, testTab === 'grade' ? styles.tabBtnActive : null]}>
                <Text style={[styles.tabBtnText, testTab === 'grade' ? styles.tabBtnTextActive : null]}>Grade Tests</Text>
              </Pressable>
            </View>

            {testMsg ? (
              <View style={[styles.banner, { backgroundColor: testMsg.kind === 'success' ? C.successSoft : C.dangerSoft }]}>
                <Text style={[styles.bannerText, { color: testMsg.kind === 'success' ? C.success : C.danger }]}>{testMsg.text}</Text>
              </View>
            ) : null}

            {testTab === 'create' ? (
              <View style={styles.workspaceCard}>
                <Text style={styles.workspaceTitle}>Schedule New Test</Text>

                <View style={styles.fieldGroup}>
                  <Text style={styles.fieldLabel}>Course</Text>
                  <View style={styles.statusSelectorRow}>
                    {(['pecadr', 'advanced', 'certificate'] as const).map((c) => (
                      <Pressable key={c} onPress={() => setTestCourse(c)}
                        style={({ pressed }) => [styles.selectorChip, testCourse === c ? { backgroundColor: C.primarySoft, borderColor: C.secondary } : null, pressed ? styles.pressed : null]}>
                        <Text style={[styles.selectorChipText, testCourse === c ? { color: C.secondary } : null]}>{c.toUpperCase()}</Text>
                      </Pressable>
                    ))}
                  </View>
                </View>

                <View style={styles.fieldGroup}>
                  <Text style={styles.fieldLabel}>Title</Text>
                  <TextInput value={testTitle} onChangeText={setTestTitle} placeholder="e.g. Mid-Term Assessment" placeholderTextColor={C.textMuted} style={styles.input} />
                </View>

                <View style={styles.fieldGroup}>
                  <Text style={styles.fieldLabel}>Description / Instructions</Text>
                  <TextInput value={testDesc} onChangeText={setTestDesc} placeholder="What topics will be covered..." placeholderTextColor={C.textMuted} multiline textAlignVertical="top" style={styles.textArea} />
                </View>

                <View style={styles.fieldGroup}>
                  <Text style={styles.fieldLabel}>Date (YYYY-MM-DD)</Text>
                  <TextInput value={testDate} onChangeText={setTestDate} placeholder="2025-12-31" placeholderTextColor={C.textMuted} style={styles.input} />
                </View>

                <View style={[styles.buttonRow, { gap: 12 }]}>
                  <View style={[styles.fieldGroup, { flex: 1 }]}>
                    <Text style={styles.fieldLabel}>Duration (min)</Text>
                    <TextInput value={testDuration} onChangeText={setTestDuration} keyboardType="numeric" placeholder="60" placeholderTextColor={C.textMuted} style={styles.input} />
                  </View>
                  <View style={[styles.fieldGroup, { flex: 1 }]}>
                    <Text style={styles.fieldLabel}>Total Marks</Text>
                    <TextInput value={testTotal} onChangeText={setTestTotal} keyboardType="numeric" placeholder="100" placeholderTextColor={C.textMuted} style={styles.input} />
                  </View>
                  <View style={[styles.fieldGroup, { flex: 1 }]}>
                    <Text style={styles.fieldLabel}>Pass Mark</Text>
                    <TextInput value={testPass} onChangeText={setTestPass} keyboardType="numeric" placeholder="50" placeholderTextColor={C.textMuted} style={styles.input} />
                  </View>
                </View>

                <Pressable onPress={handleCreateTest} disabled={testSaving}
                  style={({ pressed }) => [styles.primaryButton, (testSaving || pressed) ? styles.pressed : null]}>
                  {testSaving ? <ActivityIndicator size="small" color={C.textInverse} /> : <Text style={styles.primaryButtonText}>Schedule Test</Text>}
                </Pressable>
              </View>
            ) : (
              adminTests.length === 0 ? (
                <EmptyState icon="clipboard-list" title="No tests yet" body="Schedule a test first, then you can grade students here." />
              ) : (
                <View style={styles.stack}>
                  {adminTests.map((test) => {
                    const isGrading = gradingTestKey === test.id;
                    return (
                      <View key={test.id} style={styles.panelCard}>
                        <View style={styles.panelHeaderRow}>
                          <View style={styles.panelHeaderCopy}>
                            <Text style={styles.panelTitle}>{test.title}</Text>
                            <Text style={styles.panelSubtitle}>{test.courseId} · {formatDate(test.scheduledDate)} · {test.totalMarks} marks</Text>
                          </View>
                          <View style={[styles.statusChip, { backgroundColor: test.status === 'upcoming' ? C.warningSoft : C.successSoft }]}>
                            <View style={[styles.statusDot, { backgroundColor: test.status === 'upcoming' ? C.warning : C.success }]} />
                            <Text style={[styles.statusChipText, { color: test.status === 'upcoming' ? C.warning : C.success }]}>{test.status}</Text>
                          </View>
                        </View>

                        {test.description ? (
                          <View style={styles.noteBlock}>
                            <Text style={styles.noteLabel}>Instructions</Text>
                            <Text style={styles.noteBody}>{test.description}</Text>
                          </View>
                        ) : null}

                        {isGrading ? (
                          <View style={styles.gradeForm}>
                            <View style={styles.fieldGroup}>
                              <Text style={styles.fieldLabel}>Student UID</Text>
                              <TextInput value={testStudentId} onChangeText={setTestStudentId} placeholder="Firebase user ID" placeholderTextColor={C.textMuted} style={styles.input} autoCapitalize="none" />
                            </View>
                            <View style={styles.fieldGroup}>
                              <Text style={styles.fieldLabel}>Score (0–{test.totalMarks})</Text>
                              <TextInput value={testScore} onChangeText={setTestScore} keyboardType="numeric" placeholder="e.g. 78" placeholderTextColor={C.textMuted} style={styles.input} />
                            </View>
                            <View style={styles.fieldGroup}>
                              <Text style={styles.fieldLabel}>Feedback</Text>
                              <TextInput value={testFeedback} onChangeText={setTestFeedback} placeholder="Optional feedback for the student..." placeholderTextColor={C.textMuted} multiline textAlignVertical="top" style={styles.textArea} />
                            </View>
                            <View style={styles.buttonRow}>
                              <Pressable onPress={() => setGradingTestKey(null)} style={({ pressed }) => [styles.secondaryButton, pressed ? styles.pressed : null]}>
                                <Text style={styles.secondaryButtonText}>Cancel</Text>
                              </Pressable>
                              <Pressable onPress={() => handleGradeTest(test)} disabled={testGradingSaving}
                                style={({ pressed }) => [styles.primaryButton, (testGradingSaving || pressed) ? styles.pressed : null]}>
                                {testGradingSaving ? <ActivityIndicator size="small" color={C.textInverse} /> : <Text style={styles.primaryButtonText}>Save Grade</Text>}
                              </Pressable>
                            </View>
                          </View>
                        ) : (
                          <Pressable onPress={() => { setGradingTestKey(test.id); setTestStudentId(''); setTestScore(''); setTestFeedback(''); }}
                            style={({ pressed }) => [styles.secondaryButton, pressed ? styles.pressed : null]}>
                            <Text style={styles.secondaryButtonText}>Grade a Student</Text>
                          </Pressable>
                        )}
                      </View>
                    );
                  })}
                </View>
              )
            )}
          </>
        ) : null}

        {activeView === 'announcements' ? (
          <View style={[styles.dualGrid, isWide ? styles.dualGridWide : null]}>
            <View style={[styles.workspaceCard, isWide ? styles.workspaceCardWide : null]}>
              <Text style={styles.workspaceTitle}>Publish Announcement</Text>
              <Text style={styles.workspaceBody}>
                Use concise institute updates for admissions windows, class reminders, service notices, and urgent communications.
              </Text>

              {announcementError ? (
                <View style={[styles.banner, { backgroundColor: C.dangerSoft }]}>
                  <Text style={[styles.bannerText, { color: C.danger }]}>{announcementError}</Text>
                </View>
              ) : null}

              {announcementSuccess ? (
                <View style={[styles.banner, { backgroundColor: C.successSoft }]}>
                  <Text style={[styles.bannerText, { color: C.success }]}>{announcementSuccess}</Text>
                </View>
              ) : null}

              <View style={styles.fieldGroup}>
                <Text style={styles.fieldLabel}>Title</Text>
                <TextInput
                  value={announcementTitle}
                  onChangeText={(value) => {
                    setAnnouncementTitle(value);
                    setAnnouncementError('');
                    setAnnouncementSuccess('');
                  }}
                  placeholder="Cohort 5 applications now open"
                  placeholderTextColor={C.textMuted}
                  style={styles.input}
                />
              </View>

              <View style={styles.fieldGroup}>
                <Text style={styles.fieldLabel}>Detail</Text>
                <TextInput
                  value={announcementDetail}
                  onChangeText={(value) => {
                    setAnnouncementDetail(value);
                    setAnnouncementError('');
                    setAnnouncementSuccess('');
                  }}
                  placeholder="State the update, deadline, and required action..."
                  placeholderTextColor={C.textMuted}
                  multiline
                  textAlignVertical="top"
                  style={styles.textArea}
                />
              </View>

              <View style={styles.toggleRow}>
                <View style={styles.toggleCopy}>
                  <Text style={styles.fieldLabel}>Mark as urgent</Text>
                  <Text style={styles.toggleHint}>
                    Urgent posts appear with stronger emphasis in the shared feed.
                  </Text>
                </View>
                <Switch
                  value={announcementUrgent}
                  onValueChange={setAnnouncementUrgent}
                  trackColor={{ false: C.borderStrong, true: C.primarySoft }}
                  thumbColor={announcementUrgent ? C.secondary : C.surface}
                />
              </View>

              <Pressable
                onPress={handlePublishAnnouncement}
                disabled={savingAnnouncement}
                style={({ pressed }) => [
                  styles.primaryButton,
                  (savingAnnouncement || pressed) ? styles.pressed : null,
                ]}
              >
                {savingAnnouncement ? (
                  <ActivityIndicator size="small" color={C.textInverse} />
                ) : (
                  <Text style={styles.primaryButtonText}>Publish Announcement</Text>
                )}
              </Pressable>
            </View>

            <View style={[styles.workspaceCard, isWide ? styles.workspaceCardWide : null]}>
              <Text style={styles.workspaceTitle}>Recent Feed</Text>
              <Text style={styles.workspaceBody}>
                This is what the latest institute communication stream currently looks like.
              </Text>
              <AnnouncementListCard announcements={announcements} />
            </View>
          </View>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: C.bg,
  },
  scroll: {
    flex: 1,
  },
  content: {
    paddingTop: 18,
    paddingBottom: 120,
    gap: 18,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  backPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: C.surfaceAlt,
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: C.border,
  },
  backPillText: {
    fontSize: 13,
    fontFamily: Fonts.sansSemiBold,
    color: C.secondary,
  },
  hero: {
    backgroundColor: C.surface,
    borderRadius: 28,
    padding: 22,
    borderWidth: 1,
    borderColor: C.border,
    gap: 12,
  },
  heroEyebrow: {
    fontSize: 13,
    fontFamily: Fonts.sansSemiBold,
    color: C.secondary,
    textTransform: 'uppercase',
    letterSpacing: 0.9,
  },
  heroTitle: {
    fontSize: 36,
    lineHeight: 40,
    fontFamily: Fonts.displayBold,
    color: C.textPrimary,
  },
  heroDescription: {
    fontSize: 16,
    lineHeight: 25,
    fontFamily: Fonts.sans,
    color: C.textSecondary,
    maxWidth: 760,
  },
  statusRail: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  statusChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 999,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  statusChipText: {
    fontSize: 13,
    fontFamily: Fonts.sansBold,
  },
  metaWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  metaChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: C.surfaceBrass,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: C.borderBrass,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  metaChipSubtle: {
    backgroundColor: C.surfaceAlt,
    borderColor: C.border,
  },
  metaChipText: {
    fontSize: 13,
    fontFamily: Fonts.sansSemiBold,
    color: C.secondary,
  },
  sectionNav: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  sectionButton: {
    minWidth: 148,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
    backgroundColor: C.surface,
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  sectionButtonActive: {
    backgroundColor: C.primary,
    borderColor: C.primary,
  },
  sectionButtonCopy: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  sectionButtonLabel: {
    fontSize: 13,
    fontFamily: Fonts.sansBold,
    color: C.secondary,
  },
  sectionButtonLabelActive: {
    color: C.textInverse,
  },
  sectionButtonBadge: {
    minWidth: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
    backgroundColor: C.primarySoft,
  },
  sectionButtonBadgeActive: {
    backgroundColor: 'rgba(255,255,255,0.18)',
  },
  sectionButtonBadgeText: {
    fontSize: 11,
    fontFamily: Fonts.sansBold,
    color: C.secondary,
  },
  sectionButtonBadgeTextActive: {
    color: C.textInverse,
  },
  summaryGrid: {
    gap: 12,
  },
  summaryGridWide: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  summaryCard: {
    flex: 1,
    minWidth: 180,
    backgroundColor: C.surface,
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 24,
    padding: 18,
    gap: 8,
  },
  summaryIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  summaryValue: {
    fontSize: 28,
    lineHeight: 32,
    fontFamily: Fonts.displayBold,
    color: C.textPrimary,
  },
  summaryLabel: {
    fontSize: 15,
    fontFamily: Fonts.sansBold,
    color: C.textPrimary,
  },
  summaryHelper: {
    fontSize: 13,
    lineHeight: 20,
    fontFamily: Fonts.sans,
    color: C.textMuted,
  },
  dualGrid: {
    gap: 16,
  },
  dualGridWide: {
    flexDirection: 'row',
    alignItems: 'stretch',
  },
  workspaceCard: {
    backgroundColor: C.surface,
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 24,
    padding: 18,
    gap: 14,
  },
  workspaceCardWide: {
    flex: 1,
  },
  workspaceTitle: {
    fontSize: 22,
    lineHeight: 26,
    fontFamily: Fonts.displaySemiBold,
    color: C.textPrimary,
  },
  workspaceBody: {
    fontSize: 14,
    lineHeight: 22,
    fontFamily: Fonts.sans,
    color: C.textSecondary,
  },
  workspaceMetricRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  iconBadgeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  iconBadge: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stack: {
    gap: 16,
  },
  panelCard: {
    backgroundColor: C.surface,
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 24,
    padding: 18,
    gap: 14,
  },
  panelHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 12,
  },
  panelHeaderCopy: {
    flex: 1,
    gap: 4,
  },
  panelTitle: {
    fontSize: 17,
    lineHeight: 23,
    fontFamily: Fonts.sansBold,
    color: C.textPrimary,
  },
  panelSubtitle: {
    fontSize: 13,
    fontFamily: Fonts.sans,
    color: C.textMuted,
  },
  detailsCard: {
    backgroundColor: C.surfaceAlt,
    borderRadius: 18,
    padding: 14,
    gap: 10,
    borderWidth: 1,
    borderColor: C.border,
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
  },
  noteBlock: {
    backgroundColor: C.surfaceBrass,
    borderRadius: 18,
    padding: 14,
    gap: 6,
    borderWidth: 1,
    borderColor: C.borderBrass,
  },
  noteLabel: {
    fontSize: 11,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    fontFamily: Fonts.sansSemiBold,
    color: C.secondary,
  },
  noteBody: {
    fontSize: 14,
    lineHeight: 22,
    fontFamily: Fonts.sans,
    color: C.textSecondary,
  },
  editorCard: {
    backgroundColor: C.dangerSoft,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#E7C8C0',
    padding: 14,
    gap: 12,
  },
  editorLabel: {
    fontSize: 13,
    fontFamily: Fonts.sansBold,
    color: C.danger,
  },
  fieldGroup: {
    gap: 8,
  },
  fieldLabel: {
    fontSize: 14,
    fontFamily: Fonts.sansSemiBold,
    color: C.textPrimary,
  },
  input: {
    backgroundColor: C.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: C.border,
    paddingHorizontal: 14,
    paddingVertical: 12,
    minHeight: 52,
    lineHeight: 20,
    fontSize: 14,
    fontFamily: Fonts.sans,
    color: C.textPrimary,
  },
  textArea: {
    minHeight: 110,
    backgroundColor: C.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: C.border,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14,
    fontFamily: Fonts.sans,
    color: C.textPrimary,
  },
  statusSelectorRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  selectorChip: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: C.border,
    backgroundColor: C.surface,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  selectorChipText: {
    fontSize: 13,
    fontFamily: Fonts.sansSemiBold,
    color: C.textSecondary,
  },
  buttonRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  primaryButton: {
    minHeight: 52,
    paddingHorizontal: 20,
    paddingVertical: 14,
    backgroundColor: C.primary,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryButtonText: {
    fontSize: 14,
    fontFamily: Fonts.sansBold,
    color: C.textInverse,
  },
  secondaryButton: {
    minHeight: 52,
    paddingHorizontal: 20,
    paddingVertical: 14,
    backgroundColor: C.surface,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: C.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryButtonText: {
    fontSize: 14,
    fontFamily: Fonts.sansBold,
    color: C.secondary,
  },
  dangerButton: {
    minHeight: 52,
    paddingHorizontal: 20,
    paddingVertical: 14,
    backgroundColor: C.danger,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dangerButtonText: {
    fontSize: 14,
    fontFamily: Fonts.sansBold,
    color: C.textInverse,
  },
  outcomeBar: {
    borderRadius: 16,
    backgroundColor: C.surfaceAlt,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  outcomeBarText: {
    fontSize: 13,
    fontFamily: Fonts.sansSemiBold,
    color: C.textSecondary,
  },
  emptyState: {
    backgroundColor: C.surface,
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 24,
    padding: 26,
    gap: 10,
    alignItems: 'center',
  },
  emptyStateIcon: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: C.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyStateTitle: {
    fontSize: 17,
    fontFamily: Fonts.sansBold,
    color: C.textPrimary,
    textAlign: 'center',
  },
  emptyStateBody: {
    fontSize: 14,
    lineHeight: 22,
    fontFamily: Fonts.sans,
    color: C.textMuted,
    textAlign: 'center',
    maxWidth: 560,
  },
  banner: {
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  bannerText: {
    fontSize: 13,
    lineHeight: 20,
    fontFamily: Fonts.sansSemiBold,
  },
  filterTrigger: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: C.surface,
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  filterTriggerText: {
    flex: 1,
    fontSize: 14,
    fontFamily: Fonts.sansSemiBold,
    color: C.textPrimary,
  },
  filterDropdown: {
    marginTop: 6,
    backgroundColor: C.surface,
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 14,
    overflow: 'hidden',
  },
  filterOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 13,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
  },
  filterOptionActive: {
    backgroundColor: C.primarySoft,
  },
  filterOptionText: {
    fontSize: 14,
    fontFamily: Fonts.sans,
    color: C.textSecondary,
  },
  filterOptionTextActive: {
    fontFamily: Fonts.sansSemiBold,
    color: C.secondary,
  },
  admissionsTabRow: {
    flexDirection: 'row',
    gap: 10,
  },
  admissionsTabBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: C.border,
    backgroundColor: C.surface,
  },
  admissionsTabBtnActive: {
    backgroundColor: C.primary,
    borderColor: C.primary,
  },
  admissionsTabText: {
    fontSize: 14,
    fontFamily: Fonts.sansSemiBold,
    color: C.textSecondary,
  },
  admissionsTabTextActive: {
    color: C.textInverse,
  },
  admissionsTabBadge: {
    backgroundColor: C.primarySoft,
    borderRadius: 999,
    minWidth: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 5,
  },
  admissionsTabBadgeActive: {
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
  admissionsTabBadgeText: {
    fontSize: 11,
    fontFamily: Fonts.sansBold,
    color: C.secondary,
  },
  admissionsTabBadgeTextActive: {
    color: C.textInverse,
  },
  toggleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 16,
    alignItems: 'center',
  },
  toggleCopy: {
    flex: 1,
    gap: 4,
  },
  toggleHint: {
    fontSize: 12,
    lineHeight: 19,
    fontFamily: Fonts.sans,
    color: C.textMuted,
  },
  feedCard: {
    backgroundColor: C.surfaceAlt,
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 18,
    padding: 14,
    gap: 12,
  },
  feedRow: {
    flexDirection: 'row',
    gap: 12,
  },
  feedMarker: {
    width: 8,
    borderRadius: 999,
  },
  feedCopy: {
    flex: 1,
    gap: 6,
  },
  feedTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 10,
  },
  feedTitle: {
    flex: 1,
    fontSize: 14,
    lineHeight: 20,
    fontFamily: Fonts.sansBold,
    color: C.textPrimary,
  },
  feedTime: {
    fontSize: 12,
    fontFamily: Fonts.sans,
    color: C.textMuted,
  },
  feedBody: {
    fontSize: 13,
    lineHeight: 20,
    fontFamily: Fonts.sans,
    color: C.textSecondary,
  },
  feedDivider: {
    height: 1,
    backgroundColor: C.border,
  },
  pressed: {
    opacity: 0.86,
  },
  notifCard: {
    backgroundColor: C.surface,
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 24,
    padding: 18,
    gap: 12,
  },
  notifHeaderRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  notifTitle: {
    fontSize: 17,
    fontFamily: Fonts.sansBold,
    color: C.textPrimary,
  },
  notifSubtitle: {
    fontSize: 13,
    fontFamily: Fonts.sans,
    color: C.textMuted,
  },
  notifMarkBtn: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    backgroundColor: C.surfaceAlt,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: C.border,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 100,
  },
  notifMarkBtnText: {
    fontSize: 13,
    fontFamily: Fonts.sansSemiBold,
    color: C.secondary,
  },
  notifRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  notifDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginTop: 5,
  },
  notifMessage: {
    fontSize: 14,
    lineHeight: 20,
    fontFamily: Fonts.sans,
    color: C.textPrimary,
  },
  notifTime: {
    fontSize: 12,
    fontFamily: Fonts.sans,
    color: C.textMuted,
  },
  tabRow: {
    flexDirection: 'row',
    gap: 10,
  },
  tabBtn: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: C.border,
    backgroundColor: C.surface,
    alignItems: 'center',
  },
  tabBtnActive: {
    backgroundColor: C.primary,
    borderColor: C.primary,
  },
  tabBtnText: {
    fontSize: 13,
    fontFamily: Fonts.sansBold,
    color: C.secondary,
  },
  tabBtnTextActive: {
    color: C.textInverse,
  },
  matRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
  },
  matTypeTag: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  matTypeText: {
    fontSize: 10,
    fontFamily: Fonts.sansBold,
    color: C.secondary,
  },
  matTitle: {
    fontSize: 14,
    fontFamily: Fonts.sansSemiBold,
    color: C.textPrimary,
  },
  matMeta: {
    fontSize: 12,
    fontFamily: Fonts.sans,
    color: C.textMuted,
  },
  materialsHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 12,
  },
  materialsHeaderRowStacked: {
    flexDirection: 'column',
  },
  materialsHeaderChipWrap: {
    alignSelf: 'flex-start',
    maxWidth: '100%',
  },
  materialSectionTitle: {
    fontSize: 15,
    fontFamily: Fonts.sansBold,
    color: C.textPrimary,
  },
  materialMetaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  materialRecordCard: {
    backgroundColor: C.surfaceAlt,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: C.border,
    padding: 16,
    gap: 10,
  },
  materialRecordTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 12,
  },
  materialRecordActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  materialActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: C.secondary,
    backgroundColor: C.primarySoft,
  },
  materialActionBtnText: {
    fontSize: 12,
    fontFamily: Fonts.sansBold,
    color: C.secondary,
  },
  deleteBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: C.dangerSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  subCard: {
    backgroundColor: C.surfaceAlt,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: C.border,
    padding: 14,
    gap: 10,
  },
  subHeaderRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  subUserId: {
    fontSize: 13,
    fontFamily: Fonts.sansSemiBold,
    color: C.textPrimary,
  },
  subMeta: {
    fontSize: 12,
    fontFamily: Fonts.sans,
    color: C.textMuted,
  },
  subTextCard: {
    backgroundColor: C.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: C.border,
    padding: 12,
    gap: 4,
  },
  gradeBtn: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    backgroundColor: C.primarySoft,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: C.secondary,
  },
  gradeBtnText: {
    fontSize: 12,
    fontFamily: Fonts.sansBold,
    color: C.secondary,
  },
  gradeForm: {
    backgroundColor: C.surface,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: C.border,
    padding: 14,
    gap: 12,
  },
  browseBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 18,
    paddingVertical: 14,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: C.secondary,
    backgroundColor: C.primarySoft,
  },
  browseBtnText: {
    fontSize: 14,
    fontFamily: Fonts.sansBold,
    color: C.secondary,
  },
  materialSourceCard: {
    minHeight: 168,
    backgroundColor: C.surfaceAlt,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: C.border,
    padding: 16,
    gap: 12,
  },
  materialsWorkspaceCard: {
    marginTop: 10,
  },
  materialSourceTitle: {
    fontSize: 14,
    fontFamily: Fonts.sansBold,
    color: C.textPrimary,
  },
  materialPickerRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 10,
  },
  materialUrlInput: {
    width: '100%',
  },
  pickedFilePill: {
    flex: 1,
    minWidth: 220,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: C.successSoft,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  pickedFileName: {
    flex: 1,
    fontSize: 13,
    fontFamily: Fonts.sansSemiBold,
    color: C.success,
  },
  fieldNote: {
    fontSize: 12,
    lineHeight: 18,
    fontFamily: Fonts.sans,
    color: C.textMuted,
  },
});

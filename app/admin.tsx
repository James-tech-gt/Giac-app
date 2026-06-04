import { AccessGate } from '@/components/access-gate';
import { DatePickerField } from '@/components/date-picker-field';
import { C, Fonts } from '@/constants/theme';
import { auth } from '@/services/firebase';
import {
  AccountDeletionRequest,
  AdminAssignment,
  AdminTest,
  AdminNotification,
  Announcement,
  Application,
  Material,
  Service,
  UserRecord,
  approveAccountDeletionRequest,
  approveApplication,
  deleteApplication,
  assignMediator,
  createAdminAssignment,
  createAdminTest,
  createAnnouncement,
  createMaterial,
  deleteMaterial,
  getAllUsers,
  gradeAssignmentSubmission,
  gradeTestSubmission,
  markAdminNotificationsRead,
  createAdminNotification,
  createStudentNotification,
  deleteService,
  rejectAccountDeletionRequest,
  rejectApplication,
  subscribeAccountDeletionRequests,
  subscribeAdminAssignments,
  subscribeAdminNotifications,
  subscribeAdminTests,
  subscribeAllApplications,
  subscribeAllMaterials,
  subscribeAllServices,
  subscribeAnnouncements,
  updateCaseStatus,
  updateUserRole,
  markCourseComplete,
  setStudentProgress,
  createSession,
  subscribeAdminSessions,
  deleteSession,
  createPersonalSession,
  deletePersonalSession,
  deleteAssignment,
  deleteTest,
  CourseRegistration,
  subscribePendingRegistrations,
  subscribeAllRegistrations,
  sendAdmissionLetter,
  rejectRegistration,
  deleteRegistration,
  issueCertificate,
  deleteCertificate,
  updatePaymentStatus,
  toggleAccessLock,
  isPaymentLocked,
  type Session,
  type CreateSessionInput,
  Course,
  subscribeCourses,
  createCourse,
  updateCourse,
  deleteCourse,
  deleteAnnouncement,
  sendGraduationInvitation,
  subscribeAllGraduationInvitations,
  deleteGraduationInvitation,
  GraduationInvitation,
  updateServiceMeetingLink,
} from '@/services/firestore';
import { uploadFile, deleteFile } from '@/services/storage';
import { FontAwesome6 } from '@expo/vector-icons';
import * as DocumentPicker from 'expo-document-picker';
import * as WebBrowser from 'expo-web-browser';
import { router, useLocalSearchParams } from 'expo-router';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Linking,
  Modal,
  Platform,
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

type AdminView = 'overview' | 'admissions' | 'cases' | 'announcements' | 'materials' | 'assignments' | 'tests' | 'deletions' | 'team' | 'registrations' | 'courses';

type StatusTone = {
  bg: string;
  color: string;
  dot: string;
  label: string;
};

function getOutcomeLabel(grade: number): string {
  if (grade >= 90) return 'Excellent';
  if (grade >= 70) return 'Satisfactory';
  return 'Needs Revision';
}

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
  if (status === 'withdrawn') {
    return { label: 'Withdrawn', color: C.textMuted, bg: C.surfaceAlt, dot: C.textMuted };
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
  onDelete,
}: {
  application: Application;
  busy: boolean;
  onApprove: () => void;
  onReject: (feedback: string) => void;
  onDelete: () => void;
}) {
  const tone = getApplicationTone(application.status);
  const [rejecting, setRejecting] = useState(false);
  const [feedback, setFeedback] = useState('');
  const [confirmDelete, setConfirmDelete] = useState(false);

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
        {application.whatsapp?.trim() ? (
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>WhatsApp</Text>
            <Text style={styles.detailValue}>{application.whatsapp.trim()}</Text>
          </View>
        ) : null}
        {application.location?.trim() ? (
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Location</Text>
            <Text style={styles.detailValue}>{application.location.trim()}</Text>
          </View>
        ) : null}
        {application.educationLevel?.trim() ? (
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Education</Text>
            <Text style={styles.detailValue}>{application.educationLevel.trim()}</Text>
          </View>
        ) : null}
        {application.areaOfStudy?.trim() ? (
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Area of Study</Text>
            <Text style={styles.detailValue}>{application.areaOfStudy.trim()}</Text>
          </View>
        ) : null}
        {application.occupation?.trim() ? (
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Occupation</Text>
            <Text style={styles.detailValue}>{application.occupation.trim()}</Text>
          </View>
        ) : null}
        {application.organization?.trim() ? (
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Organisation</Text>
            <Text style={styles.detailValue}>{application.organization.trim()}</Text>
          </View>
        ) : null}
        {application.paymentMode?.trim() ? (
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Payment Mode</Text>
            <Text style={styles.detailValue}>{application.paymentMode.trim()}</Text>
          </View>
        ) : null}
        {application.transactionRef?.trim() ? (
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Transaction Ref</Text>
            <Text style={[styles.detailValue, { fontWeight: '700' }]}>{application.transactionRef.trim()}</Text>
          </View>
        ) : null}
        {application.receiptLink?.trim() ? (
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Receipt</Text>
            <Pressable
              onPress={() => WebBrowser.openBrowserAsync(application.receiptLink!)}
              style={({ pressed }) => [styles.fileChip, pressed && styles.pressed]}
            >
              <FontAwesome6 name="file-lines" size={12} color={C.secondary} />
              <Text style={styles.fileChipText}>View Receipt</Text>
              <FontAwesome6 name="arrow-up-right-from-square" size={11} color={C.textMuted} />
            </Pressable>
          </View>
        ) : null}
        {application.certificateLink?.trim() ? (
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Certificate</Text>
            <Pressable
              onPress={() => WebBrowser.openBrowserAsync(application.certificateLink!)}
              style={({ pressed }) => [styles.fileChip, pressed && styles.pressed]}
            >
              <FontAwesome6 name="certificate" size={12} color={C.secondary} />
              <Text style={styles.fileChipText}>View Certificate</Text>
              <FontAwesome6 name="arrow-up-right-from-square" size={11} color={C.textMuted} />
            </Pressable>
          </View>
        ) : null}
      </View>
      {application.motivation?.trim() ? (
        <View style={styles.noteBlock}>
          <Text style={styles.noteLabel}>Motivation</Text>
          <Text style={styles.noteBody}>{application.motivation.trim()}</Text>
        </View>
      ) : null}

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

      {confirmDelete ? (
        <View style={styles.editorCard}>
          <Text style={[styles.editorLabel, { color: C.danger }]}>Delete this application permanently?</Text>
          <View style={styles.buttonRow}>
            <Pressable
              onPress={() => setConfirmDelete(false)}
              style={({ pressed }) => [styles.secondaryButton, pressed ? styles.pressed : null]}
            >
              <Text style={styles.secondaryButtonText}>Cancel</Text>
            </Pressable>
            <Pressable
              onPress={onDelete}
              disabled={busy}
              style={({ pressed }) => [styles.dangerButton, pressed ? styles.pressed : null]}
            >
              <Text style={styles.dangerButtonText}>Delete</Text>
            </Pressable>
          </View>
        </View>
      ) : (
        <Pressable
          onPress={() => setConfirmDelete(true)}
          style={({ pressed }) => [styles.deleteRow, pressed ? styles.pressed : null]}
        >
          <FontAwesome6 name="trash" size={12} color={C.danger} />
          <Text style={styles.deleteRowText}>Delete application</Text>
        </Pressable>
      )}
    </View>
  );
}

function CaseCard({
  busyAssign,
  busyStatus,
  busyDelete,
  onAssignMediator,
  onMarkComplete,
  onDelete,
  service,
}: {
  busyAssign: boolean;
  busyStatus: boolean;
  busyDelete: boolean;
  onAssignMediator: (name: string, note: string) => void;
  onMarkComplete: (resolution: string) => void;
  onDelete: () => void;
  service: Service;
}) {
  const tone = getServiceTone(service.status);
  const [mediatorName, setMediatorName] = useState(service.mediatorName ?? '');
  const [mediatorNote, setMediatorNote] = useState(service.mediatorNote ?? '');
  const [meetingLink, setMeetingLink] = useState(service.meetingLink ?? '');
  const [linkSaving, setLinkSaving] = useState(false);
  const [linkDeleting, setLinkDeleting] = useState(false);
  const [resolution, setResolution] = useState(service.resolution ?? '');
  const [confirmDelete, setConfirmDelete] = useState(false);

  useEffect(() => {
    setMediatorName(service.mediatorName ?? '');
    setMediatorNote(service.mediatorNote ?? '');
    setMeetingLink(service.meetingLink ?? '');
    setResolution(service.resolution ?? '');
  }, [service.mediatorName, service.mediatorNote, service.meetingLink, service.resolution]);

  const handleSaveLink = async () => {
    if (!meetingLink.trim()) { Alert.alert('Required', 'Enter a Zoom or Google Meet link.'); return; }
    setLinkSaving(true);
    try {
      await updateServiceMeetingLink(service.id, meetingLink);
      await createStudentNotification(service.userId, 'A session link has been added to your case. Join when ready.', 'case_message', service.id);
    } catch {
      Alert.alert('Error', 'Could not save the meeting link. Please try again.');
    } finally {
      setLinkSaving(false);
    }
  };

  const handleDeleteLink = async () => {
    setLinkDeleting(true);
    try {
      await updateServiceMeetingLink(service.id, '');
      setMeetingLink('');
    } catch {
      Alert.alert('Error', 'Could not remove the meeting link. Please try again.');
    } finally {
      setLinkDeleting(false);
    }
  };

  return (
    <View style={styles.panelCard}>
      <View style={styles.panelHeaderRow}>
        <View style={styles.panelHeaderCopy}>
          <Text style={styles.panelTitle}>
            {service.serviceType === 'arbitration' ? 'Arbitration' : 'Mediation'} — {service.category || 'Uncategorized'}
          </Text>
          <Text style={styles.panelSubtitle}>Submitted {formatDate(service.createdAt)}</Text>
        </View>
        <StatusChip tone={tone} />
      </View>

      <View style={styles.detailsCard}>
        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Client</Text>
          <Text style={styles.detailValue}>{service.clientName?.trim() || 'Unknown'}</Text>
        </View>
        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Email</Text>
          <Text style={styles.detailValue}>{service.clientEmail?.trim() || service.userId}</Text>
        </View>
      </View>

      <View style={styles.detailsCard}>
        <Text style={styles.noteLabel}>Case details</Text>
        <Text style={styles.noteBody}>{service.caseDetails?.trim() || 'No case summary was provided.'}</Text>
      </View>

      <View style={styles.fieldGroup}>
        <Text style={styles.fieldLabel}>Mediator / Officer name</Text>
        <TextInput
          value={mediatorName}
          onChangeText={setMediatorName}
          placeholder="Full name of assigned mediator"
          placeholderTextColor={C.textMuted}
          style={styles.input}
        />
      </View>

      <View style={styles.fieldGroup}>
        <Text style={styles.fieldLabel}>Note to client (optional)</Text>
        <TextInput
          value={mediatorNote}
          onChangeText={setMediatorNote}
          placeholder="e.g. Your mediator will contact you within 48 hours."
          placeholderTextColor={C.textMuted}
          multiline
          style={[styles.input, { minHeight: 60, textAlignVertical: 'top' }]}
        />
      </View>

      <Pressable
        onPress={() => onAssignMediator(mediatorName, mediatorNote)}
        disabled={busyAssign}
        style={({ pressed }) => [styles.primaryButton, (busyAssign || pressed) ? styles.pressed : null]}
      >
        {busyAssign
          ? <ActivityIndicator size="small" color={C.textInverse} />
          : <Text style={styles.primaryButtonText}>
              {service.mediatorName ? 'Update Mediator' : 'Assign Mediator'}
            </Text>
        }
      </Pressable>

      {/* ── Zoom / Meeting Link ── */}
      <View style={styles.fieldGroup}>
        <Text style={styles.fieldLabel}>Session Link (Zoom / Google Meet)</Text>
        <TextInput
          value={meetingLink}
          onChangeText={setMeetingLink}
          placeholder="https://zoom.us/j/... or meet.google.com/..."
          placeholderTextColor={C.textMuted}
          autoCapitalize="none"
          keyboardType="url"
          style={styles.input}
        />
        <View style={{ flexDirection: 'row', gap: 8, marginTop: 4 }}>
          <Pressable
            onPress={handleSaveLink}
            disabled={linkSaving}
            style={({ pressed }) => [styles.primaryButton, { flex: 1 }, (linkSaving || pressed) ? styles.pressed : null]}
          >
            {linkSaving
              ? <ActivityIndicator size="small" color={C.textInverse} />
              : <Text style={styles.primaryButtonText}>Send Link to Student</Text>
            }
          </Pressable>
          {service.meetingLink ? (
            <Pressable
              onPress={handleDeleteLink}
              disabled={linkDeleting}
              style={({ pressed }) => [
                styles.primaryButton,
                { backgroundColor: C.danger, paddingHorizontal: 14 },
                (linkDeleting || pressed) ? styles.pressed : null,
              ]}
            >
              {linkDeleting
                ? <ActivityIndicator size="small" color={C.textInverse} />
                : <FontAwesome6 name="trash" size={14} color={C.textInverse} />
              }
            </Pressable>
          ) : null}
        </View>
      </View>

      {service.status === 'in-progress' ? (
        <>
          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>Resolution summary (optional)</Text>
            <TextInput
              value={resolution}
              onChangeText={setResolution}
              placeholder="Describe the outcome or resolution before marking complete."
              placeholderTextColor={C.textMuted}
              multiline
              style={[styles.input, { minHeight: 72, textAlignVertical: 'top' }]}
            />
          </View>
          <View style={styles.buttonRow}>
            <Pressable
              onPress={() => onMarkComplete(resolution)}
              disabled={busyStatus}
              style={({ pressed }) => [styles.primaryButton, { flex: 1 }, (busyStatus || pressed) ? styles.pressed : null]}
            >
              {busyStatus
                ? <ActivityIndicator size="small" color={C.textInverse} />
                : <Text style={styles.primaryButtonText}>Mark Complete</Text>
              }
            </Pressable>
            {confirmDelete ? (
              <View style={styles.confirmRow}>
                <Text style={styles.confirmText}>Delete this case?</Text>
                <Pressable onPress={() => setConfirmDelete(false)} style={({ pressed }) => [styles.secondaryButton, pressed ? styles.pressed : null]}>
                  <Text style={styles.secondaryButtonText}>Cancel</Text>
                </Pressable>
                <Pressable onPress={() => { setConfirmDelete(false); onDelete(); }} disabled={busyDelete} style={({ pressed }) => [styles.dangerButton, (busyDelete || pressed) ? styles.pressed : null]}>
                  {busyDelete ? <ActivityIndicator size="small" color={C.textInverse} /> : <Text style={styles.dangerButtonText}>Delete</Text>}
                </Pressable>
              </View>
            ) : (
              <Pressable onPress={() => setConfirmDelete(true)} style={({ pressed }) => [styles.deleteBtn, pressed ? styles.pressed : null]}>
                <FontAwesome6 name="trash" size={14} color={C.danger} />
              </Pressable>
            )}
          </View>
        </>
      ) : service.status === 'completed' ? (
        <>
          {service.resolution ? (
            <View style={[styles.detailsCard, { borderColor: C.success + '40' }]}>
              <Text style={[styles.noteLabel, { color: C.success }]}>Resolution</Text>
              <Text style={styles.noteBody}>{service.resolution}</Text>
            </View>
          ) : null}
          <View style={styles.buttonRow}>
            <View style={{ flex: 1 }} />
            {confirmDelete ? (
              <View style={styles.confirmRow}>
                <Text style={styles.confirmText}>Delete this case?</Text>
                <Pressable onPress={() => setConfirmDelete(false)} style={({ pressed }) => [styles.secondaryButton, pressed ? styles.pressed : null]}>
                  <Text style={styles.secondaryButtonText}>Cancel</Text>
                </Pressable>
                <Pressable onPress={() => { setConfirmDelete(false); onDelete(); }} disabled={busyDelete} style={({ pressed }) => [styles.dangerButton, (busyDelete || pressed) ? styles.pressed : null]}>
                  {busyDelete ? <ActivityIndicator size="small" color={C.textInverse} /> : <Text style={styles.dangerButtonText}>Delete</Text>}
                </Pressable>
              </View>
            ) : (
              <Pressable onPress={() => setConfirmDelete(true)} style={({ pressed }) => [styles.deleteBtn, pressed ? styles.pressed : null]}>
                <FontAwesome6 name="trash" size={14} color={C.danger} />
              </Pressable>
            )}
          </View>
        </>
      ) : (
        <View style={styles.buttonRow}>
          <View style={{ flex: 1 }} />
          {confirmDelete ? (
            <View style={styles.confirmRow}>
              <Text style={styles.confirmText}>Delete this case?</Text>
              <Pressable onPress={() => setConfirmDelete(false)} style={({ pressed }) => [styles.secondaryButton, pressed ? styles.pressed : null]}>
                <Text style={styles.secondaryButtonText}>Cancel</Text>
              </Pressable>
              <Pressable onPress={() => { setConfirmDelete(false); onDelete(); }} disabled={busyDelete} style={({ pressed }) => [styles.dangerButton, (busyDelete || pressed) ? styles.pressed : null]}>
                {busyDelete ? <ActivityIndicator size="small" color={C.textInverse} /> : <Text style={styles.dangerButtonText}>Delete</Text>}
              </Pressable>
            </View>
          ) : (
            <Pressable onPress={() => setConfirmDelete(true)} style={({ pressed }) => [styles.deleteBtn, pressed ? styles.pressed : null]}>
              <FontAwesome6 name="trash" size={14} color={C.danger} />
            </Pressable>
          )}
        </View>
      )}

      <View style={styles.chatDivider} />
      <Pressable
        onPress={() => router.push({
          pathname: '/admin-case-chat',
          params: {
            caseId: service.id,
            category: service.category ?? '',
            serviceType: service.serviceType ?? '',
            clientUserId: service.userId ?? '',
            mediatorName: service.mediatorName ?? '',
          },
        })}
        style={({ pressed }) => [styles.openChatBtn, pressed && styles.pressed]}
      >
        <FontAwesome6 name="comments" size={14} color={C.textInverse} />
        <Text style={styles.openChatBtnText}>Open Client Chat</Text>
      </Pressable>
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
  const { openCaseId, openAdmissions, openRegistrations } = useLocalSearchParams<{ openCaseId?: string; openAdmissions?: string; openRegistrations?: string }>();
  const openCaseFired = useRef(false);
  const openAdmissionsFired = useRef(false);
  const openRegistrationsFired = useRef(false);
  const admissionsMsgTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const sessionMsgTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const teamMsgTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [applications, setApplications] = useState<Application[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);

  const [adminNotifications, setAdminNotifications] = useState<AdminNotification[]>([]);
  const [markingRead, setMarkingRead] = useState(false);
  const [admissionsMsg, setAdmissionsMsg] = useState<{ text: string; kind: 'success' | 'error' } | null>(null);
  const [admissionsTab, setAdmissionsTab] = useState<'enrolled' | 'pending' | 'rejected' | 'withdrawn'>('enrolled');
  const [expandedEnrolledId, setExpandedEnrolledId] = useState<string | null>(null);
  const [generatingCertId, setGeneratingCertId] = useState<string | null>(null);
  const [deletingCertId, setDeletingCertId] = useState<string | null>(null);
  const [markingCompleteId, setMarkingCompleteId] = useState<string | null>(null);
  const [confirmDeleteCertId, setConfirmDeleteCertId] = useState<string | null>(null);
  const [confirmDeleteEnrollId, setConfirmDeleteEnrollId] = useState<string | null>(null);
  const [certSuccessApp, setCertSuccessApp] = useState<Application | null>(null);
  const [pendingCertFile, setPendingCertFile] = useState<{ appId: string; asset: DocumentPicker.DocumentPickerAsset } | null>(null);
  const [graduationInviteApp, setGraduationInviteApp] = useState<Application | null>(null);
  const [graduationMessage, setGraduationMessage] = useState('');
  const [graduationLetter, setGraduationLetter] = useState<{ uri: string; name: string } | null>(null);
  const [sendingGradInvite, setSendingGradInvite] = useState(false);
  const [gradInviteError, setGradInviteError] = useState('');
  const [gradInviteSuccess, setGradInviteSuccess] = useState(false);
  const [allGradInvites, setAllGradInvites] = useState<GraduationInvitation[]>([]);
  const [deletingInviteId, setDeletingInviteId] = useState<string | null>(null);
  const [markingPaidId, setMarkingPaidId] = useState<string | null>(null);
  const [lockingId, setLockingId] = useState<string | null>(null);
  const [progressEditing, setProgressEditing] = useState<Record<string, string>>({});
  const [savingProgressId, setSavingProgressId] = useState<string | null>(null);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [sessionCourseIds, setSessionCourseIds] = useState<string[]>([]);
  const [sessionTitle, setSessionTitle] = useState('');
  const [sessionDate, setSessionDate] = useState('');
  const [sessionLink, setSessionLink] = useState('');
  const [sessionSaving, setSessionSaving] = useState(false);
  const [sessionMsg, setSessionMsg] = useState<{ text: string; kind: 'success' | 'error' } | null>(null);
  const [personalSessionInputs, setPersonalSessionInputs] = useState<Record<string, { title: string; date: string; link: string }>>({});
  const [personalSessionSavingId, setPersonalSessionSavingId] = useState<string | null>(null);

  // Team
  const [teamUsers, setTeamUsers] = useState<UserRecord[]>([]);
  const [teamLoading, setTeamLoading] = useState(false);
  const [teamMsg, setTeamMsg] = useState<{ text: string; kind: 'success' | 'error' } | null>(null);
  const [togglingUserId, setTogglingUserId] = useState<string | null>(null);
  const [expandedUserId, setExpandedUserId] = useState<string | null>(null);
  const [confirmingUserId, setConfirmingUserId] = useState<string | null>(null);

  // Materials
  const [materials, setMaterials] = useState<Material[]>([]);
  const [matTitle, setMatTitle] = useState('');
  const [matModule, setMatModule] = useState('');
  const [matCourse, setMatCourse] = useState('pecadr');
  const [matType, setMatType] = useState<Material['type']>('link');
  const [matUrl, setMatUrl] = useState('');
  const [matFileName, setMatFileName] = useState('');
  const [matUploading, setMatUploading] = useState(false);
  const [matUploadProgress, setMatUploadProgress] = useState(0);
  const [matSaving, setMatSaving] = useState(false);
  const [matMsg, setMatMsg] = useState<{ text: string; kind: 'success' | 'error' } | null>(null);

  // Assignments
  const [adminAssignments, setAdminAssignments] = useState<AdminAssignment[]>([]);
  const [asnTab, setAsnTab] = useState<'create' | 'submissions'>('create');
  const [asnTitle, setAsnTitle] = useState('');
  const [asnDesc, setAsnDesc] = useState('');
  const [asnDeadline, setAsnDeadline] = useState('');
  const [asnCourse, setAsnCourse] = useState('pecadr');
  const [asnSaving, setAsnSaving] = useState(false);
  const [asnMsg, setAsnMsg] = useState<{ text: string; kind: 'success' | 'error' } | null>(null);
  const [asnFileUrl, setAsnFileUrl] = useState('');
  const [asnFileName, setAsnFileName] = useState('');
  const [asnUploading, setAsnUploading] = useState(false);
  const [asnUploadProgress, setAsnUploadProgress] = useState(0);
  const [gradingKey, setGradingKey] = useState<string | null>(null);
  const [selectedOutcome, setSelectedOutcome] = useState<'needs_revision' | 'satisfactory' | 'excellent' | null>(null);
  const [reviewFeedback, setReviewFeedback] = useState('');
  const [gradingSaving, setGradingSaving] = useState(false);

  // Tests
  const [adminTests, setAdminTests] = useState<AdminTest[]>([]);
  const [testTab, setTestTab] = useState<'create' | 'submissions'>('create');
  const [testTitle, setTestTitle] = useState('');
  const [testDesc, setTestDesc] = useState('');
  const [testDate, setTestDate] = useState('');
  const [testDuration, setTestDuration] = useState('60');
  const [testCourse, setTestCourse] = useState<'pecadr' | 'pemadr'>('pecadr');
  const [testSaving, setTestSaving] = useState(false);
  const [testMsg, setTestMsg] = useState<{ text: string; kind: 'success' | 'error' } | null>(null);
  const [testFileUrl, setTestFileUrl] = useState('');
  const [testFileName, setTestFileName] = useState('');
  const [testUploading, setTestUploading] = useState(false);
  const [testUploadProgress, setTestUploadProgress] = useState(0);
  const [reviewingTestKey, setReviewingTestKey] = useState<string | null>(null);
  const [selectedTestOutcome, setSelectedTestOutcome] = useState<'needs_revision' | 'satisfactory' | 'excellent' | null>(null);
  const [testReviewFeedback, setTestReviewFeedback] = useState('');
  const [testReviewSaving, setTestReviewSaving] = useState(false);

  const [casesTab, setCasesTab] = useState<'unassigned' | 'assigned'>('unassigned');
  const [busyApplicationId, setBusyApplicationId] = useState<string | null>(null);
  const [busyAssignId, setBusyAssignId] = useState<string | null>(null);
  const [busyStatusId, setBusyStatusId] = useState<string | null>(null);
  const [busyDeleteId, setBusyDeleteId] = useState<string | null>(null);
  const [announcementTitle, setAnnouncementTitle] = useState('');
  const [announcementDetail, setAnnouncementDetail] = useState('');
  const [announcementUrgent, setAnnouncementUrgent] = useState(false);
  const [savingAnnouncement, setSavingAnnouncement] = useState(false);
  const [announcementError, setAnnouncementError] = useState('');
  const [announcementSuccess, setAnnouncementSuccess] = useState('');

  const showAdmissionsMsg = (msg: { text: string; kind: 'success' | 'error' } | null) => {
    if (admissionsMsgTimer.current) clearTimeout(admissionsMsgTimer.current);
    setAdmissionsMsg(msg);
    if (msg?.kind === 'success') {
      admissionsMsgTimer.current = setTimeout(() => showAdmissionsMsg(null), 5000);
    }
  };
  const showSessionMsg = (msg: { text: string; kind: 'success' | 'error' } | null) => {
    if (sessionMsgTimer.current) clearTimeout(sessionMsgTimer.current);
    setSessionMsg(msg);
    if (msg?.kind === 'success') {
      sessionMsgTimer.current = setTimeout(() => showSessionMsg(null), 5000);
    }
  };
  const showTeamMsg = (msg: { text: string; kind: 'success' | 'error' } | null) => {
    if (teamMsgTimer.current) clearTimeout(teamMsgTimer.current);
    setTeamMsg(msg);
    if (msg?.kind === 'success') {
      teamMsgTimer.current = setTimeout(() => showTeamMsg(null), 5000);
    }
  };

  useEffect(() => subscribeAllApplications(setApplications), []);
  useEffect(() => subscribeAllServices(setServices), []);
  useEffect(() => subscribeAnnouncements(setAnnouncements), []);
  useEffect(() => subscribeAdminNotifications(setAdminNotifications), []);
  useEffect(() => subscribeAdminSessions(setSessions), []);
  useEffect(() => subscribeAllGraduationInvitations(setAllGradInvites), []);

  // Navigate straight to the Cases view when arriving from a notification tap
  useEffect(() => {
    if (openCaseId && !openCaseFired.current) {
      openCaseFired.current = true;
      setActiveView('cases');
    }
  }, [openCaseId]);

  // Navigate straight to Admissions → Withdrawn tab when arriving from a withdrawal notification
  useEffect(() => {
    if (openAdmissions && !openAdmissionsFired.current) {
      openAdmissionsFired.current = true;
      setActiveView('admissions');
      setAdmissionsTab('withdrawn');
    }
  }, [openAdmissions]);

  useEffect(() => {
    if (openRegistrations && !openRegistrationsFired.current) {
      openRegistrationsFired.current = true;
      setActiveView('registrations');
    }
  }, [openRegistrations]);

  // Once services load, switch to whichever tab contains the target case
  useEffect(() => {
    if (!openCaseId || services.length === 0) return;
    const target = services.find((s) => s.id === openCaseId);
    if (target) setCasesTab(target.mediatorName ? 'assigned' : 'unassigned');
  }, [openCaseId, services]);
  useEffect(() => subscribeAllMaterials(setMaterials), []);
  useEffect(() => subscribeAdminAssignments(setAdminAssignments), []);
  useEffect(() => subscribeAdminTests(setAdminTests), []);

  const [deletionRequests, setDeletionRequests] = useState<AccountDeletionRequest[]>([]);
  const [busyDeletionId, setBusyDeletionId] = useState<string | null>(null);
  useEffect(() => subscribeAccountDeletionRequests(setDeletionRequests), []);

  const [registrations, setRegistrations] = useState<CourseRegistration[]>([]);
  const [studentNumberInputs, setStudentNumberInputs] = useState<Record<string, string>>({});
  const [letterFileUrls, setLetterFileUrls] = useState<Record<string, string>>({});
  const [letterFileNames, setLetterFileNames] = useState<Record<string, string>>({});
  const [uploadingLetterId, setUploadingLetterId] = useState<string | null>(null);
  const [letterUploadProgress, setLetterUploadProgress] = useState(0);
  const [busyRegId, setBusyRegId] = useState<string | null>(null);
  const [confirmDeleteRegId, setConfirmDeleteRegId] = useState<string | null>(null);
  useEffect(() => subscribeAllRegistrations(setRegistrations), []);

  // Courses
  const [courses, setCourses] = useState<Course[]>([]);
  const [editingCourseId, setEditingCourseId] = useState<string | null>(null);
  const [savingCourse, setSavingCourse] = useState(false);
  const [courseMsg, setCourseMsg] = useState<{ text: string; kind: 'success' | 'error' } | null>(null);
  const [courseTitle, setCourseTitle] = useState('');
  const [courseProgram, setCourseProgram] = useState('');
  const [courseLevel, setCourseLevel] = useState('');
  const [courseDuration, setCourseDuration] = useState('');
  const [courseFees, setCourseFees] = useState('');
  const [courseSchedule, setCourseSchedule] = useState('');
  const [coursePlatform, setCoursePlatform] = useState('');
  const [courseDescription, setCourseDescription] = useState('');
  const [coursePractical, setCoursePractical] = useState('');
  const [courseIdealFor, setCourseIdealFor] = useState('');
  const [courseContentRaw, setCourseContentRaw] = useState('');
  const [deletingCourseId, setDeletingCourseId] = useState<string | null>(null);
  const [deletingAnnouncementId, setDeletingAnnouncementId] = useState<string | null>(null);
  useEffect(() => subscribeCourses(setCourses), []);

  const applicationCounts = useMemo(() => {
    return {
      approved: applications.filter((item) => item.status === 'approved' || item.status === 'completed').length,
      pending: applications.filter((item) => item.status === 'pending').length,
      rejected: applications.filter((item) => item.status === 'rejected').length,
      withdrawn: applications.filter((item) => item.status === 'withdrawn').length,
      total: applications.filter((item) => item.status !== 'withdrawn').length,
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

  const enrolledApplications = useMemo(
    () =>
      applications
        .filter((a) => a.status === 'approved' || a.status === 'completed')
        .sort((a, b) => {
          const aTime = typeof a.decidedAt?.toDate === 'function' ? a.decidedAt.toDate().getTime() : new Date(a.decidedAt ?? 0).getTime();
          const bTime = typeof b.decidedAt?.toDate === 'function' ? b.decidedAt.toDate().getTime() : new Date(b.decidedAt ?? 0).getTime();
          return bTime - aTime;
        }),
    [applications]
  );

  const rejectedApplications = useMemo(
    () =>
      applications
        .filter((a) => a.status === 'rejected')
        .sort((a, b) => {
          const aTime = typeof a.decidedAt?.toDate === 'function' ? a.decidedAt.toDate().getTime() : new Date(a.decidedAt ?? 0).getTime();
          const bTime = typeof b.decidedAt?.toDate === 'function' ? b.decidedAt.toDate().getTime() : new Date(b.decidedAt ?? 0).getTime();
          return bTime - aTime;
        }),
    [applications]
  );

  const withdrawnApplications = useMemo(
    () =>
      applications
        .filter((a) => a.status === 'withdrawn')
        .sort((a, b) => {
          const aTime = typeof a.withdrawnAt?.toDate === 'function' ? a.withdrawnAt.toDate().getTime() : new Date(a.withdrawnAt ?? 0).getTime();
          const bTime = typeof b.withdrawnAt?.toDate === 'function' ? b.withdrawnAt.toDate().getTime() : new Date(b.withdrawnAt ?? 0).getTime();
          return bTime - aTime;
        }),
    [applications]
  );

  const actionableCases = useMemo(
    () => services.filter((item) => item.status !== 'completed'),
    [services]
  );

  const analytics = useMemo(() => {
    const revenue = applications
      .filter((a) => a.status === 'approved' || a.status === 'completed')
      .reduce((sum, a) => {
        const course = courses.find((c) => c.id === a.courseId);
        return sum + (course?.fees ?? 0);
      }, 0);

    const courseBreakdown = courses.map((c) => ({
      id: c.id,
      program: c.program,
      title: c.title,
      registrations: registrations.filter((r) => r.courseInterest === c.id).length,
      applications: applications.filter((a) => a.courseId === c.id && a.status !== 'withdrawn').length,
      enrolled: applications.filter((a) => a.courseId === c.id && (a.status === 'approved' || a.status === 'completed')).length,
    }));

    return { revenue, courseBreakdown };
  }, [applications, courses, registrations]);

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

  const loadTeamUsers = async () => {
    setTeamLoading(true);
    showTeamMsg(null);
    try {
      const users = await getAllUsers();
      setTeamUsers(users.sort((a, b) => a.fullName.localeCompare(b.fullName)));
    } catch {
      showTeamMsg({ text: 'Could not load users. Try again.', kind: 'error' });
    } finally {
      setTeamLoading(false);
    }
  };

  const handlePickCertFile = async (application: Application) => {
    const result = await DocumentPicker.getDocumentAsync({ type: 'application/pdf', copyToCacheDirectory: true });
    if (result.canceled || !result.assets?.[0]) return;
    setPendingCertFile({ appId: application.id, asset: result.assets[0] });
  };

  const handleUploadCert = async (application: Application) => {
    if (!pendingCertFile || pendingCertFile.appId !== application.id) return;
    const { asset } = pendingCertFile;
    setGeneratingCertId(application.id);
    setPendingCertFile(null);
    try {
      const storagePath = `certificates/${application.userId}/${Date.now()}.pdf`;
      const downloadUrl = await uploadFile(storagePath, asset.uri);
      if (!application.courseCompleted) {
        await markCourseComplete(application.id, application.userId, application.courseId, application.courseTitle || 'the course');
      }
      await issueCertificate({
        applicationId: application.id,
        userId: application.userId,
        courseId: application.courseId,
        courseTitle: application.courseTitle || 'GIAC Programme',
        program: application.courseProgram || '',
        studentName: application.fullName?.trim() || 'Student',
        certificateUrl: downloadUrl,
      });
      setCertSuccessApp(application);
    } catch {
      Alert.alert('Error', 'Could not upload certificate. Please try again.');
    } finally {
      setGeneratingCertId(null);
    }
  };

  const handleMarkComplete = async (application: Application) => {
    setMarkingCompleteId(application.id);
    try {
      await markCourseComplete(application.id, application.userId, application.courseId, application.courseTitle || 'the course');
    } catch {
      Alert.alert('Error', 'Could not mark as complete. Please try again.');
    } finally {
      setMarkingCompleteId(null);
    }
  };

  const handleDeleteCertificate = async (application: Application) => {
    setConfirmDeleteCertId(null);
    setDeletingCertId(application.id);
    try {
      if (application.certificateUrl) {
        await deleteFile(application.certificateUrl);
      }
      await deleteCertificate(application.id, application.userId, application.courseId);
    } catch {
      Alert.alert('Error', 'Could not delete certificate. Please try again.');
    } finally {
      setDeletingCertId(null);
    }
  };

  const handlePickGraduationLetter = async () => {
    const result = await DocumentPicker.getDocumentAsync({ type: ['application/pdf', 'image/*'], copyToCacheDirectory: true });
    if (result.canceled || !result.assets?.[0]) return;
    const asset = result.assets[0];
    setGraduationLetter({ uri: asset.uri, name: asset.name });
  };

  const handleSendGraduationInvite = async () => {
    if (!graduationInviteApp) return;
    if (!graduationMessage.trim() && !graduationLetter) {
      setGradInviteError('Please type a message or upload an invitation letter.');
      return;
    }
    setSendingGradInvite(true);
    setGradInviteError('');
    try {
      let letterUrl: string | undefined;
      if (graduationLetter) {
        const path = `graduation-letters/${graduationInviteApp.userId}/${Date.now()}_${graduationLetter.name}`;
        letterUrl = await uploadFile(path, graduationLetter.uri);
      }
      await sendGraduationInvitation({
        userId: graduationInviteApp.userId,
        studentName: graduationInviteApp.fullName?.trim() || 'Student',
        courseTitle: graduationInviteApp.courseTitle || 'GIAC Programme',
        email: graduationInviteApp.email,
        message: graduationMessage.trim(),
        letterUrl,
      });
      setGraduationInviteApp(null);
      setGraduationMessage('');
      setGraduationLetter(null);
      setGradInviteSuccess(true);
      setTimeout(() => setGradInviteSuccess(false), 4000);
    } catch {
      setGradInviteError('Could not send invitation. Please try again.');
    } finally {
      setSendingGradInvite(false);
    }
  };

  const handleMarkFullPayment = async (application: Application) => {
    setMarkingPaidId(application.id);
    try {
      await updatePaymentStatus(application.id, 'full');
      showAdmissionsMsg({ text: `Full payment confirmed for ${application.fullName?.trim() || 'student'}. Access restored if it was locked.`, kind: 'success' });
    } catch {
      showAdmissionsMsg({ text: 'Could not update payment status. Try again.', kind: 'error' });
    } finally {
      setMarkingPaidId(null);
    }
  };

  const handleToggleLock = async (application: Application) => {
    const willLock = !application.accessLocked;
    setLockingId(application.id);
    try {
      await toggleAccessLock(application.id, willLock);
      showAdmissionsMsg({
        text: willLock
          ? `Access locked for ${application.fullName?.trim() || 'student'}. They cannot view materials, assignments, or tests.`
          : `Access restored for ${application.fullName?.trim() || 'student'}.`,
        kind: willLock ? 'error' : 'success',
      });
    } catch {
      showAdmissionsMsg({ text: 'Could not update access. Try again.', kind: 'error' });
    } finally {
      setLockingId(null);
    }
  };

  const handleSaveProgress = async (application: Application) => {
    const raw = progressEditing[application.id];
    const pct = parseInt(raw ?? '', 10);
    if (isNaN(pct)) return;
    setSavingProgressId(application.id);
    try {
      await setStudentProgress(application.userId, application.courseId, pct);
      setProgressEditing((prev) => { const next = { ...prev }; delete next[application.id]; return next; });
    } catch {
      showAdmissionsMsg({ text: 'Could not update progress. Try again.', kind: 'error' });
    } finally {
      setSavingProgressId(null);
    }
  };

  const handleCreateSession = async () => {
    if (sessionCourseIds.length === 0 || !sessionTitle.trim() || !sessionDate || !sessionLink.trim()) {
      showSessionMsg({ text: 'Please select at least one course and fill in all fields.', kind: 'error' });
      return;
    }
    setSessionSaving(true);
    showSessionMsg(null);
    try {
      await Promise.all(
        sessionCourseIds.map((courseId) =>
          createSession({ courseId, title: sessionTitle, scheduledDateIso: sessionDate, zoomLink: sessionLink })
        )
      );
      setSessionTitle('');
      setSessionDate('');
      setSessionLink('');
      setSessionCourseIds([]);
      showSessionMsg({ text: 'Session posted. Students have been notified.', kind: 'success' });
    } catch {
      showSessionMsg({ text: 'Could not post session. Try again.', kind: 'error' });
    } finally {
      setSessionSaving(false);
    }
  };

  const handleCreatePersonalSession = async (application: Application) => {
    const input = personalSessionInputs[application.id];
    if (!input?.title?.trim() || !input?.date || !input?.link?.trim()) {
      showAdmissionsMsg({ text: 'Please fill in title, date and link for the personal session.', kind: 'error' });
      return;
    }
    setPersonalSessionSavingId(application.id);
    try {
      await createPersonalSession({ userId: application.userId, title: input.title, scheduledDateIso: input.date, zoomLink: input.link });
      setPersonalSessionInputs((prev) => { const next = { ...prev }; delete next[application.id]; return next; });
      showAdmissionsMsg({ text: `Session sent to ${application.fullName || 'student'}.`, kind: 'success' });
    } catch {
      showAdmissionsMsg({ text: 'Could not send personal session. Try again.', kind: 'error' });
    } finally {
      setPersonalSessionSavingId(null);
    }
  };

  const handleToggleAdmin = async (user: UserRecord) => {
    const newRole = user.role === 'admin' ? 'applicant' : 'admin';
    setTogglingUserId(user.id);
    showTeamMsg(null);
    try {
      await updateUserRole(user.id, newRole);
      setTeamUsers((prev) =>
        prev.map((u) => (u.id === user.id ? { ...u, role: newRole } : u))
      );
      setTeamMsg({
        text: newRole === 'admin'
          ? `${user.fullName || user.email} is now an admin.`
          : `${user.fullName || user.email} has been removed as admin.`,
        kind: 'success',
      });
    } catch {
      showTeamMsg({ text: 'Could not update role. Try again.', kind: 'error' });
    } finally {
      setTogglingUserId(null);
      setConfirmingUserId(null);
    }
  };

  const handleApprove = async (application: Application) => {
    setBusyApplicationId(application.id);
    showAdmissionsMsg(null);
    const adminName = auth.currentUser?.displayName || auth.currentUser?.email || 'An admin';
    try {
      await approveApplication(application.id, application.userId, application.courseTitle, application.courseId);
      setAdmissionsMsg({
        text: `${application.fullName || 'Applicant'} has been approved. Their account is now upgraded to student.`,
        kind: 'success',
      });
      createAdminNotification({
        type: 'application',
        message: `${adminName} approved ${application.fullName || 'an applicant'}'s application for ${application.courseTitle || 'a course'}.`,
        referenceId: application.id,
        userId: application.userId,
      }).catch(() => {});
      createStudentNotification(
        application.userId,
        `Congratulations! Your application for ${application.courseTitle || 'the GIAC programme'} has been approved.`,
        'application_approved',
        application.id
      ).catch(() => {});
    } catch {
      showAdmissionsMsg({ text: 'Could not approve the application. Please try again.', kind: 'error' });
    } finally {
      setBusyApplicationId(null);
    }
  };

  const handleReject = async (application: Application, feedback: string) => {
    setBusyApplicationId(application.id);
    showAdmissionsMsg(null);
    const adminName = auth.currentUser?.displayName || auth.currentUser?.email || 'An admin';
    try {
      await rejectApplication(application.id, feedback, application.userId, application.courseTitle);
      showAdmissionsMsg({ text: `Application has been rejected.`, kind: 'success' });
      createAdminNotification({
        type: 'application',
        message: `${adminName} rejected ${application.fullName || 'an applicant'}'s application for ${application.courseTitle || 'a course'}.`,
        referenceId: application.id,
        userId: application.userId,
      }).catch(() => {});
      createStudentNotification(
        application.userId,
        `We've reviewed your application for ${application.courseTitle || 'the GIAC programme'}. Please check the app for details.`,
        'application_rejected',
        application.id
      ).catch(() => {});
    } catch {
      showAdmissionsMsg({ text: 'Could not reject the application. Please try again.', kind: 'error' });
    } finally {
      setBusyApplicationId(null);
    }
  };

  const handleDeleteApplication = async (application: Application) => {
    setBusyApplicationId(application.id);
    showAdmissionsMsg(null);
    try {
      await deleteApplication(application.id);
    } catch {
      Alert.alert('Error', 'Could not delete the enrollment. Please try again.');
    } finally {
      setBusyApplicationId(null);
    }
  };

  const handleAssignMediator = async (service: Service, name: string, note: string) => {
    if (!name.trim()) { Alert.alert('Required', 'Enter a mediator name before assigning.'); return; }
    setBusyAssignId(service.id);
    const adminName = auth.currentUser?.displayName || auth.currentUser?.email || 'An admin';
    try {
      await assignMediator(service.id, name.trim(), note.trim(), service.userId);
      createAdminNotification({
        type: 'service',
        message: `${adminName} assigned ${name.trim()} as mediator for ${service.clientName || 'a client'}'s ${service.serviceType} case.`,
        referenceId: service.id,
        userId: service.userId,
      }).catch(() => {});
    } catch {
      Alert.alert('Error', 'Could not assign mediator. Please try again.');
    } finally {
      setBusyAssignId(null);
    }
  };

  const handleUpdateStatus = async (service: Service, status: Service['status'], resolution: string) => {
    setBusyStatusId(service.id);
    const adminName = auth.currentUser?.displayName || auth.currentUser?.email || 'An admin';
    try {
      await updateCaseStatus(service.id, status, resolution.trim(), service.userId);
      createAdminNotification({
        type: 'service',
        message: `${adminName} marked ${service.clientName || 'a client'}'s ${service.serviceType} case as ${status}.`,
        referenceId: service.id,
        userId: service.userId,
      }).catch(() => {});
    } catch {
      Alert.alert('Error', 'Could not update case status. Please try again.');
    } finally {
      setBusyStatusId(null);
    }
  };

  const handleDeleteCase = async (service: Service) => {
    setBusyDeleteId(service.id);
    try {
      await deleteService(service.id);
    } catch {
      Alert.alert('Error', 'Could not delete the case. Please try again.');
    } finally {
      setBusyDeleteId(null);
    }
  };


  const handlePickMaterialFile = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: matType === 'pdf' ? 'application/pdf' : ['application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
        copyToCacheDirectory: true,
      });
      if (result.canceled || !result.assets?.[0]) return;
      const file = result.assets[0];
      setMatUploading(true);
      setMatUploadProgress(0);
      const path = `materials/${matCourse}/${Date.now()}_${file.name}`;
      const url = await uploadFile(path, file.uri, setMatUploadProgress);
      setMatUrl(url);
      setMatFileName(file.name);
    } catch (err: any) {
      const msg = err?.code === 'storage/unauthorized'
        ? 'Storage permission denied. Check your admin role.'
        : 'Upload failed. Please try again.';
      setMatMsg({ text: msg, kind: 'error' });
      Alert.alert('Upload Failed', msg);
    } finally {
      setMatUploading(false);
    }
  };

  const handleCreateMaterial = async () => {
    if (!matTitle.trim() || !matModule.trim()) {
      setMatMsg({ text: 'Title and module are required.', kind: 'error' });
      return;
    }
    const normalizedUrl = matUrl.trim();
    if (!normalizedUrl) {
      setMatMsg({ text: (matType === 'pdf' || matType === 'doc') ? 'Please upload a file before saving.' : 'Paste a URL before saving.', kind: 'error' });
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
      setMatTitle(''); setMatModule(''); setMatUrl(''); setMatType('link'); setMatFileName('');
      setMatMsg({ text: `"${createdMaterial.title}" published successfully and added below.`, kind: 'success' });
    } catch (err: any) {
      const msg = err?.code === 'permission-denied'
        ? 'Permission denied. Make sure you are signed in as admin.'
        : 'Could not save material. Please try again.';
      setMatMsg({ text: msg, kind: 'error' });
      Alert.alert('Save Failed', msg);
    } finally {
      setMatSaving(false);
    }
  };

  const handleDeleteMaterial = async (id: string, fileUrl?: string) => {
    try {
      if (fileUrl) await deleteFile(fileUrl).catch(() => {});
      await deleteMaterial(id);
    } catch { Alert.alert('Error', 'Could not delete material.'); }
  };

  const handleDeleteAssignment = async (id: string, fileUrl?: string) => {
    try {
      if (fileUrl) await deleteFile(fileUrl).catch(() => {});
      await deleteAssignment(id);
    } catch { Alert.alert('Error', 'Could not delete assignment.'); }
  };

  const handleDeleteTest = async (id: string, fileUrl?: string) => {
    try {
      if (fileUrl) await deleteFile(fileUrl).catch(() => {});
      await deleteTest(id);
    } catch { Alert.alert('Error', 'Could not delete test.'); }
  };

  const handleOpenMaterialLink = async (url: string) => {
    try {
      await Linking.openURL(url);
    } catch {
      Alert.alert('Error', 'Could not open this material link.');
    }
  };

  const handlePickLetterFile = async (regId: string) => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['application/pdf', 'image/*'],
        copyToCacheDirectory: true,
      });
      if (result.canceled || !result.assets?.[0]) return;
      const file = result.assets[0];
      setUploadingLetterId(regId);
      setLetterUploadProgress(0);
      const path = `admission-letters/${regId}/${Date.now()}_${file.name}`;
      const url = await uploadFile(path, file.uri, setLetterUploadProgress);
      setLetterFileUrls((prev) => ({ ...prev, [regId]: url }));
      setLetterFileNames((prev) => ({ ...prev, [regId]: file.name }));
    } catch {
      Alert.alert('Upload failed', 'Could not upload the letter. Please try again.');
    } finally {
      setUploadingLetterId(null);
    }
  };

  const handlePickAssignmentFile = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'image/*'],
        copyToCacheDirectory: true,
      });
      if (result.canceled || !result.assets?.[0]) return;
      const file = result.assets[0];
      setAsnUploading(true);
      setAsnUploadProgress(0);
      const path = `assignment-files/${asnCourse}/${Date.now()}_${file.name}`;
      const url = await uploadFile(path, file.uri, setAsnUploadProgress);
      setAsnFileUrl(url);
      setAsnFileName(file.name);
    } catch {
      Alert.alert('Upload failed', 'Could not upload the file. Please try again.');
    } finally {
      setAsnUploading(false);
    }
  };

  const handlePickTestFile = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'image/*'],
        copyToCacheDirectory: true,
      });
      if (result.canceled || !result.assets?.[0]) return;
      const file = result.assets[0];
      setTestUploading(true);
      setTestUploadProgress(0);
      const path = `test-files/${testCourse}/${Date.now()}_${file.name}`;
      const url = await uploadFile(path, file.uri, setTestUploadProgress);
      setTestFileUrl(url);
      setTestFileName(file.name);
    } catch {
      Alert.alert('Upload failed', 'Could not upload the file. Please try again.');
    } finally {
      setTestUploading(false);
    }
  };

  const handleCreateAssignment = async () => {
    if (!asnTitle.trim() || !asnDesc.trim() || !asnDeadline.trim()) {
      setAsnMsg({ text: 'Title, description, and deadline are required.', kind: 'error' });
      return;
    }
    if (!asnFileUrl) {
      setAsnMsg({ text: 'Please upload the assignment file before creating.', kind: 'error' });
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
        maxGrade: 100,
        fileUrl: asnFileUrl || undefined,
      });
      setAsnTitle(''); setAsnDesc(''); setAsnDeadline('');
      setAsnFileUrl(''); setAsnFileName('');
      setAsnMsg({ text: 'Assignment created successfully.', kind: 'success' });
    } catch {
      setAsnMsg({ text: 'Could not create assignment. Please try again.', kind: 'error' });
    } finally {
      setAsnSaving(false);
    }
  };

  const handleGradeSubmission = async (assignment: AdminAssignment, userId: string) => {
    if (!selectedOutcome) {
      setAsnMsg({ text: 'Please select an outcome before submitting.', kind: 'error' });
      return;
    }
    const scoreMap = { needs_revision: 60, satisfactory: 80, excellent: 100 };
    const grade = scoreMap[selectedOutcome];
    setGradingSaving(true);
    setAsnMsg(null);
    try {
      await gradeAssignmentSubmission(assignment.id, userId, grade, reviewFeedback.trim(), assignment.title);
      setGradingKey(null); setSelectedOutcome(null); setReviewFeedback('');
      setAsnMsg({ text: 'Review submitted and student notified.', kind: 'success' });
    } catch {
      setAsnMsg({ text: 'Could not save review. Please try again.', kind: 'error' });
    } finally {
      setGradingSaving(false);
    }
  };

  const handleReviewTest = async (test: AdminTest, userId: string) => {
    if (!selectedTestOutcome) {
      setTestMsg({ text: 'Please select an outcome before submitting.', kind: 'error' });
      return;
    }
    const scoreMap = { needs_revision: 60, satisfactory: 80, excellent: 100 };
    const score = scoreMap[selectedTestOutcome];
    setTestReviewSaving(true);
    setTestMsg(null);
    try {
      await gradeTestSubmission(test.id, userId, score, testReviewFeedback.trim(), test.title, test.courseId, test.totalMarks, test.passMark);
      setReviewingTestKey(null); setSelectedTestOutcome(null); setTestReviewFeedback('');
      setTestMsg({ text: 'Test reviewed and student notified.', kind: 'success' });
    } catch {
      setTestMsg({ text: 'Could not save review. Please try again.', kind: 'error' });
    } finally {
      setTestReviewSaving(false);
    }
  };

  const handleCreateTest = async () => {
    if (!testTitle.trim() || !testDesc.trim() || !testDate.trim()) {
      setTestMsg({ text: 'Title, description, and date are required.', kind: 'error' });
      return;
    }
    if (!testFileUrl) {
      setTestMsg({ text: 'Please upload the test paper before scheduling.', kind: 'error' });
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
        totalMarks: 100,
        passMark: 60,
        fileUrl: testFileUrl || undefined,
      });
      setTestTitle(''); setTestDesc(''); setTestDate('');
      setTestFileUrl(''); setTestFileName('');
      setTestMsg({ text: 'Test scheduled successfully.', kind: 'success' });
    } catch {
      setTestMsg({ text: 'Could not create test. Please try again.', kind: 'error' });
    } finally {
      setTestSaving(false);
    }
  };


  const handleApproveDeletion = async (req: AccountDeletionRequest) => {
    setBusyDeletionId(req.id);
    const adminName = auth.currentUser?.displayName || auth.currentUser?.email || 'An admin';
    try {
      await approveAccountDeletionRequest(req.id);
      createAdminNotification({
        type: 'account',
        message: `${adminName} approved an account deletion request.`,
        referenceId: req.id,
        userId: req.userId,
      }).catch(() => {});
    } catch {
      Alert.alert('Error', 'Could not approve the deletion request. Please try again.');
    } finally {
      setBusyDeletionId(null);
    }
  };

  const handleRejectDeletion = async (req: AccountDeletionRequest) => {
    setBusyDeletionId(req.id);
    const adminName = auth.currentUser?.displayName || auth.currentUser?.email || 'An admin';
    try {
      await rejectAccountDeletionRequest(req.id);
      createAdminNotification({
        type: 'account',
        message: `${adminName} rejected an account deletion request for ${req.fullName || req.email}.`,
        referenceId: req.id,
        userId: req.userId,
      }).catch(() => {});
    } catch {
      Alert.alert('Error', 'Could not reject the deletion request. Please try again.');
    } finally {
      setBusyDeletionId(null);
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

  const CURATED_IDS = ['pecadr', 'pemadr'];

  const resetCourseForm = () => {
    setEditingCourseId(null);
    setCourseTitle('');
    setCourseProgram('');
    setCourseLevel('');
    setCourseDuration('');
    setCourseFees('');
    setCourseSchedule('');
    setCoursePlatform('');
    setCourseDescription('');
    setCoursePractical('');
    setCourseIdealFor('');
    setCourseContentRaw('');
  };

  const startEditCourse = (c: Course) => {
    setEditingCourseId(c.id);
    setCourseTitle(c.title);
    setCourseProgram(c.program);
    setCourseLevel(c.level);
    setCourseDuration(c.duration);
    setCourseFees(c.fees != null ? String(c.fees) : '');
    setCourseSchedule(c.schedule);
    setCoursePlatform(c.platform ?? '');
    setCourseDescription(c.description ?? '');
    setCoursePractical(c.practicalSessions ?? '');
    setCourseIdealFor(c.idealFor ?? '');
    setCourseContentRaw((c.content ?? []).join('\n'));
    setCourseMsg(null);
  };

  const handleSaveCourse = async () => {
    if (!courseTitle.trim() || !courseProgram.trim() || !courseLevel.trim() || !courseDuration.trim() || !courseSchedule.trim()) {
      setCourseMsg({ text: 'Title, program, level, duration, and schedule are required.', kind: 'error' });
      return;
    }
    setSavingCourse(true);
    setCourseMsg(null);
    const feesNum = parseFloat(courseFees);
    const payload: Omit<Course, 'id' | 'createdAt'> = {
      title: courseTitle.trim(),
      program: courseProgram.trim(),
      level: courseLevel.trim(),
      duration: courseDuration.trim(),
      schedule: courseSchedule.trim(),
      ...(coursePlatform.trim() ? { platform: coursePlatform.trim() } : {}),
      ...(courseDescription.trim() ? { description: courseDescription.trim() } : {}),
      ...(coursePractical.trim() ? { practicalSessions: coursePractical.trim() } : {}),
      ...(courseIdealFor.trim() ? { idealFor: courseIdealFor.trim() } : {}),
      ...(!isNaN(feesNum) && courseFees.trim() ? { fees: feesNum } : {}),
      ...(courseContentRaw.trim() ? { content: courseContentRaw.split('\n').map(l => l.trim()).filter(Boolean) } : {}),
    };
    try {
      if (editingCourseId) {
        await updateCourse(editingCourseId, payload);
        setCourseMsg({ text: 'Course updated.', kind: 'success' });
      } else {
        await createCourse(payload);
        setCourseMsg({ text: 'Course created.', kind: 'success' });
      }
      resetCourseForm();
    } catch {
      setCourseMsg({ text: 'Could not save course. Please try again.', kind: 'error' });
    } finally {
      setSavingCourse(false);
    }
  };

  const handleDeleteCourse = async (courseId: string) => {
    setDeletingCourseId(courseId);
    setCourseMsg(null);
    try {
      await deleteCourse(courseId);
    } catch {
      setCourseMsg({ text: 'Could not delete course. Check your connection.', kind: 'error' });
    } finally {
      setDeletingCourseId(null);
    }
  };

  const handleDeleteAnnouncement = async (id: string) => {
    setDeletingAnnouncementId(id);
    try {
      await deleteAnnouncement(id);
    } catch {
      setAnnouncementError('Could not delete announcement. Please try again.');
    } finally {
      setDeletingAnnouncementId(null);
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
      {/* Graduation invitation modal */}
      <Modal
        visible={graduationInviteApp !== null}
        transparent
        animationType="slide"
        onRequestClose={() => { setGraduationInviteApp(null); setGraduationMessage(''); setGradInviteError(''); }}
      >
        <KeyboardAvoidingView
          style={styles.certOverlay}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          <View style={[styles.certSuccessCard, { gap: 14 }]}>
            <View style={styles.certSuccessIconWrap}>
              <FontAwesome6 name="graduation-cap" size={32} color={C.secondary} />
            </View>
            <Text style={styles.certSuccessTitle}>Send Graduation Invite</Text>
            <Text style={[styles.certSuccessSub, { textAlign: 'left', color: C.textSecondary }]}>
              Type a message, upload an invitation letter, or both. The student will receive it in-app and by email.
            </Text>
            {gradInviteError ? (
              <View style={[styles.banner, { backgroundColor: C.dangerSoft }]}>
                <Text style={[styles.bannerText, { color: C.danger }]}>{gradInviteError}</Text>
              </View>
            ) : null}
            <TextInput
              value={graduationMessage}
              onChangeText={(v) => { setGraduationMessage(v); setGradInviteError(''); }}
              placeholder="e.g. You are cordially invited to the GIAC Graduation Ceremony on [date] at [venue]..."
              placeholderTextColor={C.textMuted}
              multiline
              textAlignVertical="top"
              style={[styles.textArea, { minHeight: 100 }]}
              editable={!sendingGradInvite}
            />

            {/* Letter upload */}
            {graduationLetter ? (
              <View style={[styles.enrolledRow, { backgroundColor: C.surfaceAlt, borderRadius: 14, paddingHorizontal: 12, paddingVertical: 10 }]}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 }}>
                  <FontAwesome6 name="file-pdf" size={15} color={C.danger} />
                  <Text style={{ fontFamily: Fonts.sansSemiBold, fontSize: 13, color: C.textPrimary, flex: 1 }} numberOfLines={1}>
                    {graduationLetter.name}
                  </Text>
                </View>
                <Pressable onPress={() => setGraduationLetter(null)} style={({ pressed }) => [pressed && styles.pressed]}>
                  <FontAwesome6 name="xmark" size={14} color={C.textSecondary} />
                </Pressable>
              </View>
            ) : (
              <Pressable
                onPress={handlePickGraduationLetter}
                disabled={sendingGradInvite}
                style={({ pressed }) => [styles.outlineButton, pressed && styles.pressed]}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <FontAwesome6 name="upload" size={13} color={C.textSecondary} />
                  <Text style={styles.outlineButtonText}>Upload Invitation Letter (optional)</Text>
                </View>
              </Pressable>
            )}

            <View style={{ flexDirection: 'row', gap: 10 }}>
              <Pressable
                onPress={() => { setGraduationInviteApp(null); setGraduationMessage(''); setGraduationLetter(null); setGradInviteError(''); }}
                style={({ pressed }) => [styles.outlineButton, { flex: 1 }, pressed && styles.pressed]}
              >
                <Text style={styles.outlineButtonText}>Skip</Text>
              </Pressable>
              <Pressable
                onPress={handleSendGraduationInvite}
                disabled={sendingGradInvite || (!graduationMessage.trim() && !graduationLetter)}
                style={({ pressed }) => [
                  styles.primaryButton,
                  { flex: 1 },
                  (sendingGradInvite || (!graduationMessage.trim() && !graduationLetter) || pressed) && styles.pressed,
                ]}
              >
                {sendingGradInvite
                  ? <ActivityIndicator size="small" color={C.textInverse} />
                  : <Text style={styles.primaryButtonText}>Send Invite</Text>}
              </Pressable>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Certificate success overlay */}
      <Modal visible={certSuccessApp !== null} transparent animationType="fade" onRequestClose={() => setCertSuccessApp(null)}>
        <View style={styles.certOverlay}>
          <View style={styles.certSuccessCard}>
            <View style={[styles.certSuccessIconWrap]}>
              <FontAwesome6 name="certificate" size={36} color={C.secondary} />
            </View>
            <Text style={styles.certSuccessTitle}>Certificate Issued!</Text>
            <Text style={styles.certSuccessName}>{certSuccessApp?.fullName?.trim() || 'Student'}</Text>
            <Text style={styles.certSuccessSub}>{certSuccessApp?.courseTitle}</Text>
            <Text style={[styles.certSuccessSub, { color: C.textMuted, marginTop: 2 }]}>The student has been notified.</Text>
            <Pressable
              onPress={() => setCertSuccessApp(null)}
              style={({ pressed }) => [styles.primaryButton, { width: '100%', marginTop: 8 }, pressed && styles.pressed]}
            >
              <Text style={styles.primaryButtonText}>Done</Text>
            </Pressable>
          </View>
        </View>
      </Modal>

      <KeyboardAvoidingView
        style={styles.safe}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 20 : 0}
      >
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={[
            styles.content,
            { paddingHorizontal: horizontalPadding, paddingBottom: 132 },
          ]}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
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
            <StatusChip tone={{ ...getApplicationTone('approved'), label: `${applicationCounts.approved} Approved` }} />
            <StatusChip tone={{ ...getApplicationTone('pending'), label: `${applicationCounts.pending} Pending` }} />
            <StatusChip tone={{ ...getApplicationTone('rejected'), label: `${applicationCounts.rejected} Rejected` }} />
            <StatusChip tone={{ ...getServiceTone('submitted'), label: `${serviceCounts.total} ADR` }} />
          </View>

          <View style={styles.metaWrap}>
            <MetaChip label={`${applicationCounts.approved} enrolled student${applicationCounts.approved !== 1 ? 's' : ''}`} />
            <MetaChip label={`${applicationCounts.pending} pending review`} subtle />
            <MetaChip label={`${serviceCounts.total} ADR request${serviceCounts.total !== 1 ? 's' : ''}`} subtle />
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
            count={applications.length > 0 ? applications.length : undefined}
            icon="user-graduate"
            label="Admissions"
            onPress={() => setActiveView('admissions')}
          />
          <SectionButton
            active={activeView === 'cases'}
            count={services.length > 0 ? services.length : undefined}
            icon="scale-balanced"
            label="ADR Cases"
            onPress={() => setActiveView('cases')}
          />
          <SectionButton
            active={activeView === 'announcements'}
            count={announcements.length > 0 ? announcements.length : undefined}
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
          <SectionButton
            active={activeView === 'registrations'}
            count={registrations.length > 0 ? registrations.length : undefined}
            icon="id-card"
            label="Registrations"
            onPress={() => setActiveView('registrations')}
          />
          <SectionButton
            active={activeView === 'deletions'}
            count={deletionRequests.length > 0 ? deletionRequests.length : undefined}
            icon="trash"
            label="Deletions"
            onPress={() => setActiveView('deletions')}
          />
          <SectionButton
            active={activeView === 'team'}
            icon="users"
            label="Team"
            onPress={() => { setActiveView('team'); loadTeamUsers(); }}
          />
          <SectionButton
            active={activeView === 'courses'}
            count={courses.length > 0 ? courses.length : undefined}
            icon="book"
            label="Courses"
            onPress={() => { setActiveView('courses'); resetCourseForm(); setCourseMsg(null); }}
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

            </View>

            <View style={[styles.summaryGrid, isWide ? styles.summaryGridWide : null]}>
              <SummaryCard
                accent={C.secondary}
                icon="id-card"
                label="Total Registrations"
                value={`${registrations.length}`}
                helper="Users who registered for a course"
              />
              <SummaryCard
                accent={C.success}
                icon="file-circle-check"
                label="Total Applications"
                value={`${applicationCounts.total}`}
                helper="Non-withdrawn applications submitted"
              />
              <SummaryCard
                accent={C.warning}
                icon="trophy"
                label="Completed Cases"
                value={`${serviceCounts.completed}`}
                helper="ADR cases resolved and closed"
              />
              <SummaryCard
                accent={C.accentStrong}
                icon="book"
                label="Active Courses"
                value={`${courses.length}`}
                helper="Courses available to students"
              />
            </View>

          </>
        ) : null}

        {activeView === 'admissions' ? (
          <>
            {/* Tab switcher */}
            <View style={styles.admissionsTabRow}>
              {([
                { key: 'enrolled', label: 'Enrolled', count: enrolledApplications.length },
                { key: 'pending', label: 'Pending', count: applicationCounts.pending },
                { key: 'rejected', label: 'Rejected', count: rejectedApplications.length },
                { key: 'withdrawn', label: 'Withdrawn', count: withdrawnApplications.length },
              ] as const).map((tab) => (
                <Pressable
                  key={tab.key}
                  onPress={() => setAdmissionsTab(tab.key)}
                  style={({ pressed }) => [
                    styles.admissionsTabBtn,
                    admissionsTab === tab.key ? styles.admissionsTabBtnActive : null,
                    pressed ? styles.pressed : null,
                  ]}
                >
                  <Text style={[styles.admissionsTabText, admissionsTab === tab.key ? styles.admissionsTabTextActive : null]}>
                    {tab.label}
                  </Text>
                  {tab.count > 0 ? (
                    <View style={[styles.admissionsTabBadge, admissionsTab === tab.key ? styles.admissionsTabBadgeActive : null]}>
                      <Text style={[styles.admissionsTabBadgeText, admissionsTab === tab.key ? styles.admissionsTabBadgeTextActive : null]}>
                        {tab.count}
                      </Text>
                    </View>
                  ) : null}
                </Pressable>
              ))}
            </View>

            {admissionsMsg ? (
              <View style={[styles.banner, { backgroundColor: admissionsMsg.kind === 'success' ? C.successSoft : C.dangerSoft }]}>
                <Text style={[styles.bannerText, { color: admissionsMsg.kind === 'success' ? C.success : C.danger }]}>
                  {admissionsMsg.text}
                </Text>
              </View>
            ) : null}

            {admissionsTab === 'enrolled' ? (
              enrolledApplications.length > 0 ? (
                <View style={styles.stack}>
                  {enrolledApplications.map((application) => {
                    const isSavingProgress = savingProgressId === application.id;
                    const isCompleted = application.courseCompleted === true;
                    const isLocked = isPaymentLocked(application);
                    const isFullPaid = application.paymentStatus === 'full';
                    const progressVal = progressEditing[application.id];
                    const courseSessions = sessions.filter((s) => s.courseId === application.courseId);
                    const isExpanded = expandedEnrolledId === application.id;
                    return (
                      <View key={application.id} style={styles.panelCard}>
                        {/* Dropdown header */}
                        <Pressable
                          onPress={() => setExpandedEnrolledId(isExpanded ? null : application.id)}
                          style={({ pressed }) => [styles.teamDropdownHeader, pressed && styles.pressed]}
                        >
                          <View style={styles.panelHeaderCopy}>
                            <Text style={styles.panelTitle}>{application.fullName?.trim() || 'Student'}</Text>
                            <Text style={styles.panelSubtitle}>{application.courseTitle || application.courseId}</Text>
                          </View>
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                            {isCompleted ? (
                              <View style={[styles.statusChip, { backgroundColor: C.successSoft }]}>
                                <View style={[styles.statusDot, { backgroundColor: C.success }]} />
                                <Text style={[styles.statusChipText, { color: C.success }]}>Completed</Text>
                              </View>
                            ) : (
                              <View style={[styles.statusChip, { backgroundColor: C.secondarySoft }]}>
                                <View style={[styles.statusDot, { backgroundColor: C.secondary }]} />
                                <Text style={[styles.statusChipText, { color: C.secondary }]}>Enrolled</Text>
                              </View>
                            )}
                            {isLocked ? (
                              <View style={[styles.statusChip, { backgroundColor: '#FFF3E0' }]}>
                                <FontAwesome6 name="lock" size={9} color="#E65100" />
                                <Text style={[styles.statusChipText, { color: '#E65100' }]}>Locked</Text>
                              </View>
                            ) : isFullPaid ? (
                              <View style={[styles.statusChip, { backgroundColor: C.successSoft }]}>
                                <FontAwesome6 name="circle-check" size={9} color={C.success} />
                                <Text style={[styles.statusChipText, { color: C.success }]}>Paid</Text>
                              </View>
                            ) : null}
                            <FontAwesome6 name={isExpanded ? 'chevron-up' : 'chevron-down'} size={13} color={C.textSecondary} />
                          </View>
                        </Pressable>

                        {/* Expanded actions */}
                        {isExpanded ? (
                          <View style={styles.teamDropdownBody}>

                            {/* ── Progress ── */}
                            <Text style={styles.enrolledLabel}>Progress (%)</Text>
                            <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
                              <Pressable
                                onPress={() => {
                                  const cur = parseInt(progressVal ?? '0', 10);
                                  const next = Math.max(0, cur - 5);
                                  setProgressEditing((prev) => ({ ...prev, [application.id]: String(next) }));
                                }}
                                style={({ pressed }) => [styles.enrolledNudge, pressed && styles.pressed]}
                              >
                                <Text style={styles.enrolledNudgeText}>−5</Text>
                              </Pressable>
                              <TextInput
                                style={[styles.input, { flex: 1, textAlign: 'center' }]}
                                keyboardType="numeric"
                                maxLength={3}
                                placeholder="0–100"
                                value={progressVal ?? ''}
                                onChangeText={(v) => setProgressEditing((prev) => ({ ...prev, [application.id]: v }))}
                              />
                              <Pressable
                                onPress={() => {
                                  const cur = parseInt(progressVal ?? '0', 10);
                                  const next = Math.min(100, cur + 5);
                                  setProgressEditing((prev) => ({ ...prev, [application.id]: String(next) }));
                                }}
                                style={({ pressed }) => [styles.enrolledNudge, pressed && styles.pressed]}
                              >
                                <Text style={styles.enrolledNudgeText}>+5</Text>
                              </Pressable>
                              <Pressable
                                onPress={() => handleSaveProgress(application)}
                                disabled={isSavingProgress || progressVal === undefined}
                                style={({ pressed }) => [
                                  styles.enrolledActionChip,
                                  { backgroundColor: C.primary },
                                  (pressed || isSavingProgress || progressVal === undefined) && styles.pressed,
                                ]}
                              >
                                {isSavingProgress
                                  ? <ActivityIndicator size="small" color={C.textInverse} />
                                  : <Text style={[styles.enrolledChipText, { color: C.textInverse }]}>Save</Text>
                                }
                              </Pressable>
                            </View>

                            <View style={styles.enrolledDivider} />

                            {/* ── Completion & Certificate ── */}
                            {generatingCertId === application.id ? (
                              <View style={[styles.enrolledFullButton, { opacity: 0.8 }]}>
                                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                                  <ActivityIndicator size="small" color={C.textInverse} />
                                  <Text style={[styles.enrolledChipText, { color: C.textInverse, fontSize: 14 }]}>Uploading certificate...</Text>
                                </View>
                              </View>
                            ) : pendingCertFile?.appId === application.id ? (
                              <View style={{ gap: 10 }}>
                                <View style={[styles.enrolledRow, { backgroundColor: C.surfaceAlt, borderRadius: 14, paddingHorizontal: 12, paddingVertical: 10 }]}>
                                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 }}>
                                    <FontAwesome6 name="file-pdf" size={16} color={C.danger} />
                                    <Text style={{ fontFamily: Fonts.sansSemiBold, fontSize: 13, color: C.textPrimary, flex: 1 }} numberOfLines={1}>
                                      {pendingCertFile.asset.name}
                                    </Text>
                                  </View>
                                  <Pressable onPress={() => setPendingCertFile(null)} style={({ pressed }) => [pressed && styles.pressed]}>
                                    <FontAwesome6 name="xmark" size={14} color={C.textSecondary} />
                                  </Pressable>
                                </View>
                                <Pressable
                                  onPress={() => handleUploadCert(application)}
                                  style={({ pressed }) => [styles.enrolledFullButton, pressed && styles.pressed]}
                                >
                                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                                    <FontAwesome6 name="upload" size={14} color={C.textInverse} />
                                    <Text style={[styles.enrolledChipText, { color: C.textInverse, fontSize: 14 }]}>
                                      {isCompleted ? 'Upload Certificate' : 'Mark Complete & Upload Certificate'}
                                    </Text>
                                  </View>
                                </Pressable>
                              </View>
                            ) : isCompleted && application.certificateUrl ? (
                              <View style={{ gap: 8 }}>
                                <View style={styles.enrolledRow}>
                                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                                    <FontAwesome6 name="circle-check" size={14} color={C.success} />
                                    <View>
                                      <Text style={{ fontFamily: Fonts.sansBold, fontSize: 13, color: C.success }}>Completed</Text>
                                      <Text style={{ fontFamily: Fonts.sans, fontSize: 12, color: C.success }}>Certificate issued</Text>
                                    </View>
                                  </View>
                                  {confirmDeleteCertId === application.id ? (
                                    <View style={{ flexDirection: 'row', gap: 8 }}>
                                      <Pressable
                                        onPress={() => setConfirmDeleteCertId(null)}
                                        style={({ pressed }) => [styles.enrolledActionChip, pressed && styles.pressed]}
                                      >
                                        <Text style={styles.enrolledChipText}>Cancel</Text>
                                      </Pressable>
                                      <Pressable
                                        onPress={() => handleDeleteCertificate(application)}
                                        style={({ pressed }) => [styles.enrolledActionChip, { backgroundColor: C.danger }, pressed && styles.pressed]}
                                      >
                                        <Text style={[styles.enrolledChipText, { color: C.textInverse }]}>Confirm Delete</Text>
                                      </Pressable>
                                    </View>
                                  ) : deletingCertId === application.id ? (
                                    <ActivityIndicator size="small" color={C.danger} />
                                  ) : (
                                    <Pressable
                                      onPress={() => setConfirmDeleteCertId(application.id)}
                                      style={({ pressed }) => [
                                        styles.enrolledActionChip,
                                        { backgroundColor: C.dangerSoft },
                                        pressed && styles.pressed,
                                      ]}
                                    >
                                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
                                        <FontAwesome6 name="trash" size={11} color={C.danger} />
                                        <Text style={[styles.enrolledChipText, { color: C.danger }]}>Delete Certificate</Text>
                                      </View>
                                    </Pressable>
                                  )}
                                </View>
                                <Pressable
                                  onPress={() => {
                                    setGraduationInviteApp(application);
                                    setGraduationMessage('');
                                    setGradInviteError('');
                                  }}
                                  style={({ pressed }) => [
                                    styles.enrolledFullButton,
                                    { backgroundColor: C.secondary },
                                    pressed && styles.pressed,
                                  ]}
                                >
                                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                                    <FontAwesome6 name="graduation-cap" size={14} color={C.textInverse} />
                                    <Text style={[styles.enrolledChipText, { color: C.textInverse, fontSize: 14 }]}>Send Graduation Invite</Text>
                                  </View>
                                </Pressable>

                                {gradInviteSuccess && graduationInviteApp === null && (
                                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#E8F2EE', borderRadius: 12, padding: 12 }}>
                                    <FontAwesome6 name="circle-check" size={14} color={C.success} />
                                    <Text style={{ fontSize: 13, fontFamily: Fonts.sansSemiBold, color: C.success, flex: 1 }}>Invitation sent successfully.</Text>
                                  </View>
                                )}

                                {allGradInvites.filter(inv => inv.userId === application.userId).map(invite => (
                                  <View key={invite.id} style={{ backgroundColor: C.surfaceAlt, borderRadius: 12, padding: 12, gap: 6 }}>
                                    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flex: 1 }}>
                                        <FontAwesome6 name="graduation-cap" size={12} color={C.secondary} />
                                        <Text style={{ fontSize: 12, fontFamily: Fonts.sansSemiBold, color: C.secondary, flex: 1 }} numberOfLines={1}>
                                          Invite sent{invite.letterUrl ? ' · Letter attached' : ''}
                                        </Text>
                                      </View>
                                      <Pressable
                                        onPress={async () => {
                                          setDeletingInviteId(invite.id);
                                          try { await deleteGraduationInvitation(invite.id); }
                                          catch { Alert.alert('Error', 'Could not delete invitation.'); }
                                          finally { setDeletingInviteId(null); }
                                        }}
                                        disabled={deletingInviteId === invite.id}
                                        style={({ pressed }) => [pressed && styles.pressed]}
                                      >
                                        {deletingInviteId === invite.id
                                          ? <ActivityIndicator size="small" color={C.danger} />
                                          : <FontAwesome6 name="trash" size={13} color={C.danger} />
                                        }
                                      </Pressable>
                                    </View>
                                    {invite.message ? (
                                      <Text style={{ fontSize: 12, fontFamily: Fonts.sans, color: C.textSecondary }} numberOfLines={2}>{invite.message}</Text>
                                    ) : null}
                                  </View>
                                ))}
                              </View>
                            ) : isCompleted ? (
                              <Pressable
                                onPress={() => handlePickCertFile(application)}
                                style={({ pressed }) => [styles.enrolledFullButton, pressed && styles.pressed]}
                              >
                                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                                  <FontAwesome6 name="certificate" size={14} color={C.textInverse} />
                                  <Text style={[styles.enrolledChipText, { color: C.textInverse, fontSize: 14 }]}>Upload Certificate</Text>
                                </View>
                              </Pressable>
                            ) : (
                              <View style={{ gap: 10 }}>
                                <Pressable
                                  onPress={() => handleMarkComplete(application)}
                                  disabled={markingCompleteId === application.id}
                                  style={({ pressed }) => [styles.enrolledFullButton, (pressed || markingCompleteId === application.id) && styles.pressed]}
                                >
                                  {markingCompleteId === application.id
                                    ? <ActivityIndicator size="small" color={C.textInverse} />
                                    : (
                                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                                        <FontAwesome6 name="circle-check" size={14} color={C.textInverse} />
                                        <Text style={[styles.enrolledChipText, { color: C.textInverse, fontSize: 14 }]}>Mark as Complete</Text>
                                      </View>
                                    )
                                  }
                                </Pressable>
                                <Pressable
                                  onPress={() => handlePickCertFile(application)}
                                  style={({ pressed }) => [
                                    styles.enrolledFullButton,
                                    { backgroundColor: C.secondary },
                                    pressed && styles.pressed,
                                  ]}
                                >
                                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                                    <FontAwesome6 name="certificate" size={14} color={C.textInverse} />
                                    <Text style={[styles.enrolledChipText, { color: C.textInverse, fontSize: 14 }]}>Select Certificate & Mark Complete</Text>
                                  </View>
                                </Pressable>
                              </View>
                            )}

                            <View style={styles.enrolledDivider} />

                            {/* ── Payment ── */}
                            <View style={styles.enrolledRow}>
                              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                                <FontAwesome6 name="money-bill-wave" size={13} color={C.textSecondary} />
                                <Text style={styles.enrolledLabel}>Payment</Text>
                              </View>
                              {isFullPaid ? (
                                <View style={[styles.enrolledActionChip, { backgroundColor: C.successSoft }]}>
                                  <FontAwesome6 name="circle-check" size={11} color={C.success} />
                                  <Text style={[styles.enrolledChipText, { color: C.success }]}>Full — Paid</Text>
                                </View>
                              ) : (
                                <View style={[styles.enrolledActionChip, { backgroundColor: '#FFF8E1' }]}>
                                  <FontAwesome6 name="clock" size={11} color="#E65100" />
                                  <Text style={[styles.enrolledChipText, { color: '#E65100' }]}>Partial</Text>
                                </View>
                              )}
                            </View>
                            {!isFullPaid ? (
                              <Pressable
                                onPress={() => handleMarkFullPayment(application)}
                                disabled={markingPaidId === application.id}
                                style={({ pressed }) => [
                                  styles.outlineButton,
                                  (pressed || markingPaidId === application.id) && styles.pressed,
                                ]}
                              >
                                {markingPaidId === application.id
                                  ? <ActivityIndicator size="small" color={C.textSecondary} />
                                  : (
                                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                                      <FontAwesome6 name="circle-check" size={13} color={C.success} />
                                      <Text style={styles.outlineButtonText}>Confirm Full Payment Received</Text>
                                    </View>
                                  )
                                }
                              </Pressable>
                            ) : null}

                            {/* ── Access ── */}
                            <View style={styles.enrolledRow}>
                              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                                <FontAwesome6 name={isLocked ? 'lock' : 'lock-open'} size={13} color={C.textSecondary} />
                                <Text style={styles.enrolledLabel}>Access</Text>
                              </View>
                              <View style={[styles.enrolledActionChip, { backgroundColor: isLocked ? C.dangerSoft : C.successSoft }]}>
                                <FontAwesome6 name={isLocked ? 'lock' : 'lock-open'} size={11} color={isLocked ? C.danger : C.success} />
                                <Text style={[styles.enrolledChipText, { color: isLocked ? C.danger : C.success }]}>
                                  {isLocked ? 'Locked' : 'Active'}
                                </Text>
                              </View>
                            </View>
                            <Pressable
                              onPress={() => handleToggleLock(application)}
                              disabled={lockingId === application.id}
                              style={({ pressed }) => [
                                styles.outlineButton,
                                (pressed || lockingId === application.id) && styles.pressed,
                              ]}
                            >
                              {lockingId === application.id
                                ? <ActivityIndicator size="small" color={C.textSecondary} />
                                : (
                                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                                    <FontAwesome6 name={isLocked ? 'lock-open' : 'lock'} size={13} color={isLocked ? C.success : C.danger} />
                                    <Text style={[styles.outlineButtonText, { color: isLocked ? C.success : C.danger }]}>
                                      {isLocked ? 'Unlock Access' : 'Lock Access'}
                                    </Text>
                                  </View>
                                )
                              }
                            </Pressable>

                            <View style={styles.enrolledDivider} />

                            {/* ── Sessions ── */}
                            {courseSessions.length > 0 ? (
                              <View style={{ gap: 6 }}>
                                <Text style={styles.enrolledLabel}>Course Sessions</Text>
                                {courseSessions.map((s) => (
                                  <View key={s.id} style={styles.sessionRow}>
                                    <View style={{ flex: 1 }}>
                                      <Text style={styles.panelTitle}>{s.title}</Text>
                                      <Text style={styles.panelSubtitle}>
                                        {s.scheduledDate?.toDate ? s.scheduledDate.toDate().toLocaleString() : String(s.scheduledDate)}
                                      </Text>
                                    </View>
                                    <Pressable onPress={() => deleteSession(s.id)} style={({ pressed }) => [pressed && styles.pressed]}>
                                      <FontAwesome6 name="trash" size={14} color={C.danger} />
                                    </Pressable>
                                  </View>
                                ))}
                              </View>
                            ) : null}

                            <View style={{ gap: 6 }}>
                              <Text style={styles.enrolledLabel}>Send Personal Session</Text>
                              <TextInput
                                style={styles.input}
                                placeholder="Session title"
                                value={personalSessionInputs[application.id]?.title ?? ''}
                                onChangeText={(v) => setPersonalSessionInputs((prev) => ({ ...prev, [application.id]: { ...prev[application.id], title: v } }))}
                              />
                              <DatePickerField
                                value={personalSessionInputs[application.id]?.date ?? ''}
                                onChange={(v) => setPersonalSessionInputs((prev) => ({ ...prev, [application.id]: { ...prev[application.id], date: v } }))}
                                mode="datetime"
                                placeholder="Select date and time"
                              />
                              <TextInput
                                style={styles.input}
                                placeholder="Zoom link"
                                autoCapitalize="none"
                                value={personalSessionInputs[application.id]?.link ?? ''}
                                onChangeText={(v) => setPersonalSessionInputs((prev) => ({ ...prev, [application.id]: { ...prev[application.id], link: v } }))}
                              />
                              <Pressable
                                onPress={() => handleCreatePersonalSession(application)}
                                disabled={personalSessionSavingId === application.id}
                                style={({ pressed }) => [
                                  styles.outlineButton,
                                  (pressed || personalSessionSavingId === application.id) && styles.pressed,
                                ]}
                              >
                                {personalSessionSavingId === application.id
                                  ? <ActivityIndicator size="small" color={C.textSecondary} />
                                  : <Text style={styles.outlineButtonText}>Send to {application.fullName?.trim() || 'Student'}</Text>
                                }
                              </Pressable>
                            </View>

                            <View style={styles.enrolledDivider} />

                            {/* ── Delete enrollment ── */}
                            {confirmDeleteEnrollId === application.id ? (
                              <View style={{ gap: 10 }}>
                                <Text style={{ fontFamily: Fonts.sans, fontSize: 13, color: C.danger }}>
                                  Remove {application.fullName?.trim() || 'this student'} from the course? This cannot be undone.
                                </Text>
                                <View style={{ flexDirection: 'row', gap: 10 }}>
                                  <Pressable
                                    onPress={() => setConfirmDeleteEnrollId(null)}
                                    style={({ pressed }) => [styles.enrolledActionChip, pressed && styles.pressed]}
                                  >
                                    <Text style={styles.enrolledChipText}>Cancel</Text>
                                  </Pressable>
                                  <Pressable
                                    onPress={() => {
                                      setConfirmDeleteEnrollId(null);
                                      handleDeleteApplication(application);
                                    }}
                                    disabled={busyApplicationId === application.id}
                                    style={({ pressed }) => [
                                      styles.enrolledActionChip,
                                      { backgroundColor: C.danger },
                                      (pressed || busyApplicationId === application.id) && styles.pressed,
                                    ]}
                                  >
                                    {busyApplicationId === application.id
                                      ? <ActivityIndicator size="small" color={C.textInverse} />
                                      : <Text style={[styles.enrolledChipText, { color: C.textInverse }]}>Confirm Delete</Text>
                                    }
                                  </Pressable>
                                </View>
                              </View>
                            ) : (
                              <Pressable
                                onPress={() => setConfirmDeleteEnrollId(application.id)}
                                style={({ pressed }) => [styles.enrolledDangerRow, pressed && styles.pressed]}
                              >
                                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                                  <FontAwesome6 name="trash" size={12} color={C.danger} />
                                  <Text style={styles.enrolledDangerText}>Delete Enrollment</Text>
                                </View>
                              </Pressable>
                            )}
                          </View>
                        ) : null}
                      </View>
                    );
                  })}
                  {/* Add Session form */}
                  <View style={styles.workspaceCard}>
                    <Text style={styles.workspaceTitle}>Schedule a Virtual Session</Text>
                    {sessionMsg ? (
                      <View style={[styles.banner, { backgroundColor: sessionMsg.kind === 'success' ? C.successSoft : C.dangerSoft }]}>
                        <Text style={[styles.bannerText, { color: sessionMsg.kind === 'success' ? C.success : C.danger }]}>{sessionMsg.text}</Text>
                      </View>
                    ) : null}
                    <View style={styles.fieldGroup}>
                      <Text style={styles.fieldLabel}>Course</Text>
                      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
                        {enrolledApplications
                          .filter((a, i, arr) => arr.findIndex((x) => x.courseId === a.courseId) === i)
                          .map((a) => {
                            const selected = sessionCourseIds.includes(a.courseId);
                            return (
                              <Pressable
                                key={a.courseId}
                                onPress={() =>
                                  setSessionCourseIds((prev) =>
                                    selected ? prev.filter((id) => id !== a.courseId) : [...prev, a.courseId]
                                  )
                                }
                                style={({ pressed }) => [
                                  styles.courseChip,
                                  selected && styles.courseChipActive,
                                  pressed && styles.pressed,
                                ]}
                              >
                                <Text style={[styles.courseChipText, selected && styles.courseChipTextActive]}>
                                  {a.courseTitle || a.courseId}
                                </Text>
                              </Pressable>
                            );
                          })}
                      </View>
                    </View>
                    <View style={styles.fieldGroup}>
                      <Text style={styles.fieldLabel}>Session Title</Text>
                      <TextInput style={styles.input} value={sessionTitle} onChangeText={setSessionTitle} placeholder="e.g. Week 3 — Live Q&A" />
                    </View>
                    <View style={styles.fieldGroup}>
                      <Text style={styles.fieldLabel}>Date & Time</Text>
                      <DatePickerField value={sessionDate} onChange={setSessionDate} mode="datetime" placeholder="Select date and time" />
                    </View>
                    <View style={styles.fieldGroup}>
                      <Text style={styles.fieldLabel}>Zoom Link</Text>
                      <TextInput style={styles.input} value={sessionLink} onChangeText={setSessionLink} placeholder="https://zoom.us/j/..." autoCapitalize="none" />
                    </View>
                    <Pressable
                      onPress={handleCreateSession}
                      disabled={sessionSaving}
                      style={({ pressed }) => [styles.primaryButton, (pressed || sessionSaving) && styles.pressed]}
                    >
                      {sessionSaving
                        ? <ActivityIndicator size="small" color={C.textInverse} />
                        : <Text style={styles.primaryButtonText}>Post Session</Text>
                      }
                    </Pressable>
                  </View>
                </View>
              ) : (
                <EmptyState
                  icon="user-graduate"
                  title="No enrolled students yet"
                  body="Approved applicants will appear here. Go to Pending to review new applications."
                />
              )
            ) : admissionsTab === 'pending' ? (
              pendingApplications.length > 0 ? (
                <View style={styles.stack}>
                  {pendingApplications.map((application) => (
                    <ApplicationCard
                      key={application.id}
                      application={application}
                      busy={busyApplicationId === application.id}
                      onApprove={() => handleApprove(application)}
                      onReject={(feedback) => handleReject(application, feedback)}
                      onDelete={() => handleDeleteApplication(application)}
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
            ) : admissionsTab === 'rejected' ? (
              rejectedApplications.length > 0 ? (
                <View style={styles.stack}>
                  {rejectedApplications.map((application) => (
                    <ApplicationCard
                      key={application.id}
                      application={application}
                      busy={busyApplicationId === application.id}
                      onApprove={() => {}}
                      onReject={() => {}}
                      onDelete={() => handleDeleteApplication(application)}
                    />
                  ))}
                </View>
              ) : (
                <EmptyState
                  icon="folder-open"
                  title="No rejected applications"
                  body="Rejected applications will appear here once you action them from the Pending tab."
                />
              )
            ) : (
              withdrawnApplications.length > 0 ? (
                <View style={styles.stack}>
                  {withdrawnApplications.map((application) => (
                    <ApplicationCard
                      key={application.id}
                      application={application}
                      busy={busyApplicationId === application.id}
                      onApprove={() => {}}
                      onReject={() => {}}
                      onDelete={() => handleDeleteApplication(application)}
                    />
                  ))}
                </View>
              ) : (
                <EmptyState
                  icon="right-from-bracket"
                  title="No withdrawals"
                  body="Applications withdrawn by students will appear here."
                />
              )
            )}
          </>
        ) : null}

        {activeView === 'cases' ? (
          <>
            <View style={styles.tabRow}>
              <Pressable
                onPress={() => setCasesTab('unassigned')}
                style={[styles.tabBtn, casesTab === 'unassigned' ? styles.tabBtnActive : null]}
              >
                <Text style={[styles.tabBtnText, casesTab === 'unassigned' ? styles.tabBtnTextActive : null]}>
                  Unassigned ({services.filter((s) => !s.mediatorName).length})
                </Text>
              </Pressable>
              <Pressable
                onPress={() => setCasesTab('assigned')}
                style={[styles.tabBtn, casesTab === 'assigned' ? styles.tabBtnActive : null]}
              >
                <Text style={[styles.tabBtnText, casesTab === 'assigned' ? styles.tabBtnTextActive : null]}>
                  Assigned ({services.filter((s) => !!s.mediatorName).length})
                </Text>
              </Pressable>
            </View>
            {(() => {
              const base = casesTab === 'unassigned'
                ? services.filter((s) => !s.mediatorName)
                : services.filter((s) => !!s.mediatorName);
              // Bring the notification-tapped case to the top
              const filtered = openCaseId
                ? [...base.filter((s) => s.id === openCaseId), ...base.filter((s) => s.id !== openCaseId)]
                : base;
              return filtered.length > 0 ? (
                <View style={styles.stack}>
                  {filtered.map((service) => (
                    <CaseCard
                      key={service.id}
                      service={service}
                      busyAssign={busyAssignId === service.id}
                      busyStatus={busyStatusId === service.id}
                      busyDelete={busyDeleteId === service.id}
                      onAssignMediator={(name, note) => handleAssignMediator(service, name, note)}
                      onMarkComplete={(resolution) => handleUpdateStatus(service, 'completed', resolution)}
                      onDelete={() => handleDeleteCase(service)}
                    />
                  ))}
                </View>
              ) : (
                <EmptyState
                  icon="scale-balanced"
                  title={casesTab === 'unassigned' ? 'No unassigned cases' : 'No assigned cases'}
                  body={casesTab === 'unassigned'
                    ? 'All submitted cases have been assigned a mediator.'
                    : 'Assign a mediator to a case and it will appear here.'}
                />
              );
            })()}
          </>
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
                    <Pressable key={t} onPress={() => { setMatType(t); setMatUrl(''); setMatFileName(''); }}
                      style={({ pressed }) => [styles.selectorChip, matType === t ? { backgroundColor: C.primarySoft, borderColor: C.secondary } : null, pressed ? styles.pressed : null]}>
                      <Text style={[styles.selectorChipText, matType === t ? { color: C.secondary } : null]}>{t.toUpperCase()}</Text>
                    </Pressable>
                  ))}
                </View>
              </View>

              <View style={styles.fieldGroup}>
                <Text style={styles.fieldLabel}>{matType === 'pdf' || matType === 'doc' ? 'File' : 'URL'}</Text>
                {matType === 'pdf' || matType === 'doc' ? (
                  <Pressable
                    onPress={handlePickMaterialFile}
                    disabled={matUploading}
                    style={({ pressed }) => [styles.uploadBtn, matUrl && styles.uploadBtnDone, pressed && styles.pressed]}
                  >
                    {matUploading ? (
                      <View style={styles.uploadBtnInner}>
                        <ActivityIndicator size="small" color={C.secondary} />
                        <Text style={styles.uploadBtnText}>Uploading {Math.round(matUploadProgress * 100)}%…</Text>
                      </View>
                    ) : matUrl ? (
                      <View style={styles.uploadBtnInner}>
                        <FontAwesome6 name="circle-check" size={15} color={C.success} />
                        <Text style={[styles.uploadBtnText, { color: C.success }]} numberOfLines={1}>{matFileName || 'File uploaded'}</Text>
                        <FontAwesome6 name="arrow-rotate-right" size={12} color={C.textMuted} />
                      </View>
                    ) : (
                      <View style={styles.uploadBtnInner}>
                        <FontAwesome6 name="arrow-up-from-bracket" size={15} color={C.secondary} />
                        <Text style={styles.uploadBtnText}>Choose {matType === 'pdf' ? 'PDF' : 'Word document'}</Text>
                      </View>
                    )}
                  </Pressable>
                ) : (
                  <TextInput
                    value={matUrl}
                    onChangeText={setMatUrl}
                    placeholder={matType === 'video' ? 'Paste YouTube or Vimeo link…' : 'Paste a website or resource link…'}
                    placeholderTextColor={C.textMuted}
                    style={[styles.input, styles.materialUrlInput]}
                    autoCapitalize="none"
                    autoCorrect={false}
                  />
                )}
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
                          <Pressable onPress={() => handleDeleteMaterial(mat.id, mat.fileUrl)} style={({ pressed }) => [styles.deleteBtn, pressed ? styles.pressed : null]}>
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
              <Pressable onPress={() => setAsnTab('submissions')} style={[styles.tabBtn, asnTab === 'submissions' ? styles.tabBtnActive : null]}>
                <Text style={[styles.tabBtnText, asnTab === 'submissions' ? styles.tabBtnTextActive : null]}>
                  Submissions ({adminAssignments.reduce((acc, a) => acc + a.submissions.length, 0)})
                </Text>
              </Pressable>
            </View>

            {asnMsg ? (
              <View style={[styles.banner, { backgroundColor: asnMsg.kind === 'success' ? C.successSoft : C.dangerSoft }]}>
                <Text style={[styles.bannerText, { color: asnMsg.kind === 'success' ? C.success : C.danger }]}>{asnMsg.text}</Text>
              </View>
            ) : null}

            {asnTab !== 'submissions' ? (
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
                  <Text style={styles.fieldLabel}>Deadline</Text>
                  <DatePickerField value={asnDeadline} onChange={setAsnDeadline} placeholder="Select deadline" />
                </View>

                <View style={styles.fieldGroup}>
                  <Text style={styles.fieldLabel}>Assignment File (PDF or document)</Text>
                  <Pressable
                    onPress={handlePickAssignmentFile}
                    disabled={asnUploading}
                    style={({ pressed }) => [styles.uploadBtn, asnFileUrl ? styles.uploadBtnDone : null, pressed ? styles.pressed : null]}
                  >
                    {asnUploading ? (
                      <View style={styles.uploadBtnInner}>
                        <ActivityIndicator size="small" color={C.secondary} />
                        <Text style={styles.uploadBtnText}>Uploading {Math.round(asnUploadProgress * 100)}%…</Text>
                      </View>
                    ) : asnFileUrl ? (
                      <View style={styles.uploadBtnInner}>
                        <FontAwesome6 name="circle-check" size={14} color={C.success} />
                        <Text style={[styles.uploadBtnText, { color: C.success }]} numberOfLines={1}>{asnFileName || 'File uploaded'}</Text>
                        <FontAwesome6 name="arrow-rotate-right" size={11} color={C.textMuted} />
                      </View>
                    ) : (
                      <View style={styles.uploadBtnInner}>
                        <FontAwesome6 name="arrow-up-from-bracket" size={14} color={C.secondary} />
                        <Text style={styles.uploadBtnText}>Upload PDF or document</Text>
                      </View>
                    )}
                  </Pressable>
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
                          <Text style={styles.panelSubtitle}>{asn.courseId.toUpperCase()} · {asn.submissions.length} submission{asn.submissions.length !== 1 ? 's' : ''}</Text>
                        </View>
                        <Pressable
                          onPress={() => handleDeleteAssignment(asn.id, asn.fileUrl)}
                          style={({ pressed }) => [styles.deleteBtn, pressed && styles.pressed]}
                        >
                          <FontAwesome6 name="trash" size={13} color={C.danger} />
                        </Pressable>
                      </View>

                      {asn.fileUrl ? (
                        <Pressable
                          onPress={() => WebBrowser.openBrowserAsync(asn.fileUrl!)}
                          style={({ pressed }) => [styles.fileChip, pressed && styles.pressed]}
                        >
                          <FontAwesome6 name="file-arrow-down" size={12} color={C.secondary} />
                          <Text style={styles.fileChipText}>Assignment File Attached</Text>
                          <FontAwesome6 name="arrow-up-right-from-square" size={11} color={C.textMuted} />
                        </Pressable>
                      ) : null}

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
                                  <Text style={styles.subUserId}>{sub.studentName?.trim() || 'Student submission'}</Text>
                                  <Text style={styles.subMeta}>{sub.studentEmail?.trim() || sub.userId}</Text>
                                  <Text style={styles.subMeta}>{formatDate(sub.submittedAt)} · {sub.status === 'graded' ? getOutcomeLabel(sub.grade ?? 0) : 'Pending Review'}</Text>
                                </View>
                                {sub.status !== 'graded' ? (
                                  <Pressable onPress={() => { setGradingKey(key); setSelectedOutcome(null); setReviewFeedback(''); }}
                                    style={({ pressed }) => [styles.gradeBtn, pressed ? styles.pressed : null]}>
                                    <Text style={styles.gradeBtnText}>Review</Text>
                                  </Pressable>
                                ) : null}
                              </View>

                              {sub.text ? (
                                <View style={styles.subTextCard}>
                                  <Text style={styles.noteLabel}>Submission</Text>
                                  <Text style={styles.noteBody}>{sub.text}</Text>
                                </View>
                              ) : null}

                              {sub.attachmentLink ? (
                                <Pressable
                                  onPress={() => WebBrowser.openBrowserAsync(sub.attachmentLink!)}
                                  style={({ pressed }) => [styles.fileChip, { alignSelf: 'flex-start' }, pressed && styles.pressed]}
                                >
                                  <FontAwesome6 name="file-arrow-down" size={12} color={C.secondary} />
                                  <Text style={styles.fileChipText}>Open {sub.studentName?.trim() || 'Student'}'s File</Text>
                                  <FontAwesome6 name="arrow-up-right-from-square" size={11} color={C.textMuted} />
                                </Pressable>
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
                                    <Text style={styles.fieldLabel}>Outcome</Text>
                                    <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap', marginTop: 4 }}>
                                      {(['needs_revision', 'satisfactory', 'excellent'] as const).map((outcome) => {
                                        const cfg = {
                                          needs_revision: { label: 'Needs Revision', color: C.warning, bg: C.warningSoft },
                                          satisfactory: { label: 'Satisfactory', color: C.secondary, bg: C.secondarySoft },
                                          excellent: { label: 'Excellent', color: C.success, bg: C.successSoft },
                                        }[outcome];
                                        const isSelected = selectedOutcome === outcome;
                                        return (
                                          <Pressable
                                            key={outcome}
                                            onPress={() => setSelectedOutcome(outcome)}
                                            style={[{
                                              paddingHorizontal: 16, paddingVertical: 9,
                                              borderRadius: 20, borderWidth: 1.5,
                                              borderColor: isSelected ? cfg.color : C.border,
                                              backgroundColor: isSelected ? cfg.bg : 'transparent',
                                            }]}
                                          >
                                            <Text style={{ fontSize: 13, fontFamily: Fonts.sansSemiBold, color: isSelected ? cfg.color : C.textMuted }}>
                                              {cfg.label}
                                            </Text>
                                          </Pressable>
                                        );
                                      })}
                                    </View>
                                  </View>
                                  <View style={styles.fieldGroup}>
                                    <Text style={styles.fieldLabel}>Feedback (optional)</Text>
                                    <TextInput value={reviewFeedback} onChangeText={setReviewFeedback} placeholder="Add comments for the student..." placeholderTextColor={C.textMuted} multiline textAlignVertical="top" style={styles.textArea} />
                                  </View>
                                  <View style={styles.buttonRow}>
                                    <Pressable onPress={() => { setGradingKey(null); setSelectedOutcome(null); setReviewFeedback(''); }} style={({ pressed }) => [styles.secondaryButton, pressed ? styles.pressed : null]}>
                                      <Text style={styles.secondaryButtonText}>Cancel</Text>
                                    </Pressable>
                                    <Pressable onPress={() => handleGradeSubmission(asn, sub.userId)} disabled={gradingSaving}
                                      style={({ pressed }) => [styles.primaryButton, (gradingSaving || pressed) ? styles.pressed : null]}>
                                      {gradingSaving ? <ActivityIndicator size="small" color={C.textInverse} /> : <Text style={styles.primaryButtonText}>Submit Review</Text>}
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
                <Text style={[styles.tabBtnText, testTab === 'create' ? styles.tabBtnTextActive : null]}>Create</Text>
              </Pressable>
              <Pressable onPress={() => setTestTab('submissions')} style={[styles.tabBtn, testTab === 'submissions' ? styles.tabBtnActive : null]}>
                <Text style={[styles.tabBtnText, testTab === 'submissions' ? styles.tabBtnTextActive : null]}>
                  Submissions ({adminTests.reduce((acc, t) => acc + t.submissions.length, 0)})
                </Text>
              </Pressable>
            </View>

            {testMsg ? (
              <View style={[styles.banner, { backgroundColor: testMsg.kind === 'success' ? C.successSoft : C.dangerSoft }]}>
                <Text style={[styles.bannerText, { color: testMsg.kind === 'success' ? C.success : C.danger }]}>{testMsg.text}</Text>
              </View>
            ) : null}

            {testTab !== 'submissions' ? (
            <View style={styles.workspaceCard}>
                <Text style={styles.workspaceTitle}>Schedule New Test</Text>

                <View style={styles.fieldGroup}>
                  <Text style={styles.fieldLabel}>Course</Text>
                  <View style={styles.statusSelectorRow}>
                    {([{ id: 'pecadr', label: 'PECADR' }, { id: 'pemadr', label: 'PEMADR' }] as const).map((c) => (
                      <Pressable key={c.id} onPress={() => setTestCourse(c.id)}
                        style={({ pressed }) => [styles.selectorChip, testCourse === c.id ? { backgroundColor: C.primarySoft, borderColor: C.secondary } : null, pressed ? styles.pressed : null]}>
                        <Text style={[styles.selectorChipText, testCourse === c.id ? { color: C.secondary } : null]}>{c.label}</Text>
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
                  <Text style={styles.fieldLabel}>Scheduled Date</Text>
                  <DatePickerField value={testDate} onChange={setTestDate} placeholder="Select test date" />
                </View>

                <View style={styles.fieldGroup}>
                  <Text style={styles.fieldLabel}>Test Paper (PDF or document)</Text>
                  <Pressable
                    onPress={handlePickTestFile}
                    disabled={testUploading}
                    style={({ pressed }) => [styles.uploadBtn, testFileUrl ? styles.uploadBtnDone : null, pressed ? styles.pressed : null]}
                  >
                    {testUploading ? (
                      <View style={styles.uploadBtnInner}>
                        <ActivityIndicator size="small" color={C.secondary} />
                        <Text style={styles.uploadBtnText}>Uploading {Math.round(testUploadProgress * 100)}%…</Text>
                      </View>
                    ) : testFileUrl ? (
                      <View style={styles.uploadBtnInner}>
                        <FontAwesome6 name="circle-check" size={14} color={C.success} />
                        <Text style={[styles.uploadBtnText, { color: C.success }]} numberOfLines={1}>{testFileName || 'File uploaded'}</Text>
                        <FontAwesome6 name="arrow-rotate-right" size={11} color={C.textMuted} />
                      </View>
                    ) : (
                      <View style={styles.uploadBtnInner}>
                        <FontAwesome6 name="arrow-up-from-bracket" size={14} color={C.secondary} />
                        <Text style={styles.uploadBtnText}>Upload PDF or document</Text>
                      </View>
                    )}
                  </Pressable>
                </View>

                <View style={styles.fieldGroup}>
                  <Text style={styles.fieldLabel}>Duration (min)</Text>
                  <TextInput value={testDuration} onChangeText={setTestDuration} keyboardType="numeric" placeholder="60" placeholderTextColor={C.textMuted} style={styles.input} />
                </View>

                <Pressable onPress={handleCreateTest} disabled={testSaving}
                  style={({ pressed }) => [styles.primaryButton, (testSaving || pressed) ? styles.pressed : null]}>
                  {testSaving ? <ActivityIndicator size="small" color={C.textInverse} /> : <Text style={styles.primaryButtonText}>Schedule Test</Text>}
                </Pressable>
            </View>
            ) : (
              adminTests.length === 0 ? (
                <EmptyState icon="clipboard-list" title="No tests yet" body="Schedule a test first, then students' submissions will appear here." />
              ) : (
              <View style={styles.stack}>
                {adminTests.map((test) => (
                  <View key={test.id} style={styles.panelCard}>
                    <View style={styles.panelHeaderRow}>
                      <View style={styles.panelHeaderCopy}>
                        <Text style={styles.panelTitle}>{test.title}</Text>
                        <Text style={styles.panelSubtitle}>{test.courseId.toUpperCase()} · {formatDate(test.scheduledDate)} · {test.durationMinutes} min · {test.submissions.length} submission{test.submissions.length !== 1 ? 's' : ''}</Text>
                      </View>
                      <Pressable
                        onPress={() => handleDeleteTest(test.id, test.fileUrl)}
                        style={({ pressed }) => [styles.deleteBtn, pressed && styles.pressed]}
                      >
                        <FontAwesome6 name="trash" size={13} color={C.danger} />
                      </Pressable>
                    </View>

                    {test.description ? (
                      <View style={styles.noteBlock}>
                        <Text style={styles.noteLabel}>Instructions</Text>
                        <Text style={styles.noteBody}>{test.description}</Text>
                      </View>
                    ) : null}

                    {test.fileUrl ? (
                      <Pressable
                        onPress={() => WebBrowser.openBrowserAsync(test.fileUrl!)}
                        style={({ pressed }) => [styles.fileChip, pressed && styles.pressed]}
                      >
                        <FontAwesome6 name="file-arrow-down" size={12} color={C.secondary} />
                        <Text style={styles.fileChipText}>Test Paper Attached</Text>
                        <FontAwesome6 name="arrow-up-right-from-square" size={11} color={C.textMuted} />
                      </Pressable>
                    ) : null}

                    {test.submissions.length === 0 ? (
                      <View style={[styles.banner, { backgroundColor: C.surfaceAlt }]}>
                        <Text style={[styles.bannerText, { color: C.textMuted }]}>No submissions yet.</Text>
                      </View>
                    ) : (
                      <View style={{ gap: 8, marginTop: 4 }}>
                        {test.submissions.map((sub) => {
                          const key = `${test.id}__${sub.userId}`;
                          const isReviewing = reviewingTestKey === key;
                          return (
                            <View key={sub.userId} style={styles.subCard}>
                              <View style={styles.subHeaderRow}>
                                <View style={{ flex: 1, gap: 2 }}>
                                  <Text style={styles.subUserId}>{sub.studentName?.trim() || 'Student'}</Text>
                                  <Text style={styles.subMeta}>{sub.studentEmail?.trim() || sub.userId}</Text>
                                  <Text style={styles.subMeta}>
                                    {formatDate(sub.submittedAt)} · {sub.grade != null ? getOutcomeLabel(sub.grade) : 'Pending Review'}
                                  </Text>
                                </View>
                                {sub.grade == null ? (
                                  <Pressable
                                    onPress={() => { setReviewingTestKey(key); setSelectedTestOutcome(null); setTestReviewFeedback(''); }}
                                    style={({ pressed }) => [styles.gradeBtn, pressed && styles.pressed]}
                                  >
                                    <Text style={styles.gradeBtnText}>Review</Text>
                                  </Pressable>
                                ) : null}
                              </View>

                              {sub.text ? (
                                <View style={styles.subTextCard}>
                                  <Text style={styles.noteLabel}>Submission</Text>
                                  <Text style={styles.noteBody}>{sub.text}</Text>
                                </View>
                              ) : null}
                              {sub.attachmentLink ? (
                                <Pressable
                                  onPress={() => WebBrowser.openBrowserAsync(sub.attachmentLink!)}
                                  style={({ pressed }) => [styles.fileChip, { alignSelf: 'flex-start' }, pressed && styles.pressed]}
                                >
                                  <FontAwesome6 name="file-arrow-down" size={12} color={C.secondary} />
                                  <Text style={styles.fileChipText}>Open {sub.studentName?.trim() || 'Student'}'s File</Text>
                                  <FontAwesome6 name="arrow-up-right-from-square" size={11} color={C.textMuted} />
                                </Pressable>
                              ) : null}

                              {isReviewing ? (
                                <View style={styles.gradeForm}>
                                  <View style={styles.fieldGroup}>
                                    <Text style={styles.fieldLabel}>Outcome</Text>
                                    <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap', marginTop: 4 }}>
                                      {(['needs_revision', 'satisfactory', 'excellent'] as const).map((outcome) => {
                                        const cfg = {
                                          needs_revision: { label: 'Needs Revision', color: C.warning, bg: C.warningSoft },
                                          satisfactory: { label: 'Satisfactory', color: C.secondary, bg: C.secondarySoft },
                                          excellent: { label: 'Excellent', color: C.success, bg: C.successSoft },
                                        }[outcome];
                                        const isSelected = selectedTestOutcome === outcome;
                                        return (
                                          <Pressable
                                            key={outcome}
                                            onPress={() => setSelectedTestOutcome(outcome)}
                                            style={[{
                                              paddingHorizontal: 16, paddingVertical: 9,
                                              borderRadius: 20, borderWidth: 1.5,
                                              borderColor: isSelected ? cfg.color : C.border,
                                              backgroundColor: isSelected ? cfg.bg : 'transparent',
                                            }]}
                                          >
                                            <Text style={{ fontSize: 13, fontFamily: Fonts.sansSemiBold, color: isSelected ? cfg.color : C.textMuted }}>
                                              {cfg.label}
                                            </Text>
                                          </Pressable>
                                        );
                                      })}
                                    </View>
                                  </View>
                                  <View style={styles.fieldGroup}>
                                    <Text style={styles.fieldLabel}>Feedback (optional)</Text>
                                    <TextInput value={testReviewFeedback} onChangeText={setTestReviewFeedback} placeholder="Add comments for the student..." placeholderTextColor={C.textMuted} multiline textAlignVertical="top" style={styles.textArea} />
                                  </View>
                                  <View style={styles.buttonRow}>
                                    <Pressable onPress={() => { setReviewingTestKey(null); setSelectedTestOutcome(null); setTestReviewFeedback(''); }} style={({ pressed }) => [styles.secondaryButton, pressed && styles.pressed]}>
                                      <Text style={styles.secondaryButtonText}>Cancel</Text>
                                    </Pressable>
                                    <Pressable onPress={() => handleReviewTest(test, sub.userId)} disabled={testReviewSaving}
                                      style={({ pressed }) => [styles.primaryButton, (testReviewSaving || pressed) && styles.pressed]}>
                                      {testReviewSaving ? <ActivityIndicator size="small" color={C.textInverse} /> : <Text style={styles.primaryButtonText}>Submit Review</Text>}
                                    </Pressable>
                                  </View>
                                </View>
                              ) : null}
                            </View>
                          );
                        })}
                      </View>
                    )}
                  </View>
                ))}
              </View>
              )
            )}
          </>
        ) : null}

        {activeView === 'deletions' ? (
          deletionRequests.length > 0 ? (
            <View style={styles.stack}>
              {deletionRequests.map((req) => (
                <View key={req.id} style={styles.panelCard}>
                  <View style={styles.panelHeaderRow}>
                    <View style={styles.panelHeaderCopy}>
                      <Text style={styles.panelTitle}>{req.fullName?.trim() || 'Unknown user'}</Text>
                      <Text style={styles.panelSubtitle}>{req.email}</Text>
                    </View>
                    <View style={[styles.statusChip, { backgroundColor: C.dangerSoft }]}>
                      <View style={[styles.statusDot, { backgroundColor: C.danger }]} />
                      <Text style={[styles.statusChipText, { color: C.danger }]}>Pending</Text>
                    </View>
                  </View>

                  <View style={styles.metaWrap}>
                    <MetaChip label={req.role || 'Member'} />
                    <MetaChip icon="calendar" label={`Requested ${formatDate(req.requestedAt)}`} subtle />
                  </View>

                  <View style={styles.detailsCard}>
                    <Text style={styles.noteLabel}>Reason</Text>
                    <Text style={styles.noteBody}>{req.reason?.trim() || 'No reason provided.'}</Text>
                  </View>

                  <View style={styles.buttonRow}>
                    <Pressable
                      onPress={() => handleApproveDeletion(req)}
                      disabled={busyDeletionId === req.id}
                      style={({ pressed }) => [styles.dangerButton, (pressed || busyDeletionId === req.id) ? styles.pressed : null]}
                    >
                      {busyDeletionId === req.id
                        ? <ActivityIndicator size="small" color={C.textInverse} />
                        : <Text style={styles.dangerButtonText}>Approve &amp; Delete</Text>
                      }
                    </Pressable>
                    <Pressable
                      onPress={() => handleRejectDeletion(req)}
                      disabled={busyDeletionId === req.id}
                      style={({ pressed }) => [styles.secondaryButton, (pressed || busyDeletionId === req.id) ? styles.pressed : null]}
                    >
                      <Text style={styles.secondaryButtonText}>Reject</Text>
                    </Pressable>
                  </View>
                </View>
              ))}
            </View>
          ) : (
            <EmptyState
              icon="trash"
              title="No deletion requests"
              body="Account deletion requests from users will appear here for your review."
            />
          )
        ) : null}

        {activeView === 'registrations' ? (
          registrations.length > 0 ? (
            <View style={styles.stack}>
              {registrations.map((reg) => (
                <View key={reg.id} style={styles.panelCard}>
                  <View style={styles.panelHeaderRow}>
                    <View style={{ flex: 1, gap: 2 }}>
                      <Text style={styles.panelTitle}>{reg.fullName}</Text>
                      <Text style={styles.panelSubtitle}>{reg.email}</Text>
                      <Text style={styles.panelSubtitle}>{reg.phone}</Text>
                      <Text style={styles.panelSubtitle}>Course: {reg.courseInterest.toUpperCase()}</Text>
                    </View>
                    <View style={[styles.statusBadge, {
                      backgroundColor:
                        reg.status === 'accepted' ? '#E8F2EE' :
                        reg.status === 'letter_sent' ? '#EEF2F9' :
                        reg.status === 'rejected' ? '#F9EFEC' : '#F4ECD2',
                    }]}>
                      <Text style={[styles.statusBadgeText, {
                        color:
                          reg.status === 'accepted' ? C.success :
                          reg.status === 'letter_sent' ? C.secondary :
                          reg.status === 'rejected' ? C.danger : C.warning,
                      }]}>
                        {reg.status === 'pending' ? 'Pending' :
                         reg.status === 'letter_sent' ? 'Letter Sent' :
                         reg.status === 'accepted' ? 'Accepted' : 'Rejected'}
                      </Text>
                    </View>
                  </View>
                  {reg.studentNumber ? (
                    <Text style={styles.panelSubtitle}>Student No: {reg.studentNumber}</Text>
                  ) : null}
                  {reg.status === 'pending' && (
                    <View style={{ gap: 8, marginTop: 8 }}>
                      <TextInput
                        value={studentNumberInputs[reg.id] ?? ''}
                        onChangeText={(v) => setStudentNumberInputs((prev) => ({ ...prev, [reg.id]: v }))}
                        placeholder="Assign student number"
                        placeholderTextColor={C.textMuted}
                        style={styles.input}
                      />
                      <Pressable
                        onPress={() => handlePickLetterFile(reg.id)}
                        disabled={uploadingLetterId === reg.id}
                        style={({ pressed }) => [styles.uploadBtn, letterFileUrls[reg.id] ? styles.uploadBtnDone : null, pressed ? styles.pressed : null]}
                      >
                        {uploadingLetterId === reg.id ? (
                          <View style={styles.uploadBtnInner}>
                            <ActivityIndicator size="small" color={C.secondary} />
                            <Text style={styles.uploadBtnText}>Uploading {Math.round(letterUploadProgress * 100)}%…</Text>
                          </View>
                        ) : letterFileUrls[reg.id] ? (
                          <View style={styles.uploadBtnInner}>
                            <FontAwesome6 name="circle-check" size={14} color={C.success} />
                            <Text style={[styles.uploadBtnText, { color: C.success }]} numberOfLines={1}>{letterFileNames[reg.id] || 'Letter uploaded'}</Text>
                            <FontAwesome6 name="arrow-rotate-right" size={11} color={C.textMuted} />
                          </View>
                        ) : (
                          <View style={styles.uploadBtnInner}>
                            <FontAwesome6 name="arrow-up-from-bracket" size={14} color={C.secondary} />
                            <Text style={styles.uploadBtnText}>Upload Admission Letter (PDF)</Text>
                          </View>
                        )}
                      </Pressable>
                      <View style={styles.buttonRow}>
                        <Pressable
                          onPress={async () => {
                            const sn = studentNumberInputs[reg.id]?.trim();
                            if (!sn) { Alert.alert('Error', 'Please enter a student number.'); return; }
                            if (!letterFileUrls[reg.id]) { Alert.alert('Error', 'Please upload the admission letter first.'); return; }
                            setBusyRegId(reg.id);
                            try {
                              await sendAdmissionLetter(reg.id, reg.userId, sn, reg.fullName, reg.courseInterest, letterFileUrls[reg.id]);
                              setStudentNumberInputs((prev) => ({ ...prev, [reg.id]: '' }));
                              setLetterFileUrls((prev) => ({ ...prev, [reg.id]: '' }));
                              setLetterFileNames((prev) => ({ ...prev, [reg.id]: '' }));
                            } catch {
                              Alert.alert('Error', 'Could not send admission letter.');
                            } finally { setBusyRegId(null); }
                          }}
                          disabled={busyRegId === reg.id}
                          style={({ pressed }) => [styles.primaryButton, (pressed || busyRegId === reg.id) ? styles.pressed : null]}
                        >
                          {busyRegId === reg.id
                            ? <ActivityIndicator size="small" color={C.textInverse} />
                            : <Text style={styles.primaryButtonText}>Send Admission Letter</Text>
                          }
                        </Pressable>
                        <Pressable
                          onPress={async () => {
                            setBusyRegId(reg.id);
                            try { await rejectRegistration(reg.id); }
                            catch { Alert.alert('Error', 'Could not reject registration.'); }
                            finally { setBusyRegId(null); }
                          }}
                          disabled={busyRegId === reg.id}
                          style={({ pressed }) => [styles.secondaryButton, (pressed || busyRegId === reg.id) ? styles.pressed : null]}
                        >
                          <Text style={styles.secondaryButtonText}>Reject</Text>
                        </Pressable>
                      </View>
                    </View>
                  )}

                  {reg.status === 'letter_sent' && reg.letterUrl ? (
                    <Pressable
                      onPress={() => WebBrowser.openBrowserAsync(reg.letterUrl!)}
                      style={({ pressed }) => [styles.fileChip, { marginTop: 8 }, pressed && styles.pressed]}
                    >
                      <FontAwesome6 name="file-arrow-down" size={12} color={C.secondary} />
                      <Text style={styles.fileChipText}>View Sent Letter</Text>
                      <FontAwesome6 name="arrow-up-right-from-square" size={11} color={C.textMuted} />
                    </Pressable>
                  ) : null}

                  {/* Delete registration */}
                  <View style={[styles.enrolledDivider, { marginTop: 10 }]} />
                  {confirmDeleteRegId === reg.id ? (
                    <View style={{ gap: 8 }}>
                      <Text style={{ fontFamily: Fonts.sans, fontSize: 13, color: C.danger }}>
                        Delete this registration? This cannot be undone.
                      </Text>
                      <View style={{ flexDirection: 'row', gap: 8 }}>
                        <Pressable
                          onPress={() => setConfirmDeleteRegId(null)}
                          style={({ pressed }) => [styles.enrolledActionChip, pressed && styles.pressed]}
                        >
                          <Text style={styles.enrolledChipText}>Cancel</Text>
                        </Pressable>
                        <Pressable
                          onPress={async () => {
                            setConfirmDeleteRegId(null);
                            setBusyRegId(reg.id);
                            try { await deleteRegistration(reg.id); }
                            catch { Alert.alert('Error', 'Could not delete registration.'); }
                            finally { setBusyRegId(null); }
                          }}
                          disabled={busyRegId === reg.id}
                          style={({ pressed }) => [
                            styles.enrolledActionChip,
                            { backgroundColor: C.danger },
                            (pressed || busyRegId === reg.id) && styles.pressed,
                          ]}
                        >
                          {busyRegId === reg.id
                            ? <ActivityIndicator size="small" color={C.textInverse} />
                            : <Text style={[styles.enrolledChipText, { color: C.textInverse }]}>Confirm Delete</Text>
                          }
                        </Pressable>
                      </View>
                    </View>
                  ) : (
                    <Pressable
                      onPress={() => setConfirmDeleteRegId(reg.id)}
                      style={({ pressed }) => [styles.enrolledDangerRow, pressed && styles.pressed]}
                    >
                      <FontAwesome6 name="trash" size={12} color={C.danger} />
                      <Text style={styles.enrolledDangerText}>Delete Registration</Text>
                    </Pressable>
                  )}
                </View>
              ))}
            </View>
          ) : (
            <View style={styles.emptyState}>
              <Text style={styles.emptyStateText}>No registrations yet.</Text>
            </View>
          )
        ) : null}

        {activeView === 'team' ? (
          <View style={styles.stack}>
            <View style={styles.panelCard}>
              <Text style={styles.workspaceTitle}>Manage Team</Text>
              <Text style={styles.workspaceBody}>
                Promote users to admin or remove admin access. Changes take effect the next time the user opens the app.
              </Text>
              {teamMsg ? (
                <View style={[styles.banner, { backgroundColor: teamMsg.kind === 'success' ? C.successSoft : C.dangerSoft, marginTop: 8 }]}>
                  <Text style={[styles.bannerText, { color: teamMsg.kind === 'success' ? C.success : C.danger }]}>{teamMsg.text}</Text>
                </View>
              ) : null}
              <Pressable
                onPress={loadTeamUsers}
                disabled={teamLoading}
                style={({ pressed }) => [styles.secondaryButton, { marginTop: 12 }, (pressed || teamLoading) && styles.pressed]}
              >
                {teamLoading
                  ? <ActivityIndicator size="small" color={C.secondary} />
                  : <Text style={styles.secondaryButtonText}>Refresh List</Text>
                }
              </Pressable>
            </View>

            {teamLoading && teamUsers.length === 0 ? (
              <View style={[styles.panelCard, { alignItems: 'center', paddingVertical: 32 }]}>
                <ActivityIndicator size="large" color={C.secondary} />
              </View>
            ) : teamUsers.length === 0 ? (
              <EmptyState icon="users" title="No users yet" body="Registered users will appear here." />
            ) : (
              teamUsers.map((user) => {
                const isAdmin = user.role === 'admin';
                const isBusy = togglingUserId === user.id;
                const isExpanded = expandedUserId === user.id;
                const isSelf = user.id === auth.currentUser?.uid;
                return (
                  <View key={user.id} style={styles.panelCard}>
                    <Pressable
                      onPress={() => {
                        setExpandedUserId(isExpanded ? null : user.id);
                        setConfirmingUserId(null);
                      }}
                      style={({ pressed }) => [
                        styles.teamDropdownHeader,
                        pressed && styles.pressed,
                      ]}
                    >
                      <View style={styles.panelHeaderCopy}>
                        <Text style={styles.panelTitle}>{user.fullName?.trim() || 'No name'}</Text>
                        <Text style={styles.panelSubtitle}>{user.email}</Text>
                      </View>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                        <View style={[styles.statusChip, { backgroundColor: isAdmin ? C.warningSoft : C.successSoft }]}>
                          <View style={[styles.statusDot, { backgroundColor: isAdmin ? C.warning : C.success }]} />
                          <Text style={[styles.statusChipText, { color: isAdmin ? C.warning : C.success }]}>
                            {isAdmin ? 'Admin' : user.role.charAt(0).toUpperCase() + user.role.slice(1)}
                          </Text>
                        </View>
                        <FontAwesome6
                          name={isExpanded ? 'chevron-up' : 'chevron-down'}
                          size={13}
                          color={C.textSecondary}
                        />
                      </View>
                    </Pressable>
                    {isExpanded ? (
                      <View style={styles.teamDropdownBody}>
                        {user.phone ? (
                          <View style={[styles.metaWrap, { marginBottom: 10 }]}>
                            <MetaChip icon="phone" label={user.phone} subtle />
                          </View>
                        ) : null}
                        {isSelf ? (
                          <Text style={[styles.panelSubtitle, { fontStyle: 'italic' }]}>
                            This is you — you cannot change your own role.
                          </Text>
                        ) : confirmingUserId === user.id ? (
                          <View style={{ gap: 6 }}>
                            <Text style={[styles.panelSubtitle, { marginBottom: 2 }]}>
                              {isAdmin
                                ? `Remove admin access from ${user.fullName?.trim() || user.email}?`
                                : `Make ${user.fullName?.trim() || user.email} an admin?`}
                            </Text>
                            <View style={{ flexDirection: 'row', gap: 8 }}>
                              <Pressable
                                onPress={() => setConfirmingUserId(null)}
                                disabled={isBusy}
                                style={({ pressed }) => [
                                  styles.outlineButton,
                                  (pressed || isBusy) && styles.pressed,
                                  { flex: 1 },
                                ]}
                              >
                                <Text style={styles.outlineButtonText}>Cancel</Text>
                              </Pressable>
                              <Pressable
                                onPress={() => handleToggleAdmin(user)}
                                disabled={isBusy}
                                style={({ pressed }) => [
                                  isAdmin ? styles.dangerButton : styles.primaryButton,
                                  (pressed || isBusy) && styles.pressed,
                                  { flex: 1 },
                                ]}
                              >
                                {isBusy
                                  ? <ActivityIndicator size="small" color={C.textInverse} />
                                  : <Text style={isAdmin ? styles.dangerButtonText : styles.primaryButtonText}>
                                      Confirm
                                    </Text>
                                }
                              </Pressable>
                            </View>
                          </View>
                        ) : (
                          <Pressable
                            onPress={() => setConfirmingUserId(user.id)}
                            style={({ pressed }) => [
                              isAdmin ? styles.dangerButton : styles.primaryButton,
                              pressed && styles.pressed,
                            ]}
                          >
                            <Text style={isAdmin ? styles.dangerButtonText : styles.primaryButtonText}>
                              {isAdmin ? 'Remove Admin Access' : 'Make Admin'}
                            </Text>
                          </Pressable>
                        )}
                      </View>
                    ) : null}
                  </View>
                );
              })
            )}
          </View>
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
              <Text style={styles.workspaceTitle}>Published Announcements</Text>
              <Text style={styles.workspaceBody}>
                All active announcements visible to students. Tap Delete to remove one permanently.
              </Text>
              {announcements.length === 0 ? (
                <EmptyState
                  icon="bullhorn"
                  title="No announcements yet"
                  body="Publish your first operational update and it will appear here."
                />
              ) : (
                <View style={styles.feedCard}>
                  {announcements.map((ann, index) => (
                    <React.Fragment key={ann.id}>
                      <View style={styles.feedRow}>
                        <View style={[styles.feedMarker, { backgroundColor: ann.urgent ? C.warning : C.secondary }]} />
                        <View style={[styles.feedCopy, { flex: 1 }]}>
                          <View style={styles.feedTopRow}>
                            <Text style={[styles.feedTitle, { flex: 1, flexShrink: 1 }]}>{ann.title}</Text>
                            <Text style={styles.feedTime}>{formatDate(ann.createdAt)}</Text>
                          </View>
                          <Text style={styles.feedBody}>{ann.detail}</Text>
                          <Pressable
                            onPress={() => handleDeleteAnnouncement(ann.id)}
                            disabled={deletingAnnouncementId === ann.id}
                            style={({ pressed }) => [
                              styles.dangerButton,
                              { marginTop: 8, alignSelf: 'flex-start', minHeight: 36, paddingVertical: 8, paddingHorizontal: 16 },
                              (deletingAnnouncementId === ann.id || pressed) ? styles.pressed : null,
                            ]}
                          >
                            {deletingAnnouncementId === ann.id
                              ? <ActivityIndicator size="small" color={C.textInverse} />
                              : <Text style={styles.dangerButtonText}>Delete</Text>}
                          </Pressable>
                        </View>
                      </View>
                      {index < announcements.length - 1 ? <View style={styles.feedDivider} /> : null}
                    </React.Fragment>
                  ))}
                </View>
              )}
            </View>
          </View>
        ) : null}

        {activeView === 'courses' ? (
          <View style={[styles.dualGrid, isWide ? styles.dualGridWide : null]}>
            <View style={[styles.workspaceCard, isWide ? styles.workspaceCardWide : null]}>
              <Text style={styles.workspaceTitle}>
                {editingCourseId ? 'Edit Course' : 'Add New Course'}
              </Text>
              <Text style={styles.workspaceBody}>
                Changes here merge with the built-in courses. Leave optional fields blank to inherit defaults.
              </Text>

              {courseMsg ? (
                <View style={[styles.banner, { backgroundColor: courseMsg.kind === 'error' ? C.dangerSoft : C.successSoft }]}>
                  <Text style={[styles.bannerText, { color: courseMsg.kind === 'error' ? C.danger : C.success }]}>{courseMsg.text}</Text>
                </View>
              ) : null}

              <View style={styles.fieldGroup}>
                <Text style={styles.fieldLabel}>Title *</Text>
                <TextInput value={courseTitle} onChangeText={setCourseTitle} placeholder="Professional Executive Certificate in ADR" placeholderTextColor={C.textMuted} style={styles.input} />
              </View>
              <View style={styles.fieldGroup}>
                <Text style={styles.fieldLabel}>Program * (e.g. PECADR)</Text>
                <TextInput value={courseProgram} onChangeText={setCourseProgram} placeholder="PECADR" placeholderTextColor={C.textMuted} style={styles.input} />
              </View>
              <View style={styles.fieldGroup}>
                <Text style={styles.fieldLabel}>Level * (e.g. Certificate)</Text>
                <TextInput value={courseLevel} onChangeText={setCourseLevel} placeholder="Certificate" placeholderTextColor={C.textMuted} style={styles.input} />
              </View>
              <View style={styles.fieldGroup}>
                <Text style={styles.fieldLabel}>Duration * (e.g. 4 weeks)</Text>
                <TextInput value={courseDuration} onChangeText={setCourseDuration} placeholder="4 weeks" placeholderTextColor={C.textMuted} style={styles.input} />
              </View>
              <View style={styles.fieldGroup}>
                <Text style={styles.fieldLabel}>Schedule *</Text>
                <TextInput value={courseSchedule} onChangeText={setCourseSchedule} placeholder="Mondays, Wednesdays, and Fridays | 5:30 PM - 8:30 PM" placeholderTextColor={C.textMuted} style={styles.input} />
              </View>
              <View style={styles.fieldGroup}>
                <Text style={styles.fieldLabel}>Fees (GHS, numbers only)</Text>
                <TextInput value={courseFees} onChangeText={setCourseFees} placeholder="3200" placeholderTextColor={C.textMuted} keyboardType="numeric" style={styles.input} />
              </View>
              <View style={styles.fieldGroup}>
                <Text style={styles.fieldLabel}>Platform</Text>
                <TextInput value={coursePlatform} onChangeText={setCoursePlatform} placeholder="Virtual (Google Meet/Zoom)" placeholderTextColor={C.textMuted} style={styles.input} />
              </View>
              <View style={styles.fieldGroup}>
                <Text style={styles.fieldLabel}>Practical Sessions</Text>
                <TextInput value={coursePractical} onChangeText={setCoursePractical} placeholder="In-person sessions at Kasoa" placeholderTextColor={C.textMuted} style={styles.input} />
              </View>
              <View style={styles.fieldGroup}>
                <Text style={styles.fieldLabel}>Description</Text>
                <TextInput value={courseDescription} onChangeText={setCourseDescription} placeholder="Short description of the course..." placeholderTextColor={C.textMuted} multiline textAlignVertical="top" style={styles.textArea} />
              </View>
              <View style={styles.fieldGroup}>
                <Text style={styles.fieldLabel}>Ideal For</Text>
                <TextInput value={courseIdealFor} onChangeText={setCourseIdealFor} placeholder="Beginners and professionals seeking foundational knowledge..." placeholderTextColor={C.textMuted} multiline textAlignVertical="top" style={styles.textArea} />
              </View>
              <View style={styles.fieldGroup}>
                <Text style={styles.fieldLabel}>Course Content (one item per line)</Text>
                <TextInput value={courseContentRaw} onChangeText={setCourseContentRaw} placeholder={"Introduction to ADR & its benefits\nNegotiation techniques\nMediation principles and practice"} placeholderTextColor={C.textMuted} multiline textAlignVertical="top" style={[styles.textArea, { minHeight: 120 }]} />
              </View>

              <View style={{ flexDirection: 'row', gap: 10 }}>
                <Pressable
                  onPress={handleSaveCourse}
                  disabled={savingCourse}
                  style={({ pressed }) => [styles.primaryButton, { flex: 1 }, (savingCourse || pressed) ? styles.pressed : null]}
                >
                  {savingCourse ? (
                    <ActivityIndicator size="small" color={C.textInverse} />
                  ) : (
                    <Text style={styles.primaryButtonText}>{editingCourseId ? 'Save Changes' : 'Create Course'}</Text>
                  )}
                </Pressable>
                {editingCourseId ? (
                  <Pressable onPress={resetCourseForm} style={({ pressed }) => [styles.secondaryButton, pressed ? styles.pressed : null]}>
                    <Text style={styles.secondaryButtonText}>Cancel</Text>
                  </Pressable>
                ) : null}
              </View>
            </View>

            <View style={[styles.workspaceCard, isWide ? styles.workspaceCardWide : null]}>
              <Text style={styles.workspaceTitle}>All Courses ({courses.length})</Text>
              <Text style={styles.workspaceBody}>
                Built-in courses can be overridden. Only Firestore-added or overridden courses can be deleted.
              </Text>
              {courses.length === 0 ? (
                <Text style={[styles.workspaceBody, { fontStyle: 'italic' }]}>No courses yet.</Text>
              ) : (
                courses.map((c) => {
                  const isBuiltIn = CURATED_IDS.includes(c.id) && !c.createdAt;
                  return (
                    <View key={c.id} style={[styles.panelCard, { gap: 8 }]}>
                      <View style={{ flex: 1, gap: 4 }}>
                        <Text style={styles.panelTitle}>{c.title}</Text>
                        <Text style={styles.panelSubtitle}>{c.program} · {c.level} · {c.duration}</Text>
                        {isBuiltIn ? (
                          <View style={{ alignSelf: 'flex-start', backgroundColor: C.primarySoft, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 4, marginTop: 2 }}>
                            <Text style={{ fontSize: 11, fontFamily: Fonts.sansSemiBold, color: C.secondary }}>Built-in</Text>
                          </View>
                        ) : null}
                      </View>
                      <View style={{ flexDirection: 'row', gap: 8 }}>
                        <Pressable
                          onPress={() => startEditCourse(c)}
                          style={({ pressed }) => [styles.secondaryButton, pressed ? styles.pressed : null]}
                        >
                          <Text style={styles.secondaryButtonText}>Edit</Text>
                        </Pressable>
                        {!isBuiltIn ? (
                          <Pressable
                            onPress={() => handleDeleteCourse(c.id)}
                            disabled={deletingCourseId === c.id}
                            style={({ pressed }) => [styles.dangerButton, (deletingCourseId === c.id || pressed) ? styles.pressed : null]}
                          >
                            {deletingCourseId === c.id
                              ? <ActivityIndicator size="small" color={C.textInverse} />
                              : <Text style={styles.dangerButtonText}>Delete</Text>}
                          </Pressable>
                        ) : null}
                      </View>
                    </View>
                  );
                })
              )}
            </View>
          </View>
        ) : null}
        </ScrollView>
      </KeyboardAvoidingView>
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
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  summaryGridWide: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  summaryCard: {
    flex: 1,
    minWidth: 140,
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
  outlineButton: {
    minHeight: 44,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 18,
    borderWidth: 1.5,
    borderColor: C.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  outlineButtonText: {
    fontSize: 14,
    fontFamily: Fonts.sansBold,
    color: C.textSecondary,
  },
  teamDropdownHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  teamDropdownBody: {
    marginTop: 14,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: C.border,
    gap: 8,
  },
  enrolledActions: {
    marginTop: 14,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: C.border,
    gap: 12,
  },
  sessionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: C.surfaceAlt,
    borderRadius: 12,
    padding: 10,
  },
  courseChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: C.border,
    marginRight: 6,
    marginBottom: 6,
  },
  courseChipActive: {
    backgroundColor: C.primary,
    borderColor: C.primary,
  },
  courseChipText: {
    fontSize: 13,
    fontFamily: Fonts.sansSemiBold,
    color: C.textSecondary,
  },
  courseChipTextActive: {
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
  deleteRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 6,
    alignSelf: 'flex-start',
  },
  deleteRowText: {
    fontSize: 13,
    fontFamily: Fonts.sansSemiBold,
    color: C.danger,
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
  confirmRow: {
    flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap',
  },
  confirmText: {
    flex: 1, fontSize: 13, fontFamily: Fonts.sansSemiBold, color: C.danger,
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
  statusBadge: {
    borderRadius: 999, paddingHorizontal: 10, paddingVertical: 5, alignSelf: 'flex-start',
  },
  statusBadgeText: {
    fontSize: 11, fontFamily: Fonts.sansBold,
  },
  emptyStateText: {
    fontSize: 14, fontFamily: Fonts.sans, color: C.textMuted, textAlign: 'center',
  },
  fileChip: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 8,
    backgroundColor: '#EEF2F9',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    alignSelf: 'flex-start' as const,
  },
  fileChipText: {
    fontSize: 13,
    fontFamily: Fonts.sansSemiBold,
    color: C.secondary,
    flex: 1,
  },
  uploadBtn: {
    backgroundColor: C.surfaceAlt, borderWidth: 1, borderColor: C.border,
    borderRadius: 12, paddingHorizontal: 16, paddingVertical: 14,
    borderStyle: 'dashed',
  },
  uploadBtnDone: {
    backgroundColor: C.successSoft, borderColor: '#A8D5C0', borderStyle: 'solid',
  },
  uploadBtnInner: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  uploadBtnText: { flex: 1, fontSize: 14, fontFamily: Fonts.sans, color: C.secondary },
  chatDivider: { height: 1, backgroundColor: C.border, marginVertical: 4 },
  openChatBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: C.secondary, borderRadius: 12,
    paddingVertical: 12, paddingHorizontal: 16,
  },
  openChatBtnText: { fontSize: 14, fontFamily: Fonts.sansBold, color: C.textInverse },
  chatInputRow: { flexDirection: 'row', gap: 8, alignItems: 'flex-end' },
  chatInput: {
    flex: 1, backgroundColor: C.surfaceAlt, borderWidth: 1, borderColor: C.border,
    borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10,
    fontSize: 13, fontFamily: Fonts.sans, color: C.textPrimary, maxHeight: 100, textAlignVertical: 'top',
  },
  chatSendBtn: {
    width: 40, height: 40, borderRadius: 10, backgroundColor: C.primary,
    alignItems: 'center', justifyContent: 'center',
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
  enrolledDivider: {
    height: 1,
    backgroundColor: C.border,
    marginVertical: 4,
  },
  enrolledRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
    paddingVertical: 2,
  },
  enrolledLabel: {
    fontSize: 14,
    fontFamily: Fonts.sansSemiBold,
    color: C.textPrimary,
  },
  enrolledActionChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 20,
  },
  enrolledChipText: {
    fontSize: 12,
    fontFamily: Fonts.sansBold,
  },
  enrolledFullButton: {
    minHeight: 52,
    paddingHorizontal: 20,
    paddingVertical: 14,
    backgroundColor: C.primary,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  enrolledNudge: {
    width: 44,
    height: 44,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: C.border,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: C.surfaceAlt,
  },
  enrolledNudgeText: {
    fontSize: 13,
    fontFamily: Fonts.sansBold,
    color: C.textPrimary,
  },
  enrolledDangerRow: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 4,
  },
  enrolledDangerText: {
    fontSize: 13,
    fontFamily: Fonts.sansBold,
    color: C.danger,
  },
  certOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.55)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  certSuccessCard: {
    backgroundColor: C.surface,
    borderRadius: 28,
    padding: 28,
    alignItems: 'center',
    gap: 6,
    width: '100%',
    maxWidth: 360,
  },
  certSuccessIconWrap: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: C.secondarySoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  certSuccessTitle: {
    fontSize: 22,
    fontFamily: Fonts.sansBold,
    color: C.textPrimary,
    marginTop: 4,
  },
  certSuccessName: {
    fontSize: 16,
    fontFamily: Fonts.sansSemiBold,
    color: C.textPrimary,
  },
  certSuccessSub: {
    fontSize: 14,
    fontFamily: Fonts.sans,
    color: C.textSecondary,
    textAlign: 'center',
  },
});

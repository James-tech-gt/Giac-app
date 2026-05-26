import { Fonts } from '@/constants/theme';
import { auth } from '@/services/firebase';
import { Certificate, GraduationInvitation, getCertificates, subscribeUserGraduationInvitations, deleteGraduationInvitation } from '@/services/firestore';
import { FontAwesome6 } from '@expo/vector-icons';
import { router } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Linking,
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

function formatDate(timestamp: unknown): string {
  if (!timestamp) return '—';
  const date =
    typeof timestamp === 'object' &&
    timestamp !== null &&
    'toDate' in timestamp &&
    typeof (timestamp as any).toDate === 'function'
      ? (timestamp as any).toDate()
      : new Date(timestamp as any);
  if (isNaN(date.getTime())) return '—';
  return date.toLocaleDateString('en-GB', {
    day: 'numeric', month: 'long', year: 'numeric',
  });
}

function CertificateCard({ cert }: { cert: Certificate }) {
  return (
    <View style={styles.certCard}>
      {/* Gold accent bar */}
      <View style={styles.certAccent} />

      <View style={styles.certBody}>
        <View style={styles.certIconWrap}>
          <FontAwesome6 name="certificate" size={22} color={C.accent} />
        </View>

        <View style={styles.certInfo}>
          <View style={[styles.programBadge, { backgroundColor: C.secondarySoft }]}>
            <Text style={styles.programBadgeText}>{cert.program || 'GIAC'}</Text>
          </View>
          <Text style={styles.certTitle}>{cert.courseTitle}</Text>
          <Text style={styles.certMeta}>Issued {formatDate(cert.issueDate)}</Text>
          {cert.credentialId ? (
            <Text style={styles.credentialId}>ID: {cert.credentialId}</Text>
          ) : null}
        </View>
      </View>

      <View style={styles.certActions}>
        {cert.certificateUrl ? (
          <TouchableOpacity
            style={styles.downloadBtn}
            onPress={() => Linking.openURL(cert.certificateUrl)}
          >
            <FontAwesome6 name="download" size={13} color={C.surface} />
            <Text style={styles.downloadBtnText}>Download Certificate</Text>
          </TouchableOpacity>
        ) : (
          <View style={styles.pendingDownload}>
            <FontAwesome6 name="hourglass-half" size={13} color={C.textMuted} />
            <Text style={styles.pendingDownloadText}>Certificate file coming soon</Text>
          </View>
        )}
      </View>
    </View>
  );
}

export default function CertificatesScreen() {
  const user = auth.currentUser;
  const [certificates, setCertificates] = useState<Certificate[]>([]);
  const [loading, setLoading] = useState(true);
  const [graduationInvites, setGraduationInvites] = useState<GraduationInvitation[]>([]);
  const [deletingInviteId, setDeletingInviteId] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    async function load() {
      if (!user?.uid) { if (active) setLoading(false); return; }
      try {
        const data = await getCertificates(user.uid);
        if (active) setCertificates(data);
      } finally {
        if (active) setLoading(false);
      }
    }
    load();

    const unsubInvites = user?.uid
      ? subscribeUserGraduationInvitations(user.uid, (invites) => {
          if (active) setGraduationInvites(invites);
        })
      : null;

    return () => {
      active = false;
      unsubInvites?.();
    };
  }, [user?.uid]);

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
          <Text style={styles.title}>Your Certificates</Text>
          <Text style={styles.subtitle}>
            Your earned GIAC certifications recognized globally.
          </Text>
        </View>

        {/* Graduation Invitations */}
        {graduationInvites.length > 0 && (
          <View style={styles.inviteSection}>
            <Text style={styles.sectionHeader}>Graduation Invitations</Text>
            {graduationInvites.map((invite) => (
              <View key={invite.id} style={styles.inviteCard}>
                <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 12 }}>
                  <View style={styles.inviteIconWrap}>
                    <FontAwesome6 name="graduation-cap" size={20} color={C.accent} />
                  </View>
                  <View style={[styles.inviteInfo, { flex: 1 }]}>
                    <Text style={styles.inviteTitle}>{invite.courseTitle}</Text>
                    {invite.message ? (
                      <Text style={styles.inviteMessage}>{invite.message}</Text>
                    ) : null}
                    <Text style={styles.inviteMeta}>Issued {formatDate(invite.createdAt)}</Text>
                  </View>
                  <TouchableOpacity
                    onPress={() => {
                      Alert.alert('Delete Invitation', 'Remove this graduation invitation from your list?', [
                        { text: 'Cancel', style: 'cancel' },
                        {
                          text: 'Delete', style: 'destructive',
                          onPress: async () => {
                            setDeletingInviteId(invite.id);
                            try { await deleteGraduationInvitation(invite.id); }
                            catch { Alert.alert('Error', 'Could not delete invitation.'); }
                            finally { setDeletingInviteId(null); }
                          },
                        },
                      ]);
                    }}
                    disabled={deletingInviteId === invite.id}
                    hitSlop={8}
                  >
                    {deletingInviteId === invite.id
                      ? <ActivityIndicator size="small" color={C.textMuted} />
                      : <FontAwesome6 name="trash" size={14} color={C.textMuted} />
                    }
                  </TouchableOpacity>
                </View>
                {invite.letterUrl ? (
                  <TouchableOpacity
                    style={styles.downloadBtn}
                    onPress={() => WebBrowser.openBrowserAsync(invite.letterUrl)}
                  >
                    <FontAwesome6 name="download" size={13} color={C.surface} />
                    <Text style={styles.downloadBtnText}>Download Letter</Text>
                  </TouchableOpacity>
                ) : null}
              </View>
            ))}
          </View>
        )}

        {/* Content */}
        {loading ? (
          <View style={styles.centerCard}>
            <ActivityIndicator color={C.secondary} />
          </View>
        ) : certificates.length > 0 ? (
          <View style={styles.list}>
            {certificates.map((cert) => (
              <CertificateCard key={cert.id} cert={cert} />
            ))}
          </View>
        ) : (
          <>
            {/* Empty state */}
            <View style={styles.emptyCard}>
              <View style={styles.emptyIconWrap}>
                <FontAwesome6 name="graduation-cap" size={36} color={C.accent} />
              </View>
              <Text style={styles.emptyTitle}>No certificates yet</Text>
              <Text style={styles.emptyText}>
                Complete your training program to earn a globally recognized GIAC certificate.
                Keep attending sessions, completing assignments, and passing your exams!
              </Text>
            </View>

            {/* Journey steps */}
            <View style={styles.section}>
              <Text style={styles.sectionHeader}>Your path to certification</Text>
              {[
                { icon: 'check-circle' as const, label: 'Enrol in a program', done: true },
                { icon: 'book-open' as const, label: 'Complete all modules', done: false },
                { icon: 'pen-to-square' as const, label: 'Submit all assignments', done: false },
                { icon: 'file-pen' as const, label: 'Pass your examinations', done: false },
                { icon: 'certificate' as const, label: 'Receive your certificate', done: false },
              ].map((step, i) => (
                <View key={i} style={styles.step}>
                  <View style={[styles.stepIcon, step.done && styles.stepIconDone]}>
                    <FontAwesome6
                      name={step.icon}
                      size={14}
                      color={step.done ? C.success : C.textMuted}
                    />
                  </View>
                  <Text style={[styles.stepLabel, step.done && styles.stepLabelDone]}>
                    {step.label}
                  </Text>
                  {step.done && (
                    <View style={styles.doneBadge}>
                      <Text style={styles.doneBadgeText}>Done</Text>
                    </View>
                  )}
                </View>
              ))}
            </View>

            {/* Info card */}
            <View style={styles.infoCard}>
              <FontAwesome6 name="globe" size={16} color={C.secondary} />
              <View style={styles.infoText}>
                <Text style={styles.infoTitle}>Global Recognition</Text>
                <Text style={styles.infoBody}>
                  GIAC certificates are recognized worldwide and come with automatic associate
                  membership in GNAAP (Ghana National Association of ADR Practitioners).
                </Text>
              </View>
            </View>
          </>
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

  centerCard: {
    backgroundColor: C.surface, borderRadius: 20, padding: 28,
    borderWidth: 1, borderColor: C.border, alignItems: 'center',
  },

  list: { gap: 16 },

  certCard: {
    backgroundColor: C.surface, borderRadius: 20,
    borderWidth: 1, borderColor: C.border,
  },
  certAccent: {
    height: 4, backgroundColor: C.accent,
    borderTopLeftRadius: 20, borderTopRightRadius: 20,
  },
  certBody: { flexDirection: 'row', gap: 14, padding: 18, alignItems: 'flex-start' },
  certIconWrap: {
    width: 48, height: 48, borderRadius: 14,
    backgroundColor: C.accentSoft, alignItems: 'center', justifyContent: 'center',
  },
  certInfo: { flex: 1, gap: 6 },
  programBadge: { alignSelf: 'flex-start', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 3 },
  programBadgeText: {
    fontSize: 11, fontFamily: Fonts.sansBold, color: C.secondary,
    textTransform: 'uppercase', letterSpacing: 0.5,
  },
  certTitle: { fontSize: 16, fontFamily: Fonts.sansBold, color: C.textPrimary },
  certMeta: { fontSize: 13, fontFamily: Fonts.sans, color: C.textMuted },
  credentialId: { fontSize: 12, fontFamily: Fonts.sans, color: C.textMuted, letterSpacing: 0.3 },
  certActions: { paddingHorizontal: 18, paddingBottom: 18 },
  downloadBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: C.secondary, borderRadius: 12, paddingVertical: 10,
  },
  downloadBtnText: { fontSize: 14, fontFamily: Fonts.sansSemiBold, color: C.surface },
  pendingDownload: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    borderRadius: 12, paddingVertical: 10, backgroundColor: C.border,
  },
  pendingDownloadText: { fontSize: 14, fontFamily: Fonts.sans, color: C.textMuted },

  emptyCard: {
    backgroundColor: C.surface, borderRadius: 20, padding: 28,
    borderWidth: 1, borderColor: C.border, alignItems: 'center', gap: 12,
  },
  emptyIconWrap: {
    width: 72, height: 72, borderRadius: 20,
    backgroundColor: C.accentSoft, alignItems: 'center', justifyContent: 'center',
  },
  emptyTitle: { fontSize: 18, fontFamily: Fonts.displayBold, color: C.textPrimary },
  emptyText: {
    fontSize: 14, lineHeight: 22, fontFamily: Fonts.sans,
    color: C.textSecondary, textAlign: 'center',
  },

  section: { gap: 10 },
  sectionHeader: {
    fontSize: 13, fontFamily: Fonts.sansSemiBold, color: C.secondary,
    textTransform: 'uppercase', letterSpacing: 0.6,
  },
  step: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: C.surface, borderRadius: 14, padding: 14,
    borderWidth: 1, borderColor: C.border,
  },
  stepIcon: {
    width: 32, height: 32, borderRadius: 8,
    backgroundColor: C.border, alignItems: 'center', justifyContent: 'center',
  },
  stepIconDone: { backgroundColor: C.successSoft },
  stepLabel: {
    flex: 1, fontSize: 14, fontFamily: Fonts.sans, color: C.textSecondary,
  },
  stepLabelDone: { color: C.success, fontFamily: Fonts.sansSemiBold },
  doneBadge: {
    backgroundColor: C.successSoft, borderRadius: 6,
    paddingHorizontal: 8, paddingVertical: 3,
  },
  doneBadgeText: { fontSize: 11, fontFamily: Fonts.sansSemiBold, color: C.success },

  infoCard: {
    flexDirection: 'row', gap: 12, alignItems: 'flex-start',
    backgroundColor: C.secondarySoft, borderRadius: 16, padding: 16,
  },
  infoText: { flex: 1, gap: 4 },
  infoTitle: { fontSize: 14, fontFamily: Fonts.sansSemiBold, color: C.secondary },
  infoBody: { fontSize: 13, lineHeight: 20, fontFamily: Fonts.sans, color: C.textSecondary },

  inviteSection: { gap: 12 },
  inviteCard: {
    backgroundColor: C.surface, borderRadius: 20,
    borderWidth: 1, borderColor: '#E7D7A8',
    padding: 16, gap: 12,
  },
  inviteIconWrap: {
    width: 44, height: 44, borderRadius: 12,
    backgroundColor: C.accentSoft, alignItems: 'center', justifyContent: 'center',
    alignSelf: 'flex-start',
  },
  inviteInfo: { gap: 4 },
  inviteTitle: { fontSize: 15, fontFamily: Fonts.sansBold, color: C.textPrimary },
  inviteMessage: { fontSize: 14, lineHeight: 22, fontFamily: Fonts.sans, color: C.textSecondary },
  inviteMeta: { fontSize: 12, fontFamily: Fonts.sans, color: C.textMuted },
});

import { Fonts } from '@/constants/theme';
import { auth } from '@/services/firebase';
import { CaseMessage, Service, createAdminNotification, sendCaseMessage, subscribeCaseMessages, subscribeUserServices } from '@/services/firestore';
import { FontAwesome6 } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { onAuthStateChanged, User } from 'firebase/auth';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
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
  surfaceAlt: '#F2F5FA',
  primary: '#1F2A44',
  secondary: '#2E4A8A',
  secondarySoft: '#E9EEF8',
  success: '#2D6A4F',
  successSoft: '#E8F2EE',
  warning: '#A9822A',
  warningSoft: '#F8F2E2',
  textPrimary: '#1F2A44',
  textSecondary: '#5A6478',
  textMuted: '#7A7F8A',
  border: '#E3E9F2',
};

const TIMELINE_STEPS: { key: string; label: string }[] = [
  { key: 'submitted', label: 'Submitted' },
  { key: 'in-progress', label: 'In Progress' },
  { key: 'completed', label: 'Completed' },
];

function formatDate(ts: unknown): string {
  if (!ts) return '';
  const d =
    typeof ts === 'object' && ts !== null && 'toDate' in ts
      ? (ts as any).toDate()
      : new Date(ts as any);
  if (isNaN(d.getTime())) return '';
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

function formatTime(ts: unknown): string {
  if (!ts) return '';
  const d =
    typeof ts === 'object' && ts !== null && 'toDate' in ts
      ? (ts as any).toDate()
      : new Date(ts as any);
  if (isNaN(d.getTime())) return '';
  return d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
}

function getTimelineIdx(s: Service): number {
  if (s.status === 'completed') return 2;
  if (s.status === 'in-progress') return 1;
  return 0;
}

function CaseCard({ service, user, autoOpen = false }: { service: Service; user: User; autoOpen?: boolean }) {
  const [expanded, setExpanded] = useState(autoOpen);
  const autoOpenFired = useRef(false);

  useEffect(() => {
    if (autoOpen && !autoOpenFired.current) {
      autoOpenFired.current = true;
      setExpanded(true);
    }
  }, [autoOpen]);
  const [messages, setMessages] = useState<CaseMessage[]>([]);
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const scrollRef = useRef<ScrollView>(null);

  useEffect(() => {
    if (!expanded) return;
    return subscribeCaseMessages(service.id, (msgs) => {
      setMessages(msgs);
      setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 80);
    });
  }, [expanded, service.id]);

  const handleSend = async () => {
    const msg = text.trim();
    if (!msg) return;
    setText('');
    setSending(true);
    try {
      await sendCaseMessage(
        service.id,
        user.uid,
        user.displayName ?? user.email ?? 'Client',
        'client',
        msg,
      );
      createAdminNotification({
        type: 'service',
        message: `New message from client in ${service.serviceType} case (${service.category})`,
        referenceId: service.id,
        userId: user.uid,
      }).catch(() => {});
    } catch {
      setText(msg);
    } finally {
      setSending(false);
    }
  };

  const tIdx = getTimelineIdx(service);

  const statusBg =
    service.status === 'completed' ? C.successSoft :
    service.status === 'in-progress' ? C.secondarySoft : C.warningSoft;
  const statusColor =
    service.status === 'completed' ? C.success :
    service.status === 'in-progress' ? C.secondary : C.warning;
  const statusLabel =
    service.status === 'completed' ? 'Completed' :
    service.status === 'in-progress' ? 'In Progress' : 'Submitted';

  return (
    <View style={styles.card}>
      {/* Header */}
      <Pressable
        onPress={() => setExpanded((v) => !v)}
        style={({ pressed }) => [styles.cardHeader, pressed && { opacity: 0.88 }]}
      >
        <View style={{ flex: 1, gap: 4 }}>
          <View style={styles.cardTypeRow}>
            <FontAwesome6
              name={service.serviceType === 'mediation' ? 'scale-balanced' : 'gavel'}
              size={13}
              color={C.secondary}
            />
            <Text style={styles.cardType}>
              {service.serviceType === 'mediation' ? 'Mediation' : 'Arbitration'}
            </Text>
          </View>
          <Text style={styles.cardCategory}>{service.category}</Text>
          <Text style={styles.cardDate}>Submitted {formatDate(service.createdAt)}</Text>
        </View>
        <View style={{ alignItems: 'flex-end', gap: 8 }}>
          <View style={[styles.statusPill, { backgroundColor: statusBg }]}>
            <Text style={[styles.statusPillText, { color: statusColor }]}>{statusLabel}</Text>
          </View>
          <FontAwesome6
            name={expanded ? 'chevron-up' : 'chevron-down'}
            size={12}
            color={C.textMuted}
          />
        </View>
      </Pressable>

      {expanded && (
        <>
          {/* Timeline */}
          <View style={styles.timelineWrap}>
            {/* Dots + connecting lines */}
            <View style={styles.timelineTrack}>
              {TIMELINE_STEPS.map((step, idx) => {
                const done = idx <= tIdx;
                return (
                  <React.Fragment key={step.key}>
                    <View style={[styles.timelineDot, { backgroundColor: done ? C.secondary : C.border }]}>
                      {done && <FontAwesome6 name="check" size={7} color="#fff" />}
                    </View>
                    {idx < TIMELINE_STEPS.length - 1 && (
                      <View style={[styles.timelineLine, { backgroundColor: idx < tIdx ? C.secondary : C.border }]} />
                    )}
                  </React.Fragment>
                );
              })}
            </View>
            {/* Labels below */}
            <View style={styles.timelineLabels}>
              {TIMELINE_STEPS.map((step, idx) => {
                const done = idx <= tIdx;
                return (
                  <Text key={step.key} style={[styles.timelineLabel, { color: done ? C.secondary : C.textMuted }]}>
                    {step.label}
                  </Text>
                );
              })}
            </View>
          </View>

          {/* Case summary */}
          <View style={styles.detailBlock}>
            <Text style={styles.detailLabel}>Case Summary</Text>
            <Text style={styles.detailText}>{service.caseDetails}</Text>
          </View>

          {/* Mediator info */}
          {service.mediatorName ? (
            <View style={styles.mediatorBlock}>
              <View style={styles.mediatorRow}>
                <FontAwesome6 name="user-tie" size={14} color={C.secondary} />
                <Text style={styles.mediatorName}>{service.mediatorName}</Text>
              </View>
              {service.mediatorNote ? (
                <Text style={styles.mediatorNote}>{service.mediatorNote}</Text>
              ) : null}
              {service.scheduledDate ? (
                <View style={styles.scheduledRow}>
                  <FontAwesome6 name="calendar-check" size={12} color={C.secondary} />
                  <Text style={styles.scheduledText}>Session: {formatDate(service.scheduledDate)}</Text>
                </View>
              ) : null}
              {service.meetingLink ? (
                <TouchableOpacity
                  style={styles.joinBtn}
                  onPress={() => Linking.openURL(service.meetingLink!)}
                  activeOpacity={0.82}
                >
                  <FontAwesome6 name="video" size={13} color="#fff" />
                  <Text style={styles.joinBtnText}>Join Session</Text>
                </TouchableOpacity>
              ) : null}
            </View>
          ) : null}

          {/* Resolution */}
          {service.status === 'completed' && service.resolution ? (
            <View style={styles.resolutionBlock}>
              <View style={styles.resolutionHeader}>
                <FontAwesome6 name="circle-check" size={14} color={C.success} />
                <Text style={styles.resolutionTitle}>Case Resolved</Text>
              </View>
              <Text style={styles.resolutionText}>{service.resolution}</Text>
            </View>
          ) : null}

          {/* Chat — only available once case is in progress */}
          {service.status === 'submitted' ? (
            <View style={styles.chatLocked}>
              <FontAwesome6 name="lock" size={14} color={C.textMuted} />
              <Text style={styles.chatLockedText}>
                Chat opens once a mediator has been assigned and your case is in progress.
              </Text>
            </View>
          ) : (
          <KeyboardAvoidingView
            style={styles.chatWrap}
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            keyboardVerticalOffset={Platform.OS === 'ios' ? 18 : 0}
          >
            <Text style={styles.chatTitle}>In Progress — Messages with GIAC</Text>
            <ScrollView
              ref={scrollRef}
              style={styles.chatScroll}
              contentContainerStyle={{ gap: 10, padding: 12 }}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
              keyboardDismissMode={Platform.OS === 'ios' ? 'interactive' : 'on-drag'}
              nestedScrollEnabled
              onContentSizeChange={() => scrollRef.current?.scrollToEnd({ animated: true })}
            >
              {messages.length === 0 ? (
                <Text style={styles.chatEmpty}>No messages yet. Send a message to your mediator below.</Text>
              ) : (
                messages.map((msg) => {
                  const isMe = msg.senderId === user.uid;
                  return (
                    <View key={msg.id} style={[styles.bubbleRow, isMe && styles.bubbleRowMe]}>
                      {!isMe && (
                        <View style={styles.bubbleAvatar}>
                          <Text style={styles.bubbleAvatarText}>{msg.senderName.charAt(0).toUpperCase()}</Text>
                        </View>
                      )}
                      <View style={[styles.bubble, isMe ? styles.bubbleMe : styles.bubbleThem]}>
                        {!isMe && <Text style={styles.bubbleSender}>{msg.senderName}</Text>}
                        <Text style={[styles.bubbleText, isMe && styles.bubbleTextMe]}>{msg.text}</Text>
                        <Text style={[styles.bubbleTime, isMe && { color: 'rgba(255,255,255,0.55)' }]}>
                          {formatTime(msg.createdAt)}
                        </Text>
                      </View>
                    </View>
                  );
                })
              )}
            </ScrollView>
            <View style={styles.chatInputRow}>
              <TextInput
                style={styles.chatInput}
                placeholder="Type a message…"
                placeholderTextColor={C.textMuted}
                value={text}
                onChangeText={setText}
                multiline
                returnKeyType="send"
              />
              <Pressable
                style={({ pressed }) => [
                  styles.sendBtn,
                  (!text.trim() || sending) && styles.sendBtnDisabled,
                  pressed && { opacity: 0.8 },
                ]}
                onPress={handleSend}
                disabled={!text.trim() || sending}
              >
                {sending
                  ? <ActivityIndicator size="small" color="#fff" />
                  : <FontAwesome6 name="paper-plane" size={13} color="#fff" />}
              </Pressable>
            </View>
          </KeyboardAvoidingView>
          )}
        </>
      )}
    </View>
  );
}

export default function MyCasesScreen() {
  const [user, setUser] = useState<User | null>(auth.currentUser);
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const { openCaseId } = useLocalSearchParams<{ openCaseId?: string }>();
  const listScrollRef = useRef<any>(null);

  useEffect(() => onAuthStateChanged(auth, setUser), []);

  useEffect(() => {
    if (!user?.uid) { setLoading(false); return; }
    const unsub = subscribeUserServices(user.uid, (data) => {
      setServices(data);
      setLoading(false);
    });
    return unsub;
  }, [user?.uid]);

  // When arriving from a notification, scroll to top so the auto-expanded card is visible
  useEffect(() => {
    if (openCaseId) {
      setTimeout(() => listScrollRef.current?.scrollTo({ y: 0, animated: true }), 150);
    }
  }, [openCaseId]);

  // Put the target case first so it's immediately visible
  const displayServices = useMemo(() => {
    if (!openCaseId) return services;
    const idx = services.findIndex((s) => s.id === openCaseId);
    if (idx <= 0) return services;
    return [services[idx], ...services.slice(0, idx), ...services.slice(idx + 1)];
  }, [services, openCaseId]);

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
      <ScrollView
        ref={listScrollRef}
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <View style={{ flex: 1, gap: 4 }}>
            <Text style={styles.eyebrow}>ADR Portal</Text>
            <Text style={styles.title}>My Cases</Text>
          </View>
          <TouchableOpacity
            onPress={() => router.push('/(main)/request-mediation')}
            style={styles.newBtn}
            activeOpacity={0.82}
          >
            <FontAwesome6 name="plus" size={13} color={C.secondary} />
            <Text style={styles.newBtnText}>New Request</Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.subtitle}>
          Track your mediation and arbitration requests, communicate with GIAC, and follow your case progress.
        </Text>

        {loading ? (
          <View style={styles.centered}>
            <ActivityIndicator color={C.secondary} />
          </View>
        ) : services.length === 0 ? (
          <View style={styles.emptyCard}>
            <FontAwesome6 name="scale-balanced" size={28} color={C.textMuted} />
            <Text style={styles.emptyTitle}>No cases yet</Text>
            <Text style={styles.emptyText}>
              Submit a mediation or arbitration request and it will appear here.
            </Text>
            <TouchableOpacity
              style={styles.emptyBtn}
              onPress={() => router.push('/(main)/request-mediation')}
              activeOpacity={0.82}
            >
              <Text style={styles.emptyBtnText}>Submit a Request</Text>
            </TouchableOpacity>
          </View>
        ) : user ? (
          <View style={styles.stack}>
            {displayServices.map((s) => (
              <CaseCard key={s.id} service={s} user={user} autoOpen={s.id === openCaseId} />
            ))}
          </View>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.bg },
  scroll: { flex: 1 },
  content: { padding: 20, gap: 16, paddingBottom: 56 },
  centered: { paddingVertical: 48, alignItems: 'center' },

  header: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 },
  eyebrow: {
    fontSize: 12, fontFamily: Fonts.sansSemiBold, color: C.secondary,
    textTransform: 'uppercase', letterSpacing: 0.8,
  },
  title: { fontSize: 32, lineHeight: 38, fontFamily: Fonts.displayBold, color: C.textPrimary },
  subtitle: { fontSize: 14, lineHeight: 22, fontFamily: Fonts.sans, color: C.textSecondary },
  newBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: C.secondarySoft, borderRadius: 999,
    paddingHorizontal: 14, paddingVertical: 10, marginTop: 4,
    borderWidth: 1, borderColor: C.secondary + '30',
  },
  newBtnText: { fontSize: 13, fontFamily: Fonts.sansSemiBold, color: C.secondary },

  stack: { gap: 14 },

  card: {
    backgroundColor: C.surface, borderRadius: 20,
    borderWidth: 1, borderColor: C.border, overflow: 'hidden',
  },
  cardHeader: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 12,
    padding: 16,
  },
  cardTypeRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  cardType: { fontSize: 12, fontFamily: Fonts.sansSemiBold, color: C.secondary },
  cardCategory: { fontSize: 15, fontFamily: Fonts.sansBold, color: C.textPrimary },
  cardDate: { fontSize: 12, fontFamily: Fonts.sans, color: C.textMuted },
  statusPill: { borderRadius: 999, paddingHorizontal: 10, paddingVertical: 4 },
  statusPillText: { fontSize: 11, fontFamily: Fonts.sansSemiBold },

  timelineWrap: { paddingHorizontal: 16, paddingBottom: 14, gap: 6 },
  timelineTrack: { flexDirection: 'row', alignItems: 'center' },
  timelineLabels: { flexDirection: 'row' },
  timelineDot: {
    width: 18, height: 18, borderRadius: 9,
    alignItems: 'center', justifyContent: 'center',
  },
  timelineLabel: { flex: 1, fontSize: 9, fontFamily: Fonts.sansSemiBold, textAlign: 'center' },
  timelineLine: { flex: 1, height: 2 },

  detailBlock: {
    marginHorizontal: 16, marginBottom: 12,
    backgroundColor: C.surfaceAlt, borderRadius: 14, padding: 12, gap: 4,
    borderWidth: 1, borderColor: C.border,
  },
  detailLabel: { fontSize: 11, fontFamily: Fonts.sansSemiBold, color: C.textMuted, textTransform: 'uppercase', letterSpacing: 0.6 },
  detailText: { fontSize: 14, lineHeight: 21, fontFamily: Fonts.sans, color: C.textSecondary },

  mediatorBlock: {
    marginHorizontal: 16, marginBottom: 12,
    backgroundColor: C.secondarySoft, borderRadius: 14, padding: 12, gap: 8,
    borderWidth: 1, borderColor: C.secondary + '30',
  },
  mediatorRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  mediatorName: { fontSize: 15, fontFamily: Fonts.sansBold, color: C.primary },
  mediatorNote: { fontSize: 13, lineHeight: 20, fontFamily: Fonts.sans, color: C.textSecondary },
  scheduledRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  scheduledText: { fontSize: 13, fontFamily: Fonts.sansSemiBold, color: C.secondary },
  joinBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: C.secondary, borderRadius: 12,
    paddingVertical: 10, paddingHorizontal: 16, marginTop: 4,
  },
  joinBtnText: { fontSize: 14, fontFamily: Fonts.sansBold, color: '#fff' },

  resolutionBlock: {
    marginHorizontal: 16, marginBottom: 12,
    backgroundColor: C.successSoft, borderRadius: 14, padding: 12, gap: 8,
    borderWidth: 1, borderColor: C.success + '30',
  },
  resolutionHeader: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  resolutionTitle: { fontSize: 14, fontFamily: Fonts.sansBold, color: C.success },
  resolutionText: { fontSize: 13, lineHeight: 20, fontFamily: Fonts.sans, color: C.textSecondary },

  chatLocked: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    margin: 16, padding: 14, borderRadius: 14,
    backgroundColor: C.surfaceAlt, borderWidth: 1, borderColor: C.border,
  },
  chatLockedText: {
    flex: 1, fontSize: 13, lineHeight: 19, fontFamily: Fonts.sans, color: C.textMuted,
  },
  chatTitle: {
    fontSize: 13, fontFamily: Fonts.sansSemiBold, color: C.textSecondary,
    paddingHorizontal: 16, paddingTop: 4, paddingBottom: 2,
    borderTopWidth: 1, borderTopColor: C.border,
  },
  chatWrap: {
    marginTop: 2,
  },
  chatScroll: { maxHeight: 320 },
  chatEmpty: { fontSize: 13, fontFamily: Fonts.sans, color: C.textMuted, textAlign: 'center', paddingVertical: 12 },
  bubbleRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 8 },
  bubbleRowMe: { flexDirection: 'row-reverse' },
  bubbleAvatar: {
    width: 26, height: 26, borderRadius: 13,
    backgroundColor: C.secondarySoft, alignItems: 'center', justifyContent: 'center',
  },
  bubbleAvatarText: { fontSize: 10, fontFamily: Fonts.sansBold, color: C.secondary },
  bubble: { maxWidth: '76%', borderRadius: 14, padding: 10, gap: 3 },
  bubbleMe: { backgroundColor: C.secondary, borderBottomRightRadius: 3 },
  bubbleThem: { backgroundColor: C.surfaceAlt, borderWidth: 1, borderColor: C.border, borderBottomLeftRadius: 3 },
  bubbleSender: { fontSize: 10, fontFamily: Fonts.sansSemiBold, color: C.textMuted },
  bubbleText: { fontSize: 13, fontFamily: Fonts.sans, color: C.textPrimary, lineHeight: 19 },
  bubbleTextMe: { color: '#fff' },
  bubbleTime: { fontSize: 9, fontFamily: Fonts.sans, color: C.textMuted, alignSelf: 'flex-end' },

  chatInputRow: {
    flexDirection: 'row', alignItems: 'flex-end', gap: 8,
    paddingHorizontal: 12, paddingVertical: 10,
    borderTopWidth: 1, borderTopColor: C.border,
  },
  chatInput: {
    flex: 1, backgroundColor: C.surfaceAlt, borderWidth: 1, borderColor: C.border,
    borderRadius: 18, paddingHorizontal: 14, paddingVertical: 9,
    fontSize: 13, fontFamily: Fonts.sans, color: C.textPrimary, maxHeight: 90,
  },
  sendBtn: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: C.secondary, alignItems: 'center', justifyContent: 'center',
  },
  sendBtnDisabled: { opacity: 0.4 },

  emptyCard: {
    backgroundColor: C.surface, borderRadius: 20, padding: 28,
    borderWidth: 1, borderColor: C.border, alignItems: 'center', gap: 10,
  },
  emptyTitle: { fontSize: 16, fontFamily: Fonts.sansBold, color: C.textPrimary },
  emptyText: { fontSize: 14, lineHeight: 22, fontFamily: Fonts.sans, color: C.textMuted, textAlign: 'center' },
  emptyBtn: {
    marginTop: 4, backgroundColor: C.secondary, borderRadius: 14,
    paddingHorizontal: 20, paddingVertical: 12,
  },
  emptyBtnText: { fontSize: 14, fontFamily: Fonts.sansBold, color: '#fff' },
});

import { Fonts } from '@/constants/theme';
import { auth } from '@/services/firebase';
import { Service, subscribeUserServices } from '@/services/firestore';
import { FontAwesome6 } from '@expo/vector-icons';
import { router } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
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
  success: '#3F5A3A',
  successSoft: '#E2EAD9',
  warning: '#8C6A1F',
  warningSoft: '#F4ECD2',
  danger: '#7A2E2E',
  dangerSoft: '#F9EFEC',
  textPrimary: '#14213A',
  textSecondary: '#4A5468',
  textMuted: '#6B7689',
  border: '#E3E9F2',
};

function formatDate(timestamp: unknown) {
  if (!timestamp) return 'Unknown date';
  const date =
    typeof timestamp === 'object' &&
    timestamp !== null &&
    'toDate' in timestamp &&
    typeof (timestamp as { toDate: () => Date }).toDate === 'function'
      ? (timestamp as { toDate: () => Date }).toDate()
      : new Date(timestamp as string | number | Date);
  if (Number.isNaN(date.getTime())) return 'Unknown date';
  return date.toLocaleDateString();
}

function getStatusTone(status: Service['status']) {
  if (status === 'completed') {
    return { label: 'Completed', color: C.success, bg: C.successSoft, border: '#C9D8BE' };
  }
  if (status === 'in-progress') {
    return { label: 'In Progress', color: C.secondary, bg: C.primarySoft, border: '#D4DCEB' };
  }
  return { label: 'Submitted', color: C.warning, bg: C.warningSoft, border: '#E7D7A8' };
}

function StatusChip({
  label,
  tone,
}: {
  label?: string;
  tone: ReturnType<typeof getStatusTone>;
}) {
  return (
    <View style={[styles.statusChip, { backgroundColor: tone.bg, borderColor: tone.border }]}>
      <View style={[styles.statusChipDot, { backgroundColor: tone.color }]} />
      <Text style={[styles.statusChipText, { color: tone.color }]}>{label ?? tone.label}</Text>
    </View>
  );
}

function MetaPill({
  brass,
  label,
  outline,
}: {
  brass?: boolean;
  label: string;
  outline?: boolean;
}) {
  return (
    <View style={[styles.metaPill, brass ? styles.metaPillBrass : null, outline ? styles.metaPillOutline : null]}>
      <Text style={[styles.metaPillText, brass ? styles.metaPillTextBrass : null]}>{label}</Text>
    </View>
  );
}

export default function CasesScreen() {
  const user = auth.currentUser;
  const { width } = useWindowDimensions();
  const horizontalPadding = width < 380 ? 16 : 20;
  const [cases, setCases] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;

    const loadCases = async () => {
      if (!user?.uid) {
        if (active) {
          setCases([]);
          setLoading(false);
        }
        return;
      }

      try {
        setError('');
        const unsubscribe = subscribeUserServices(user.uid, (data) => {
          if (active) {
            setCases(data);
            setLoading(false);
          }
        });
        return unsubscribe;
      } catch {
        if (active) setError('We could not load your ADR cases right now.');
      }
    };

    let unsubscribe: (() => void) | void;

    loadCases().then((cleanup) => {
      unsubscribe = cleanup;
    });

    return () => {
      active = false;
      unsubscribe?.();
    };
  }, [user?.uid]);

  const submittedCount = cases.filter((item) => item.status === 'submitted').length;
  const inProgressCount = cases.filter((item) => item.status === 'in-progress').length;
  const completedCount = cases.filter((item) => item.status === 'completed').length;

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
        <View style={styles.hero}>
          <Pressable onPress={() => router.back()} style={({ pressed }) => [styles.backButton, pressed ? styles.pressed : null]}>
            <FontAwesome6 name="arrow-left" size={14} color={C.secondary} />
            <Text style={styles.backButtonText}>Back</Text>
          </Pressable>
          <Text style={styles.eyebrow}>ADR Cases</Text>
          <Text style={styles.title}>Your Cases</Text>
          <Text style={styles.subtitle}>
            Track your mediation and arbitration requests, assigned mediators, and case progress.
          </Text>
          <View style={styles.statusRail}>
            <StatusChip tone={getStatusTone('submitted')} label={`Submitted ${submittedCount}`} />
            <StatusChip tone={getStatusTone('in-progress')} label={`In progress ${inProgressCount}`} />
            <StatusChip tone={getStatusTone('completed')} label={`Completed ${completedCount}`} />
          </View>
          <View style={styles.actionRow}>
            <Pressable onPress={() => router.push('/(main)/request-mediation')} style={({ pressed }) => [styles.primaryButton, pressed ? styles.pressed : null]}>
              <Text style={styles.primaryButtonText}>Open mediation form</Text>
            </Pressable>
          </View>
        </View>

        {!user?.uid ? (
          <View style={styles.card}>
            <Text style={styles.placeholder}>Sign in to view ADR cases linked to your account.</Text>
          </View>
        ) : loading ? (
          <View style={styles.card}>
            <Text style={styles.placeholder}>Loading cases...</Text>
          </View>
        ) : error ? (
          <View style={styles.card}>
            <Text style={styles.errorTitle}>Unable to load cases</Text>
            <Text style={styles.placeholder}>{error}</Text>
          </View>
        ) : cases.length > 0 ? (
          cases.map((item) => {
            const tone = getStatusTone(item.status);
            return (
              <View key={item.id} style={styles.card}>
                <View style={styles.topRow}>
                  <View style={styles.topText}>
                    <Text style={styles.cardTitle}>
                      {item.serviceType.charAt(0).toUpperCase() + item.serviceType.slice(1)} case
                    </Text>
                    <Text style={styles.cardSubtitle}>Submitted {formatDate(item.createdAt)}</Text>
                  </View>
                  <View style={[styles.statusPill, { backgroundColor: tone.bg }]}>
                    <View style={[styles.statusDot, { backgroundColor: tone.color }]} />
                    <Text style={[styles.statusPillText, { color: tone.color }]}>{tone.label}</Text>
                  </View>
                </View>
                <View style={styles.metaRail}>
                  <MetaPill brass label={item.category || 'Case category pending'} />
                  <MetaPill label={item.serviceType === 'arbitration' ? 'Arbitration' : 'Mediation'} />
                  <MetaPill
                    outline
                    label={item.mediatorAssigned?.trim() ? 'Officer assigned' : 'Awaiting assignment'}
                  />
                </View>

                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Category</Text>
                  <Text style={styles.detailValue}>{item.category || '—'}</Text>
                </View>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Mediator</Text>
                  <Text style={styles.detailValue}>
                    {item.mediatorAssigned?.trim() || 'Not assigned yet'}
                  </Text>
                </View>
                {item.caseDetails?.trim() ? (
                  <View style={styles.noteBlock}>
                    <Text style={styles.noteLabel}>Case details</Text>
                    <Text style={styles.noteBody}>{item.caseDetails.trim()}</Text>
                  </View>
                ) : null}
              </View>
            );
          })
        ) : (
          <View style={styles.card}>
            <Text style={styles.placeholder}>No ADR cases found for this account yet.</Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.bg },
  scroll: { flex: 1 },
  content: {
    paddingTop: 20,
    gap: 16,
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
  eyebrow: {
    fontSize: 13,
    fontFamily: Fonts.sansSemiBold,
    color: C.secondary,
    textTransform: 'uppercase',
    letterSpacing: 0.9,
  },
  title: {
    fontSize: 34,
    lineHeight: 40,
    fontFamily: Fonts.displayBold,
    color: C.textPrimary,
  },
  subtitle: {
    fontSize: 16,
    lineHeight: 25,
    fontFamily: Fonts.sans,
    color: C.textSecondary,
  },
  statusRail: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginTop: 4,
  },
  statusChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  statusChipDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  statusChipText: {
    fontSize: 13,
    fontFamily: Fonts.sansBold,
  },
  actionRow: {
    gap: 10,
  },
  primaryButton: {
    minHeight: 52,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 18,
    backgroundColor: C.primary,
    paddingHorizontal: 18,
    paddingVertical: 14,
  },
  primaryButtonText: {
    fontSize: 14,
    fontFamily: Fonts.sansBold,
    color: '#FFFFFF',
  },
  card: {
    backgroundColor: C.surface,
    borderRadius: 22,
    padding: 18,
    borderWidth: 1,
    borderColor: C.border,
    gap: 10,
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 10,
  },
  topText: { flex: 1, gap: 4 },
  cardTitle: {
    fontSize: 16,
    lineHeight: 22,
    fontFamily: Fonts.sansBold,
    color: C.textPrimary,
  },
  cardSubtitle: {
    fontSize: 13,
    fontFamily: Fonts.sans,
    color: C.textMuted,
  },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  statusPillText: {
    fontSize: 11,
    fontFamily: Fonts.sansSemiBold,
  },
  metaRail: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  metaPill: {
    backgroundColor: C.surfaceAlt,
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  metaPillBrass: {
    backgroundColor: C.warningSoft,
  },
  metaPillOutline: {
    backgroundColor: C.surface,
    borderWidth: 1,
    borderColor: C.border,
  },
  metaPillText: {
    fontSize: 13,
    fontFamily: Fonts.sansSemiBold,
    color: C.secondary,
  },
  metaPillTextBrass: {
    color: C.warning,
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
    lineHeight: 20,
    fontFamily: Fonts.sansSemiBold,
    color: C.textPrimary,
    textAlign: 'right',
  },
  noteBlock: {
    backgroundColor: C.surfaceAlt,
    borderRadius: 14,
    padding: 12,
    gap: 4,
    marginTop: 4,
  },
  noteLabel: {
    fontSize: 11,
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
  placeholder: {
    fontSize: 14,
    lineHeight: 22,
    fontFamily: Fonts.sans,
    color: C.textMuted,
  },
  errorTitle: {
    fontSize: 16,
    lineHeight: 22,
    fontFamily: Fonts.sansBold,
    color: C.danger,
  },
  pressed: {
    opacity: 0.92,
  },
});

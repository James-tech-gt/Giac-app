import { Fonts } from '@/constants/theme';
import { getUserProfile } from '@/services/auth';
import { auth } from '@/services/firebase';
import { createService } from '@/services/firestore';
import { FontAwesome6 } from '@expo/vector-icons';
import { router } from 'expo-router';
import React, { useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
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
  textPrimary: '#14213A',
  textSecondary: '#4A5468',
  textMuted: '#6B7689',
  border: '#E3E9F2',
  danger: '#7A2E2E',
  dangerSoft: '#F9EFEC',
};

type IconName = React.ComponentProps<typeof FontAwesome6>['name'];
type ServiceType = 'mediation' | 'arbitration';
type SelectorKey = 'service' | 'category' | null;

type OptionItem<T extends string> = {
  value: T;
  label: string;
  icon: IconName;
  description?: string;
};

const SERVICE_OPTIONS: OptionItem<ServiceType>[] = [
  {
    value: 'mediation',
    label: 'Mediation',
    icon: 'scale-balanced',
    description: 'Guided settlement with a neutral GIAC mediator.',
  },
  {
    value: 'arbitration',
    label: 'Arbitration',
    icon: 'gavel',
    description: 'Structured dispute review with a formal decision path.',
  },
];

const CATEGORY_OPTIONS: OptionItem<string>[] = [
  { value: 'Land disputes', label: 'Land disputes', icon: 'house' },
  { value: 'Rent & tenant conflicts', label: 'Rent & tenant conflicts', icon: 'key' },
  {
    value: 'Commercial & debt recovery cases',
    label: 'Commercial & debt recovery cases',
    icon: 'briefcase',
  },
  {
    value: 'Child maintenance & family disputes',
    label: 'Child maintenance & family disputes',
    icon: 'users',
  },
  { value: 'Workplace & business disputes', label: 'Workplace & business disputes', icon: 'building' },
  { value: 'Marriage & domestic issues', label: 'Marriage & domestic issues', icon: 'ring' },
  {
    value: 'Drafting & reviewing settlement agreements',
    label: 'Drafting & reviewing settlement agreements',
    icon: 'file-signature',
  },
];

const MEDIATION_BENEFITS: { icon: IconName; label: string }[] = [
  {
    icon: 'lock',
    label: 'Confidential, cost-effective, and impartial resolution.',
  },
  {
    icon: 'handshake',
    label: 'Preserves relationships and helps prevent litigation.',
  },
  {
    icon: 'scale-balanced',
    label: 'Expert mediators guiding efficient conflict resolution.',
  },
  {
    icon: 'gift',
    label: 'Free consultation for first-time clients.',
  },
];

const CONTACT_ITEMS: { icon: IconName; label: string }[] = [
  { icon: 'location-dot', label: 'Kasoa, Ghana' },
  { icon: 'phone', label: '+233 24 687 2805 | +233 50 257 3336' },
  { icon: 'envelope', label: 'globalinstituteofadrcenter@gmail.com' },
  { icon: 'globe', label: 'www.giacghana.com' },
];

function StatusChip({
  color,
  label,
  soft,
}: {
  color: string;
  label: string;
  soft: string;
}) {
  return (
    <View style={[styles.statusChip, { backgroundColor: soft, borderColor: soft }]}>
      <View style={[styles.statusChipDot, { backgroundColor: color }]} />
      <Text style={[styles.statusChipText, { color }]}>{label}</Text>
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

function SectionTitle({ icon, title }: { icon: IconName; title: string }) {
  return (
    <View style={styles.titleRow}>
      <View style={styles.titleIcon}>
        <FontAwesome6 name={icon} size={14} color={C.secondary} />
      </View>
      <Text style={styles.cardTitle}>{title}</Text>
    </View>
  );
}

export default function RequestMediationScreen() {
  const user = auth.currentUser;
  const { width } = useWindowDimensions();
  const isCompact = width < 390;
  const horizontalPadding = width < 380 ? 16 : 20;
  const scrollRef = useRef<ScrollView>(null);
  const [serviceType, setServiceType] = useState<ServiceType>('mediation');
  const [category, setCategory] = useState('');
  const [caseDetails, setCaseDetails] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [openSelector, setOpenSelector] = useState<SelectorKey>(null);
  const [errors, setErrors] = useState<{ category?: string; caseDetails?: string }>({});

  const selectedService = useMemo(
    () => SERVICE_OPTIONS.find((option) => option.value === serviceType) ?? SERVICE_OPTIONS[0],
    [serviceType]
  );

  const selectedCategory = useMemo(
    () => CATEGORY_OPTIONS.find((option) => option.value === category) ?? null,
    [category]
  );

  const handleSubmit = async () => {
    if (!user?.uid) {
      Alert.alert('Sign in required', 'Please sign in before sending a request.');
      return;
    }

    const newErrors: { category?: string; caseDetails?: string } = {};
    if (!category.trim()) newErrors.category = 'Please select a case category.';
    if (!caseDetails.trim()) newErrors.caseDetails = 'Please describe your case before submitting.';
    else if (caseDetails.trim().length < 30) newErrors.caseDetails = 'Please provide more detail — at least 30 characters.';
    setErrors(newErrors);
    if (Object.keys(newErrors).length > 0) {
      scrollRef.current?.scrollTo({ y: 0, animated: true });
      return;
    }

    setSubmitting(true);

    try {
      const profile = await getUserProfile(user.uid);
      await createService({
        userId: user.uid,
        clientName: profile?.fullName || user.displayName || user.email || '',
        clientEmail: user.email ?? '',
        serviceType,
        category,
        caseDetails,
      });
      setSubmitted(true);
    } catch {
      Alert.alert('Request failed', 'Please try again in a moment.');
    } finally {
      setSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
        <ScrollView
          contentContainerStyle={styles.successContainer}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.successInner}>
            <View style={styles.successIconWrap}>
              <FontAwesome6 name="circle-check" size={56} color="#4A7C59" />
            </View>
            <Text style={styles.successHeading}>Request Submitted</Text>
            <Text style={styles.successBody}>
              Your {selectedService.label.toLowerCase()} request has been received by GIAC. You can track its progress from your cases page.
            </Text>

            <View style={styles.successDetail}>
              <View style={styles.successDetailRow}>
                <Text style={styles.successDetailLabel}>Service</Text>
                <Text style={styles.successDetailValue}>{selectedService.label}</Text>
              </View>
              <View style={styles.successDivider} />
              <View style={styles.successDetailRow}>
                <Text style={styles.successDetailLabel}>Status</Text>
                <Text style={[styles.successDetailValue, { color: '#4A7C59' }]}>Submitted</Text>
              </View>
            </View>

            <Pressable
              onPress={() => router.replace('/(main)/home')}
              style={({ pressed }) => [styles.ghostButton, pressed ? styles.pressed : null]}
            >
              <Text style={styles.ghostButtonText}>Back to Home</Text>
            </Pressable>
          </View>
        </ScrollView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
      <KeyboardAvoidingView
        style={styles.safe}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 20 : 0}
      >
        <ScrollView
          ref={scrollRef}
          style={styles.scroll}
          contentContainerStyle={[
            styles.content,
            {
              paddingHorizontal: horizontalPadding,
              paddingBottom: isCompact ? 120 : 132,
            },
          ]}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
        <View style={styles.hero}>
          <View style={styles.heroTopRow}>
            <Pressable onPress={() => router.back()} style={({ pressed }) => [styles.backButton, pressed ? styles.pressed : null]}>
              <FontAwesome6 name="arrow-left" size={14} color={C.secondary} />
              <Text style={styles.backButtonText}>Back</Text>
            </Pressable>
          </View>
          <Text style={styles.heroEyebrow}>ADR Request</Text>
          <Text style={[styles.heroTitle, isCompact ? styles.heroTitleCompact : null]}>
            Request Mediation
          </Text>
          <Text style={styles.heroDescription}>
            Submit your dispute or case request here. GIAC supports practical ADR handling across family, land, workplace, commercial, and domestic matters.
          </Text>
          <View style={styles.statusRail}>
            <StatusChip color={C.secondary} soft={C.primarySoft} label="Submitted" />
            <StatusChip color={C.secondary} soft={C.primarySoft} label="GIAC review" />
            <StatusChip color={C.secondary} soft={C.primarySoft} label="Assigned mediator" />
          </View>
          <View style={styles.metaRail}>
            <MetaPill brass label={selectedService.label} />
            <MetaPill label={selectedCategory?.label ?? 'Select a case category'} outline />
          </View>
        </View>

        <View style={styles.card}>
          <SectionTitle icon="sliders" title="Service Type" />
          <Text style={styles.cardHint}>Choose the ADR service you need for this request.</Text>
          <Pressable
            onPress={() => setOpenSelector((current) => (current === 'service' ? null : 'service'))}
            style={({ pressed }) => [
              styles.selectTrigger,
              openSelector === 'service' ? styles.selectTriggerOpen : null,
              pressed ? styles.pressed : null,
            ]}
          >
            <View style={styles.selectLead}>
              <View style={styles.selectBadge}>
                <FontAwesome6 name={selectedService.icon} size={14} color={C.secondary} />
              </View>
              <View style={styles.selectTextWrap}>
                <Text style={styles.selectValue}>{selectedService.label}</Text>
                <Text style={styles.selectMeta}>{selectedService.description}</Text>
              </View>
            </View>
            <FontAwesome6
              name={openSelector === 'service' ? 'chevron-up' : 'chevron-down'}
              size={12}
              color={C.textMuted}
            />
          </Pressable>

          {openSelector === 'service' ? (
            <View style={styles.dropdown}>
              {SERVICE_OPTIONS.map((option) => {
                const selected = option.value === serviceType;
                return (
                  <Pressable
                    key={option.value}
                    onPress={() => {
                      setServiceType(option.value);
                      setOpenSelector(null);
                    }}
                    style={({ pressed }) => [
                      styles.optionRow,
                      selected ? styles.optionRowSelected : null,
                      pressed ? styles.pressed : null,
                    ]}
                  >
                    <View style={styles.optionLead}>
                      <View style={[styles.optionIcon, selected ? styles.optionIconSelected : null]}>
                        <FontAwesome6 name={option.icon} size={14} color={selected ? C.secondary : C.textSecondary} />
                      </View>
                      <View style={styles.optionTextWrap}>
                        <Text style={[styles.optionTitle, selected ? styles.optionTitleSelected : null]}>
                          {option.label}
                        </Text>
                        {option.description ? (
                          <Text style={styles.optionDescription}>{option.description}</Text>
                        ) : null}
                      </View>
                    </View>
                    {selected ? <FontAwesome6 name="check" size={14} color={C.secondary} /> : null}
                  </Pressable>
                );
              })}
            </View>
          ) : null}
        </View>

        <View style={styles.card}>
          <SectionTitle icon="folder-open" title="Case Information" />
          <Text style={styles.cardHint}>Pick the closest dispute category, then describe the matter in your own words.</Text>
          <Pressable
            onPress={() => setOpenSelector((current) => (current === 'category' ? null : 'category'))}
            style={({ pressed }) => [
              styles.selectTrigger,
              openSelector === 'category' ? styles.selectTriggerOpen : null,
              pressed ? styles.pressed : null,
            ]}
          >
            <View style={styles.selectLead}>
              <View style={styles.selectBadge}>
                <FontAwesome6
                  name={selectedCategory?.icon ?? 'folder-open'}
                  size={14}
                  color={C.secondary}
                />
              </View>
              <View style={styles.selectTextWrap}>
                <Text style={styles.selectValue}>
                  {selectedCategory?.label ?? 'Choose a case category'}
                </Text>
                <Text style={styles.selectMeta}>
                  {selectedCategory ? 'Selected dispute category' : 'Tap to browse available GIAC case categories'}
                </Text>
              </View>
            </View>
            <FontAwesome6
              name={openSelector === 'category' ? 'chevron-up' : 'chevron-down'}
              size={12}
              color={C.textMuted}
            />
          </Pressable>

          {errors.category ? (
            <Text style={styles.fieldError}>{errors.category}</Text>
          ) : null}

          {openSelector === 'category' ? (
            <View style={styles.dropdown}>
              {CATEGORY_OPTIONS.map((option) => {
                const selected = option.value === category;
                return (
                  <Pressable
                    key={option.value}
                    onPress={() => {
                      setCategory(option.value);
                      setErrors((e) => ({ ...e, category: undefined }));
                      setOpenSelector(null);
                    }}
                    style={({ pressed }) => [
                      styles.optionRow,
                      selected ? styles.optionRowSelected : null,
                      pressed ? styles.pressed : null,
                    ]}
                  >
                    <View style={styles.optionLead}>
                      <View style={[styles.optionIcon, selected ? styles.optionIconSelected : null]}>
                        <FontAwesome6 name={option.icon} size={14} color={selected ? C.secondary : C.textSecondary} />
                      </View>
                      <Text style={[styles.optionTitle, selected ? styles.optionTitleSelected : null]}>
                        {option.label}
                      </Text>
                    </View>
                    {selected ? <FontAwesome6 name="check" size={14} color={C.secondary} /> : null}
                  </Pressable>
                );
              })}
            </View>
          ) : null}

          <View style={styles.field}>
            <Text style={styles.fieldLabel}>Case details</Text>
            <TextInput
              value={caseDetails}
              onChangeText={(v) => {
                setCaseDetails(v);
                if (errors.caseDetails) setErrors((e) => ({ ...e, caseDetails: undefined }));
              }}
              placeholder="Describe the issue or dispute in at least 30 characters"
              placeholderTextColor={C.textMuted}
              multiline
              style={[styles.input, styles.inputMultiline, errors.caseDetails ? styles.inputError : null]}
            />
            {errors.caseDetails ? (
              <Text style={styles.fieldError}>{errors.caseDetails}</Text>
            ) : null}
          </View>
        </View>

        <View style={styles.infoCard}>
          <SectionTitle icon="scale-balanced" title="ADR Services & Mediation Expertise" />
          <View style={styles.infoList}>
            {CATEGORY_OPTIONS.map((item) => (
              <View key={item.value} style={styles.infoRow}>
                <View style={styles.infoBadge}>
                  <FontAwesome6 name={item.icon} size={13} color={C.secondary} />
                </View>
                <Text style={styles.infoItem}>{item.label}</Text>
              </View>
            ))}
          </View>
        </View>

        <View style={styles.infoCard}>
          <SectionTitle icon="star" title="Why Choose GIAC Mediation Services?" />
          <View style={styles.infoList}>
            {MEDIATION_BENEFITS.map((item) => (
              <View key={item.label} style={styles.infoRow}>
                <View style={styles.infoBadge}>
                  <FontAwesome6 name={item.icon} size={13} color={C.secondary} />
                </View>
                <Text style={styles.infoItem}>{item.label}</Text>
              </View>
            ))}
          </View>
        </View>

        <View style={styles.contactCard}>
          <SectionTitle icon="headset" title="Need to Speak with GIAC?" />
          <View style={styles.infoList}>
            {CONTACT_ITEMS.map((item) => (
              <View key={item.label} style={styles.infoRow}>
                <View style={styles.infoBadge}>
                  <FontAwesome6 name={item.icon} size={13} color={C.secondary} />
                </View>
                <Text style={styles.contactText}>{item.label}</Text>
              </View>
            ))}
          </View>
          <Text style={styles.contactNote}>
            First-time clients can ask for a free consultation before proceeding.
          </Text>
        </View>

        <View style={styles.actionRow}>
          <Pressable
            onPress={handleSubmit}
            disabled={submitting}
            style={({ pressed }) => [
              styles.submitButton,
              submitting ? styles.buttonDisabled : null,
              pressed ? styles.pressed : null,
            ]}
          >
            {submitting ? (
              <View style={styles.loadingRow}>
                <ActivityIndicator color="#FFFFFF" size="small" />
                <Text style={styles.submitButtonText}>Submitting</Text>
              </View>
            ) : (
              <Text style={styles.submitButtonText}>Submit Request</Text>
            )}
          </Pressable>

          <Pressable
            onPress={() => router.back()}
            style={({ pressed }) => [styles.ghostButton, pressed ? styles.pressed : null]}
          >
            <Text style={styles.ghostButtonText}>Cancel</Text>
          </Pressable>
        </View>
        </ScrollView>
      </KeyboardAvoidingView>
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
  heroTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  backButton: {
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
    backgroundColor: '#F4ECD2',
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
    color: '#8C6A1F',
  },
  card: {
    backgroundColor: C.surface,
    borderRadius: 22,
    padding: 18,
    borderWidth: 1,
    borderColor: C.border,
    gap: 14,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  titleIcon: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: C.primarySoft,
  },
  cardTitle: {
    flex: 1,
    fontSize: 18,
    fontFamily: Fonts.displaySemiBold,
    color: C.textPrimary,
  },
  cardHint: {
    fontSize: 13,
    lineHeight: 20,
    fontFamily: Fonts.sans,
    color: C.textMuted,
  },
  selectTrigger: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    backgroundColor: C.surfaceAlt,
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingVertical: 14,
  },
  selectTriggerOpen: {
    backgroundColor: C.surface,
    borderColor: C.secondary,
  },
  selectLead: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  selectBadge: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: C.primarySoft,
  },
  selectTextWrap: {
    flex: 1,
    gap: 2,
  },
  selectValue: {
    fontSize: 14,
    fontFamily: Fonts.sansSemiBold,
    color: C.textPrimary,
    flexWrap: 'wrap',
  },
  selectMeta: {
    fontSize: 12,
    lineHeight: 18,
    fontFamily: Fonts.sans,
    color: C.textMuted,
  },
  dropdown: {
    gap: 10,
  },
  optionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    backgroundColor: C.surfaceAlt,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: C.border,
    paddingHorizontal: 14,
    paddingVertical: 13,
  },
  optionRowSelected: {
    backgroundColor: C.primarySoft,
    borderColor: C.secondary,
  },
  optionLead: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  optionIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: C.surface,
  },
  optionIconSelected: {
    backgroundColor: '#FFFFFF',
  },
  optionTextWrap: {
    flex: 1,
    gap: 2,
  },
  optionTitle: {
    fontSize: 14,
    lineHeight: 20,
    fontFamily: Fonts.sansSemiBold,
    color: C.textSecondary,
    flexWrap: 'wrap',
  },
  optionTitleSelected: {
    color: C.secondary,
  },
  optionDescription: {
    fontSize: 12,
    lineHeight: 18,
    fontFamily: Fonts.sans,
    color: C.textMuted,
  },
  field: {
    gap: 8,
  },
  fieldLabel: {
    fontSize: 14,
    fontFamily: Fonts.sansSemiBold,
    color: C.textPrimary,
  },
  input: {
    backgroundColor: C.surfaceAlt,
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 15,
    fontFamily: Fonts.sans,
    color: C.textPrimary,
  },
  inputMultiline: {
    minHeight: 120,
    textAlignVertical: 'top',
  },
  infoCard: {
    backgroundColor: C.surface,
    borderRadius: 22,
    padding: 18,
    borderWidth: 1,
    borderColor: C.border,
    gap: 12,
  },
  infoList: {
    gap: 10,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  infoBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: C.primarySoft,
    marginTop: 1,
  },
  infoItem: {
    flex: 1,
    fontSize: 14,
    lineHeight: 22,
    fontFamily: Fonts.sans,
    color: C.textSecondary,
  },
  contactCard: {
    backgroundColor: C.primarySoft,
    borderRadius: 22,
    padding: 18,
    borderWidth: 1,
    borderColor: C.border,
    gap: 8,
  },
  contactText: {
    flex: 1,
    fontSize: 14,
    lineHeight: 22,
    fontFamily: Fonts.sansSemiBold,
    color: C.textPrimary,
  },
  contactNote: {
    fontSize: 13,
    lineHeight: 21,
    fontFamily: Fonts.sans,
    color: C.textSecondary,
    marginTop: 4,
  },
  successContainer: {
    flexGrow: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
    paddingVertical: 40,
  },
  successInner: {
    width: '100%',
    maxWidth: 480,
    gap: 16,
    alignItems: 'center',
  },
  successIconWrap: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#E6F0E9',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  successHeading: {
    fontSize: 30,
    lineHeight: 36,
    fontFamily: Fonts.displayBold,
    color: C.textPrimary,
    textAlign: 'center',
  },
  successBody: {
    fontSize: 15,
    lineHeight: 24,
    fontFamily: Fonts.sans,
    color: C.textSecondary,
    textAlign: 'center',
    maxWidth: 320,
  },
  successDetail: {
    width: '100%',
    backgroundColor: C.surface,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: C.border,
    padding: 16,
    gap: 10,
    marginTop: 4,
  },
  successDetailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  successDetailLabel: {
    fontSize: 13,
    fontFamily: Fonts.sans,
    color: C.textMuted,
  },
  successDetailValue: {
    fontSize: 13,
    fontFamily: Fonts.sansSemiBold,
    color: C.textPrimary,
  },
  successDivider: {
    height: 1,
    backgroundColor: C.border,
  },
  submitButton: {
    backgroundColor: C.primary,
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionRow: {
    gap: 10,
  },
  secondaryButton: {
    minHeight: 54,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: C.border,
    backgroundColor: C.surface,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 18,
    paddingVertical: 14,
  },
  secondaryButtonText: {
    fontSize: 14,
    fontFamily: Fonts.sansBold,
    color: C.secondary,
  },
  submitButtonText: {
    fontSize: 14,
    fontFamily: Fonts.sansBold,
    color: '#FFFFFF',
  },
  loadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  buttonDisabled: {
    backgroundColor: '#CBD3E0',
  },
  ghostButton: {
    width: '100%',
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ghostButtonText: {
    fontSize: 14,
    fontFamily: Fonts.sansBold,
    color: '#2A3F66',
  },
  pressed: {
    opacity: 0.92,
  },
  inputError: {
    borderColor: C.danger,
  },
  fieldError: {
    fontSize: 12,
    fontFamily: Fonts.sans,
    color: C.danger,
    marginTop: 4,
  },
});

import { Fonts } from '@/constants/theme';
import { auth } from '@/services/firebase';
import { Course, CourseRegistration, getCourses, getCoursesSync, subscribeUserRegistration } from '@/services/firestore';
import { FontAwesome6 } from '@expo/vector-icons';
import { router } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
  Linking,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
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
  accent: '#B68A2E',
  accentSoft: '#F4ECD2',
  warning: '#8C6A1F',
  textPrimary: '#14213A',
  textSecondary: '#4A5468',
  textMuted: '#6B7689',
  border: '#E3E9F2',
  danger: '#7A2E2E',
};

type IconName = React.ComponentProps<typeof FontAwesome6>['name'];

const PROGRAM_BENEFITS: { icon: IconName; label: string }[] = [
  {
    icon: 'globe',
    label: 'Global recognition for ADR-focused career growth across industries and jurisdictions',
  },
  {
    icon: 'scale-balanced',
    label: 'Career paths as a court-connected mediator, arbitrator, ADR specialist, or independent practitioner',
  },
  {
    icon: 'lightbulb',
    label: 'Stronger skills in conflict resolution, HR management, consultancy, and legal practice',
  },
  {
    icon: 'handshake',
    label: 'Automatic GIAC membership plus networking access through GNAAP and CPD opportunities',
  },
  {
    icon: 'bullseye',
    label: 'Mass private mediation experience to sharpen practical ADR capability',
  },
];

const QUALIFYING_AUDIENCES: { icon: IconName; label: string }[] = [
  {
    icon: 'briefcase',
    label: 'Professionals: lawyers, judges, HR managers, business executives, financial experts, health professionals, and educators',
  },
  {
    icon: 'users',
    label: 'Non-professionals: community leaders, social workers, counselors, pastors, and entrepreneurs',
  },
  {
    icon: 'graduation-cap',
    label: 'Students in law, business, social sciences, and conflict resolution',
  },
  {
    icon: 'building',
    label: 'Organizations such as corporate firms, government agencies, NGOs, and community groups',
  },
  {
    icon: 'crown',
    label: 'Traditional leaders, including chiefs and queen mothers, with mediation and customary arbitration support',
  },
];

const WHY_CHOOSE_GIAC: { icon: IconName; label: string }[] = [
  {
    icon: 'star',
    label: 'Expert trainers and facilitators with practical ADR and legal experience',
  },
  {
    icon: 'gavel',
    label: 'Real-world mediation and arbitration simulations for hands-on learning',
  },
  {
    icon: 'laptop',
    label: 'Flexible virtual training with scheduled in-person practical sessions',
  },
  {
    icon: 'certificate',
    label: 'Affordable and recognized certification with strong professional credibility',
  },
  {
    icon: 'globe',
    label: 'Career growth, networking, and membership opportunities through GIAC and GNAAP',
  },
];

type ContactType = 'map' | 'whatsapp' | 'phone' | 'gmail' | 'web';

const CONTACT_ITEMS: { icon: IconName; label: string; type: ContactType; value: string }[] = [
  { icon: 'location-dot', label: 'Kasoa, Ghana',                          type: 'map',       value: 'Kasoa,Ghana' },
  { icon: 'whatsapp',     label: '+233 24 687 2805',                      type: 'whatsapp',  value: '233246872805' },
  { icon: 'phone',        label: '+233 50 257 3336',                      type: 'phone',     value: '+233502573336' },
  { icon: 'envelope',     label: 'globalinstituteofadrcenter@gmail.com',  type: 'gmail',     value: 'globalinstituteofadrcenter@gmail.com' },
  { icon: 'globe',        label: 'www.giacghana.com',                     type: 'web',       value: 'https://www.giacghana.com' },
];

async function openContact(type: ContactType, value: string) {
  let primaryUrl = '';
  let fallbackUrl = '';

  switch (type) {
    case 'map':
      primaryUrl = `https://maps.google.com/?q=${encodeURIComponent(value)}`;
      break;
    case 'whatsapp':
      primaryUrl = `whatsapp://send?phone=${value}`;
      fallbackUrl = `https://wa.me/${value}`;
      break;
    case 'phone':
      primaryUrl = `tel:${value}`;
      break;
    case 'gmail':
      primaryUrl = `googlegmail://co?to=${encodeURIComponent(value)}`;
      fallbackUrl = `https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent(value)}`;
      break;
    case 'web':
      primaryUrl = value;
      break;
  }

  const canOpen = await Linking.canOpenURL(primaryUrl).catch(() => false);
  if (canOpen) {
    Linking.openURL(primaryUrl);
  } else if (fallbackUrl) {
    Linking.openURL(fallbackUrl);
  } else {
    Linking.openURL(primaryUrl);
  }
}

function SectionTitle({ icon, title }: { icon: IconName; title: string }) {
  return (
    <View style={styles.infoTitleRow}>
      <View style={styles.infoTitleIcon}>
        <FontAwesome6 name={icon} size={14} color={C.secondary} />
      </View>
      <Text style={styles.infoTitle}>{title}</Text>
    </View>
  );
}

function formatCurrency(value?: number) {
  if (typeof value !== 'number') return 'Fee unavailable';
  return new Intl.NumberFormat('en-GH', {
    style: 'currency',
    currency: 'GHS',
    maximumFractionDigits: 0,
  }).format(value);
}

export default function ExploreScreen() {
  const { width } = useWindowDimensions();
  const isCompact = width < 390;
  const horizontalPadding = width < 380 ? 16 : 20;
  const user = auth.currentUser;
  const [courses, setCourses] = useState<Course[]>(getCoursesSync());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [registration, setRegistration] = useState<CourseRegistration | null | undefined>(undefined);

  useEffect(() => {
    if (!user?.uid) { setRegistration(null); return; }
    return subscribeUserRegistration(user.uid, setRegistration);
  }, [user?.uid]);

  const canApply = registration?.status === 'accepted';

  useEffect(() => {
    let active = true;

    const loadCourses = async () => {
      try {
        const data = await getCourses();
        if (active) setCourses(data ?? getCoursesSync());
      } catch {
        // keep the sync courses already shown
      } finally {
        if (active) setLoading(false);
      }
    };

    loadCourses();

    return () => {
      active = false;
    };
  }, []);

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[
          styles.content,
          {
            paddingHorizontal: horizontalPadding,
            paddingBottom: isCompact ? 120 : 132,
          },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.hero}>
          <Text style={styles.heroEyebrow}>Explore</Text>
          <Text style={[styles.heroTitle, isCompact ? styles.heroTitleCompact : null]}>
            Apply for a Programme
          </Text>
          <Text style={styles.heroDescription}>
            Browse GIAC programs, open course details, and start an application from a dedicated screen when you find the right fit.
          </Text>
        </View>

        {loading ? (
          <View style={styles.card}>
            <Text style={styles.placeholderText}>Loading courses...</Text>
          </View>
        ) : error ? (
          <View style={styles.card}>
            <Text style={styles.errorTitle}>Unable to load courses</Text>
            <Text style={styles.placeholderText}>{error}</Text>
          </View>
        ) : courses.length > 0 ? (
          <View style={styles.stack}>
            {courses.map((course) => (
              <View key={course.id} style={styles.card}>
                <View style={styles.topRow}>
                  <Text style={styles.courseTitle}>{course.title}</Text>
                  <View style={styles.tag}>
                    <Text style={styles.tagText}>{course.program}</Text>
                  </View>
                </View>
                <Text style={styles.meta}>
                  {course.level} · {course.duration}
                </Text>
                {course.platform ? (
                  <Text style={styles.meta}>{course.platform}</Text>
                ) : null}
                <Text style={styles.meta}>{course.schedule}</Text>
                {course.practicalSessions ? (
                  <Text style={styles.meta}>{course.practicalSessions}</Text>
                ) : null}
                <Text style={styles.description}>
                  {course.description || 'No course description added yet.'}
                </Text>
                <Text style={styles.fee}>{formatCurrency(course.fees)}</Text>
                <View style={styles.buttonRow}>
                  <Pressable
                    onPress={() => router.push({ pathname: '/(main)/course-details', params: { courseId: course.id } })}
                    style={({ pressed }) => [styles.secondaryBtn, pressed ? styles.pressed : null]}
                  >
                    <Text style={styles.secondaryBtnText}>View Details</Text>
                  </Pressable>
                  <Pressable
                    onPress={() => canApply
                      ? router.push({ pathname: '/(main)/application', params: { courseId: course.id } })
                      : null}
                    style={({ pressed }) => [styles.brassBtn, !canApply && styles.brassBtnDisabled, canApply && pressed ? styles.pressed : null]}
                  >
                    <Text style={[styles.brassBtnText, !canApply && { opacity: 0.5 }]}>
                      {canApply ? 'Apply Now' : 'Register First'}
                    </Text>
                  </Pressable>
                </View>
              </View>
            ))}
          </View>
        ) : (
          <View style={styles.card}>
            <Text style={styles.placeholderText}>
              No courses found yet. Add course documents in Firebase and they will appear here.
            </Text>
          </View>
        )}

        <View style={styles.aboutCard}>
          <View style={styles.infoTitleRow}>
            <View style={styles.infoTitleIcon}>
              <FontAwesome6 name="building" size={14} color={C.secondary} />
            </View>
            <Text style={styles.aboutTitle}>About GIAC</Text>
          </View>
          <Text style={styles.aboutBody}>
            The Global Institute of ADR Center (GIAC) is a registered institution in Ghana dedicated to advancing Alternative Dispute Resolution (ADR). It provides world-class training and professional development in mediation, arbitration, negotiation, and other ADR mechanisms. Through its certification programs, mediation services, and research initiatives, GIAC equips individuals and organizations with the skills to resolve conflicts efficiently, preserving relationships while saving time and resources. GIAC also offers tailored programs for international students and organizations who wish to study ADR abroad, providing customized training solutions to meet diverse needs.
          </Text>

          <View style={styles.aboutDivider} />

          <View style={styles.aboutMetaRow}>
            <Text style={styles.aboutMetaLabel}>Motto</Text>
            <Text style={styles.aboutMetaValue}>Collaborative Effort for a Sustainable World</Text>
          </View>

          <View style={styles.aboutMetaRow}>
            <Text style={styles.aboutMetaLabel}>Vision</Text>
            <Text style={styles.aboutMetaValue}>
              Advancing Alternative Dispute Resolution (ADR) as a catalyst for global peace, justice, and sustainability.
            </Text>
          </View>

          <View style={styles.aboutMetaRow}>
            <Text style={styles.aboutMetaLabel}>Mission</Text>
            <Text style={styles.aboutMetaValue}>
              To promote and advance the use of ADR methods—such as mediation, arbitration, negotiation, and other conflict resolution mechanisms—to resolve disputes efficiently and effectively.
            </Text>
          </View>

          <View style={styles.aboutDivider} />

          <Text style={styles.aboutMetaLabel}>Objectives</Text>
          {[
            'Provide training and certification programs for ADR professionals.',
            'Offer resources and support for individuals and organizations seeking ADR services.',
            'Promote the benefits of ADR through research, publications, and events.',
            'Foster a global network of ADR professionals and organizations.',
          ].map((obj, i) => (
            <View key={i} style={styles.objectiveRow}>
              <View style={styles.objectiveNum}>
                <Text style={styles.objectiveNumText}>{i + 1}</Text>
              </View>
              <Text style={styles.objectiveText}>{obj}</Text>
            </View>
          ))}
        </View>

        <View style={styles.infoCard}>
          <SectionTitle icon="star" title="Why Choose GIAC?" />
          <View style={styles.infoList}>
            {WHY_CHOOSE_GIAC.map((item) => (
              <View key={item.label} style={styles.infoRow}>
                <View style={styles.infoBadge}>
                  <FontAwesome6 name={item.icon} size={13} color={C.secondary} />
                </View>
                <Text style={styles.infoItem}>{item.label}</Text>
              </View>
            ))}
          </View>
        </View>

        <View style={styles.infoCard}>
          <SectionTitle icon="graduation-cap" title="Prospects & Benefits After Completion" />
          <View style={styles.infoList}>
            {PROGRAM_BENEFITS.map((item) => (
              <View key={item.label} style={styles.infoRow}>
                <View style={styles.infoBadge}>
                  <FontAwesome6 name={item.icon} size={13} color={C.secondary} />
                </View>
                <Text style={styles.infoItem}>{item.label}</Text>
              </View>
            ))}
          </View>
        </View>

        <View style={styles.infoCard}>
          <SectionTitle icon="users" title="Who Qualifies for GIAC Programs?" />
          <View style={styles.infoList}>
            {QUALIFYING_AUDIENCES.map((item) => (
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
          <SectionTitle icon="location-dot" title="Contact GIAC" />
          {CONTACT_ITEMS.map((item) => (
            <TouchableOpacity
              key={item.label}
              style={styles.infoRow}
              onPress={() => openContact(item.type, item.value)}
              activeOpacity={0.65}
            >
              <View style={styles.infoBadge}>
                <FontAwesome6 name={item.icon} size={13} color={C.secondary} />
              </View>
              <Text style={[styles.contactText, styles.contactLink]}>{item.label}</Text>
            </TouchableOpacity>
          ))}
        </View>
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
  stack: {
    gap: 12,
  },
  card: {
    backgroundColor: C.surface,
    borderRadius: 22,
    padding: 18,
    borderWidth: 1,
    borderColor: C.border,
    gap: 8,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 10,
  },
  courseTitle: {
    flex: 1,
    fontSize: 17,
    lineHeight: 24,
    fontFamily: Fonts.sansBold,
    color: C.textPrimary,
  },
  tag: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 5,
    backgroundColor: C.accentSoft,
  },
  tagText: {
    fontSize: 11,
    fontFamily: Fonts.sansSemiBold,
    color: C.warning,
  },
  meta: {
    fontSize: 13,
    lineHeight: 20,
    fontFamily: Fonts.sans,
    color: C.textSecondary,
  },
  description: {
    fontSize: 14,
    lineHeight: 22,
    fontFamily: Fonts.sans,
    color: C.textMuted,
  },
  fee: {
    fontSize: 14,
    fontFamily: Fonts.sansBold,
    color: C.secondary,
    marginTop: 4,
  },
  aboutCard: {
    backgroundColor: C.primarySoft,
    borderRadius: 22,
    padding: 18,
    borderWidth: 1,
    borderColor: C.border,
    gap: 6,
  },
  aboutTitle: {
    fontSize: 17,
    fontFamily: Fonts.displaySemiBold,
    color: C.textPrimary,
  },
  aboutBody: {
    fontSize: 14,
    lineHeight: 22,
    fontFamily: Fonts.sans,
    color: C.textSecondary,
  },
  aboutDivider: {
    height: 1,
    backgroundColor: C.border,
    marginVertical: 4,
  },
  aboutMetaRow: {
    gap: 3,
  },
  aboutMetaLabel: {
    fontSize: 11,
    fontFamily: Fonts.sansSemiBold,
    color: C.secondary,
    textTransform: 'uppercase',
    letterSpacing: 0.7,
  },
  aboutMetaValue: {
    fontSize: 14,
    lineHeight: 22,
    fontFamily: Fonts.sans,
    color: C.textSecondary,
  },
  objectiveRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    marginTop: 6,
  },
  objectiveNum: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: C.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
    marginTop: 1,
  },
  objectiveNumText: {
    fontSize: 11,
    fontFamily: Fonts.sansBold,
    color: C.secondary,
  },
  objectiveText: {
    flex: 1,
    fontSize: 14,
    lineHeight: 22,
    fontFamily: Fonts.sans,
    color: C.textSecondary,
  },
  infoCard: {
    backgroundColor: C.surface,
    borderRadius: 22,
    padding: 18,
    borderWidth: 1,
    borderColor: C.border,
    gap: 12,
  },
  infoTitle: {
    flex: 1,
    fontSize: 18,
    lineHeight: 24,
    fontFamily: Fonts.displaySemiBold,
    color: C.textPrimary,
  },
  infoTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  infoTitleIcon: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: C.primarySoft,
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
    backgroundColor: C.accentSoft,
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
  contactLink: {
    color: C.secondary,
    textDecorationLine: 'underline',
  },
  placeholderText: {
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
  buttonRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 4,
  },
  secondaryBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: C.border,
    backgroundColor: C.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryBtnText: {
    fontSize: 13,
    fontFamily: Fonts.sansSemiBold,
    color: C.textPrimary,
  },
  brassBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 14,
    backgroundColor: '#8C6A1F',
    alignItems: 'center',
    justifyContent: 'center',
  },
  brassBtnDisabled: {
    backgroundColor: '#C4B89A',
  },
  brassBtnText: {
    fontSize: 13,
    fontFamily: Fonts.sansBold,
    color: '#FFFFFF',
  },
  pressed: {
    opacity: 0.92,
  },
});

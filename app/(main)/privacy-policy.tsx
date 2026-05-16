import { Fonts } from '@/constants/theme';
import { FontAwesome6 } from '@expo/vector-icons';
import { router } from 'expo-router';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const C = {
  bg: '#F8FAFD',
  surface: '#FFFFFF',
  primary: '#14213A',
  secondary: '#2A3F66',
  textPrimary: '#14213A',
  textSecondary: '#4A5468',
  textMuted: '#6B7689',
  border: '#E3E9F2',
};

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      <Text style={styles.sectionBody}>{children}</Text>
    </View>
  );
}

export default function PrivacyPolicyScreen() {
  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
      <ScrollView style={styles.scroll} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} hitSlop={8}>
            <FontAwesome6 name="arrow-left" size={16} color={C.primary} />
          </TouchableOpacity>
        </View>

        <View style={styles.hero}>
          <Text style={styles.eyebrow}>Legal</Text>
          <Text style={styles.title}>Privacy Policy</Text>
          <Text style={styles.updated}>Last updated: May 13, 2026</Text>
        </View>

        <View style={styles.card}>
          <Section title="1. Information We Collect">
            When you use the GIAC app, we collect information you provide directly:{'\n\n'}
            • Full name, email address, and phone number{'\n'}
            • WhatsApp number, location, and occupation{'\n'}
            • Education level, area of study, and organisation{'\n'}
            • Payment transaction references and receipt links{'\n'}
            • Assignment submissions, test responses, and course progress
          </Section>

          <View style={styles.divider} />

          <Section title="2. How We Use Your Information">
            We use your information to:{'\n\n'}
            • Process your course enrolment application{'\n'}
            • Communicate updates about your application and courses{'\n'}
            • Issue certificates upon course completion{'\n'}
            • Provide customer support
          </Section>

          <View style={styles.divider} />

          <Section title="3. Data Storage">
            Your data is stored securely using Google Firebase, hosted on Google's servers. We do not sell or share your personal information with third parties.
          </Section>

          <View style={styles.divider} />

          <Section title="4. Google Sign-In">
            You may sign in using your Google account. We only access your name and email address through Google Sign-In.
          </Section>

          <View style={styles.divider} />

          <Section title="5. Account Deletion">
            You can request account deletion at any time from the app under Settings → Delete Account. Your data will be permanently removed within 30 days of the request being approved.
          </Section>

          <View style={styles.divider} />

          <Section title="6. Contact Us">
            For privacy questions, contact us at:{'\n'}
            globalinstituteofadrcenter@gmail.com{'\n'}
            +233 24 687 2805
          </Section>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.bg },
  scroll: { flex: 1 },
  content: { padding: 20, gap: 20, paddingBottom: 60 },

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
  title: { fontSize: 34, lineHeight: 40, fontFamily: Fonts.displayBold, color: C.textPrimary },
  updated: { fontSize: 13, fontFamily: Fonts.sans, color: C.textMuted },

  card: {
    backgroundColor: C.surface, borderRadius: 20,
    borderWidth: 1, borderColor: C.border,
    padding: 20, gap: 16,
  },
  divider: { height: 1, backgroundColor: C.border },

  section: { gap: 8 },
  sectionTitle: { fontSize: 15, fontFamily: Fonts.sansBold, color: C.textPrimary },
  sectionBody: { fontSize: 14, lineHeight: 22, fontFamily: Fonts.sans, color: C.textSecondary },
});

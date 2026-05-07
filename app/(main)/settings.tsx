import AsyncStorage from '@react-native-async-storage/async-storage';
import { Fonts } from '@/constants/theme';
import { auth } from '@/services/firebase';
import { FontAwesome6 } from '@expo/vector-icons';
import { router } from 'expo-router';
import { sendPasswordResetEmail } from 'firebase/auth';
import React, { useEffect, useState } from 'react';
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const C = {
  bg: '#F8FAFD',
  surface: '#FFFFFF',
  surfaceAlt: '#F2F5FA',
  primary: '#14213A',
  secondary: '#2A3F66',
  danger: '#7A2E2E',
  dangerSoft: '#F9EFEC',
  textPrimary: '#14213A',
  textSecondary: '#4A5468',
  textMuted: '#6B7689',
  border: '#E3E9F2',
};

const STORAGE_KEY_NOTIFICATIONS = '@giac:notifications_enabled';
const APP_VERSION = '1.0.0';

function SettingRow({
  icon,
  title,
  subtitle,
  onPress,
  danger,
  right,
}: {
  icon: React.ComponentProps<typeof FontAwesome6>['name'];
  title: string;
  subtitle?: string;
  onPress?: () => void;
  danger?: boolean;
  right?: React.ReactNode;
}) {
  const content = (
    <View style={[styles.settingRow, danger && styles.settingRowDanger]}>
      <View style={[styles.settingIcon, danger && styles.settingIconDanger]}>
        <FontAwesome6 name={icon} size={14} color={danger ? C.danger : C.secondary} />
      </View>
      <View style={styles.settingBody}>
        <Text style={[styles.settingTitle, danger && styles.settingTitleDanger]}>{title}</Text>
        {subtitle ? <Text style={styles.settingSubtitle}>{subtitle}</Text> : null}
      </View>
      {right ?? (
        onPress ? <FontAwesome6 name="angle-right" size={14} color={danger ? C.danger : C.textMuted} /> : null
      )}
    </View>
  );

  if (!onPress) return content;

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [pressed && styles.pressed]}
    >
      {content}
    </Pressable>
  );
}

export default function SettingsScreen() {
  const user = auth.currentUser;
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY_NOTIFICATIONS).then((val) => {
      if (val !== null) setNotificationsEnabled(val === 'true');
    });
  }, []);

  const toggleNotifications = async (value: boolean) => {
    setNotificationsEnabled(value);
    await AsyncStorage.setItem(STORAGE_KEY_NOTIFICATIONS, value ? 'true' : 'false');
  };

  const handleChangePassword = async () => {
    if (!user?.email) {
      Alert.alert('No email', 'Your account does not have an email address.');
      return;
    }
    Alert.alert(
      'Reset Password',
      `A password reset link will be sent to ${user.email}. Continue?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Send link',
          onPress: async () => {
            try {
              await sendPasswordResetEmail(auth, user.email!);
              Alert.alert('Email sent', 'Check your inbox for the password reset link.');
            } catch {
              Alert.alert('Error', 'Could not send the reset email. Please try again.');
            }
          },
        },
      ]
    );
  };

  const handleDeleteAccount = () => {
    Alert.alert(
      'Delete Account',
      'This will permanently delete your account and all associated data. This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            Alert.alert(
              'Contact Support',
              'Please contact support@giacghana.com to request account deletion.',
              [{ text: 'OK' }]
            );
          },
        },
      ]
    );
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} hitSlop={8}>
            <FontAwesome6 name="arrow-left" size={16} color={C.primary} />
          </TouchableOpacity>
        </View>

        <View style={styles.hero}>
          <Text style={styles.eyebrow}>Preferences</Text>
          <Text style={styles.title}>Settings</Text>
          <Text style={styles.subtitle}>Manage your notifications and account preferences.</Text>
        </View>

        {/* Notifications */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Notifications</Text>
          <View style={styles.card}>
            <SettingRow
              icon="bell"
              title="Push Notifications"
              subtitle="Receive updates about your applications and announcements."
              right={
                <Switch
                  value={notificationsEnabled}
                  onValueChange={toggleNotifications}
                  trackColor={{ false: C.border, true: '#E8ECF4' }}
                  thumbColor={notificationsEnabled ? C.secondary : '#FFFFFF'}
                />
              }
            />
          </View>
        </View>

        {/* Account */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Account</Text>
          <View style={styles.card}>
            <SettingRow
              icon="user-pen"
              title="Edit Profile"
              subtitle="Update your name and phone number."
              onPress={() => router.push('/(main)/edit-profile')}
            />
            <View style={styles.cardDivider} />
            <SettingRow
              icon="key"
              title="Change Password"
              subtitle="Send a reset link to your email address."
              onPress={handleChangePassword}
            />
            {user?.email ? (
              <>
                <View style={styles.cardDivider} />
                <View style={styles.settingRow}>
                  <View style={styles.settingIcon}>
                    <FontAwesome6 name="envelope" size={14} color={C.secondary} />
                  </View>
                  <View style={styles.settingBody}>
                    <Text style={styles.settingTitle}>Email</Text>
                    <Text style={styles.settingSubtitle}>{user.email}</Text>
                  </View>
                </View>
              </>
            ) : null}
          </View>
        </View>

        {/* About */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>About</Text>
          <View style={styles.card}>
            <View style={styles.settingRow}>
              <View style={styles.settingIcon}>
                <FontAwesome6 name="circle-info" size={14} color={C.secondary} />
              </View>
              <View style={styles.settingBody}>
                <Text style={styles.settingTitle}>App Version</Text>
                <Text style={styles.settingSubtitle}>GIAC v{APP_VERSION}</Text>
              </View>
            </View>
            <View style={styles.cardDivider} />
            <View style={styles.settingRow}>
              <View style={styles.settingIcon}>
                <FontAwesome6 name="building-columns" size={14} color={C.secondary} />
              </View>
              <View style={styles.settingBody}>
                <Text style={styles.settingTitle}>Organisation</Text>
                <Text style={styles.settingSubtitle}>Global Institute of ADR Center</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Danger zone */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Danger Zone</Text>
          <View style={styles.card}>
            <SettingRow
              icon="trash"
              title="Delete Account"
              subtitle="Permanently remove your account and all data."
              onPress={handleDeleteAccount}
              danger
            />
          </View>
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
  subtitle: { fontSize: 15, lineHeight: 24, fontFamily: Fonts.sans, color: C.textSecondary },

  section: { gap: 8 },
  sectionLabel: { fontSize: 13, fontFamily: Fonts.sansSemiBold, color: C.textMuted, paddingLeft: 4 },
  card: {
    backgroundColor: C.surface, borderRadius: 20, borderWidth: 1, borderColor: C.border,
    overflow: 'hidden',
  },
  cardDivider: { height: 1, backgroundColor: C.border, marginLeft: 64 },

  settingRow: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    paddingHorizontal: 16, paddingVertical: 14,
  },
  settingRowDanger: {},
  settingIcon: {
    width: 36, height: 36, borderRadius: 18, backgroundColor: '#EEF2F7',
    alignItems: 'center', justifyContent: 'center',
  },
  settingIconDanger: { backgroundColor: C.dangerSoft },
  settingBody: { flex: 1, gap: 2 },
  settingTitle: { fontSize: 14, fontFamily: Fonts.sansSemiBold, color: C.textPrimary },
  settingTitleDanger: { color: C.danger },
  settingSubtitle: { fontSize: 12, lineHeight: 18, fontFamily: Fonts.sans, color: C.textMuted },

  pressed: { opacity: 0.92 },
});

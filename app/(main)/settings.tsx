import AsyncStorage from '@react-native-async-storage/async-storage';
import { Fonts } from '@/constants/theme';
import { getDisplayRole } from '@/services/access';
import { getUserProfile, logOut, resetPassword, sendVerificationEmail, UserProfile } from '@/services/auth';
import { auth } from '@/services/firebase';
import { onAuthStateChanged, User } from 'firebase/auth';
import {
  createAccountDeletionRequest,
  getUserApplications,
  getUserServices,
  hasPendingAccountDeletionRequest,
  type Application,
  type Service,
} from '@/services/firestore';
import { FontAwesome6 } from '@expo/vector-icons';
import { router } from 'expo-router';
import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Linking,
  Platform,
  Pressable,
  ScrollView,
  Share,
  StyleSheet,
  Switch,
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
  primary: '#14213A',
  secondary: '#2A3F66',
  success: '#2D6A4F',
  successSoft: '#E8F2EE',
  danger: '#7A2E2E',
  dangerSoft: '#F9EFEC',
  textPrimary: '#14213A',
  textSecondary: '#4A5468',
  textMuted: '#6B7689',
  border: '#E3E9F2',
};

function Banner({ banner, onDismiss }: { banner: { text: string; kind: 'success' | 'error' }; onDismiss: () => void }) {
  useEffect(() => {
    const t = setTimeout(onDismiss, 4000);
    return () => clearTimeout(t);
  }, [banner, onDismiss]);

  const isSuccess = banner.kind === 'success';
  return (
    <Pressable
      onPress={onDismiss}
      style={[
        styles.banner,
        { backgroundColor: isSuccess ? C.successSoft : C.dangerSoft, borderColor: isSuccess ? '#A8D5C0' : '#E8B8B8' },
      ]}
    >
      <FontAwesome6
        name={isSuccess ? 'circle-check' : 'circle-xmark'}
        size={15}
        color={isSuccess ? C.success : C.danger}
      />
      <Text style={[styles.bannerText, { color: isSuccess ? C.success : C.danger }]}>{banner.text}</Text>
    </Pressable>
  );
}

const STORAGE_KEY_NOTIFICATIONS = '@giac:notifications_enabled';
const STORAGE_KEY_ONBOARDED = '@giac:onboarded';
const APP_VERSION = '1.0.0';
const SUPPORT_EMAIL = 'globalinstituteofadrcenter@gmail.com';
const SUPPORT_PHONE = '+233246872805';
const SUPPORT_PHONE_DISPLAY = '+233 24 687 2805';
const WEBSITE_URL = 'https://www.giacghana.com';

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
  const [user, setUser] = useState<User | null>(auth.currentUser);
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [applications, setApplications] = useState<Application[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [banner, setBanner] = useState<{ text: string; kind: 'success' | 'error' } | null>(null);
  const [deleteConfirming, setDeleteConfirming] = useState(false);
  const [deleteReason, setDeleteReason] = useState('');
  const [deleteBusy, setDeleteBusy] = useState(false);
  const [clearConfirming, setClearConfirming] = useState(false);
  const [logoutConfirming, setLogoutConfirming] = useState(false);
  const [passwordResetSent, setPasswordResetSent] = useState(false);
  const [verifyEmailSent, setVerifyEmailSent] = useState(false);

  const showBanner = (text: string, kind: 'success' | 'error') => setBanner({ text, kind });

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => {
      setUser(u);
      u?.reload().then(() => setUser(auth.currentUser)).catch(() => {});
    });
    return unsub;
  }, []);

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY_NOTIFICATIONS).then((val) => {
      if (val !== null) setNotificationsEnabled(val === 'true');
    });
  }, []);

  useEffect(() => {
    let active = true;

    async function loadProfileContext() {
      if (!user?.uid) return;
      try {
        const [profileData, applicationData, serviceData] = await Promise.all([
          getUserProfile(user.uid),
          getUserApplications(user.uid),
          getUserServices(user.uid),
        ]);
        if (!active) return;
        setProfile(profileData);
        setApplications(applicationData ?? []);
        setServices(serviceData ?? []);
      } catch {
        if (!active) return;
        setProfile(null);
        setApplications([]);
        setServices([]);
      }
    }

    loadProfileContext();
    return () => {
      active = false;
    };
  }, [user?.uid]);

  const displayRole = useMemo(
    () => getDisplayRole({ applications, profileRole: profile?.role, services }),
    [applications, profile?.role, services]
  );

  const displayName = useMemo(() => {
    if (profile?.fullName?.trim()) return profile.fullName.trim();
    if (user?.displayName?.trim()) return user.displayName.trim();
    return 'GIAC Member';
  }, [profile?.fullName, user?.displayName]);

  const toggleNotifications = async (value: boolean) => {
    const previousValue = notificationsEnabled;
    setNotificationsEnabled(value);
    try {
      await AsyncStorage.setItem(STORAGE_KEY_NOTIFICATIONS, value ? 'true' : 'false');
    } catch {
      setNotificationsEnabled(previousValue);
      showBanner('Could not update your notification preference right now.', 'error');
    }
  };

  const handleChangePassword = async () => {
    const currentUser = auth.currentUser;
    const email = currentUser?.email;
    if (!email) {
      showBanner('Your account does not have an email address.', 'error');
      return;
    }
    try {
      await resetPassword(email);
      setPasswordResetSent(true);
      setTimeout(() => setPasswordResetSent(false), 60000);
      showBanner(`Reset link sent to ${email} — check your inbox and spam folder.`, 'success');
    } catch (err: any) {
      const msg =
        err?.code === 'auth/too-many-requests'
          ? 'Too many requests. Wait a few minutes before trying again.'
          : err?.code === 'auth/invalid-email'
          ? 'The email address on your account appears invalid.'
          : 'Could not send the reset email. Please try again.';
      showBanner(msg, 'error');
    }
  };

  const handleVerifyEmail = async () => {
    if (!user) return;
    try {
      await sendVerificationEmail();
      setVerifyEmailSent(true);
      setTimeout(() => setVerifyEmailSent(false), 60000);
      showBanner(`Verification email sent — check your inbox and spam folder.`, 'success');
    } catch (err: any) {
      const msg =
        err?.code === 'auth/too-many-requests'
          ? 'Too many requests. Wait a few minutes before trying again.'
          : err?.code === 'auth/requires-recent-login'
          ? 'Please sign out and sign back in, then try again.'
          : 'Could not send the verification email. Please try again.';
      showBanner(msg, 'error');
    }
  };

  const handleOpenWebsite = async () => {
    try {
      const supported = await Linking.canOpenURL(WEBSITE_URL);
      if (!supported) {
        showBanner(`Visit ${WEBSITE_URL} in your browser.`, 'error');
        return;
      }
      await Linking.openURL(WEBSITE_URL);
    } catch {
      showBanner(`Visit ${WEBSITE_URL} in your browser.`, 'error');
    }
  };

  const handleContactEmail = async () => {
    const emailUrl = `mailto:${SUPPORT_EMAIL}`;
    try {
      const supported = await Linking.canOpenURL(emailUrl);
      if (!supported) {
        showBanner(`Email us at ${SUPPORT_EMAIL}`, 'error');
        return;
      }
      await Linking.openURL(emailUrl);
    } catch {
      showBanner(`Email us at ${SUPPORT_EMAIL}`, 'error');
    }
  };

  const handleCallSupport = async () => {
    const callUrl = `tel:${SUPPORT_PHONE}`;
    try {
      const supported = await Linking.canOpenURL(callUrl);
      if (!supported) {
        showBanner(`Call us at ${SUPPORT_PHONE_DISPLAY}`, 'error');
        return;
      }
      await Linking.openURL(callUrl);
    } catch {
      showBanner(`Call us at ${SUPPORT_PHONE_DISPLAY}`, 'error');
    }
  };

  const handleShareApp = async () => {
    try {
      await Share.share({
        message: 'Explore GIAC for ADR training, applications, and mediation services: https://www.giacghana.com',
      });
    } catch {
      showBanner('Share this link: https://www.giacghana.com', 'error');
    }
  };

  const handleClearPreferences = () => {
    setClearConfirming(true);
  };

  const confirmClearPreferences = async () => {
    try {
      await AsyncStorage.multiRemove([STORAGE_KEY_NOTIFICATIONS, STORAGE_KEY_ONBOARDED]);
      setNotificationsEnabled(true);
      setClearConfirming(false);
      showBanner('Local settings restored to default.', 'success');
    } catch {
      setClearConfirming(false);
      showBanner('Could not reset local preferences.', 'error');
    }
  };

  const handleLogout = () => {
    setLogoutConfirming(true);
  };

  const confirmLogout = async () => {
    try {
      await logOut();
      router.replace('/(auth)/login');
    } catch {
      setLogoutConfirming(false);
      showBanner('Logout failed. Please try again.', 'error');
    }
  };

  const handleDeleteAccount = () => {
    const currentUser = auth.currentUser;
    if (!currentUser?.uid || !currentUser.email) {
      showBanner('You must be signed in with a valid email to request deletion.', 'error');
      return;
    }
    setDeleteConfirming(true);
    setDeleteReason('');
  };

  const confirmDeleteAccount = async () => {
    if (!deleteReason.trim()) {
      showBanner('Please state your reason before sending the request.', 'error');
      return;
    }
    const currentUser = auth.currentUser;
    if (!currentUser?.uid || !currentUser.email) return;
    setDeleteBusy(true);
    try {
      const pending = await hasPendingAccountDeletionRequest(currentUser.uid);
      if (pending) {
        showBanner('A deletion request is already pending. Admin will review it.', 'error');
        setDeleteConfirming(false);
        return;
      }
      await createAccountDeletionRequest({
        userId: currentUser.uid,
        email: currentUser.email,
        fullName: profile?.fullName || currentUser.displayName || '',
        role: displayRole,
        reason: deleteReason.trim(),
      });
      setDeleteConfirming(false);
      setDeleteReason('');
      showBanner('Deletion request sent. Admin will review it.', 'success');
    } catch {
      showBanner('Could not send your deletion request. Please try again.', 'error');
    } finally {
      setDeleteBusy(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
      <KeyboardAvoidingView
        style={styles.safe}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 20 : 0}
      >
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
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

        {banner ? <Banner banner={banner} onDismiss={() => setBanner(null)} /> : null}

        <View style={styles.profileBanner}>
          <View style={styles.profileBadge}>
            <Text style={styles.profileBadgeText}>{displayName.slice(0, 1).toUpperCase()}</Text>
          </View>
          <View style={styles.profileBannerBody}>
            <Text style={styles.profileBannerTitle}>{displayName}</Text>
            <Text style={styles.profileBannerSubtitle}>{user?.email || 'No email available'}</Text>
          </View>
          <View style={styles.roleChip}>
            <Text style={styles.roleChipText}>{displayRole}</Text>
          </View>
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
            <View style={styles.cardDivider} />
            <SettingRow
              icon="inbox"
              title="Open Notifications"
              subtitle="View announcements, grades, and personal updates."
              onPress={() => router.push('/(main)/notifications')}
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
              icon={passwordResetSent ? 'circle-check' : 'key'}
              title="Change Password"
              subtitle={passwordResetSent ? 'Email sent — check your inbox and spam folder.' : 'Send a reset link to your email address.'}
              onPress={passwordResetSent ? undefined : handleChangePassword}
            />
            <View style={styles.cardDivider} />
            <SettingRow
              icon={user?.emailVerified ? 'badge-check' : verifyEmailSent ? 'circle-check' : 'envelope-circle-check'}
              title={user?.emailVerified ? 'Email Verified' : 'Verify Email'}
              subtitle={
                user?.emailVerified
                  ? 'Your email address has already been verified.'
                  : verifyEmailSent
                  ? 'Email sent — check your inbox and spam folder.'
                  : 'Send a verification email to secure your account.'
              }
              onPress={user?.emailVerified || verifyEmailSent ? undefined : handleVerifyEmail}
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
            {profile?.phone ? (
              <>
                <View style={styles.cardDivider} />
                <View style={styles.settingRow}>
                  <View style={styles.settingIcon}>
                    <FontAwesome6 name="phone" size={14} color={C.secondary} />
                  </View>
                  <View style={styles.settingBody}>
                    <Text style={styles.settingTitle}>Phone</Text>
                    <Text style={styles.settingSubtitle}>{profile.phone}</Text>
                  </View>
                </View>
              </>
            ) : null}
            {profile?.role === 'admin' ? (
              <>
                <View style={styles.cardDivider} />
                <SettingRow
                  icon="shield-halved"
                  title="Operations Workspace"
                  subtitle="Open admin tools for applications, cases, and announcements."
                  onPress={() => router.push('/(main)/operations')}
                />
              </>
            ) : null}
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Support</Text>
          <View style={styles.card}>
            <SettingRow
              icon="globe"
              title="Visit Website"
              subtitle="Open the GIAC website for programmes, admissions, and updates."
              onPress={handleOpenWebsite}
            />
            <View style={styles.cardDivider} />
            <SettingRow
              icon="envelope"
              title="Email Support"
              subtitle={SUPPORT_EMAIL}
              onPress={handleContactEmail}
            />
            <View style={styles.cardDivider} />
            <SettingRow
              icon="phone"
              title="Call GIAC"
              subtitle={SUPPORT_PHONE_DISPLAY}
              onPress={handleCallSupport}
            />
            <View style={styles.cardDivider} />
            <SettingRow
              icon="share-nodes"
              title="Share GIAC"
              subtitle="Send the GIAC website to someone else."
              onPress={handleShareApp}
            />
          </View>
        </View>

        {/* About */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>About</Text>
          <View style={styles.card}>
            <SettingRow
              icon="shield"
              title="Privacy Policy"
              subtitle="How we collect, use, and protect your data."
              onPress={() => router.push('/(main)/privacy-policy')}
            />
            <View style={styles.cardDivider} />
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
            {user?.uid ? (
              <>
                <View style={styles.cardDivider} />
                <View style={styles.settingRow}>
                  <View style={styles.settingIcon}>
                    <FontAwesome6 name="fingerprint" size={14} color={C.secondary} />
                  </View>
                  <View style={styles.settingBody}>
                    <Text style={styles.settingTitle}>Account ID</Text>
                    <Text style={styles.settingSubtitle}>{user.uid}</Text>
                  </View>
                </View>
              </>
            ) : null}
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Device Preferences</Text>
          <View style={styles.card}>
            <SettingRow
              icon="play"
              title="Preview Onboarding"
              subtitle="Replay the welcome screens shown to new users."
              onPress={() => router.push('/onboarding' as any)}
            />
            <View style={styles.cardDivider} />
            <SettingRow
              icon="rotate-left"
              title="Reset Local Preferences"
              subtitle="Restore settings on this device to their default values."
              onPress={clearConfirming ? undefined : handleClearPreferences}
            />
            {clearConfirming && (
              <View style={styles.inlineConfirm}>
                <Text style={styles.inlineConfirmText}>
                  This will restore notification preferences and onboarding state on this device.
                </Text>
                <View style={styles.inlineConfirmRow}>
                  <Pressable
                    onPress={() => setClearConfirming(false)}
                    style={({ pressed }) => [styles.inlineCancelBtn, pressed && styles.pressed]}
                  >
                    <Text style={styles.inlineCancelText}>Cancel</Text>
                  </Pressable>
                  <Pressable
                    onPress={confirmClearPreferences}
                    style={({ pressed }) => [styles.inlineConfirmBtn, pressed && styles.pressed]}
                  >
                    <Text style={styles.inlineConfirmBtnText}>Reset</Text>
                  </Pressable>
                </View>
              </View>
            )}
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Session</Text>
          <View style={styles.card}>
            <SettingRow
              icon="right-from-bracket"
              title="Logout"
              subtitle="Sign out of this device."
              onPress={logoutConfirming ? undefined : handleLogout}
            />
            {logoutConfirming && (
              <View style={styles.inlineConfirm}>
                <Text style={styles.inlineConfirmText}>
                  Are you sure you want to sign out?
                </Text>
                <View style={styles.inlineConfirmRow}>
                  <Pressable
                    onPress={() => setLogoutConfirming(false)}
                    style={({ pressed }) => [styles.inlineCancelBtn, pressed && styles.pressed]}
                  >
                    <Text style={styles.inlineCancelText}>Cancel</Text>
                  </Pressable>
                  <Pressable
                    onPress={confirmLogout}
                    style={({ pressed }) => [styles.inlineConfirmBtn, styles.inlineConfirmBtnDanger, pressed && styles.pressed]}
                  >
                    <Text style={styles.inlineConfirmBtnText}>Sign out</Text>
                  </Pressable>
                </View>
              </View>
            )}
          </View>
        </View>

        {/* Danger zone */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Danger Zone</Text>
          <View style={styles.card}>
            <SettingRow
              icon="trash"
              title="Delete Account"
              subtitle="Request admin review for account deletion."
              onPress={deleteConfirming ? undefined : handleDeleteAccount}
              danger
            />
            {deleteConfirming && (
              <View style={styles.deletePanel}>
                <Text style={styles.deletePanelTitle}>Confirm deletion request</Text>
                <Text style={styles.deletePanelBody}>
                  Admin will review your request before any deletion happens. Please state your reason below.
                </Text>
                <TextInput
                  value={deleteReason}
                  onChangeText={setDeleteReason}
                  placeholder="Why do you want to delete your account?"
                  placeholderTextColor={C.textMuted}
                  multiline
                  editable={!deleteBusy}
                  style={styles.deleteReasonInput}
                  textAlignVertical="top"
                />
                <View style={styles.deletePanelRow}>
                  <Pressable
                    onPress={() => setDeleteConfirming(false)}
                    disabled={deleteBusy}
                    style={({ pressed }) => [styles.deleteCancelBtn, pressed && styles.pressed]}
                  >
                    <Text style={styles.deleteCancelText}>Cancel</Text>
                  </Pressable>
                  <Pressable
                    onPress={confirmDeleteAccount}
                    disabled={deleteBusy}
                    style={({ pressed }) => [styles.deleteConfirmBtn, (pressed || deleteBusy) && styles.pressed]}
                  >
                    {deleteBusy
                      ? <ActivityIndicator size="small" color="#fff" />
                      : <Text style={styles.deleteConfirmText}>Yes, send request</Text>
                    }
                  </Pressable>
                </View>
              </View>
            )}
          </View>
        </View>
        </ScrollView>
      </KeyboardAvoidingView>
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
  profileBanner: {
    backgroundColor: C.surface,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: C.border,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  profileBadge: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: C.surfaceAlt,
    alignItems: 'center',
    justifyContent: 'center',
  },
  profileBadgeText: {
    fontSize: 18,
    fontFamily: Fonts.displaySemiBold,
    color: C.secondary,
  },
  profileBannerBody: {
    flex: 1,
    gap: 2,
  },
  profileBannerTitle: {
    fontSize: 16,
    fontFamily: Fonts.sansBold,
    color: C.textPrimary,
  },
  profileBannerSubtitle: {
    fontSize: 13,
    lineHeight: 20,
    fontFamily: Fonts.sans,
    color: C.textMuted,
  },
  roleChip: {
    borderRadius: 999,
    backgroundColor: C.surfaceAlt,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  roleChipText: {
    fontSize: 12,
    fontFamily: Fonts.sansSemiBold,
    color: C.secondary,
  },

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

  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderRadius: 14,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  bannerText: {
    flex: 1,
    fontSize: 14,
    fontFamily: Fonts.sansSemiBold,
    lineHeight: 20,
  },

  deletePanel: {
    backgroundColor: C.dangerSoft,
    borderTopWidth: 1,
    borderTopColor: '#E8B8B8',
    padding: 16,
    gap: 10,
  },
  deletePanelTitle: {
    fontSize: 14,
    fontFamily: Fonts.sansBold,
    color: C.danger,
  },
  deletePanelBody: {
    fontSize: 13,
    lineHeight: 20,
    fontFamily: Fonts.sans,
    color: C.textSecondary,
  },
  deletePanelRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 4,
  },
  deleteCancelBtn: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: C.border,
    backgroundColor: C.surface,
  },
  deleteCancelText: {
    fontSize: 13,
    fontFamily: Fonts.sansBold,
    color: C.textSecondary,
  },
  deleteConfirmBtn: {
    flex: 2,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
    backgroundColor: C.danger,
  },
  deleteConfirmText: {
    fontSize: 13,
    fontFamily: Fonts.sansBold,
    color: '#FFFFFF',
  },
  deleteReasonInput: {
    backgroundColor: C.surface,
    borderWidth: 1,
    borderColor: '#E8B8B8',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 13,
    fontFamily: Fonts.sans,
    color: C.textPrimary,
    minHeight: 80,
  },

  inlineConfirm: {
    borderTopWidth: 1,
    borderTopColor: C.border,
    backgroundColor: C.surfaceAlt,
    padding: 14,
    gap: 10,
  },
  inlineConfirmText: {
    fontSize: 13,
    lineHeight: 20,
    fontFamily: Fonts.sans,
    color: C.textSecondary,
  },
  inlineConfirmRow: {
    flexDirection: 'row',
    gap: 10,
  },
  inlineCancelBtn: {
    flex: 1,
    paddingVertical: 11,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: C.border,
    backgroundColor: C.surface,
  },
  inlineCancelText: {
    fontSize: 13,
    fontFamily: Fonts.sansBold,
    color: C.textSecondary,
  },
  inlineConfirmBtn: {
    flex: 1,
    paddingVertical: 11,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 10,
    backgroundColor: C.secondary,
  },
  inlineConfirmBtnDanger: {
    backgroundColor: C.danger,
  },
  inlineConfirmBtnText: {
    fontSize: 13,
    fontFamily: Fonts.sansBold,
    color: '#FFFFFF',
  },
});

import { Fonts } from '@/constants/theme';
import { getUserProfile, UserProfile } from '@/services/auth';
import { getDisplayRole } from '@/services/access';
import { auth } from '@/services/firebase';
import { Application, Service, getUserApplications, getUserServices } from '@/services/firestore';
import { FontAwesome6 } from '@expo/vector-icons';
import { router } from 'expo-router';
import React, { useEffect, useMemo, useState } from 'react';
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
  danger: '#7A2E2E',
  dangerSoft: '#F9EFEC',
  textPrimary: '#14213A',
  textSecondary: '#4A5468',
  textMuted: '#6B7689',
  border: '#E3E9F2',
};

function ProfileAction({
  icon,
  title,
  description,
  onPress,
  danger,
}: {
  icon: React.ComponentProps<typeof FontAwesome6>['name'];
  title: string;
  description: string;
  onPress: () => void;
  danger?: boolean;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.actionRow,
        danger ? styles.actionRowDanger : null,
        pressed ? styles.pressed : null,
      ]}
    >
      <View style={[styles.actionIcon, danger ? styles.actionIconDanger : null]}>
        <FontAwesome6
          name={icon}
          size={14}
          color={danger ? C.danger : C.secondary}
        />
      </View>
      <View style={styles.actionBody}>
        <Text style={[styles.actionTitle, danger ? styles.actionTitleDanger : null]}>
          {title}
        </Text>
        <Text style={styles.actionDescription}>{description}</Text>
      </View>
      <FontAwesome6
        name="angle-right"
        size={14}
        color={danger ? C.danger : C.textMuted}
      />
    </Pressable>
  );
}

export default function ProfileScreen() {
  const user = auth.currentUser;
  const { width } = useWindowDimensions();
  const isCompact = width < 390;
  const horizontalPadding = width < 380 ? 16 : 20;

  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [applications, setApplications] = useState<Application[]>([]);
  const [services, setServices] = useState<Service[]>([]);

  useEffect(() => {
    let active = true;

    const loadProfile = async () => {
      if (!user?.uid) return;

      try {
        const [profileData, applicationData, serviceData] = await Promise.all([
          getUserProfile(user.uid),
          getUserApplications(user.uid),
          getUserServices(user.uid),
        ]);

        if (active) {
          setProfile(profileData);
          setApplications(applicationData ?? []);
          setServices(serviceData ?? []);
        }
      } catch {
        if (active) {
          setProfile(null);
        }
      }
    };

    loadProfile();

    return () => {
      active = false;
    };
  }, [user?.uid]);

  const displayName = useMemo(() => {
    if (profile?.fullName?.trim()) return profile.fullName.trim();
    if (user?.displayName?.trim()) return user.displayName.trim();
    if (user?.email?.trim()) return user.email.trim();
    return 'Guest';
  }, [profile?.fullName, user?.displayName, user?.email]);

  const displayEmail = profile?.email || user?.email || 'No email available';
  const displayRole = getDisplayRole({ applications, profileRole: profile?.role, services });

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
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>
              {displayName.slice(0, 1).toUpperCase()}
            </Text>
          </View>
          <Text style={[styles.heroTitle, isCompact ? styles.heroTitleCompact : null]}>
            {displayName}
          </Text>
          <Text style={styles.heroSubtitle}>{displayEmail}</Text>
          <View style={styles.rolePill}>
            <Text style={styles.rolePillText}>{displayRole}</Text>
          </View>
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Account</Text>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Name</Text>
            <Text style={styles.detailValue}>{displayName}</Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Email</Text>
            <Text style={styles.detailValue}>{displayEmail}</Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Current role</Text>
            <Text style={styles.detailValue}>{displayRole}</Text>
          </View>
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Settings</Text>
          <ProfileAction
            icon="user-pen"
            title="Edit Profile"
            description="Update your name and phone number."
            onPress={() => router.push('/(main)/edit-profile')}
          />
          <View style={styles.cardDivider} />
          <ProfileAction
            icon="gear"
            title="Settings"
            description="Notifications, password, and account preferences."
            onPress={() => router.push('/(main)/settings')}
          />
          {profile?.role === 'admin' && (
            <>
              <View style={styles.cardDivider} />
              <ProfileAction
                icon="shield-halved"
                title="Operations Workspace"
                description="Manage applications, announcements, and platform workflows."
                onPress={() => router.push('/(main)/operations')}
              />
            </>
          )}
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
    alignItems: 'center',
    gap: 8,
  },
  avatar: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: C.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: 28,
    fontFamily: Fonts.displayBold,
    color: C.secondary,
  },
  heroTitle: {
    fontSize: 32,
    lineHeight: 36,
    fontFamily: Fonts.displayBold,
    color: C.textPrimary,
    textAlign: 'center',
  },
  heroTitleCompact: {
    fontSize: 28,
    lineHeight: 32,
  },
  heroSubtitle: {
    fontSize: 15,
    lineHeight: 22,
    fontFamily: Fonts.sans,
    color: C.textSecondary,
    textAlign: 'center',
  },
  rolePill: {
    backgroundColor: C.surfaceAlt,
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 8,
    marginTop: 4,
  },
  rolePillText: {
    fontSize: 12,
    fontFamily: Fonts.sansSemiBold,
    color: C.secondary,
  },
  card: {
    backgroundColor: C.surface,
    borderRadius: 22,
    padding: 18,
    borderWidth: 1,
    borderColor: C.border,
    gap: 14,
  },
  sectionTitle: {
    fontSize: 18,
    fontFamily: Fonts.displaySemiBold,
    color: C.textPrimary,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 16,
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
  cardDivider: {
    height: 1,
    backgroundColor: C.border,
    marginVertical: 4,
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 6,
  },
  actionRowDanger: {
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: C.border,
  },
  actionIcon: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: C.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionIconDanger: {
    backgroundColor: C.dangerSoft,
  },
  actionBody: {
    flex: 1,
    gap: 2,
  },
  actionTitle: {
    fontSize: 15,
    fontFamily: Fonts.sansBold,
    color: C.textPrimary,
  },
  actionTitleDanger: {
    color: C.danger,
  },
  actionDescription: {
    fontSize: 13,
    lineHeight: 20,
    fontFamily: Fonts.sans,
    color: C.textSecondary,
  },
  pressed: {
    opacity: 0.92,
  },
});

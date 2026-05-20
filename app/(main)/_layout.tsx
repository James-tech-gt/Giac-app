import AsyncStorage from '@react-native-async-storage/async-storage';
import { Fonts } from '@/constants/theme';
import { getEffectiveRole } from '@/services/access';
import {
  Application,
  Service,
  subscribeUserApplications,
  subscribeUserServices,
} from '@/services/firestore';
import { useUserProfile } from '@/context/user-profile';
import { FontAwesome6 } from '@expo/vector-icons';
import { Tabs } from 'expo-router';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const appsKey = (uid: string) => `@giac:apps:${uid}`;
const svcsKey = (uid: string) => `@giac:svcs:${uid}`;

const C = {
  bg: '#F8FAFD',
  surface: '#FFFFFF',
  primary: '#1F2A44',
  secondary: '#2E4A8A',
  textMuted: '#7A7F73',
  border: '#E3E9F2',
};

export default function MainLayout() {
  const { width } = useWindowDimensions();
  const isCompact = width < 390;
  const insets = useSafeAreaInsets();
  const { profile, uid: currentUserId } = useUserProfile();
  const profileRole = profile?.role ?? null;
  const [applications, setApplications] = useState<Application[]>([]);
  const [services, setServices] = useState<Service[]>([]);

  useEffect(() => {
    if (!currentUserId) {
      setApplications([]);
      setServices([]);
      return;
    }

    // Load cached data first so tabs render correctly before Firestore responds
    AsyncStorage.getItem(appsKey(currentUserId))
      .then(raw => { if (raw) setApplications(JSON.parse(raw)); })
      .catch(() => {});
    AsyncStorage.getItem(svcsKey(currentUserId))
      .then(raw => { if (raw) setServices(JSON.parse(raw)); })
      .catch(() => {});

    const unsubscribeApplications = subscribeUserApplications(currentUserId, (apps) => {
      setApplications(apps);
      AsyncStorage.setItem(appsKey(currentUserId), JSON.stringify(apps)).catch(() => {});
    });
    const unsubscribeServices = subscribeUserServices(currentUserId, (svcs) => {
      setServices(svcs);
      AsyncStorage.setItem(svcsKey(currentUserId), JSON.stringify(svcs)).catch(() => {});
    });
    return () => {
      unsubscribeApplications();
      unsubscribeServices();
    };
  }, [currentUserId]);

  const resolvedRole = useMemo(
    () =>
      currentUserId
        ? getEffectiveRole({
            applications,
            profileRole,
            services,
          })
        : null,
    [applications, currentUserId, profileRole, services]
  );

  // Ratchet: once a role/tab is earned it never disappears mid-session.
  // Tabs vanishing and reappearing causes Expo Router to reset to the home tab.
  const resolvedRoleRef = useRef(resolvedRole);
  const hasServicesRef = useRef(services.length > 0);
  if (resolvedRole === 'admin' ||
      (resolvedRole === 'student' && resolvedRoleRef.current !== 'admin') ||
      (resolvedRole === 'client' && resolvedRoleRef.current !== 'admin' && resolvedRoleRef.current !== 'student') ||
      (resolvedRole === 'applicant' && resolvedRoleRef.current === null)) {
    resolvedRoleRef.current = resolvedRole;
  }
  if (services.length > 0) hasServicesRef.current = true;

  const isAdmin = resolvedRoleRef.current === 'admin';
  const isStudent = resolvedRoleRef.current === 'student';
  const hasServices = hasServicesRef.current;

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: C.surface,
          borderTopColor: C.border,
          height: (isCompact ? 64 : 72) + insets.bottom,
          paddingTop: isCompact ? 6 : 8,
          paddingBottom: (isCompact ? 6 : 10) + insets.bottom,
        },
        tabBarActiveTintColor: C.secondary,
        tabBarInactiveTintColor: C.textMuted,
        tabBarLabelStyle: {
          fontFamily: Fonts.sansSemiBold,
          fontSize: isCompact ? 10 : 11,
        },
        sceneStyle: {
          backgroundColor: C.bg,
        },
      }}
    >
      <Tabs.Screen
        name="home"
        options={{
          title: 'Home',
          tabBarIcon: ({ color, size }) => (
            <FontAwesome6 name="house" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="explore"
        options={{
          title: 'Explore',
          href: isAdmin || isStudent || hasServices ? null : '/(main)/explore',
          tabBarIcon: ({ color, size }) => (
            <FontAwesome6 name="compass" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="study"
        options={{
          title: 'Study',
          href: isStudent ? '/(main)/study' : null,
          tabBarIcon: ({ color, size }) => (
            <FontAwesome6 name="graduation-cap" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="cases"
        options={{
          title: 'My Cases',
          href: hasServices ? '/(main)/cases' : null,
          tabBarIcon: ({ color, size }) => (
            <FontAwesome6 name="scale-balanced" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="operations"
        options={{
          title: 'Operations',
          href: isAdmin ? '/(main)/operations' : null,
          tabBarIcon: ({ color, size }) => (
            <FontAwesome6 name="shield-halved" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ color, size }) => (
            <FontAwesome6 name="circle-user" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen name="application" options={{ href: null }} />
      <Tabs.Screen name="application-status" options={{ href: null }} />
      <Tabs.Screen name="course-details" options={{ href: null }} />
      <Tabs.Screen name="request-mediation" options={{ href: null }} />
      <Tabs.Screen name="courses" options={{ href: null }} />
      <Tabs.Screen name="apply" options={{ href: null }} />
      <Tabs.Screen name="services" options={{ href: null }} />
      <Tabs.Screen name="edit-profile" options={{ href: null }} />
      <Tabs.Screen name="settings" options={{ href: null }} />
      <Tabs.Screen name="notifications" options={{ href: null }} />
      <Tabs.Screen name="privacy-policy" options={{ href: null }} />
      <Tabs.Screen name="course-registration" options={{ href: null }} />
    </Tabs>
  );
}

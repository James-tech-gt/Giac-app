import { Fonts } from '@/constants/theme';
import { getUserProfile } from '@/services/auth';
import { UserRole, getEffectiveRole } from '@/services/access';
import { auth } from '@/services/firebase';
import {
  Application,
  Service,
  subscribeUserApplications,
  subscribeUserServices,
} from '@/services/firestore';
import { FontAwesome6 } from '@expo/vector-icons';
import { Tabs } from 'expo-router';
import { onAuthStateChanged } from 'firebase/auth';
import { useEffect, useMemo, useState } from 'react';
import { useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

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
  const [currentUserId, setCurrentUserId] = useState<string | null>(auth.currentUser?.uid ?? null);
  const [profileRole, setProfileRole] = useState<UserRole | null>(null);
  const [applications, setApplications] = useState<Application[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [roleReady, setRoleReady] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setCurrentUserId(user?.uid ?? null);
      if (!user?.uid) {
        setProfileRole(null);
        setApplications([]);
        setServices([]);
        setRoleReady(true);
      }
    });

    return unsubscribe;
  }, []);

  useEffect(() => {
    let active = true;

    if (!currentUserId) {
      return;
    }

    setRoleReady(false);

    const loadProfile = async () => {
      try {
        const profile = await getUserProfile(currentUserId);
        if (!active) return;
        setProfileRole(profile?.role ?? 'applicant');
      } catch {
        if (!active) return;
        setProfileRole('applicant');
      } finally {
        if (active) {
          setRoleReady(true);
        }
      }
    };

    loadProfile();

    const unsubscribeApplications = subscribeUserApplications(currentUserId, setApplications);
    const unsubscribeServices = subscribeUserServices(currentUserId, setServices);

    return () => {
      active = false;
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

  const isAdmin = resolvedRole === 'admin';
  const isStudent = resolvedRole === 'student';
  const hasServices = services.length > 0;

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
          href: roleReady ? (isAdmin || isStudent || hasServices ? null : '/(main)/explore') : null,
          tabBarIcon: ({ color, size }) => (
            <FontAwesome6 name="compass" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="study"
        options={{
          title: 'Study',
          href: roleReady && isStudent ? '/(main)/study' : null,
          tabBarIcon: ({ color, size }) => (
            <FontAwesome6 name="graduation-cap" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="cases"
        options={{
          title: 'My Cases',
          href: roleReady && hasServices ? '/(main)/cases' : null,
          tabBarIcon: ({ color, size }) => (
            <FontAwesome6 name="scale-balanced" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="operations"
        options={{
          title: 'Operations',
          href: roleReady && isAdmin ? '/(main)/operations' : null,
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
    </Tabs>
  );
}

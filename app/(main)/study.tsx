import { auth } from '@/services/firebase';
import { router } from 'expo-router';
import React, { useEffect } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

const C = {
  bg: '#F8FAFD',
  secondary: '#2E4A8A',
};

export default function StudyTabRedirect() {
  useEffect(() => {
    const target = auth.currentUser ? '/(student)/dashboard' : '/(auth)/login';
    const t = setTimeout(() => {
      router.replace(target as any);
    }, 0);

    return () => clearTimeout(t);
  }, []);

  return (
    <View style={styles.safe}>
      <ActivityIndicator color={C.secondary} />
    </View>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: C.bg,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

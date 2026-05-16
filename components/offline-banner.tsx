import { C, Fonts } from '@/constants/theme';
import { useNetworkStatus } from '@/hooks/use-network-status';
import { StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export function OfflineBanner() {
  const isConnected = useNetworkStatus();
  const insets = useSafeAreaInsets();

  if (isConnected) return null;

  return (
    <View style={[styles.banner, { paddingTop: insets.top + 8 }]}>
      <Text style={styles.text}>No internet connection</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    backgroundColor: C.danger,
    paddingBottom: 10,
    alignItems: 'center',
    zIndex: 9999,
  },
  text: {
    color: C.textInverse,
    fontFamily: Fonts.sansBold,
    fontSize: 13,
  },
});

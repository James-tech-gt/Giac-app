import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';

export default function CasesScreen() {
  return (
    <ThemedView style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
      <ThemedText type="title">Cases</ThemedText>
    </ThemedView>
  );
}

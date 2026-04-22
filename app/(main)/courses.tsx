import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';

export default function CoursesScreen() {
  return (
    <ThemedView style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
      <ThemedText type="title">Courses</ThemedText>
    </ThemedView>
  );
}

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { ScrollView, View } from 'react-native';

export default function CoursesScreen() {
  return (
    <ThemedView className="flex-1">
      <ScrollView className="flex-1" contentContainerClassName="grow">
        <View className="flex-1 px-4 py-6">
          <ThemedText className="text-2xl font-bold mb-6">Available Courses</ThemedText>
          <ThemedText className="text-base text-gray-600">
            Browse all GIAC training programs and certifications
          </ThemedText>
        </View>
      </ScrollView>
    </ThemedView>
  );
}

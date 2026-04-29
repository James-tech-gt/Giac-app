import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { ScrollView, View } from 'react-native';

export default function ApplyScreen() {
  return (
    <ThemedView className="flex-1">
      <ScrollView className="flex-1" contentContainerClassName="grow">
        <View className="flex-1 px-4 py-6">
          <ThemedText className="text-2xl font-bold mb-6">Apply for Program</ThemedText>
          <ThemedText className="text-base text-gray-600">
            Submit your application for GIAC training programs
          </ThemedText>
        </View>
      </ScrollView>
    </ThemedView>
  );
}

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { ScrollView, View } from 'react-native';

export default function ProfileScreen() {
  return (
    <ThemedView className="flex-1">
      <ScrollView className="flex-1" contentContainerClassName="grow">
        <View className="flex-1 px-4 py-6">
          <ThemedText className="text-2xl font-bold mb-6">Profile</ThemedText>
          <ThemedText className="text-base text-gray-600">
            View and manage your account information
          </ThemedText>
        </View>
      </ScrollView>
    </ThemedView>
  );
}

import { ScrollView, View, ViewProps } from 'react-native';
import { ThemedView } from './themed-view';

interface ResponsivePageProps extends ViewProps {
  children: React.ReactNode;
  scrollable?: boolean;
}

export function ResponsivePage({
  children,
  scrollable = true,
  className = 'flex-1',
  ...props
}: ResponsivePageProps) {
  const content = (
    <View className={`flex-1 px-4 py-6 ${className}`} {...props}>
      {children}
    </View>
  );

  if (!scrollable) {
    return (
      <ThemedView className="flex-1">
        {content}
      </ThemedView>
    );
  }

  return (
    <ThemedView className="flex-1">
      <ScrollView 
        className="flex-1" 
        contentContainerStyle={{ flexGrow: 1 }}
        scrollIndicatorInsets={{ right: 1 }}
      >
        {content}
      </ScrollView>
    </ThemedView>
  );
}

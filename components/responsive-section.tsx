import { View, ViewProps } from 'react-native';

interface ResponsiveSectionProps extends ViewProps {
  children: React.ReactNode;
  title?: string;
  spacing?: 'small' | 'medium' | 'large';
}

export function ResponsiveSection({
  children,
  spacing = 'medium',
  className = '',
  ...props
}: ResponsiveSectionProps) {
  const spacingMap = {
  small: 'mb-2 sm:mb-3 md:mb-4',      // Smaller on mobile, larger on bigger screens
  medium: 'mb-3 sm:mb-4 md:mb-6 lg:mb-8',
  large: 'mb-4 sm:mb-6 md:mb-8 lg:mb-10',
};

  return (
    <View className={`w-full ${spacingMap[spacing]} ${className}`} {...props}>
      {children}
    </View>
  );
}

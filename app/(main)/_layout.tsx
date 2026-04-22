import { Stack } from 'expo-router';

export default function MainLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: true,
      }}
    >
      <Stack.Screen 
        name="home" 
        options={{ title: 'Home' }}
      />
      <Stack.Screen 
        name="courses" 
        options={{ title: 'Courses' }}
      />
      <Stack.Screen 
        name="apply" 
        options={{ title: 'Apply' }}
      />
      <Stack.Screen 
        name="services" 
        options={{ title: 'Services' }}
      />
      <Stack.Screen 
        name="profile" 
        options={{ title: 'Profile' }}
      />
    </Stack>
  );
}

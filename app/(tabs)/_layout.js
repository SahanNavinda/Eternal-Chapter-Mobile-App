import { Tabs } from 'expo-router';

export default function TabLayout() {
  return (
    <Tabs screenOptions={{ headerShown: false }}>
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          // your icon settings...
        }}
      />
      <Tabs.Screen
        name="explore"
        options={{
          href: null, // THIS REMOVES IT FROM THE BOTTOM TABS
        }}
      />
    </Tabs>
  );
}
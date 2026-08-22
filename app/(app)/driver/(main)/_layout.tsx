import { Tabs } from 'expo-router';

import { useTabSlideScreenOptions } from '@/navigation/tabSlide';
import { BottomTabBar, type TabKey } from '@/ui/BottomTabBar';

function activeTab(name: string): TabKey {
  if (name === 'orders') {
    return 'orders';
  }
  if (name === 'profile') {
    return 'profile';
  }
  return 'home';
}

export default function DriverMainTabs() {
  const screenOptions = useTabSlideScreenOptions();

  return (
    <Tabs
      initialRouteName="index"
      backBehavior="none"
      screenOptions={screenOptions}
      tabBar={({ state, navigation }) => {
        const current = state.routes[state.index]?.name ?? 'index';
        return (
          <BottomTabBar
            role="driver"
            active={activeTab(current)}
            onSelect={(key) => {
              const name = key === 'orders' ? 'orders' : key === 'profile' ? 'profile' : 'index';
              if (name === current) {
                return;
              }
              navigation.navigate(name);
            }}
          />
        );
      }}
    >
      <Tabs.Screen name="index" />
      <Tabs.Screen name="orders" />
      <Tabs.Screen name="profile" />
    </Tabs>
  );
}

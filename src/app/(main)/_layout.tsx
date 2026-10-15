import React, { useEffect, useRef } from 'react';
import { AppState, AppStateStatus, Platform } from 'react-native';
import { Tabs, router } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuthStore } from '@core/auth/authStore';
import { COLORS } from '@core/config/theme';

type IconName = React.ComponentProps<typeof MaterialCommunityIcons>['name'];

const BACKGROUND_TIMEOUT_MS = 2 * 60 * 1000;
const TAB_ICON_SIZE = 22;

const tabIcon = (name: IconName) =>
  ({ color }: { color: string }) => (
    <MaterialCommunityIcons name={name} size={TAB_ICON_SIZE} color={color} />
  );

const MainLayout = () => {
  const { logout } = useAuthStore();
  const insets = useSafeAreaInsets();
  const backgroundTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const tabBottomPadding = Platform.OS === 'ios'
    ? Math.max(insets.bottom, 20)
    : Math.max(insets.bottom, 18);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (state: AppStateStatus) => {
      if (state === 'background' || state === 'inactive') {
        backgroundTimerRef.current = setTimeout(async () => {
          await logout();
          router.replace('/(auth)/login');
        }, BACKGROUND_TIMEOUT_MS);
        return;
      }
      if (state === 'active' && backgroundTimerRef.current) {
        clearTimeout(backgroundTimerRef.current);
        backgroundTimerRef.current = null;
      }
    });
    return () => {
      subscription.remove();
      if (backgroundTimerRef.current) clearTimeout(backgroundTimerRef.current);
    };
  }, [logout]);

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: COLORS.primary,
        tabBarInactiveTintColor: COLORS.textDisabled,
        tabBarHideOnKeyboard: true,
        tabBarStyle: {
          backgroundColor: COLORS.surface,
          borderTopWidth: 0.5,
          borderTopColor: COLORS.border,
          elevation: 12,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: -3 },
          shadowOpacity: 0.1,
          shadowRadius: 8,
          height: 60 + tabBottomPadding,
          paddingBottom: tabBottomPadding,
          paddingTop: 8,
        },
        tabBarItemStyle: {
          paddingVertical: 2,
        },
        tabBarLabelStyle: {
          fontSize: 10,
          fontWeight: '600',
        },
      }}
    >
      <Tabs.Screen
        name="home"
        options={{
          title: 'Accueil',
          tabBarIcon: tabIcon('home-outline'),
        }}
      />
      <Tabs.Screen
        name="commande"
        options={{
          title: 'Commande',
          tabBarIcon: tabIcon('cart-outline'),
        }}
      />
      <Tabs.Screen
        name="reception"
        options={{
          title: 'Reception',
          tabBarIcon: tabIcon('package-down'),
        }}
      />
      <Tabs.Screen
        name="inventaire"
        options={{
          title: 'Inventaire',
          tabBarIcon: tabIcon('clipboard-check-outline'),
        }}
      />
      <Tabs.Screen
        name="plus"
        options={{
          title: 'Plus',
          tabBarIcon: tabIcon('dots-horizontal-circle-outline'),
        }}
      />
      <Tabs.Screen name="sortie" options={{ href: null }} />
      <Tabs.Screen name="etiquettes" options={{ href: null }} />
      <Tabs.Screen name="prix/index" options={{ href: null }} />
      <Tabs.Screen name="activite" options={{ href: null }} />
      <Tabs.Screen name="admin" options={{ href: null }} />
    </Tabs>
  );
};

export default MainLayout;

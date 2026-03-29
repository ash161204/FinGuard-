import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { View, Text, StyleSheet } from 'react-native';
import { Feather } from '@expo/vector-icons';

import { FireScreen } from '../screens/FireScreen';
import { HomeScreen } from '../screens/HomeScreen';
import { MfScreen } from '../screens/MfScreen';
import { ProfileScreen } from '../screens/ProfileScreen';
import { TaxScreen } from '../screens/TaxScreen';
import { palette } from '../theme/tokens';
import type { MainTabParamList } from './types';

const Tab = createBottomTabNavigator<MainTabParamList>();

const tabConfig: Record<keyof MainTabParamList, { label: string; icon: keyof typeof Feather.glyphMap }> = {
  Home: { label: 'Pulse', icon: 'heart' },
  Tax: { label: 'Tax', icon: 'file-text' },
  MF: { label: 'MF', icon: 'pie-chart' },
  FIRE: { label: 'FIRE', icon: 'trending-up' },
  Profile: { label: 'Profile', icon: 'user' },
};

export function AppTabs() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: palette.accent,
        tabBarInactiveTintColor: palette.muted,
        tabBarStyle: {
          backgroundColor: palette.surface,
          borderTopColor: 'transparent',
          height: 90,
          paddingTop: 12,
          paddingBottom: 24,
          borderTopLeftRadius: 20,
          borderTopRightRadius: 20,
          position: 'absolute', // Ensures the radius curves overlap properly over the main container background
          shadowColor: '#1A1C1E',
          shadowOffset: { width: 0, height: -4 },
          shadowOpacity: 0.05,
          shadowRadius: 20,
          elevation: 10,
        },
        tabBarIcon: ({ color, focused }) => {
          const config = tabConfig[route.name];
          return (
            <View style={{ alignItems: 'center', justifyContent: 'center' }}>
              <Feather name={config.icon} size={24} color={color} />
              {focused && <View style={styles.activeDot} />}
            </View>
          );
        },
        tabBarLabel: ({ color, focused }) => (
          <Text
            style={{
              color,
              fontWeight: focused ? '700' : '600',
              fontSize: 11,
              marginTop: focused ? 6 : 4,
              letterSpacing: focused ? 0.4 : 0.2,
            }}
          >
            {tabConfig[route.name].label}
          </Text>
        ),
      })}
    >
      <Tab.Screen name="Home" component={HomeScreen} />
      <Tab.Screen name="Tax" component={TaxScreen} />
      <Tab.Screen name="MF" component={MfScreen} />
      <Tab.Screen name="FIRE" component={FireScreen} />
      <Tab.Screen name="Profile" component={ProfileScreen} />
    </Tab.Navigator>
  );
}

const styles = StyleSheet.create({
  activeDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: palette.accent,
    position: 'absolute',
    bottom: -10,
  },
});

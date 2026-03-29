import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { ActivityIndicator, View } from 'react-native';

import { AppTabs } from './AppTabs';
import { FeatureDetailScreen } from '../screens/FeatureDetailScreen';
import { OnboardingScreen } from '../screens/OnboardingScreen';
import { UploadScreen } from '../screens/UploadScreen';
import { useAppStore } from '../state/appStore';
import { palette } from '../theme/tokens';
import type { RootStackParamList } from './types';

const Stack = createNativeStackNavigator<RootStackParamList>();

export function RootNavigator() {
  const hasHydrated = useAppStore((state) => state.hasHydrated);
  const onboardingComplete = useAppStore((state) => state.onboardingComplete);

  if (!hasHydrated) {
    return (
      <View
        style={{
          flex: 1,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: palette.canvas,
        }}
      >
        <ActivityIndicator size="large" color={palette.accent} />
      </View>
    );
  }

  return (
    <Stack.Navigator initialRouteName={onboardingComplete ? 'MainTabs' : 'Onboarding'}>
      <Stack.Screen
        name="Onboarding"
        component={OnboardingScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen name="MainTabs" component={AppTabs} options={{ headerShown: false }} />
      <Stack.Screen name="Upload" component={UploadScreen} options={{ title: 'Upload' }} />
      <Stack.Screen
        name="FeatureDetail"
        component={FeatureDetailScreen}
        options={{ title: 'Detail' }}
      />
    </Stack.Navigator>
  );
}

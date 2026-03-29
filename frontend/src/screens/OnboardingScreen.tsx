import { StyleSheet, Text, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import { ScreenScaffold } from '../components/ScreenScaffold';
import { AppButton, Metric, SurfaceCard } from '../components/Ui';
import { useAppStore } from '../state/appStore';
import { palette, spacing } from '../theme/tokens';
import type { RootStackParamList } from '../navigation/types';

type Props = NativeStackScreenProps<RootStackParamList, 'Onboarding'>;

export function OnboardingScreen({ navigation }: Props) {
  const completeOnboarding = useAppStore((state) => state.completeOnboarding);

  return (
    <ScreenScaffold
      eyebrow="FinGuard"
      title="Financial health, not just more charts."
      subtitle="Upload Form 16 and CAMS, review extracted values, run deterministic analysis, and keep a local memory of score changes as you tighten the plan."
    >
      <SurfaceCard tone="soft">
        <Text style={styles.sectionTitle}>What opens first</Text>
        <View style={styles.metrics}>
          <Metric label="Tax Wizard" value="Review, rank, act" tone="accent" />
          <Metric label="MF X-Ray" value="Overlap + TER + drift" />
          <Metric label="FIRE" value="Deterministic yearly plan" />
        </View>
      </SurfaceCard>

      <SurfaceCard>
        <Text style={styles.sectionTitle}>How the app behaves</Text>
        <Text style={styles.copy}>
          The language model only structures documents. Every recommendation you see in the main
          experience comes from deterministic backend logic and the JavaScript rules engine.
        </Text>
      </SurfaceCard>

      <AppButton
        label="Enter app shell"
        onPress={() => {
          completeOnboarding();
          navigation.replace('MainTabs');
        }}
      />
    </ScreenScaffold>
  );
}

const styles = StyleSheet.create({
  sectionTitle: {
    color: palette.text,
    fontWeight: '700',
    fontSize: 18,
  },
  metrics: {
    gap: spacing.md,
    marginTop: spacing.sm,
  },
  copy: {
    color: palette.muted,
    lineHeight: 22,
    marginTop: spacing.sm,
  },
});

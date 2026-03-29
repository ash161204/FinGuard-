import { StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Feather } from '@expo/vector-icons';

import { ScreenScaffold } from '../components/ScreenScaffold';
import { AppTextField, SectionHeader, SurfaceCard, ToggleRow } from '../components/Ui';
import { useAppStore } from '../state/appStore';
import { palette, spacing, radii } from '../theme/tokens';
import { numberInputValue, parseNumberInput } from '../utils/review';

export function ProfileScreen() {
  const profile = useAppStore((state) => state.profile);
  const healthInputs = useAppStore((state) => state.healthInputs);
  const setProfile = useAppStore((state) => state.setProfile);
  const setHealthInputs = useAppStore((state) => state.setHealthInputs);

  return (
    <ScreenScaffold
      eyebrow="Profile & Inputs"
      title="Profile & Inputs"
      subtitle="Your details power the financial calculations and automated tips."
    >
      <LinearGradient 
        colors={['#1E3A8A', '#2D60FF']} 
        style={styles.virtualCard}
        start={{x: 0, y: 0}}
        end={{x: 1, y: 1}}
      >
        <Feather name="user" size={24} color={palette.accentText} style={styles.cardChip} />
        <View style={styles.cardContent}>
          <Text style={styles.userIdLabel}>User ID</Text>
          <Text style={styles.userIdValue}>John Smith</Text>
          <Text style={styles.userStatus}>Local Sandbox Mode</Text>
        </View>
      </LinearGradient>

      <SurfaceCard>
        <SectionHeader
          title="Monthly Money In & Out"
          subtitle="These numbers are sent to the backend score and FIRE endpoints when you refresh them."
        />
        <AppTextField
          label="Monthly income"
          keyboardType="numeric"
          value={numberInputValue(profile.monthlyIncome)}
          onChangeText={(value) => setProfile({ monthlyIncome: parseNumberInput(value) ?? 0 })}
          placeholder="150000"
        />
        <AppTextField
          label="Monthly expenses"
          keyboardType="numeric"
          value={numberInputValue(profile.monthlyExpenses)}
          onChangeText={(value) => setProfile({ monthlyExpenses: parseNumberInput(value) ?? 0 })}
          placeholder="70000"
        />
      </SurfaceCard>

      <SurfaceCard tone="soft">
        <SectionHeader
          title="Health inputs for score"
          subtitle="This feeds the H1 to H6 Money Health dimensions."
        />
        <AppTextField
          label="Rainy Day Fund"
          keyboardType="numeric"
          value={numberInputValue(healthInputs.emergencyFund)}
          onChangeText={(value) => setHealthInputs({ emergencyFund: parseNumberInput(value) ?? 0 })}
          placeholder="500000"
        />
        <AppTextField
          label="Medical Insurance Amount"
          keyboardType="numeric"
          value={numberInputValue(healthInputs.healthInsuranceCover)}
          onChangeText={(value) =>
            setHealthInputs({ healthInsuranceCover: parseNumberInput(value) ?? 0 })
          }
          placeholder="500000"
        />
        <AppTextField
          label="Life Insurance Amount"
          keyboardType="numeric"
          value={numberInputValue(healthInputs.termLifeCover)}
          onChangeText={(value) => setHealthInputs({ termLifeCover: parseNumberInput(value) ?? 0 })}
          placeholder="15000000"
        />
        <AppTextField
          label="Total monthly EMI"
          keyboardType="numeric"
          value={numberInputValue(healthInputs.totalMonthlyEMI)}
          onChangeText={(value) => setHealthInputs({ totalMonthlyEMI: parseNumberInput(value) ?? 0 })}
          placeholder="15000"
        />
        <AppTextField
          label="Monthly retirement saving"
          keyboardType="numeric"
          value={numberInputValue(healthInputs.monthlyRetirementSaving)}
          onChangeText={(value) =>
            setHealthInputs({ monthlyRetirementSaving: parseNumberInput(value) ?? 0 })
          }
          placeholder="20000"
        />
        <ToggleRow
          label="Has dependents"
          value={healthInputs.hasDependents}
          onValueChange={(value) => setHealthInputs({ hasDependents: value })}
        />
        <ToggleRow
          label="Revolving credit card debt"
          value={healthInputs.hasRevolvingCCDebt}
          onValueChange={(value) => setHealthInputs({ hasRevolvingCCDebt: value })}
          helper="Toggle this only if card balances are rolling over month to month."
        />
      </SurfaceCard>

      <Text style={styles.footer}>
        Profile updates save instantly to local storage and are reused the next time the app opens.
      </Text>
    </ScreenScaffold>
  );
}

const styles = StyleSheet.create({
  virtualCard: {
    height: 180,
    borderRadius: radii.card,
    padding: spacing.lg,
    justifyContent: 'space-between',
    elevation: 8,
    shadowColor: '#1E3A8A',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    marginBottom: spacing.md, // Give space before the next card
  },
  cardChip: {
    marginBottom: spacing.xs,
    opacity: 0.9,
  },
  cardContent: {
    alignItems: 'center',
    gap: 8,
    flex: 1,
    justifyContent: 'center',
    marginBottom: 24, // push up slightly
  },
  userIdLabel: {
    color: palette.accentText,
    textTransform: 'uppercase',
    letterSpacing: 2,
    fontWeight: '600',
    fontSize: 12,
    opacity: 0.8,
  },
  userIdValue: {
    color: palette.accentText,
    fontSize: 32,
    fontWeight: '800',
    letterSpacing: 1,
  },
  userStatus: {
    color: palette.accentText,
    fontSize: 13,
    opacity: 0.8,
  },
  footer: {
    lineHeight: 21,
    color: palette.muted,
  },
});

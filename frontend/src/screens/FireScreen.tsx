import { StyleSheet, Text, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useMutation } from '@tanstack/react-query';

import { ScreenScaffold } from '../components/ScreenScaffold';
import { AppButton, AppTextField, EmptyState, Metric, MiniTrend, SectionHeader, SurfaceCard } from '../components/Ui';
import { runFirePlan } from '../services/api/finguard';
import { useAppStore } from '../state/appStore';
import { palette, spacing } from '../theme/tokens';
import type { RootStackParamList } from '../navigation/types';
import { formatCurrency } from '../utils/format';
import { numberInputValue, parseNumberInput } from '../utils/review';

export function FireScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const profile = useAppStore((state) => state.profile);
  const fireInputs = useAppStore((state) => state.fireInputs);
  const fireReport = useAppStore((state) => state.reports.fire);
  const setFireInputs = useAppStore((state) => state.setFireInputs);
  const setFireReport = useAppStore((state) => state.setFireReport);

  const fireMutation = useMutation({
    mutationFn: () =>
      runFirePlan({
        current_age: fireInputs.currentAge,
        target_retirement_age: fireInputs.targetRetirementAge,
        monthly_income: profile.monthlyIncome,
        monthly_expenses: profile.monthlyExpenses,
        current_corpus: fireInputs.currentCorpus,
        monthly_sip: fireInputs.monthlySip,
        expected_annual_expense_at_retirement: fireInputs.expectedAnnualExpenseAtRetirement,
        return_rate: fireInputs.returnRate,
        inflation: fireInputs.inflation,
        salary_growth: fireInputs.salaryGrowth,
      }),
    onSuccess: (result) => {
      setFireReport(result);
    },
  });

  return (
    <ScreenScaffold
      eyebrow="Early Retirement"
      title={fireReport ? `${fireReport.retirement_age} Yrs` : "Early Retirement Planner"}
      subtitle={fireReport ? "Projected Retirement Age" : "Use your current savings and monthly investment to see your projected shortfall and earliest retirement age."}
    >
      <SurfaceCard>
        <SectionHeader
          title="Settings Card"
          subtitle="Configure your growth and savings inputs."
        />
        <View style={styles.metrics}>
          <Metric label="Monthly income" value={formatCurrency(profile.monthlyIncome)} />
          <Metric label="Monthly expenses" value={formatCurrency(profile.monthlyExpenses)} />
        </View>
        <AppTextField
          label="Current age"
          keyboardType="numeric"
          value={String(fireInputs.currentAge)}
          onChangeText={(value) => setFireInputs({ currentAge: parseNumberInput(value) ?? 0 })}
          placeholder="30"
        />
        <AppTextField
          label="Target retirement age"
          keyboardType="numeric"
          value={String(fireInputs.targetRetirementAge)}
          onChangeText={(value) =>
            setFireInputs({ targetRetirementAge: parseNumberInput(value) ?? 0 })
          }
          placeholder="45"
        />
        <AppTextField
          label="Current Total Savings"
          keyboardType="numeric"
          value={numberInputValue(fireInputs.currentCorpus)}
          onChangeText={(value) => setFireInputs({ currentCorpus: parseNumberInput(value) ?? 0 })}
          placeholder="1200000"
        />
        <AppTextField
          label="Regular Monthly Investment"
          keyboardType="numeric"
          value={numberInputValue(fireInputs.monthlySip)}
          onChangeText={(value) => setFireInputs({ monthlySip: parseNumberInput(value) ?? 0 })}
          placeholder="50000"
        />
        <AppTextField
          label="Expected annual expense at retirement"
          keyboardType="numeric"
          value={numberInputValue(fireInputs.expectedAnnualExpenseAtRetirement)}
          onChangeText={(value) =>
            setFireInputs({
              expectedAnnualExpenseAtRetirement: parseNumberInput(value) ?? 0,
            })
          }
          placeholder="1800000"
        />

        <AppTextField
          label="Expected Growth Rate (%)"
          keyboardType="numeric"
          value={fireInputs.returnRate ? String(Math.round(fireInputs.returnRate * 100)) : ''}
          onChangeText={(value) => setFireInputs({ returnRate: (parseNumberInput(value) ?? 0) / 100 })}
          helper="Enter percentage (e.g., 12%)"
          placeholder="12"
        />
        <AppTextField
          label="Cost of Living Increase (%)"
          keyboardType="numeric"
          value={fireInputs.inflation ? String(Math.round(fireInputs.inflation * 100)) : ''}
          onChangeText={(value) => setFireInputs({ inflation: (parseNumberInput(value) ?? 0) / 100 })}
          helper="Enter percentage (e.g., 6%)"
          placeholder="6"
        />
        <AppTextField
          label="Salary growth (%)"
          keyboardType="numeric"
          value={fireInputs.salaryGrowth ? String(Math.round(fireInputs.salaryGrowth * 100)) : ''}
          onChangeText={(value) => setFireInputs({ salaryGrowth: (parseNumberInput(value) ?? 0) / 100 })}
          helper="Enter percentage (e.g., 8%)"
          placeholder="8"
        />
        
        <AppButton
          label={fireMutation.isPending ? 'Building Retirement Plan...' : 'Run Retirement Plan'}
          onPress={() => fireMutation.mutate()}
          disabled={
            fireMutation.isPending
            || profile.monthlyIncome <= 0
            || profile.monthlyExpenses <= 0
          }
        />
      </SurfaceCard>

      {fireReport ? (
        <>
          <SurfaceCard>
            <SectionHeader
              title="Retirement output"
              subtitle="This is the deterministic result returned by the backend."
              aside={
                <AppButton
                  label="Open detail"
                  variant="ghost"
                  onPress={() => navigation.navigate('FeatureDetail', { kind: 'report', feature: 'fire' })}
                />
              }
            />
            <View style={styles.metrics}>
              <Metric label="Retirement age" value={String(fireReport.retirement_age)} tone="accent" />
              <Metric label="Goal Savings for Retirement" value={formatCurrency(fireReport.corpus.required)} />
              <Metric label="Estimated Savings at Retirement" value={formatCurrency(fireReport.corpus.projected)} />
              <Metric label="Shortfall" value={formatCurrency(fireReport.corpus.gap)} />
            </View>
          </SurfaceCard>

          <SurfaceCard tone="soft">
            <SectionHeader title="Trajectory" subtitle="Visualizing your corpus growth." />
            <MiniTrend values={fireReport.yearly_plan.map(y => y.projected_corpus)} />
          </SurfaceCard>

          <SurfaceCard>
            <SectionHeader title="First checkpoints" subtitle="A preview of the yearly plan." />
            {fireReport.yearly_plan.slice(0, 4).map((year) => (
              <View key={year.age} style={styles.yearRow}>
                <Text style={styles.yearLabel}>Age {year.age}</Text>
                <Text style={styles.yearCopy}>
                  Savings {formatCurrency(year.projected_corpus)} / Goal {formatCurrency(year.required_corpus)}
                </Text>
              </View>
            ))}
          </SurfaceCard>
        </>
      ) : (
        <EmptyState
          title="No retirement plan yet"
          body="Run the planner once the monthly income and expenses are set in Profile."
        />
      )}
    </ScreenScaffold>
  );
}

const styles = StyleSheet.create({
  metrics: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.lg,
  },
  yearRow: {
    gap: spacing.xs,
  },
  yearLabel: {
    fontWeight: '700',
    color: palette.text,
  },
  yearCopy: {
    lineHeight: 21,
    color: palette.muted,
  },
});

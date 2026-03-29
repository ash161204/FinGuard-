import { useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { ScreenScaffold } from '../components/ScreenScaffold';
import { InsightCardView } from '../components/Cards';
import { AppButton, EmptyState, Metric, SectionHeader, StatusBadge, SurfaceCard } from '../components/Ui';
import { analyzeMf, getLatestExtraction } from '../services/api/finguard';
import { queryKeys } from '../services/queryKeys';
import { useAppStore } from '../state/appStore';
import { palette, spacing } from '../theme/tokens';
import type { RootStackParamList } from '../navigation/types';
import { formatCurrency, sentenceCase } from '../utils/format';

const horizons = ['short', 'medium', 'long'] as const;
const riskOptions = ['conservative', 'moderate', 'aggressive'] as const;

export function MfScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const queryClient = useQueryClient();
  const mfReport = useAppStore((state) => state.reports.mf);
  const setMfReport = useAppStore((state) => state.setMfReport);
  const [goalHorizon, setGoalHorizon] = useState<(typeof horizons)[number]>('long');
  const [riskVibe, setRiskVibe] = useState<(typeof riskOptions)[number]>('moderate');

  const extractionQuery = useQuery({
    queryKey: queryKeys.extraction('cams'),
    queryFn: () => getLatestExtraction('cams'),
  });

  const analyzeMutation = useMutation({
    mutationFn: () =>
      analyzeMf({
        goal_horizon: goalHorizon,
        risk_vibe: riskVibe,
        emergency_fund_state: 'unknown',
      }),
    onSuccess: (result) => {
      setMfReport(result);
      queryClient.invalidateQueries({ queryKey: queryKeys.actions });
    },
  });

  const extraction = extractionQuery.data;
  const canAnalyze = extraction?.validation.critical_ready ?? false;

  return (
    <ScreenScaffold
      eyebrow="MF X-Ray"
      title={mfReport ? formatCurrency(mfReport.summary.portfolio_value) : "MF X-Ray"}
      subtitle={mfReport ? "Total Portfolio Value" : "Validate the extracted holdings, choose the goal horizon, and turn the engine output into ranked portfolio actions."}
    >
      <SurfaceCard>
        <SectionHeader
          title="Portfolio extraction"
          subtitle="CAMS needs at least the fund name, invested amount, and current value for each holding."
          aside={
            extractionQuery.isFetching ? (
              <ActivityIndicator size="small" color={palette.accent} />
            ) : extraction ? (
              <StatusBadge
                label={sentenceCase(extraction.validation.status)}
                tone={
                  extraction.validation.status === 'complete'
                    ? 'success'
                    : extraction.validation.status === 'partial'
                      ? 'warning'
                      : 'danger'
                }
              />
            ) : undefined
          }
        />
        {extraction ? (
          <>
            <View style={styles.metrics}>
              <Metric
                label="Your Investments"
                value={String((extraction.reviewed_data as { holdings?: unknown[] }).holdings?.length ?? 0)}
              />
              <Metric label="Missing fields" value={String(extraction.validation.missing_fields.length)} />
            </View>
            <View style={styles.buttonRow}>
              <AppButton
                label="Review CAMS"
                onPress={() =>
                  navigation.navigate('FeatureDetail', {
                    kind: 'review',
                    documentType: 'cams',
                  })
                }
              />
              <AppButton label="Upload another PDF" variant="secondary" onPress={() => navigation.navigate('Upload')} />
            </View>
          </>
        ) : (
          <EmptyState
            title="No CAMS extraction yet"
            body="Upload a CAMS PDF first. Review and correction live on the detail route after extraction completes."
            action={<AppButton label="Open upload" onPress={() => navigation.navigate('Upload')} />}
          />
        )}
      </SurfaceCard>

      <SurfaceCard tone="soft">
        <SectionHeader title="Assumptions" subtitle="These guide the rebalancing and alerting logic." />
        <View style={styles.choiceRow}>
          {riskOptions.map((option) => (
            <Pressable
              key={option}
              onPress={() => setRiskVibe(option)}
              style={[styles.choiceChip, riskVibe === option && styles.choiceChipActive]}
            >
              <Text style={[styles.choiceText, riskVibe === option && styles.choiceTextActive]}>
                {sentenceCase(option)}
              </Text>
            </Pressable>
          ))}
        </View>
        <View style={styles.choiceRow}>
          {horizons.map((option) => (
            <Pressable
              key={option}
              onPress={() => setGoalHorizon(option)}
              style={[styles.choiceChip, goalHorizon === option && styles.choiceChipActive]}
            >
              <Text style={[styles.choiceText, goalHorizon === option && styles.choiceTextActive]}>
                {sentenceCase(option)}
              </Text>
            </Pressable>
          ))}
        </View>
        <AppButton
          label={analyzeMutation.isPending ? 'Running MF X-Ray...' : 'Run MF X-Ray'}
          onPress={() => analyzeMutation.mutate()}
          disabled={!canAnalyze || analyzeMutation.isPending}
        />
      </SurfaceCard>

      {mfReport ? (
        <>
          <SurfaceCard>
            <SectionHeader
              title="Summary"
              subtitle="Snapshot of value, returns, and detected risk posture."
              aside={
                <AppButton
                  label="Open detail"
                  variant="ghost"
                  onPress={() => navigation.navigate('FeatureDetail', { kind: 'report', feature: 'mf' })}
                />
              }
            />
            <View style={styles.metrics}>
              <Metric label="Portfolio value" value={formatCurrency(mfReport.summary.portfolio_value)} tone="accent" />
              <Metric label="Your Overall Growth Rate" value={`${mfReport.summary.portfolio_xirr}%`} />
              <Metric label="Investment Risk Level" value={sentenceCase(mfReport.summary.risk_profile)} />
            </View>
          </SurfaceCard>

          <SectionHeader title="Account Health Checks & Adjustments" subtitle="Prioritized rebalancing and portfolio hygiene moves." />
          {mfReport.top_insights.length ? (
            mfReport.top_insights.map((insight) => (
              <InsightCardView key={insight.title} insight={insight} />
            ))
          ) : (
            <EmptyState
              title="No ranked MF insights"
              body="The portfolio report is present, but there were no ranked actions in the top set."
            />
          )}
        </>
      ) : (
        <EmptyState
          title="No MF report yet"
          body="Once you run MF X-Ray, the ranked portfolio insights will show up here."
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
  buttonRow: {
    gap: spacing.sm,
  },
  choiceRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  choiceChip: {
    borderRadius: 999,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderWidth: 1,
    borderColor: palette.borderStrong,
    backgroundColor: palette.surface,
  },
  choiceChipActive: {
    backgroundColor: palette.accent,
    borderColor: palette.accent,
  },
  choiceText: {
    color: palette.text,
    fontWeight: '600',
  },
  choiceTextActive: {
    color: palette.accentText,
  },
});

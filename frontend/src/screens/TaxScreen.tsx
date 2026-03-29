import { useEffect } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { ScreenScaffold } from '../components/ScreenScaffold';
import { InsightCardView } from '../components/Cards';
import { AppButton, EmptyState, Metric, SectionHeader, StatusBadge, SurfaceCard } from '../components/Ui';
import { analyzeTax, getLatestExtraction } from '../services/api/finguard';
import { queryKeys } from '../services/queryKeys';
import { useAppStore } from '../state/appStore';
import { palette, spacing } from '../theme/tokens';
import type { RootStackParamList } from '../navigation/types';
import { formatCurrency, sentenceCase } from '../utils/format';

export function TaxScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const queryClient = useQueryClient();
  const taxReport = useAppStore((state) => state.reports.tax);
  const setTaxReport = useAppStore((state) => state.setTaxReport);

  const extractionQuery = useQuery({
    queryKey: queryKeys.extraction('form16'),
    queryFn: () => getLatestExtraction('form16'),
  });

  const analyzeMutation = useMutation({
    mutationFn: analyzeTax,
    onSuccess: (result) => {
      setTaxReport(result);
      queryClient.invalidateQueries({ queryKey: queryKeys.actions });
    },
  });

  useEffect(() => {
    if (!extractionQuery.data) {
      setTaxReport(null);
    }
  }, [extractionQuery.data, setTaxReport]);

  const extraction = extractionQuery.data;
  const canAnalyze = extraction?.validation.critical_ready ?? false;
  const isPartial = extraction?.validation.status === 'partial';

  return (
    <ScreenScaffold
      eyebrow="Tax Wizard"
      title={taxReport ? formatCurrency(taxReport.summary.tax_payable) : "Tax Wizard"}
      subtitle={taxReport ? "Total Tax You Owe" : "Review the extracted Form 16 fields, normalize them, and run the deterministic tax report."}
    >
      <SurfaceCard>
        <SectionHeader
          title="Extraction status"
          subtitle="Level 1 fields must be present before Tax Wizard can be marked complete."
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
              <Metric label="Missing fields" value={String(extraction.validation.missing_fields.length)} />
              <Metric label="Blocking fields" value={String(extraction.validation.blocking_fields.length)} />
            </View>
            {isPartial ? (
              <Text style={styles.notice}>
                Partial analysis is still allowed. Optional fields are missing, but the core tax inputs
                are in place.
              </Text>
            ) : null}
            {extraction.validation.blocking_fields.length ? (
              <Text style={styles.noticeDanger}>
                Blocking fields: {extraction.validation.blocking_fields.join(', ')}
              </Text>
            ) : null}
            <View style={styles.buttonRow}>
              <AppButton
                label="Review Form 16"
                onPress={() =>
                  navigation.navigate('FeatureDetail', {
                    kind: 'review',
                    documentType: 'form16',
                  })
                }
              />
              <AppButton label="Upload another PDF" variant="secondary" onPress={() => navigation.navigate('Upload')} />
            </View>
          </>
        ) : (
          <EmptyState
            title="No Form 16 extraction yet"
            body="Upload a Form 16 PDF first. The review editor will appear once extraction completes."
            action={<AppButton label="Open upload" onPress={() => navigation.navigate('Upload')} />}
          />
        )}
      </SurfaceCard>

      <SurfaceCard tone="soft">
        <SectionHeader
          title="Run analysis"
          subtitle="This calls the backend adapter around the JS insight engine."
        />
        <AppButton
          label={analyzeMutation.isPending ? 'Running Tax Wizard...' : 'Run Tax Wizard'}
          onPress={() => analyzeMutation.mutate()}
          disabled={!canAnalyze || analyzeMutation.isPending}
        />
        {!canAnalyze && extraction ? (
          <Text style={styles.noticeDanger}>Complete the blocking Level 1 fields before running Tax Wizard.</Text>
        ) : null}
      </SurfaceCard>

      {taxReport ? (
        <>
          <SurfaceCard>
            <SectionHeader
              title="Summary"
              subtitle="The summary-first view that feeds the rest of the app."
              aside={
                <AppButton
                  label="Open detail"
                  variant="ghost"
                  onPress={() => navigation.navigate('FeatureDetail', { kind: 'report', feature: 'tax' })}
                />
              }
            />
            <View style={styles.metrics}>
              <Metric label="Best Tax System" value={taxReport.summary.recommended_regime || '—'} tone="accent" />
              <Metric label="Total Tax You Owe" value={formatCurrency(taxReport.summary.tax_payable)} />
              <Metric label="Final Tax Balance" value={formatCurrency(taxReport.summary.refund_or_payable)} />
            </View>
          </SurfaceCard>

          <SectionHeader title="Top Smart Tips" subtitle="Ranked with the money / risk / urgency weighting." />
          {taxReport.top_insights.length ? (
            taxReport.top_insights.map((insight) => (
              <InsightCardView key={insight.title} insight={insight} />
            ))
          ) : (
            <EmptyState
              title="No tax suggestions"
              body="The engine returned a report, but there were no ranked tax actions in the top set."
            />
          )}
        </>
      ) : (
        <EmptyState
          title="No tax report yet"
          body="Once you run Tax Wizard, the summary and ranked smart tips will render here."
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
  notice: {
    color: palette.warning,
    lineHeight: 21,
  },
  noticeDanger: {
    color: palette.danger,
    lineHeight: 21,
  },
});

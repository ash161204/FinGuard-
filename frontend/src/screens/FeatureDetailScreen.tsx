import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { RouteProp, useRoute } from '@react-navigation/native';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { InsightCardView } from '../components/Cards';
import { ScreenScaffold } from '../components/ScreenScaffold';
import {
  AppButton,
  AppTextField,
  EmptyState,
  Metric,
  SectionHeader,
  StatusBadge,
  SurfaceCard,
} from '../components/Ui';
import {
  getLatestExtraction,
  normalizeDocument,
  saveReviewedExtraction,
} from '../services/api/finguard';
import { queryKeys } from '../services/queryKeys';
import { useAppStore } from '../state/appStore';
import { palette, spacing } from '../theme/tokens';
import type {
  CamsHolding,
  CamsReviewData,
  Form16ReviewData,
} from '../types';
import type { RootStackParamList } from '../navigation/types';
import { formatCurrency, sentenceCase } from '../utils/format';
import {
  asCamsReview,
  asForm16Review,
  emptyHolding,
  numberInputValue,
  parseNumberInput,
} from '../utils/review';

type FeatureDetailRoute = RouteProp<RootStackParamList, 'FeatureDetail'>;

export function FeatureDetailScreen() {
  const route = useRoute<FeatureDetailRoute>();

  if (route.params.kind === 'review') {
    return <ReviewDetail documentType={route.params.documentType} />;
  }

  return <ReportDetail feature={route.params.feature} />;
}

function ReviewDetail({ documentType }: { documentType: 'form16' | 'cams' }) {
  const queryClient = useQueryClient();
  const clearDerivedForDocument = useAppStore((state) => state.clearDerivedForDocument);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [form16Draft, setForm16Draft] = useState<Form16ReviewData>(asForm16Review(null));
  const [camsDraft, setCamsDraft] = useState<CamsReviewData>(asCamsReview(null));

  const extractionQuery = useQuery({
    queryKey: queryKeys.extraction(documentType),
    queryFn: () => getLatestExtraction(documentType),
  });

  useEffect(() => {
    if (!extractionQuery.data) {
      return;
    }
    if (documentType === 'form16') {
      setForm16Draft(asForm16Review(extractionQuery.data.reviewed_data));
      return;
    }
    setCamsDraft(asCamsReview(extractionQuery.data.reviewed_data));
  }, [documentType, extractionQuery.data]);

  const saveMutation = useMutation({
    mutationFn: ({
      reviewStatus,
      reviewedData,
    }: {
      reviewStatus: 'pending' | 'completed';
      reviewedData: Form16ReviewData | CamsReviewData;
    }) => saveReviewedExtraction(documentType, reviewedData, reviewStatus),
    onSuccess: (result) => {
      clearDerivedForDocument(documentType);
      queryClient.invalidateQueries({ queryKey: queryKeys.extraction(documentType) });
      setFeedback(
        result.review_status === 'completed'
          ? 'Review saved as complete.'
          : 'Draft review saved.',
      );
    },
    onError: (error) => {
      setFeedback(error instanceof Error ? error.message : 'Could not save review.');
    },
  });

  const normalizeMutation = useMutation({
    mutationFn: () => normalizeDocument(documentType),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.extraction(documentType) });
      setFeedback('Normalization completed. Analysis screens can use the canonical payload now.');
    },
    onError: (error) => {
      setFeedback(error instanceof Error ? error.message : 'Normalization failed.');
    },
  });

  async function saveAndNormalize() {
    const extraction = extractionQuery.data;
    if (!extraction) return;

    if (extraction.validation.blocking_fields.length > 0) {
      setFeedback('Cannot save as complete: missing blocking fields. Please fill them out or use Save Draft.');
      return;
    }

    const finalData = documentType === 'form16' ? form16Draft : camsDraft;

    try {
      await saveMutation.mutateAsync({
        reviewStatus: 'completed',
        reviewedData: finalData,
      });
      await normalizeMutation.mutateAsync();
    } catch {
      return;
    }
  }

  const extraction = extractionQuery.data;

  return (
    <ScreenScaffold
      eyebrow={documentType === 'form16' ? 'Form 16 Review' : 'CAMS Review'}
      title={documentType === 'form16' ? 'Review extracted salary fields' : 'Review extracted holdings'}
      subtitle="Correct missing or weakly extracted fields before normalization and analysis."
    >
      {extractionQuery.isFetching && !extraction ? (
        <SurfaceCard>
          <ActivityIndicator size="small" color={palette.accent} />
        </SurfaceCard>
      ) : null}

      {extraction ? (
        <SurfaceCard>
          <SectionHeader
            title="Validation state"
            subtitle="This mirrors the backend’s current view of the document."
            aside={
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
            }
          />
          <View style={styles.metricRow}>
            <Metric label="Missing fields" value={String(extraction.validation.missing_fields.length)} />
            <Metric label="Blocking fields" value={String(extraction.validation.blocking_fields.length)} />
          </View>
          {extraction.warnings.length ? (
            <Text style={styles.helper}>Warnings: {extraction.warnings.join(' • ')}</Text>
          ) : null}
        </SurfaceCard>
      ) : (
        <EmptyState
          title="No extracted payload"
          body="Go back to Upload and finish the extraction job first."
        />
      )}

      {documentType === 'form16' ? (
        <Form16Editor value={form16Draft} onChange={setForm16Draft} />
      ) : (
        <CamsEditor value={camsDraft} onChange={setCamsDraft} />
      )}

      <SurfaceCard tone="soft">
        <SectionHeader
          title="Persist review"
          subtitle="Save a draft if optional fields are still missing, or save complete and normalize."
        />
        <View style={styles.buttonRow}>
          <AppButton
            label="Save draft"
            variant="secondary"
            onPress={() =>
              saveMutation.mutate({
                reviewStatus: 'pending',
                reviewedData: documentType === 'form16' ? form16Draft : camsDraft,
              })
            }
            disabled={saveMutation.isPending || normalizeMutation.isPending}
          />
          <AppButton
            label="Save + normalize"
            onPress={() => {
              void saveAndNormalize();
            }}
            disabled={saveMutation.isPending || normalizeMutation.isPending}
          />
        </View>
        {feedback ? <Text style={styles.helper}>{feedback}</Text> : null}
      </SurfaceCard>
    </ScreenScaffold>
  );
}

function Form16Editor({
  value,
  onChange,
}: {
  value: Form16ReviewData;
  onChange: (value: Form16ReviewData) => void;
}) {
  const setLevel1 = (field: keyof Form16ReviewData['level_1'], next: number | null) => {
    onChange({
      ...value,
      level_1: {
        ...value.level_1,
        [field]: next,
      },
    });
  };

  const setDeduction = (field: '80C' | '80D' | '80CCD1B', next: number | null) => {
    onChange({
      ...value,
      level_1: {
        ...value.level_1,
        deductions: {
          ...value.level_1.deductions,
          [field]: next,
        },
      },
    });
  };

  const setLevel2 = (field: keyof Form16ReviewData['level_2'], next: number | null) => {
    onChange({
      ...value,
      level_2: {
        ...value.level_2,
        [field]: next,
      },
    });
  };

  const setLevel3 = (field: keyof Form16ReviewData['level_3'], next: number | null) => {
    onChange({
      ...value,
      level_3: {
        ...value.level_3,
        [field]: next,
      },
    });
  };

  return (
    <>
      <SurfaceCard>
        <SectionHeader title="Level 1" subtitle="Core fields. These block Tax Wizard if missing." />
        <AppTextField
          label="Salary"
          keyboardType="numeric"
          value={numberInputValue(value.level_1.salary)}
          onChangeText={(text) => setLevel1('salary', parseNumberInput(text))}
        />
        <AppTextField
          label="HRA received"
          keyboardType="numeric"
          value={numberInputValue(value.level_1.hra_received)}
          onChangeText={(text) => setLevel1('hra_received', parseNumberInput(text))}
        />
        <AppTextField
          label="Rent paid"
          keyboardType="numeric"
          value={numberInputValue(value.level_1.rent_paid)}
          onChangeText={(text) => setLevel1('rent_paid', parseNumberInput(text))}
        />
        <AppTextField
          label="Tax deducted"
          keyboardType="numeric"
          value={numberInputValue(value.level_1.tax_deducted)}
          onChangeText={(text) => setLevel1('tax_deducted', parseNumberInput(text))}
        />
        <AppTextField
          label="80C deduction"
          keyboardType="numeric"
          value={numberInputValue(value.level_1.deductions['80C'])}
          onChangeText={(text) => setDeduction('80C', parseNumberInput(text))}
        />
        <AppTextField
          label="80D deduction"
          keyboardType="numeric"
          value={numberInputValue(value.level_1.deductions['80D'])}
          onChangeText={(text) => setDeduction('80D', parseNumberInput(text))}
        />
        <AppTextField
          label="80CCD(1B) deduction"
          keyboardType="numeric"
          value={numberInputValue(value.level_1.deductions['80CCD1B'])}
          onChangeText={(text) => setDeduction('80CCD1B', parseNumberInput(text))}
        />
      </SurfaceCard>

      <SurfaceCard tone="soft">
        <SectionHeader title="Level 2" subtitle="Useful optional fields that improve the quality of the tax report." />
        <AppTextField
          label="LTA"
          keyboardType="numeric"
          value={numberInputValue(value.level_2.lta)}
          onChangeText={(text) => setLevel2('lta', parseNumberInput(text))}
        />
        <AppTextField
          label="Bonus"
          keyboardType="numeric"
          value={numberInputValue(value.level_2.bonus)}
          onChangeText={(text) => setLevel2('bonus', parseNumberInput(text))}
        />
        <AppTextField
          label="Other allowances"
          keyboardType="numeric"
          value={numberInputValue(value.level_2.other_allowances)}
          onChangeText={(text) => setLevel2('other_allowances', parseNumberInput(text))}
        />
        <AppTextField
          label="Professional tax"
          keyboardType="numeric"
          value={numberInputValue(value.level_2.professional_tax)}
          onChangeText={(text) => setLevel2('professional_tax', parseNumberInput(text))}
        />
      </SurfaceCard>

      <SurfaceCard>
        <SectionHeader title="Level 3" subtitle="Rare inputs. Safe to leave blank unless the document clearly shows them." />
        <AppTextField
          label="Previous employer income"
          keyboardType="numeric"
          value={numberInputValue(value.level_3.previous_employer_income)}
          onChangeText={(text) => setLevel3('previous_employer_income', parseNumberInput(text))}
        />
        <AppTextField
          label="Other income"
          keyboardType="numeric"
          value={numberInputValue(value.level_3.other_income)}
          onChangeText={(text) => setLevel3('other_income', parseNumberInput(text))}
        />
        <AppTextField
          label="Losses"
          keyboardType="numeric"
          value={numberInputValue(value.level_3.losses)}
          onChangeText={(text) => setLevel3('losses', parseNumberInput(text))}
        />
      </SurfaceCard>
    </>
  );
}

function CamsEditor({
  value,
  onChange,
}: {
  value: CamsReviewData;
  onChange: (value: CamsReviewData) => void;
}) {
  const updateHolding = (
    index: number,
    field: keyof CamsHolding,
    next: string | number | null,
  ) => {
    onChange({
      holdings: value.holdings.map((holding, holdingIndex) =>
        holdingIndex === index
          ? {
              ...holding,
              [field]: next,
            }
          : holding,
      ),
    });
  };

  return (
    <>
      {value.holdings.map((holding, index) => (
        <SurfaceCard key={`${index}-${holding.fund_name ?? 'holding'}`}>
          <SectionHeader title={`Holding ${index + 1}`} subtitle="Edit the extracted holding row before normalization." />
          <AppTextField
            label="Fund name"
            value={holding.fund_name ?? ''}
            onChangeText={(text) => updateHolding(index, 'fund_name', text)}
          />
          <AppTextField
            label="Category"
            value={holding.category ?? ''}
            onChangeText={(text) => updateHolding(index, 'category', text)}
          />
          <AppTextField
            label="Invested amount"
            keyboardType="numeric"
            value={numberInputValue(holding.invested)}
            onChangeText={(text) => updateHolding(index, 'invested', parseNumberInput(text))}
          />
          <AppTextField
            label="Current value"
            keyboardType="numeric"
            value={numberInputValue(holding.current)}
            onChangeText={(text) => updateHolding(index, 'current', parseNumberInput(text))}
          />
          <AppTextField
            label="Purchase date"
            value={holding.purchase_date ?? ''}
            onChangeText={(text) => updateHolding(index, 'purchase_date', text)}
            helper="Use YYYY-MM-DD or DD/MM/YYYY."
          />
          <View style={styles.planRow}>
            {(['Direct', 'Regular'] as const).map((plan) => (
              <Pressable
                key={plan}
                onPress={() => updateHolding(index, 'plan', plan)}
                style={[styles.planChip, holding.plan === plan && styles.planChipActive]}
              >
                <Text style={[styles.planChipText, holding.plan === plan && styles.planChipTextActive]}>
                  {plan}
                </Text>
              </Pressable>
            ))}
          </View>
        </SurfaceCard>
      ))}

      <AppButton
        label="Add holding"
        variant="secondary"
        onPress={() =>
          onChange({
            holdings: [...value.holdings, emptyHolding()],
          })
        }
      />
    </>
  );
}

function ReportDetail({ feature }: { feature: 'tax' | 'mf' | 'score' | 'fire' }) {
  const reports = useAppStore((state) => state.reports);

  if (feature === 'tax') {
    const report = reports.tax;
    if (!report) {
      return <EmptyReportState title="No tax report cached" />;
    }

    return (
      <ScreenScaffold
        eyebrow="Tax Detail"
        title="Latest cached tax report"
        subtitle="This view mirrors the summary and exposes the raw backend report for inspection."
      >
        <SurfaceCard>
          <View style={styles.metricRow}>
            <Metric label="Best regime" value={report.summary.recommended_regime || '—'} />
            <Metric label="Tax payable" value={formatCurrency(report.summary.tax_payable)} />
          </View>
        </SurfaceCard>
        {report.top_insights.map((insight) => (
          <InsightCardView key={insight.title} insight={insight} />
        ))}
        <RawReportCard title="Tax report JSON" payload={report.full_report} />
      </ScreenScaffold>
    );
  }

  if (feature === 'mf') {
    const report = reports.mf;
    if (!report) {
      return <EmptyReportState title="No MF report cached" />;
    }

    return (
      <ScreenScaffold
        eyebrow="MF Detail"
        title="Latest cached MF report"
        subtitle="Inspect the report behind the summary cards and top ranked portfolio actions."
      >
        <SurfaceCard>
          <View style={styles.metricRow}>
            <Metric label="Portfolio value" value={formatCurrency(report.summary.portfolio_value)} />
            <Metric label="XIRR" value={`${report.summary.portfolio_xirr}%`} />
            <Metric label="Risk profile" value={sentenceCase(report.summary.risk_profile)} />
          </View>
        </SurfaceCard>
        {report.top_insights.map((insight) => (
          <InsightCardView key={insight.title} insight={insight} />
        ))}
        <RawReportCard title="MF report JSON" payload={report.full_report} />
      </ScreenScaffold>
    );
  }

  if (feature === 'score') {
    const report = reports.score;
    if (!report) {
      return <EmptyReportState title="No score cached" />;
    }

    return (
      <ScreenScaffold
        eyebrow="Score Detail"
        title="Latest cached score"
        subtitle="Dimensions, scores, and deltas from the previous local score refresh."
      >
        <SurfaceCard tone="accent">
          <Text style={styles.scoreHero}>Score {report.score}</Text>
          <Text style={styles.scoreHeroSub}>Grade {report.grade}</Text>
        </SurfaceCard>
        {report.dimensions.map((dimension) => (
          <SurfaceCard key={dimension.id}>
            <SectionHeader
              title={`${dimension.id} · ${dimension.name}`}
              subtitle={dimension.tip}
              aside={<StatusBadge label={dimension.grade} tone="accent" />}
            />
            <Text style={styles.helper}>{dimension.detail}</Text>
            <Text style={styles.scoreDimension}>Score {dimension.score}</Text>
          </SurfaceCard>
        ))}
      </ScreenScaffold>
    );
  }

  const report = reports.fire;
  if (!report) {
    return <EmptyReportState title="No FIRE plan cached" />;
  }

  return (
    <ScreenScaffold
      eyebrow="FIRE Detail"
      title="Latest cached FIRE plan"
      subtitle="Use the yearly plan to inspect the projected corpus path against the required target."
    >
      <SurfaceCard>
        <View style={styles.metricRow}>
          <Metric label="Retirement age" value={String(report.retirement_age)} />
          <Metric label="Required corpus" value={formatCurrency(report.corpus.required)} />
          <Metric label="Projected corpus" value={formatCurrency(report.corpus.projected)} />
        </View>
      </SurfaceCard>
      {report.yearly_plan.map((year) => (
        <SurfaceCard key={year.age}>
          <SectionHeader
            title={`Age ${year.age}`}
            subtitle={`Income ${formatCurrency(year.annual_income)} · Expenses ${formatCurrency(year.annual_expenses)}`}
          />
          <Text style={styles.helper}>
            Corpus {formatCurrency(year.projected_corpus)} / Required {formatCurrency(year.required_corpus)}
          </Text>
          <Text style={styles.helper}>Gap {formatCurrency(year.gap)}</Text>
        </SurfaceCard>
      ))}
    </ScreenScaffold>
  );
}

function RawReportCard({
  title,
  payload,
}: {
  title: string;
  payload: Record<string, unknown>;
}) {
  return (
    <SurfaceCard tone="soft">
      <SectionHeader title={title} subtitle="Raw backend payload for debugging and verification." />
      <Text style={styles.jsonBlock}>{JSON.stringify(payload, null, 2)}</Text>
    </SurfaceCard>
  );
}

function EmptyReportState({ title }: { title: string }) {
  return (
    <ScreenScaffold
      eyebrow="Detail"
      title={title}
      subtitle="Run the corresponding flow first so the app has something cached to show here."
    >
      <EmptyState
        title="Nothing cached yet"
        body="The detail route reads locally persisted reports from previous successful API calls."
      />
    </ScreenScaffold>
  );
}

const styles = StyleSheet.create({
  metricRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.lg,
  },
  helper: {
    color: palette.muted,
    lineHeight: 21,
  },
  buttonRow: {
    gap: spacing.sm,
  },
  planRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  planChip: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: palette.borderStrong,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    backgroundColor: palette.surface,
  },
  planChipActive: {
    backgroundColor: palette.accent,
    borderColor: palette.accent,
  },
  planChipText: {
    color: palette.text,
    fontWeight: '600',
  },
  planChipTextActive: {
    color: palette.accentText,
  },
  jsonBlock: {
    fontFamily: 'Courier',
    color: palette.inkSoft,
    lineHeight: 18,
  },
  scoreHero: {
    fontSize: 40,
    fontWeight: '700',
    color: palette.accentText,
  },
  scoreHeroSub: {
    color: palette.accentText,
    fontSize: 18,
    fontWeight: '600',
  },
  scoreDimension: {
    color: palette.accent,
    fontWeight: '700',
  },
});

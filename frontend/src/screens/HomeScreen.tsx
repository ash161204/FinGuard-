import { useEffect } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View, ScrollView } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import { Feather } from '@expo/vector-icons';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { ScreenScaffold } from '../components/ScreenScaffold';
import { ActionCardView } from '../components/Cards';
import { AppButton, EmptyState, Metric, MiniTrend, SectionHeader, SurfaceCard } from '../components/Ui';
import { getActions, scoreUser, updateAction } from '../services/api/finguard';
import { queryKeys } from '../services/queryKeys';
import { useAppStore } from '../state/appStore';
import { palette, spacing, radii } from '../theme/tokens';
import type { RootStackParamList } from '../navigation/types';
import { formatCurrency } from '../utils/format';

export function HomeScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const queryClient = useQueryClient();
  const profile = useAppStore((state) => state.profile);
  const healthInputs = useAppStore((state) => state.healthInputs);
  const reports = useAppStore((state) => state.reports);
  const scoreHistory = useAppStore((state) => state.scoreHistory);
  const cachedActions = useAppStore((state) => state.actions);
  const setActions = useAppStore((state) => state.setActions);
  const setScoreReport = useAppStore((state) => state.setScoreReport);
  const pushScoreHistory = useAppStore((state) => state.pushScoreHistory);
  const upsertAction = useAppStore((state) => state.upsertAction);

  const actionsQuery = useQuery({
    queryKey: queryKeys.actions,
    queryFn: getActions,
    initialData: cachedActions.length ? cachedActions : undefined,
  });

  useEffect(() => {
    if (actionsQuery.data) {
      setActions(actionsQuery.data);
    }
  }, [actionsQuery.data, setActions]);

  const scoreMutation = useMutation({
    mutationFn: async () =>
      scoreUser({
        monthly_income: profile.monthlyIncome,
        monthly_expenses: profile.monthlyExpenses,
        health_inputs: healthInputs,
      }),
    onSuccess: (result) => {
      setScoreReport(result);
      pushScoreHistory({
        score: result.score,
        timestamp: new Date().toISOString(),
      });
    },
  });

  const actionMutation = useMutation({
    mutationFn: ({ actionId, status, progress }: { actionId: string; status: 'completed' | 'pending'; progress: number }) =>
      updateAction(actionId, { status, progress }),
    onSuccess: (action) => {
      upsertAction(action);
      queryClient.invalidateQueries({ queryKey: queryKeys.actions });
    },
  });

  const topActions = (actionsQuery.data ?? cachedActions)
    .filter((action) => action.status !== 'archived')
    .slice(0, 3);

  const score = reports.score;

  return (
    <ScreenScaffold
      eyebrow="Overall Health"
      title="Hi, John Smith 👋"
      subtitle="Welcome back to your financial pulse."
    >
      <LinearGradient 
        colors={['#1E3A8A', '#3b82f6']} 
        style={styles.virtualCard}
        start={{x: 0, y: 0}}
        end={{x: 1, y: 1}}
      >
        {/* Decorative glassmorphism elements */}
        <View style={styles.cardGlow1} />
        <View style={styles.cardGlow2} />
        
        <View style={styles.cardTopRow}>
          <Feather name="credit-card" size={28} color="rgba(255,255,255,0.9)" style={styles.cardChip} />
          <Text style={styles.scoreLabel}>
            Health Grade: <Text style={styles.gradeHighlight}>{score?.grade ?? '—'}</Text>
          </Text>
        </View>

        <View style={styles.cardMiddleRow}>
          <Text style={styles.scoreValue}>{score?.score ?? '—'}</Text>
          <Text style={styles.scoreValueSub}>Fitness Score</Text>
        </View>

        <View style={styles.cardBottomRow}>
          <Text style={styles.scoreCopy}>
            IN: {formatCurrency(profile.monthlyIncome)}
          </Text>
          <Text style={styles.scoreCopy}>
            OUT: {formatCurrency(profile.monthlyExpenses)}
          </Text>
        </View>
      </LinearGradient>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.quickActions}>
        <Pressable style={styles.quickActionButton} onPress={() => navigation.navigate('Upload')}>
          <Feather name="upload" size={18} color={palette.surface} />
          <Text style={styles.quickActionLabel}>Upload</Text>
        </Pressable>
        <Pressable 
          style={styles.quickActionButton} 
          onPress={() => scoreMutation.mutate()} 
          disabled={scoreMutation.isPending}
        >
          <Feather name="refresh-cw" size={18} color={palette.surface} />
          <Text style={styles.quickActionLabel}>
            {scoreMutation.isPending ? 'Refreshing...' : 'Refresh'}
          </Text>
        </Pressable>
      </ScrollView>

      <SurfaceCard>
        <SectionHeader
          title="Trend"
          subtitle="Stored locally from each score refresh on this device."
          aside={<Metric label="Saved points" value={String(scoreHistory.length)} />}
        />
        {scoreHistory.length ? (
          <>
            <MiniTrend values={[...scoreHistory].reverse().map((point) => point.score)} />
            <Text style={styles.trendCaption}>
              Latest {scoreHistory[0].score} • First saved {scoreHistory[scoreHistory.length - 1].score}
            </Text>
          </>
        ) : (
          <EmptyState
            title="No score history yet"
            body="Run the score once after filling monthly income, expenses, and health inputs in Profile."
          />
        )}
      </SurfaceCard>

      <SectionHeader
        title="Top To-Do List"
        subtitle="This feed merges automated recommendations with any manual actions you add later."
        aside={
          actionsQuery.isFetching ? <ActivityIndicator size="small" color={palette.accent} /> : undefined
        }
      />

      {topActions.length ? (
        topActions.map((action) => (
          <ActionCardView
            key={action.id}
            action={action}
            onComplete={
              action.status !== 'completed'
                ? () =>
                    actionMutation.mutate({
                      actionId: action.id,
                      status: 'completed',
                      progress: 100,
                    })
                : undefined
            }
            onResume={
              action.status === 'dismissed'
                ? () =>
                    actionMutation.mutate({
                      actionId: action.id,
                      status: 'pending',
                      progress: Math.max(action.progress, 10),
                    })
                : undefined
            }
          />
        ))
      ) : (
        <EmptyState
          title="No tasks yet"
          body="Run Tax Wizard or MF X-Ray once and the top automated recommendations will appear here."
          action={<AppButton label="Open upload" onPress={() => navigation.navigate('Upload')} />}
        />
      )}

      <SurfaceCard tone="soft">
        <SectionHeader title="Deep detail" subtitle="Open the latest cached backend outputs for inspection." />
        <View style={styles.detailLinks}>
          {[
            { label: 'Score detail', feature: 'score' as const },
            { label: 'Tax detail', feature: 'tax' as const },
            { label: 'MF detail', feature: 'mf' as const },
            { label: 'FIRE detail', feature: 'fire' as const },
          ].map((item) => (
            <Pressable
              key={item.feature}
              onPress={() => navigation.navigate('FeatureDetail', { kind: 'report', feature: item.feature })}
              style={styles.detailLink}
            >
              <Text style={styles.detailLinkText}>{item.label}</Text>
            </Pressable>
          ))}
        </View>
      </SurfaceCard>
    </ScreenScaffold>
  );
}

const styles = StyleSheet.create({
  virtualCard: {
    height: 200,
    borderRadius: radii.card,
    padding: spacing.lg,
    justifyContent: 'space-between',
    elevation: 10,
    shadowColor: '#1E3A8A',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 18,
    overflow: 'hidden',
  },
  cardGlow1: {
    position: 'absolute',
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
    top: -80,
    right: -40,
  },
  cardGlow2: {
    position: 'absolute',
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    bottom: -50,
    left: -20,
  },
  cardTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    zIndex: 2,
  },
  cardChip: {
    opacity: 0.95,
  },
  scoreLabel: {
    color: 'rgba(255,255,255,0.7)',
    textTransform: 'uppercase',
    letterSpacing: 2,
    fontWeight: '600',
    fontSize: 13,
  },
  gradeHighlight: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 16,
  },
  cardMiddleRow: {
    zIndex: 2,
    marginTop: 8,
  },
  scoreValue: {
    color: '#FFFFFF',
    fontSize: 64,
    fontWeight: '900',
    lineHeight: 70,
    letterSpacing: -1,
  },
  scoreValueSub: {
    color: 'rgba(255,255,255,0.85)',
    fontSize: 16,
    fontWeight: '500',
  },
  cardBottomRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    zIndex: 2,
  },
  scoreCopy: {
    color: 'rgba(255,255,255,0.9)',
    fontSize: 13,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  quickActions: {
    flexDirection: 'row',
    gap: spacing.sm,
    paddingVertical: spacing.sm,
  },
  quickActionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1E3A8A', 
    paddingHorizontal: spacing.lg,
    paddingVertical: 12,
    borderRadius: 99,
    gap: 8,
  },
  quickActionLabel: {
    color: palette.surface,
    fontWeight: '600',
    fontSize: 14,
  },
  trendCaption: {
    color: palette.muted,
    marginTop: spacing.sm,
  },
  detailLinks: {
    gap: spacing.sm,
  },
  detailLink: {
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: palette.borderStrong,
  },
  detailLinkText: {
    color: palette.accent,
    fontWeight: '700',
  },
});

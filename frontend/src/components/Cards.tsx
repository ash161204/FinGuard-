import { Pressable, StyleSheet, Text, View } from 'react-native';

import { SurfaceCard, StatusBadge } from './Ui';
import { palette, spacing } from '../theme/tokens';
import type { ActionItem, InsightCard } from '../types';
import { formatCurrency } from '../utils/format';

type InsightCardViewProps = {
  insight: InsightCard;
  onPress?: () => void;
};

export function InsightCardView({ insight, onPress }: InsightCardViewProps) {
  const body = (
    <SurfaceCard>
      <View style={styles.row}>
        <Text style={styles.title}>{insight.title}</Text>
        <StatusBadge
          label={insight.priority}
          tone={
            insight.priority === 'high'
              ? 'danger'
              : insight.priority === 'medium'
                ? 'warning'
                : 'accent'
          }
        />
      </View>
      <Text style={styles.subtitle}>{insight.subtitle}</Text>
      <View style={styles.row}>
        <Text style={styles.meta}>Impact</Text>
        <Text style={styles.impact}>{formatCurrency(insight.impact)}</Text>
      </View>
      <Text style={styles.actionLabel}>{insight.action}</Text>
    </SurfaceCard>
  );

  if (!onPress) {
    return body;
  }

  return <Pressable onPress={onPress}>{body}</Pressable>;
}

type ActionCardViewProps = {
  action: ActionItem;
  onComplete?: () => void;
  onResume?: () => void;
};

export function ActionCardView({ action, onComplete, onResume }: ActionCardViewProps) {
  const title = action.details.title ?? action.action_type;
  const subtitle = action.details.subtitle ?? action.details.action ?? 'Action available.';

  return (
    <SurfaceCard tone={action.status === 'completed' ? 'soft' : 'default'}>
      <View style={styles.row}>
        <Text style={styles.title}>{title}</Text>
        <StatusBadge
          label={action.status.replace('_', ' ')}
          tone={
            action.status === 'completed'
              ? 'success'
              : action.status === 'dismissed' || action.status === 'archived'
                ? 'neutral'
                : action.details.priority === 'high'
                  ? 'danger'
                  : action.details.priority === 'medium'
                    ? 'warning'
                    : 'accent'
          }
        />
      </View>
      <Text style={styles.subtitle}>{subtitle}</Text>
      <Text style={styles.meta}>
        Progress {action.progress}% • {formatCurrency(action.details.impact)}
      </Text>
      <View style={styles.progressTrack}>
        <View style={[styles.progressFill, { width: `${Math.max(action.progress, 6)}%` }]} />
      </View>
      <View style={styles.actionsRow}>
        {action.status !== 'completed' && onComplete ? (
          <Pressable onPress={onComplete}>
            <Text style={styles.link}>Mark complete</Text>
          </Pressable>
        ) : null}
        {action.status === 'dismissed' && onResume ? (
          <Pressable onPress={onResume}>
            <Text style={styles.link}>Restore</Text>
          </Pressable>
        ) : null}
      </View>
    </SurfaceCard>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: spacing.md,
  },
  title: {
    flex: 1,
    color: palette.text,
    fontWeight: '700',
    fontSize: 17,
  },
  subtitle: {
    color: palette.muted,
    lineHeight: 22,
  },
  meta: {
    color: palette.inkSoft,
    fontWeight: '600',
  },
  impact: {
    color: palette.accent,
    fontWeight: '700',
  },
  actionLabel: {
    color: palette.text,
    lineHeight: 21,
  },
  progressTrack: {
    height: 10,
    borderRadius: 999,
    backgroundColor: '#e6ddcf',
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 999,
    backgroundColor: palette.accent,
  },
  actionsRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  link: {
    color: palette.accent,
    fontWeight: '700',
  },
});

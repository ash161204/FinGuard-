import { ReactNode } from 'react';
import {
  Pressable,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
  type TextInputProps,
} from 'react-native';

import { palette, spacing, typography, radii, shadows } from '../theme/tokens';

type CardProps = {
  children: ReactNode;
  tone?: 'default' | 'accent' | 'soft';
};

export function SurfaceCard({ children, tone = 'default' }: CardProps) {
  return (
    <View
      style={[
        styles.card,
        tone === 'accent' && styles.cardAccent,
        tone === 'soft' && styles.cardSoft,
      ]}
    >
      {children}
    </View>
  );
}

type ButtonProps = {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  variant?: 'primary' | 'secondary' | 'ghost';
};

export function AppButton({
  label,
  onPress,
  disabled = false,
  variant = 'primary',
}: ButtonProps) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [
        styles.button,
        variant === 'secondary' && styles.buttonSecondary,
        variant === 'ghost' && styles.buttonGhost,
        disabled && styles.buttonDisabled,
        pressed && !disabled ? styles.buttonPressed : null,
      ]}
    >
      <Text
        style={[
          styles.buttonLabel,
          variant !== 'primary' && styles.buttonLabelSecondary,
          disabled && styles.buttonLabelDisabled,
        ]}
      >
        {label}
      </Text>
    </Pressable>
  );
}

type BadgeProps = {
  label: string;
  tone?: 'neutral' | 'success' | 'warning' | 'danger' | 'accent';
};

export function StatusBadge({ label, tone = 'neutral' }: BadgeProps) {
  return (
    <View
      style={[
        styles.badge,
        tone === 'success' && styles.badgeSuccess,
        tone === 'warning' && styles.badgeWarning,
        tone === 'danger' && styles.badgeDanger,
        tone === 'accent' && styles.badgeAccent,
      ]}
    >
      <Text style={[styles.badgeText, tone === 'accent' && styles.badgeTextAccent]}>{label}</Text>
    </View>
  );
}

type SectionHeaderProps = {
  title: string;
  subtitle?: string;
  aside?: ReactNode;
};

export function SectionHeader({ title, subtitle, aside }: SectionHeaderProps) {
  return (
    <View style={styles.sectionHeader}>
      <View style={styles.sectionText}>
        <Text style={styles.sectionTitle}>{title}</Text>
        {subtitle ? <Text style={styles.sectionSubtitle}>{subtitle}</Text> : null}
      </View>
      {aside}
    </View>
  );
}

type MetricProps = {
  label: string;
  value: string;
  tone?: 'default' | 'accent';
};

export function Metric({ label, value, tone = 'default' }: MetricProps) {
  return (
    <View style={styles.metric}>
      <Text style={styles.metricLabel}>{label}</Text>
      <Text style={[styles.metricValue, tone === 'accent' && styles.metricValueAccent]}>{value}</Text>
    </View>
  );
}

type FieldProps = TextInputProps & {
  label: string;
  helper?: string;
};

export function AppTextField({ label, helper, ...props }: FieldProps) {
  return (
    <View style={styles.fieldGroup}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <TextInput
        {...props}
        placeholderTextColor={palette.muted}
        style={[styles.input, props.multiline ? styles.inputMultiline : null, props.style]}
      />
      {helper ? <Text style={styles.fieldHelper}>{helper}</Text> : null}
    </View>
  );
}

type ToggleProps = {
  label: string;
  value: boolean;
  onValueChange: (value: boolean) => void;
  helper?: string;
};

export function ToggleRow({ label, value, onValueChange, helper }: ToggleProps) {
  return (
    <View style={styles.toggleRow}>
      <View style={styles.toggleText}>
        <Text style={styles.fieldLabel}>{label}</Text>
        {helper ? <Text style={styles.fieldHelper}>{helper}</Text> : null}
      </View>
      <Switch
        value={value}
        onValueChange={onValueChange}
        trackColor={{ true: palette.accentMuted, false: palette.border }}
        thumbColor={value ? palette.accent : palette.surface}
      />
    </View>
  );
}

type EmptyStateProps = {
  title: string;
  body: string;
  action?: ReactNode;
};

export function EmptyState({ title, body, action }: EmptyStateProps) {
  return (
    <SurfaceCard>
      <View style={styles.emptyState}>
        <Text style={styles.emptyTitle}>{title}</Text>
        <Text style={styles.emptyBody}>{body}</Text>
        {action}
      </View>
    </SurfaceCard>
  );
}

type MiniTrendProps = {
  values: number[];
};

export function MiniTrend({ values }: MiniTrendProps) {
    const normalized = values.length
      ? values.map((value) => Math.max(8, Math.min((value / 100) * 120, 120)))
      : [];

    return (
      <View style={styles.trendRow}>
        {normalized.map((height, index) => (
          <View
            key={`${index}-${height}`}
            style={[
              styles.trendBar,
              {
                height,
                backgroundColor: height > 80 ? '#2D60FF' : height > 50 ? '#82A5FF' : '#C4D6FF',
              },
            ]}
          />
        ))}
      </View>
    );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: palette.surface,
    borderRadius: radii.card,
    padding: spacing.md,
    gap: spacing.sm,
    ...shadows.card,
  },
  cardAccent: {
    backgroundColor: palette.accent,
  },
  cardSoft: {
    backgroundColor: '#F5F7FF',
    shadowOpacity: 0,
    elevation: 0,
  },
  button: {
    minHeight: 48,
    borderRadius: 16,
    paddingHorizontal: spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: palette.accent,
  },
  buttonSecondary: {
    backgroundColor: palette.surface,
    borderWidth: 1,
    borderColor: palette.borderStrong,
  },
  buttonGhost: {
    backgroundColor: 'transparent',
  },
  buttonDisabled: {
    opacity: 0.45,
  },
  buttonPressed: {
    transform: [{ scale: 0.98 }],
  },
  buttonLabel: {
    color: palette.accentText,
    fontWeight: '700',
  },
  buttonLabelSecondary: {
    color: palette.text,
  },
  buttonLabelDisabled: {
    color: palette.muted,
  },
  badge: {
    alignSelf: 'flex-start',
    borderRadius: 999,
    paddingVertical: 6,
    paddingHorizontal: 12,
    backgroundColor: '#F0F2F5',
  },
  badgeText: {
    color: palette.text,
    fontSize: typography.caption,
    fontWeight: '700',
  },
  badgeTextAccent: {
    color: palette.accentText,
  },
  badgeSuccess: {
    backgroundColor: '#dceee2',
  },
  badgeWarning: {
    backgroundColor: '#f4e6c6',
  },
  badgeDanger: {
    backgroundColor: '#f2ddd8',
  },
  badgeAccent: {
    backgroundColor: palette.accent,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: spacing.md,
    alignItems: 'flex-start',
  },
  sectionText: {
    flex: 1,
    gap: spacing.xs,
  },
  sectionTitle: {
    fontSize: typography.subtitle,
    color: palette.text,
    fontWeight: '700',
  },
  sectionSubtitle: {
    color: palette.muted,
    lineHeight: 20,
  },
  metric: {
    gap: spacing.xs,
  },
  metricLabel: {
    color: palette.muted,
    fontSize: typography.caption,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  metricValue: {
    color: palette.text,
    fontSize: typography.subtitle,
    fontWeight: '700',
  },
  metricValueAccent: {
    color: palette.accent,
  },
  fieldGroup: {
    gap: spacing.xs,
  },
  fieldLabel: {
    color: palette.text,
    fontWeight: '600',
  },
  fieldHelper: {
    color: palette.muted,
    fontSize: typography.caption,
    lineHeight: 18,
  },
  input: {
    backgroundColor: '#F0F2F5',
    borderRadius: radii.input,
    minHeight: 48,
    paddingHorizontal: spacing.md,
    color: palette.text,
  },
  inputMultiline: {
    minHeight: 96,
    paddingTop: spacing.md,
    textAlignVertical: 'top',
  },
  toggleRow: {
    borderRadius: radii.input,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
    backgroundColor: '#F0F2F5',
  },
  toggleText: {
    flex: 1,
    gap: spacing.xs,
  },
  emptyState: {
    gap: spacing.sm,
  },
  emptyTitle: {
    color: palette.text,
    fontSize: typography.subtitle,
    fontWeight: '700',
  },
  emptyBody: {
    color: palette.muted,
    lineHeight: 22,
  },
  trendRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    gap: 4,
    minHeight: 120,
    paddingTop: 8,
  },
  trendBar: {
    flex: 1,
    borderRadius: 8,
  },
});

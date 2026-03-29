import { ReactNode } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

import { palette, spacing, typography, radii } from '../theme/tokens';

type ScreenScaffoldProps = {
  title: string;
  subtitle: string;
  eyebrow?: string;
  scrollable?: boolean;
  children?: ReactNode;
};

export function ScreenScaffold({
  title,
  subtitle,
  eyebrow,
  scrollable = true,
  children,
}: ScreenScaffoldProps) {
  
  const headerContent = (
    <LinearGradient
      colors={[palette.accent, palette.accentMuted]}
      style={styles.headerGradient}
    >
      <SafeAreaView style={styles.safeAreaTop}>
        <View style={styles.heroContent}>
          {eyebrow ? <Text style={styles.eyebrow}>{eyebrow}</Text> : null}
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.subtitle}>{subtitle}</Text>
        </View>
      </SafeAreaView>
    </LinearGradient>
  );

  const bodyContent = (
    <View style={styles.bodyContainer}>
      <View style={styles.body}>{children}</View>
    </View>
  );

  return (
    <View style={styles.container}>
      {headerContent}
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.avoidingView}
      >
        {scrollable ? (
          <ScrollView
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            {bodyContent}
          </ScrollView>
        ) : (
          <View style={styles.scrollContent}>{bodyContent}</View>
        )}
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: palette.accent,
  },
  safeAreaTop: {
    flex: 1,
  },
  headerGradient: {
    height: '35%',
    width: '100%',
    paddingHorizontal: spacing.xl,
    paddingTop: Platform.OS === 'android' ? spacing.xl : 0,
    justifyContent: 'center',
  },
  heroContent: {
    marginTop: spacing.xl,
    gap: spacing.xs,
  },
  avoidingView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
  },
  bodyContainer: {
    flex: 1,
    backgroundColor: palette.canvas,
    marginTop: -30,
    borderTopLeftRadius: radii.card,
    borderTopRightRadius: radii.card,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xl,
    paddingBottom: 100, // accommodate tabs
  },
  eyebrow: {
    color: palette.accentSoft,
    letterSpacing: 1.6,
    textTransform: 'uppercase',
    fontSize: typography.eyebrow,
    fontWeight: '700',
  },
  title: {
    fontSize: typography.hero,
    fontWeight: '700',
    color: palette.accentText,
  },
  subtitle: {
    fontSize: typography.body,
    color: palette.accentSoft,
    lineHeight: 22,
    marginTop: spacing.xs,
  },
  body: {
    gap: spacing.md,
  },
});

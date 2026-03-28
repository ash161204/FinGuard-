import { useMemo, useState } from "react";
import Slider from "@react-native-community/slider";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
  useWindowDimensions,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { useAppContext } from "../context/AppContext";
import { buildMoneyHealthScore } from "../utils/insightEngine";
import { T } from "../components/theme";
import { ScoreRing } from "../components/Bubbles";
import "../global.css";

const RS = "\u20B9";
const DEFAULT_INCOME = 50000;
const DEFAULT_RATIO = 0.5;

const GOAL_OPTIONS = [
  { value: "Emergency", label: "Stay Protected", icon: "shield-alert-outline", emoji: "\u{1F6E1}" },
  { value: "Savings", label: "Build Wealth", icon: "piggy-bank-outline", emoji: "\u{1F331}" },
  { value: "Debt", label: "Destroy Debt", icon: "credit-card-outline", emoji: "\u{1F525}" },
];

const RISK_OPTIONS = [
  { value: "Safe", label: "Play Safe", icon: "shield-check-outline", subtitle: "Slow & steady", tint: "rgba(126, 206, 193, 0.15)", c: T.teal },
  { value: "Balanced", label: "Balanced", icon: "scale-balance", subtitle: "Safety + growth", tint: "rgba(232, 184, 109, 0.15)", c: T.gold },
  { value: "Bold", label: "YOLO", icon: "rocket-launch-outline", subtitle: "High risk/reward", tint: "rgba(248, 113, 113, 0.15)" , c: T.red },
];

const clamp = (v, lo, hi) => Math.min(Math.max(v, lo), hi);
const digitsOnly = (v) => v.replace(/[^0-9]/g, "");
const roundToStep = (v, step = 500) => Math.round(v / step) * step;
const fmtAmt = (v) => new Intl.NumberFormat("en-IN", { maximumFractionDigits: 0 }).format(Number(v) || 0);

// Needs ratio → label + color
function needsLabel(pct) {
  if (pct <= 40) return { text: "Healthy", color: T.green };
  if (pct <= 60) return { text: "Balanced", color: T.amber };
  if (pct <= 75) return { text: "Tight", color: T.red };
  return { text: "Risky", color: T.red };
}

// Mini input for health section
function MiniInput({ label, value, onChangeText, placeholder, suffix }) {
  return (
    <View style={{ flex: 1, minWidth: "45%" }}>
      <Text style={ms.label}>{label}</Text>
      <View style={ms.inputWrap}>
        <Text style={ms.rs}>{RS}</Text>
        <TextInput
          value={value ? fmtAmt(value) : ""}
          onChangeText={(t) => onChangeText(Number(digitsOnly(t)) || 0)}
          keyboardType="number-pad"
          placeholder={placeholder}
          placeholderTextColor={T.textSec}
          style={ms.input}
        />
        {suffix ? <Text style={ms.suffix}>{suffix}</Text> : null}
      </View>
    </View>
  );
}

function ToggleChip({ label, active, onPress }) {
  return (
    <Pressable onPress={onPress} style={[ms.chip, active && ms.chipActive]}>
      <Text style={[ms.chipText, active && ms.chipTextActive]}>{label}</Text>
    </Pressable>
  );
}

const ms = {
  label: { fontSize: 10, fontWeight: "800", textTransform: "uppercase", letterSpacing: 1.5, color: T.textSec, marginBottom: 6 },
  inputWrap: { flexDirection: "row", alignItems: "center", borderRadius: T.radiusSm, backgroundColor: "rgba(255,255,255,0.05)", borderWidth: 1, borderColor: T.cardBorder, paddingHorizontal: 12, paddingVertical: 10 },
  rs: { fontSize: 16, fontWeight: "900", color: T.teal, marginRight: 6 },
  input: { flex: 1, fontSize: 18, fontWeight: "800", color: T.text },
  suffix: { fontSize: 10, color: T.textSec, marginLeft: 4 },
  chip: { borderRadius: 20, paddingHorizontal: 14, paddingVertical: 8, borderWidth: 1, borderColor: T.cardBorder, backgroundColor: "transparent" },
  chipActive: { backgroundColor: "rgba(126, 206, 193, 0.1)", borderColor: T.teal },
  chipText: { fontSize: 12, fontWeight: "600", color: T.textSec },
  chipTextActive: { color: T.teal, fontWeight: "800" },
};

// ═══════════════════════════════════════════════════════
// PAGE 1 — Baseline Builder (Onboarding)
// ═══════════════════════════════════════════════════════

export default function OnboardingScreen() {
  const { height } = useWindowDimensions();
  const compact = height < 820;
  const {
    income,
    needsSliderAmount,
    primaryGoal,
    riskVibe,
    healthInputs,
    setNeedsSliderAmount,
    setPrimaryGoal,
    setRiskVibe,
    setHealthInputs,
    saveOnboarding,
    resetSwipedTotals,
  } = useAppContext();

  const [showHealthSection, setShowHealthSection] = useState(false);
  const [showLiteScore, setShowLiteScore] = useState(false);

  const sliderMax = Math.max(income, DEFAULT_INCOME);
  const needsPct = income ? Math.round((needsSliderAmount / income) * 100) : 0;
  const nl = needsLabel(needsPct);
  const canSubmit = income > 0 && needsSliderAmount > 0;

  const liteHealth = useMemo(
    () => buildMoneyHealthScore(healthInputs, income, needsSliderAmount, null, null),
    [healthInputs, income, needsSliderAmount]
  );

  const handleIncomeChange = (value) => {
    const nextIncome = Number(digitsOnly(value)) || 0;
    const ratio = income > 0 ? clamp(needsSliderAmount / income, 0, 1) : DEFAULT_RATIO;
    const nextNeeds = nextIncome ? clamp(roundToStep(nextIncome * ratio), 0, nextIncome) : 0;
    saveOnboarding({ income: nextIncome, needsSliderAmount: nextNeeds, primaryGoal, riskVibe });
  };
  const handleNeedsChange = (value) => setNeedsSliderAmount(clamp(roundToStep(value), 0, income || sliderMax));
  
  const handleDefaults = () => {
    saveOnboarding({
      income: DEFAULT_INCOME, needsSliderAmount: roundToStep(DEFAULT_INCOME * DEFAULT_RATIO),
      primaryGoal: "Emergency", riskVibe: "Balanced",
      healthInputs: { emergencyFund: 150000, healthInsuranceCover: 500000, termLifeCover: 0, hasDependents: false, totalMonthlyEMI: 0, hasRevolvingCCDebt: false, monthlyRetirementSaving: 5000 },
    });
  };

  const handleSubmit = () => {
    if (!canSubmit) return;
    saveOnboarding({ income, needsSliderAmount, primaryGoal, riskVibe, healthInputs });
    resetSwipedTotals();
    setShowLiteScore(true);
  };

  const handleContinue = () => router.push("/interstitial");
  const progressStep = showLiteScore ? 1 : 0;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: T.bg }} edges={["top", "bottom"]}>
      <KeyboardAvoidingView behavior={Platform.select({ ios: "padding", android: undefined })} style={{ flex: 1 }}>
        <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingHorizontal: 20, paddingTop: compact ? 22 : 34, paddingBottom: 40 }} showsVerticalScrollIndicator={false}>
          
          {/* Progress Bar */}
          <View style={{ flexDirection: "row", gap: 6, marginBottom: 20 }}>
            {["Setup", "Docs", "Dashboard"].map((label, i) => (
              <View key={label} style={{ flex: 1, alignItems: "center" }}>
                <View style={{ height: 4, borderRadius: 2, width: "100%", backgroundColor: i <= progressStep ? T.gold : "rgba(255,255,255,0.06)" }} />
                <Text style={{ fontSize: 9, fontWeight: "800", textTransform: "uppercase", color: i <= progressStep ? T.gold : T.textSec, marginTop: 4 }}>{label}</Text>
              </View>
            ))}
          </View>

          {/* Header */}
          <View style={{ marginBottom: 24, alignItems: "center" }}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 8 }}>
              <Ionicons name="sparkles" size={18} color={T.gold} />
              <Text style={{ fontSize: 13, fontWeight: "900", color: T.gold, letterSpacing: 2, textTransform: "uppercase" }}>FinBuddy Setup</Text>
            </View>
            <Text style={{ fontSize: 32, fontWeight: "900", color: T.text, textAlign: "center", fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif' }}>Build your safety net.</Text>
            <Text style={{ marginTop: 8, fontSize: 14, color: T.textSec, textAlign: "center", lineHeight: 22 }}>Quick setup. Zero jargon. Complete this to unlock your Dashboard.</Text>
          </View>

          {/* Core Inputs */}
          <View style={cardStyle}>
            <View style={{ alignItems: "center" }}>
              <Pressable onPress={handleDefaults} style={{ borderRadius: 20, borderWidth: 1, borderColor: "rgba(232, 184, 109, 0.2)", backgroundColor: "rgba(232, 184, 109, 0.05)", paddingHorizontal: 16, paddingVertical: 8 }}>
                <Text style={{ fontSize: 11, fontWeight: "800", color: T.gold, textTransform: "uppercase", letterSpacing: 1 }}>Use Smart Defaults</Text>
              </Pressable>
            </View>

            <View>
              <Text style={sectionLabel}>Monthly Take-Home Income</Text>
              <View style={{ borderRadius: T.radiusSm, backgroundColor: "rgba(255,255,255,0.03)", borderWidth: 1, borderColor: T.cardBorder, paddingHorizontal: 16, paddingVertical: 14 }}>
                <View style={{ flexDirection: "row", alignItems: "center" }}>
                  <Text style={{ fontSize: 28, fontWeight: "900", color: T.teal, marginRight: 8 }}>{RS}</Text>
                  <TextInput
                    value={income ? fmtAmt(income) : ""}
                    onChangeText={handleIncomeChange}
                    keyboardType="number-pad"
                    placeholder="50,000"
                    placeholderTextColor={T.textSec}
                    style={{ flex: 1, fontSize: 32, fontWeight: "900", color: T.text }}
                  />
                </View>
              </View>
            </View>

            <View>
              <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                <Text style={sectionLabel}>Monthly Needs (Rent/Bills)</Text>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                  <Text style={{ fontSize: 13, fontWeight: "900", color: T.text }}>{needsPct}%</Text>
                  <View style={{ borderRadius: 8, backgroundColor: nl.color + "22", paddingHorizontal: 8, paddingVertical: 3 }}>
                    <Text style={{ fontSize: 10, fontWeight: "900", textTransform: "uppercase", color: nl.color }}>{nl.text}</Text>
                  </View>
                </View>
              </View>

              <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-end", marginBottom: 12 }}>
                <Text style={{ fontSize: 26, fontWeight: "900", color: T.text, fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif' }}>{RS}{fmtAmt(needsSliderAmount)}</Text>
              </View>

              <View style={{ borderRadius: 16, backgroundColor: "rgba(255,255,255,0.03)", paddingHorizontal: 8, paddingVertical: 8 }}>
                <Slider
                  value={needsSliderAmount}
                  onValueChange={handleNeedsChange}
                  minimumValue={0}
                  maximumValue={sliderMax}
                  step={500}
                  minimumTrackTintColor={nl.color}
                  maximumTrackTintColor="rgba(255,255,255,0.1)"
                  thumbTintColor={T.teal}
                  style={{ height: compact ? 38 : 44 }}
                />
              </View>
            </View>
          </View>

          {/* Personality Layer */}
          <View style={[cardStyle, { marginTop: 16 }]}>
            <View>
              <Text style={sectionLabel}>Primary Goal</Text>
              <View style={{ flexDirection: "row", gap: 8 }}>
                {GOAL_OPTIONS.map((o) => {
                  const sel = primaryGoal === o.value;
                  return (
                    <Pressable
                      key={o.value}
                      onPress={() => setPrimaryGoal(o.value)}
                      style={{
                        flex: 1, alignItems: "center", borderRadius: T.radiusSm, paddingVertical: 14,
                        backgroundColor: sel ? "rgba(126, 206, 193, 0.1)" : "rgba(255,255,255,0.02)",
                        borderWidth: 1.5, borderColor: sel ? T.teal : T.cardBorder,
                      }}
                    >
                      <Text style={{ fontSize: 24, marginBottom: 8 }}>{o.emoji}</Text>
                      <Text style={{ fontSize: 11, fontWeight: "800", color: sel ? T.teal : T.textSec, textAlign: "center" }}>{o.label}</Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>

            <View>
              <Text style={sectionLabel}>Risk Tolerance</Text>
              <View style={{ flexDirection: "row", borderRadius: T.radiusSm, backgroundColor: "rgba(255,255,255,0.02)", padding: 4, gap: 4 }}>
                {RISK_OPTIONS.map((o) => {
                  const sel = riskVibe === o.value;
                  return (
                    <Pressable
                      key={o.value}
                      onPress={() => setRiskVibe(o.value)}
                      style={{ flex: 1, borderRadius: 10, paddingVertical: 12, alignItems: "center", backgroundColor: sel ? o.tint : "transparent" }}
                    >
                      <MaterialCommunityIcons name={o.icon} size={20} color={sel ? o.c : T.textSec} />
                      <Text style={{ marginTop: 6, fontSize: 10, fontWeight: "900", textTransform: "uppercase", letterSpacing: 1, color: sel ? o.c : T.textSec }}>
                        {o.label}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>
          </View>

          {/* Health Inputs */}
          <Pressable
            onPress={() => setShowHealthSection(!showHealthSection)}
            style={{ marginTop: 16, borderRadius: T.radiusSm, backgroundColor: T.card, paddingHorizontal: 18, paddingVertical: 16, flexDirection: "row", alignItems: "center", justifyContent: "space-between", borderWidth: 1, borderColor: T.cardBorder }}
          >
            <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
              <MaterialCommunityIcons name="heart-pulse" size={20} color={T.gold} />
              <View>
                <Text style={{ fontSize: 15, fontWeight: "800", color: T.text }}>{showHealthSection ? "Financial Health Check" : "Deepen your profile (Optional)"}</Text>
              </View>
            </View>
            <Ionicons name={showHealthSection ? "chevron-up" : "chevron-down"} size={20} color={T.textSec} />
          </Pressable>

          {showHealthSection && (
            <View style={[cardStyle, { marginTop: 8 }]}>
              <View style={{ flexDirection: "row", gap: 12, flexWrap: "wrap" }}>
                <MiniInput label="Emergency Fund" value={healthInputs.emergencyFund} onChangeText={(v) => setHealthInputs({ emergencyFund: v })} placeholder="1,50,000" />
                <MiniInput label="Health Insurance" value={healthInputs.healthInsuranceCover} onChangeText={(v) => setHealthInputs({ healthInsuranceCover: v })} placeholder="5,00,000" />
              </View>
              <View style={{ flexDirection: "row", gap: 12, flexWrap: "wrap" }}>
                <MiniInput label="Term Life" value={healthInputs.termLifeCover} onChangeText={(v) => setHealthInputs({ termLifeCover: v })} placeholder="0" />
                <MiniInput label="Monthly EMIs" value={healthInputs.totalMonthlyEMI} onChangeText={(v) => setHealthInputs({ totalMonthlyEMI: v })} placeholder="0" />
              </View>
              <MiniInput label="Monthly Retirement Savings" value={healthInputs.monthlyRetirementSaving} onChangeText={(v) => setHealthInputs({ monthlyRetirementSaving: v })} placeholder="5,000" />

              <View>
                <Text style={ms.label}>Quick Checks</Text>
                <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
                  <ToggleChip label={healthInputs.hasDependents ? "Has Dependents" : "No Dependents"} active={healthInputs.hasDependents} onPress={() => setHealthInputs({ hasDependents: !healthInputs.hasDependents })} />
                  <ToggleChip label={healthInputs.hasRevolvingCCDebt ? "CC Debt: Yes" : "CC Debt: No"} active={healthInputs.hasRevolvingCCDebt} onPress={() => setHealthInputs({ hasRevolvingCCDebt: !healthInputs.hasRevolvingCCDebt })} />
                </View>
              </View>
            </View>
          )}

          {/* Lite Score Screen */}
          {showLiteScore && (
            <View style={[cardStyle, { marginTop: 20, alignItems: "center", borderWidth: 2, borderColor: T.gold }]}>
               <Text style={{ fontSize: 13, fontWeight: "900", letterSpacing: 2, textTransform: "uppercase", color: T.gold, marginBottom: 16 }}>Your Snapshot</Text>
               <ScoreRing score={liteHealth.overallScore} grade={liteHealth.overallGrade} color={liteHealth.overallScore >= 70 ? T.green : liteHealth.overallScore >= 40 ? T.amber : T.red} size={150} />
               <Text style={{ marginTop: 20, fontSize: 16, fontWeight: "800", color: T.text, textAlign: "center" }}>
                 {liteHealth.overallScore >= 80 ? "You're financially strong!" : liteHealth.overallScore >= 60 ? "Good foundations, room to grow." : "Let's build your safety net."}
               </Text>
               
               <Pressable onPress={handleContinue} style={{ marginTop: 24, width: "100%", borderRadius: T.radiusFull, backgroundColor: T.gold, paddingVertical: 18, alignItems: "center" }}>
                  <Text style={{ fontSize: 16, fontWeight: "900", color: T.textOnAccent }}>Continue to Dashboard</Text>
               </Pressable>
            </View>
          )}

          {/* Submit CTA */}
          {!showLiteScore && (
            <Pressable onPress={handleSubmit} disabled={!canSubmit} style={{ marginTop: 24, borderRadius: T.radiusFull, backgroundColor: canSubmit ? T.gold : "rgba(232, 184, 109, 0.4)", paddingVertical: 18, alignItems: "center" }}>
              <Text style={{ fontSize: 16, fontWeight: "900", color: canSubmit ? T.textOnAccent : T.textSec, textTransform: "uppercase", letterSpacing: 1 }}>{canSubmit ? "Compute Baseline Score" : "Fill Details Above"}</Text>
            </Pressable>
          )}
          
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const cardStyle = { borderRadius: T.radius, backgroundColor: T.card, padding: 20, gap: 20, borderWidth: 1, borderColor: T.cardBorder };
const sectionLabel = { fontSize: 11, fontWeight: "800", textTransform: "uppercase", letterSpacing: 1.5, color: T.textSec, marginBottom: 8 };

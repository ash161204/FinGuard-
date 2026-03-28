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

import { useAppContext } from "../context/AppContext";
import { buildMoneyHealthScore } from "../utils/insightEngine";
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
  { value: "Safe", label: "Play Safe", icon: "shield-check-outline", subtitle: "Slow and steady", tint: "#E6F9F1" },
  { value: "Balanced", label: "Balanced", icon: "scale-balance", subtitle: "Safety plus growth", tint: "#EDE1FF" },
  { value: "Bold", label: "YOLO", icon: "rocket-launch-outline", subtitle: "High risk, high reward", tint: "#FEE2E2" },
];

const clamp = (v, lo, hi) => Math.min(Math.max(v, lo), hi);
const digitsOnly = (v) => v.replace(/[^0-9]/g, "");
const roundToStep = (v, step = 500) => Math.round(v / step) * step;
const fmtAmt = (v) => new Intl.NumberFormat("en-IN", { maximumFractionDigits: 0 }).format(Number(v) || 0);

// ── Needs ratio → label + color ──
function needsLabel(pct) {
  if (pct <= 40) return { text: "Healthy", color: "#16A34A" };
  if (pct <= 60) return { text: "Balanced", color: "#EAB308" };
  if (pct <= 75) return { text: "Tight", color: "#EA580C" };
  return { text: "Risky", color: "#DC2626" };
}

// ── Mini input for health section ──
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
          placeholderTextColor="#9CA3AF"
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
  label: { fontSize: 10, fontWeight: "700", textTransform: "uppercase", letterSpacing: 1.8, color: "rgba(98,85,121,0.7)", marginBottom: 6 },
  inputWrap: { flexDirection: "row", alignItems: "center", borderRadius: 16, backgroundColor: "#F5F6F7", borderWidth: 1, borderColor: "rgba(0,104,79,0.05)", paddingHorizontal: 12, paddingVertical: 10 },
  rs: { fontSize: 16, fontWeight: "800", color: "#00684F", marginRight: 6 },
  input: { flex: 1, fontSize: 18, fontWeight: "800", color: "#2C2F30" },
  suffix: { fontSize: 10, color: "#9CA3AF", marginLeft: 4 },
  chip: { borderRadius: 20, paddingHorizontal: 14, paddingVertical: 8, borderWidth: 1, borderColor: "#E2E8F0", backgroundColor: "#FAFAFA" },
  chipActive: { backgroundColor: "#E6F9F1", borderColor: "#9AF2D0" },
  chipText: { fontSize: 12, fontWeight: "600", color: "#94A3B8" },
  chipTextActive: { color: "#00684F", fontWeight: "700" },
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

  // Lite Health Score (computed from onboarding inputs only, no docs)
  const liteHealth = useMemo(
    () => buildMoneyHealthScore(healthInputs, income, needsSliderAmount, null, null),
    [healthInputs, income, needsSliderAmount],
  );

  const handleIncomeChange = (value) => {
    const nextIncome = Number(digitsOnly(value)) || 0;
    const ratio = income > 0 ? clamp(needsSliderAmount / income, 0, 1) : DEFAULT_RATIO;
    const nextNeeds = nextIncome ? clamp(roundToStep(nextIncome * ratio), 0, nextIncome) : 0;
    saveOnboarding({ income: nextIncome, needsSliderAmount: nextNeeds, primaryGoal, riskVibe });
  };

  const handleNeedsChange = (value) => {
    setNeedsSliderAmount(clamp(roundToStep(value), 0, income || sliderMax));
  };

  const handleDefaults = () => {
    saveOnboarding({
      income: DEFAULT_INCOME,
      needsSliderAmount: roundToStep(DEFAULT_INCOME * DEFAULT_RATIO),
      primaryGoal: "Emergency",
      riskVibe: "Balanced",
      healthInputs: {
        emergencyFund: 150000,
        healthInsuranceCover: 500000,
        termLifeCover: 0,
        hasDependents: false,
        totalMonthlyEMI: 0,
        hasRevolvingCCDebt: false,
        monthlyRetirementSaving: 5000,
      },
    });
  };

  const handleSubmit = () => {
    if (!canSubmit) return;
    saveOnboarding({ income, needsSliderAmount, primaryGoal, riskVibe, healthInputs });
    resetSwipedTotals();
    setShowLiteScore(true);
  };

  const handleContinue = () => {
    router.push("/interstitial");
  };

  // ── Progress steps ──
  const progressStep = showLiteScore ? 1 : 0;

  return (
    <LinearGradient colors={["#F6F7F4", "#F6FBF7", "#FFFDF8"]} style={{ flex: 1 }}>
      <KeyboardAvoidingView behavior={Platform.select({ ios: "padding", android: undefined })} style={{ flex: 1 }}>
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{ paddingHorizontal: 20, paddingTop: compact ? 42 : 54, paddingBottom: 40 }}
          showsVerticalScrollIndicator={false}
        >
          {/* ── Progress Bar ── */}
          <View style={{ flexDirection: "row", gap: 6, marginBottom: 16 }}>
            {["Setup", "Docs", "Dashboard"].map((label, i) => (
              <View key={label} style={{ flex: 1, alignItems: "center" }}>
                <View style={{
                  height: 4, borderRadius: 2, width: "100%",
                  backgroundColor: i <= progressStep ? "#16A34A" : "#E2E8F0",
                }} />
                <Text style={{ fontSize: 9, fontWeight: "700", color: i <= progressStep ? "#16A34A" : "#94A3B8", marginTop: 4 }}>
                  {label}
                </Text>
              </View>
            ))}
          </View>

          {/* ── Header ── */}
          <View style={{ marginBottom: 16, alignItems: "center" }}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 8 }}>
              <Ionicons name="shield-checkmark-outline" size={18} color="#00684F" />
              <Text style={{ fontSize: 14, fontWeight: "800", color: "#00684F" }}>FinGuard AI</Text>
            </View>
            <Text style={{ fontSize: 26, fontWeight: "900", color: "#2C2F30", textAlign: "center" }}>
              Build your safety net.
            </Text>
            <Text style={{ marginTop: 6, fontSize: 13, color: "#64748B", textAlign: "center", lineHeight: 20 }}>
              Quick setup. Warm guidance. Zero money jargon.
            </Text>
          </View>

          {/* ═══ SECTION A: Core Inputs ═══ */}
          <View style={{
            borderRadius: 24, backgroundColor: "#FFFFFF", padding: 18, gap: 18,
            shadowColor: "#112236", shadowOpacity: 0.06, shadowRadius: 16, shadowOffset: { width: 0, height: 6 }, elevation: 3,
          }}>
            {/* Smart defaults pill */}
            <View style={{ alignItems: "center" }}>
              <Pressable onPress={handleDefaults} style={{
                borderRadius: 20, borderWidth: 1, borderColor: "rgba(0,104,79,0.15)",
                backgroundColor: "rgba(0,104,79,0.04)", paddingHorizontal: 14, paddingVertical: 6,
              }}>
                <Text style={{ fontSize: 11, fontWeight: "700", color: "#00684F" }}>Use smart defaults</Text>
              </Pressable>
            </View>

            {/* Monthly Income */}
            <View>
              <Text style={sectionLabel}>Monthly Income</Text>
              <View style={{ borderRadius: 20, backgroundColor: "#F5F6F7", borderWidth: 1, borderColor: "rgba(0,104,79,0.05)", paddingHorizontal: 16, paddingVertical: 14 }}>
                <View style={{ flexDirection: "row", alignItems: "center" }}>
                  <Text style={{ fontSize: 24, fontWeight: "900", color: "#00684F", marginRight: 8 }}>{RS}</Text>
                  <TextInput
                    value={income ? fmtAmt(income) : ""}
                    onChangeText={handleIncomeChange}
                    keyboardType="number-pad"
                    placeholder="50,000"
                    placeholderTextColor="#9CA3AF"
                    style={{ flex: 1, fontSize: 30, fontWeight: "900", color: "#2C2F30" }}
                  />
                </View>
              </View>
              <Text style={{ marginTop: 6, textAlign: "center", fontSize: 11, color: "#94A3B8" }}>
                Monthly take-home after tax
              </Text>
            </View>

            {/* Monthly Needs Slider + Live Insight */}
            <View>
              <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                <Text style={sectionLabel}>Monthly Needs</Text>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                  <Text style={{ fontSize: 13, fontWeight: "800", color: "#2C2F30" }}>{needsPct}%</Text>
                  <View style={{ borderRadius: 8, backgroundColor: nl.color + "18", paddingHorizontal: 8, paddingVertical: 3 }}>
                    <Text style={{ fontSize: 11, fontWeight: "800", color: nl.color }}>{nl.text}</Text>
                  </View>
                </View>
              </View>

              <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-end", marginBottom: 6 }}>
                <Text style={{ fontSize: 24, fontWeight: "900", color: "#2C2F30" }}>{RS}{fmtAmt(needsSliderAmount)}</Text>
                <Text style={{ fontSize: 10, color: "#94A3B8", textTransform: "uppercase", letterSpacing: 1 }}>Rent / bills / groceries</Text>
              </View>

              <View style={{ borderRadius: 16, backgroundColor: "#EEF2EF", paddingHorizontal: 8, paddingVertical: 6 }}>
                <Slider
                  value={needsSliderAmount}
                  onValueChange={handleNeedsChange}
                  minimumValue={0}
                  maximumValue={sliderMax}
                  step={500}
                  minimumTrackTintColor={nl.color}
                  maximumTrackTintColor="#D7DEE0"
                  thumbTintColor="#00684F"
                  style={{ height: compact ? 38 : 44, transform: [{ scaleY: compact ? 1.4 : 1.6 }] }}
                />
              </View>

              {/* Live insight */}
              <Text style={{ marginTop: 8, fontSize: 12, color: "#607081", textAlign: "center" }}>
                {needsPct <= 40
                  ? "Great! You have plenty of room for savings and investments."
                  : needsPct <= 60
                  ? "Balanced. You can save and invest with discipline."
                  : needsPct <= 75
                  ? "Your expenses are high. Consider trimming discretionary spending."
                  : "Most of your income goes to essentials. Building a buffer is critical."}
              </Text>
            </View>
          </View>

          {/* ═══ SECTION B: Personality Layer ═══ */}
          <View style={{
            marginTop: 14, borderRadius: 24, backgroundColor: "#FFFFFF", padding: 18, gap: 14,
            shadowColor: "#112236", shadowOpacity: 0.06, shadowRadius: 16, shadowOffset: { width: 0, height: 6 }, elevation: 3,
          }}>
            {/* Main Goal */}
            <View>
              <Text style={sectionLabel}>Main Goal</Text>
              <View style={{ flexDirection: "row", gap: 8 }}>
                {GOAL_OPTIONS.map((o) => {
                  const sel = primaryGoal === o.value;
                  return (
                    <Pressable
                      key={o.value}
                      onPress={() => setPrimaryGoal(o.value)}
                      style={{
                        flex: 1, alignItems: "center", borderRadius: 18, paddingVertical: 14,
                        backgroundColor: sel ? "#E6F9F1" : "#FAFAFA",
                        borderWidth: 1.5, borderColor: sel ? "#9AF2D0" : "#E2E8F0",
                      }}
                    >
                      <Text style={{ fontSize: 22, marginBottom: 6 }}>{o.emoji}</Text>
                      <Text style={{ fontSize: 11, fontWeight: "800", color: sel ? "#00684F" : "#64748B" }}>{o.label}</Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>

            {/* Risk Vibe */}
            <View>
              <Text style={sectionLabel}>Risk Vibe</Text>
              <View style={{ flexDirection: "row", borderRadius: 18, backgroundColor: "#F7F7FB", padding: 4, gap: 4 }}>
                {RISK_OPTIONS.map((o) => {
                  const sel = riskVibe === o.value;
                  return (
                    <Pressable
                      key={o.value}
                      onPress={() => setRiskVibe(o.value)}
                      style={{
                        flex: 1, borderRadius: 14, paddingVertical: 10, alignItems: "center",
                        backgroundColor: sel ? o.tint : "transparent",
                      }}
                    >
                      <MaterialCommunityIcons name={o.icon} size={18} color={sel ? "#403455" : "#94A3B8"} />
                      <Text style={{ marginTop: 4, fontSize: 10, fontWeight: "800", textTransform: "uppercase", letterSpacing: 1, color: sel ? "#403455" : "#94A3B8" }}>
                        {o.label}
                      </Text>
                      {!compact && <Text style={{ marginTop: 2, fontSize: 9, color: "#94A3B8" }}>{o.subtitle}</Text>}
                    </Pressable>
                  );
                })}
              </View>
            </View>
          </View>

          {/* ═══ SECTION C: Optional Deep Inputs (Accordion) ═══ */}
          <Pressable
            onPress={() => setShowHealthSection(!showHealthSection)}
            style={{
              marginTop: 14, borderRadius: 20, backgroundColor: "#FFFFFF", paddingHorizontal: 16, paddingVertical: 14,
              flexDirection: "row", alignItems: "center", justifyContent: "space-between",
              shadowColor: "#112236", shadowOpacity: 0.04, shadowRadius: 10, shadowOffset: { width: 0, height: 4 }, elevation: 2,
            }}
          >
            <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
              <MaterialCommunityIcons name="heart-pulse" size={18} color="#00684F" />
              <View>
                <Text style={{ fontSize: 13, fontWeight: "800", color: "#2C2F30" }}>
                  {showHealthSection ? "Financial Health Check" : "Improve your score \u2192 Add more details"}
                </Text>
                <Text style={{ fontSize: 10, color: "#94A3B8", marginTop: 2 }}>Optional - Powers your Money Health Score</Text>
              </View>
            </View>
            <Ionicons name={showHealthSection ? "chevron-up" : "chevron-down"} size={18} color="#94A3B8" />
          </Pressable>

          {showHealthSection && (
            <View style={{
              marginTop: 8, borderRadius: 24, backgroundColor: "#FFFFFF", padding: 16, gap: 16,
              shadowColor: "#112236", shadowOpacity: 0.04, shadowRadius: 10, shadowOffset: { width: 0, height: 4 }, elevation: 2,
            }}>
              <View style={{ flexDirection: "row", gap: 12, flexWrap: "wrap" }}>
                <MiniInput label="Emergency Fund" value={healthInputs.emergencyFund} onChangeText={(v) => setHealthInputs({ emergencyFund: v })} placeholder="1,50,000" suffix="savings" />
                <MiniInput label="Health Insurance Cover" value={healthInputs.healthInsuranceCover} onChangeText={(v) => setHealthInputs({ healthInsuranceCover: v })} placeholder="5,00,000" />
              </View>
              <View style={{ flexDirection: "row", gap: 12, flexWrap: "wrap" }}>
                <MiniInput label="Term Life Cover" value={healthInputs.termLifeCover} onChangeText={(v) => setHealthInputs({ termLifeCover: v })} placeholder="0" />
                <MiniInput label="Monthly EMIs" value={healthInputs.totalMonthlyEMI} onChangeText={(v) => setHealthInputs({ totalMonthlyEMI: v })} placeholder="0" suffix="/mo" />
              </View>
              <MiniInput label="Monthly Retirement Savings (EPF + NPS + SIPs)" value={healthInputs.monthlyRetirementSaving} onChangeText={(v) => setHealthInputs({ monthlyRetirementSaving: v })} placeholder="5,000" suffix="/mo" />

              {/* Section D: Quick Flags (Pills) */}
              <View>
                <Text style={ms.label}>Quick Checks</Text>
                <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
                  <ToggleChip label={healthInputs.hasDependents ? "Has Dependents" : "No Dependents"} active={healthInputs.hasDependents} onPress={() => setHealthInputs({ hasDependents: !healthInputs.hasDependents })} />
                  <ToggleChip label={healthInputs.hasRevolvingCCDebt ? "CC Debt: Yes" : "CC Debt: No"} active={healthInputs.hasRevolvingCCDebt} onPress={() => setHealthInputs({ hasRevolvingCCDebt: !healthInputs.hasRevolvingCCDebt })} />
                </View>
              </View>
            </View>
          )}

          {/* ═══ Lite Score Card (shown after submit) ═══ */}
          {showLiteScore && (
            <View style={{
              marginTop: 18, borderRadius: 24, backgroundColor: "#FFFFFF", padding: 22, alignItems: "center",
              shadowColor: "#112236", shadowOpacity: 0.08, shadowRadius: 20, shadowOffset: { width: 0, height: 8 }, elevation: 4,
            }}>
              <Text style={{ fontSize: 11, fontWeight: "800", textTransform: "uppercase", letterSpacing: 2, color: "#94A3B8" }}>
                Your Money Health
              </Text>

              {/* Score ring */}
              <View style={{
                marginTop: 14, width: 100, height: 100, borderRadius: 50, borderWidth: 5,
                borderColor: liteHealth.overallScore >= 70 ? "#16A34A" : liteHealth.overallScore >= 40 ? "#EAB308" : "#DC2626",
                alignItems: "center", justifyContent: "center",
              }}>
                <Text style={{ fontSize: 32, fontWeight: "900", color: "#2C2F30" }}>{liteHealth.overallScore}</Text>
                <Text style={{ fontSize: 14, fontWeight: "800", color: liteHealth.overallScore >= 70 ? "#16A34A" : liteHealth.overallScore >= 40 ? "#EAB308" : "#DC2626", marginTop: -2 }}>
                  {liteHealth.overallGrade}
                </Text>
              </View>

              <Text style={{ marginTop: 10, fontSize: 15, fontWeight: "800", color: "#2C2F30" }}>
                {liteHealth.overallScore >= 80 ? "You're financially strong!" : liteHealth.overallScore >= 60 ? "Good foundations, room to grow." : liteHealth.overallScore >= 40 ? "Needs work in a few areas." : "Let's build your safety net."}
              </Text>

              {/* Confidence badge */}
              <View style={{ marginTop: 8, borderRadius: 12, backgroundColor: "#FFF7ED", paddingHorizontal: 12, paddingVertical: 6 }}>
                <Text style={{ fontSize: 11, fontWeight: "700", color: "#EA580C" }}>
                  Low Confidence — Based on limited data
                </Text>
              </View>

              {/* Mini dimension pills */}
              <View style={{ marginTop: 14, flexDirection: "row", flexWrap: "wrap", gap: 6, justifyContent: "center" }}>
                {liteHealth.dimensions.map((d) => {
                  const c = d.score >= 70 ? "#16A34A" : d.score >= 40 ? "#EAB308" : "#DC2626";
                  return (
                    <View key={d.id} style={{ borderRadius: 10, backgroundColor: c + "14", paddingHorizontal: 10, paddingVertical: 5 }}>
                      <Text style={{ fontSize: 10, fontWeight: "800", color: c }}>{d.name} {d.score}</Text>
                    </View>
                  );
                })}
              </View>

              {/* CTA */}
              <Pressable
                onPress={handleContinue}
                style={{
                  marginTop: 18, width: "100%", borderRadius: 18, backgroundColor: "#00684F",
                  paddingVertical: 16, alignItems: "center",
                }}
              >
                <Text style={{ fontSize: 16, fontWeight: "900", color: "#FFFFFF" }}>Get Accurate Score</Text>
                <Text style={{ fontSize: 11, color: "#9AF2D0", marginTop: 2 }}>Upload documents for deeper insights</Text>
              </Pressable>
            </View>
          )}

          {/* ═══ Submit Button (hidden when score shown) ═══ */}
          {!showLiteScore && (
            <View style={{ marginTop: 18 }}>
              <LinearGradient
                colors={canSubmit ? ["#9AF2D0", "#7BE2BD"] : ["#CBD5E1", "#CBD5E1"]}
                start={{ x: 0.2, y: 0 }}
                end={{ x: 0.8, y: 1 }}
                style={{ borderRadius: 24 }}
              >
                <Pressable
                  onPress={handleSubmit}
                  disabled={!canSubmit}
                  style={{ alignItems: "center", justifyContent: "center", borderRadius: 24, paddingHorizontal: 24, paddingVertical: 16 }}
                >
                  <Text style={{ fontSize: 17, fontWeight: "900", color: "#163B31" }}>See My Score</Text>
                </Pressable>
              </LinearGradient>
              <Text style={{ marginTop: 8, textAlign: "center", fontSize: 10, color: "#94A3B8", fontStyle: "italic" }}>
                Private by default. Your data stays on your device.
              </Text>
            </View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </LinearGradient>
  );
}

const sectionLabel = {
  fontSize: 10, fontWeight: "700", textTransform: "uppercase", letterSpacing: 2.2,
  color: "rgba(98,85,121,0.7)", marginBottom: 6,
};

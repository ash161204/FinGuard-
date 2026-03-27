import Slider from "@react-native-community/slider";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  Text,
  TextInput,
  View,
  useWindowDimensions,
} from "react-native";

import { useAppContext } from "../context/AppContext";
import "../global.css";

const RS = "\u20B9";
const DEFAULT_INCOME = 50000;
const DEFAULT_RATIO = 0.5;

const GOAL_OPTIONS = [
  { value: "Emergency", label: "Stay Protected", icon: "shield-alert-outline", emoji: "🚨" },
  { value: "Savings", label: "Grow Savings", icon: "piggy-bank-outline", emoji: "🐖" },
  { value: "Debt", label: "Kill Debt", icon: "credit-card-outline", emoji: "💳" },
];

const RISK_OPTIONS = [
  { value: "Safe", label: "Play Safe", icon: "shield-check-outline", subtitle: "Slow and steady" },
  { value: "Balanced", label: "Balanced", icon: "scale-balance", subtitle: "Safety plus growth" },
  { value: "Bold", label: "YOLO", icon: "rocket-launch-outline", subtitle: "High risk, high reward" },
];

const clamp = (value, min, max) => Math.min(Math.max(value, min), max);
const digitsOnly = (value) => value.replace(/[^0-9]/g, "");
const roundToStep = (value, step = 500) => Math.round(value / step) * step;
const formatAmount = (value) =>
  new Intl.NumberFormat("en-IN", { maximumFractionDigits: 0 }).format(Number(value) || 0);

export default function OnboardingScreen() {
  const { height } = useWindowDimensions();
  const compact = height < 820;
  const {
    income,
    needsSliderAmount,
    primaryGoal,
    riskVibe,
    setNeedsSliderAmount,
    setPrimaryGoal,
    setRiskVibe,
    saveOnboarding,
    resetSwipedTotals,
  } = useAppContext();

  const sliderMax = Math.max(income, DEFAULT_INCOME);
  const needsShareLabel = income ? `${Math.round((needsSliderAmount / income) * 100)}%` : "0%";
  const canSubmit = income > 0 && needsSliderAmount > 0;

  const handleIncomeChange = (value) => {
    const cleaned = digitsOnly(value);
    const nextIncome = Number(cleaned) || 0;
    const ratio = income > 0 ? clamp(needsSliderAmount / income, 0, 1) : DEFAULT_RATIO;
    const nextNeeds = nextIncome ? clamp(roundToStep(nextIncome * ratio), 0, nextIncome) : 0;

    saveOnboarding({
      income: nextIncome,
      needsSliderAmount: nextNeeds,
      primaryGoal,
      riskVibe,
    });
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
    });
  };

  const handleSubmit = () => {
    if (!canSubmit) {
      return;
    }

    saveOnboarding({
      income,
      needsSliderAmount,
      primaryGoal,
      riskVibe,
    });
    resetSwipedTotals();
    router.push("/swipe");
  };

  return (
    <LinearGradient colors={["#F6F7F4", "#F6FBF7", "#FFFDF8"]} className="flex-1">
      <KeyboardAvoidingView
        behavior={Platform.select({ ios: "padding", android: undefined })}
        className="flex-1"
      >
        <View className="flex-1 px-5" style={{ paddingTop: compact ? 42 : 54, paddingBottom: 18 }}>
          <View className="mb-4">
            <View className="mb-2 flex-row items-center justify-between">
              <View className="h-9 w-9 items-center justify-center rounded-full bg-white shadow-soft">
                <Ionicons name="sparkles-outline" size={16} color="#00684F" />
              </View>
              <View className="flex-row items-center gap-2">
                <Ionicons name="shield-checkmark-outline" size={16} color="#005B45" />
                <Text className="text-sm font-extrabold text-[#00684F]">FinGuard AI</Text>
              </View>
              <View className="h-9 w-9" />
            </View>

            <Text className="text-center text-[10px] font-bold uppercase tracking-[2.2px] text-slate-400">
              Step 1 of 2
            </Text>

            <View className="mt-3 items-center">
              <Text className="text-center text-[27px] font-extrabold italic leading-8 text-[#2C2F30]">
                Build your safety net.
              </Text>
              <Text className="mt-2 text-center text-[12px] leading-5 text-slate-500">
                Quick setup. Warm guidance. Zero money jargon.
              </Text>
            </View>
          </View>

          <View className="rounded-[28px] bg-white px-4 py-4 shadow-soft">
            <View className="mb-4 items-center">
              <Pressable
                onPress={handleDefaults}
                className="rounded-full border border-[#00684F]/10 bg-[#00684F]/5 px-3.5 py-1.5"
              >
                <Text className="text-[10px] font-bold text-[#00684F]">Use smart defaults</Text>
              </Pressable>
            </View>

            <View className="mb-4">
              <Text className="mb-2 text-center text-[10px] font-bold uppercase tracking-[2.2px] text-[#625579]/70">
                Monthly Income
              </Text>
              <View className="rounded-[24px] border border-[#00684F]/5 bg-[#F5F6F7] px-4 py-4">
                <View className="flex-row items-center">
                  <Text className="mr-2 text-2xl font-extrabold text-[#00684F]">{RS}</Text>
                  <TextInput
                    value={income ? formatAmount(income) : ""}
                    onChangeText={handleIncomeChange}
                    keyboardType="number-pad"
                    placeholder="50,000"
                    placeholderTextColor="#9CA3AF"
                    className="flex-1 text-[30px] font-extrabold leading-9 text-[#2C2F30]"
                  />
                </View>
              </View>
              <Text className="mt-2 text-center text-[10px] text-slate-500">
                Monthly take-home after tax
              </Text>
            </View>

            <View className="mb-4">
              <View className="mb-2 flex-row items-center justify-between">
                <Text className="text-[10px] font-bold uppercase tracking-[2.2px] text-[#625579]/70">
                  Monthly Needs
                </Text>
                <Text className="text-xs font-bold text-[#00684F]">{needsShareLabel}</Text>
              </View>

              <View className="mb-2 flex-row items-end justify-between">
                <Text className="text-2xl font-extrabold text-[#2C2F30]">
                  {RS}{formatAmount(needsSliderAmount)}
                </Text>
                <Text className="text-[10px] uppercase tracking-[1.1px] text-slate-500">
                  Rent • bills • groceries
                </Text>
              </View>

              <View className="rounded-[20px] bg-[#EEF2EF] px-2 py-2">
                <Slider
                  value={needsSliderAmount}
                  onValueChange={handleNeedsChange}
                  minimumValue={0}
                  maximumValue={sliderMax}
                  step={500}
                  minimumTrackTintColor="#16A34A"
                  maximumTrackTintColor="#D7DEE0"
                  thumbTintColor="#00684F"
                  style={{
                    height: compact ? 40 : 48,
                    transform: [{ scaleY: compact ? 1.45 : 1.7 }],
                  }}
                />
              </View>
            </View>

            <View className="mb-4">
              <Text className="mb-2 text-[10px] font-bold uppercase tracking-[2.2px] text-[#625579]/70">
                Main Goal
              </Text>
              <View className="flex-row flex-wrap gap-2">
                {GOAL_OPTIONS.map((option) => {
                  const selected = primaryGoal === option.value;

                  return (
                    <Pressable
                      key={option.value}
                      onPress={() => setPrimaryGoal(option.value)}
                      className={`flex-row items-center gap-2 rounded-full px-3 py-2 ${
                        selected ? "bg-[#E6F9F1]" : "border border-slate-200 bg-[#FAFAFA]"
                      }`}
                    >
                      <Text className="text-base">{option.emoji}</Text>
                      <Text
                        className={`text-[12px] font-semibold ${
                          selected ? "text-[#2C2F30]" : "text-slate-500"
                        }`}
                      >
                        {option.label}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>

            <View>
              <Text className="mb-2 text-[10px] font-bold uppercase tracking-[2.2px] text-[#625579]/70">
                Risk Vibe
              </Text>
              <View className="flex-row rounded-[20px] bg-[#F7F7FB] p-1">
                {RISK_OPTIONS.map((option) => {
                  const selected = riskVibe === option.value;

                  return (
                    <Pressable
                      key={option.value}
                      onPress={() => setRiskVibe(option.value)}
                      className={`flex-1 rounded-[16px] px-2 py-2.5 ${
                        selected ? "bg-[#EDE1FF]" : "bg-transparent"
                      }`}
                    >
                      <MaterialCommunityIcons
                        name={option.icon}
                        size={16}
                        color={selected ? "#403455" : "#64748B"}
                        style={{ alignSelf: "center", marginBottom: compact ? 2 : 4 }}
                      />
                      <Text
                        className={`text-center text-[10px] font-extrabold uppercase tracking-[1.2px] ${
                          selected ? "text-[#403455]" : "text-slate-500"
                        }`}
                      >
                        {option.label}
                      </Text>
                      {!compact ? (
                        <Text className="mt-1 text-center text-[9px] text-slate-500">
                          {option.subtitle}
                        </Text>
                      ) : null}
                    </Pressable>
                  );
                })}
              </View>
            </View>
          </View>

          <View className="mt-4">
            <LinearGradient
              colors={canSubmit ? ["#9AF2D0", "#7BE2BD"] : ["#CBD5E1", "#CBD5E1"]}
              start={{ x: 0.2, y: 0 }}
              end={{ x: 0.8, y: 1 }}
              className="rounded-full"
            >
              <Pressable
                onPress={handleSubmit}
                disabled={!canSubmit}
                className="items-center justify-center rounded-full px-6 py-4"
              >
                <Text className="text-lg font-extrabold text-[#163B31]">{"Let's Go"}</Text>
              </Pressable>
            </LinearGradient>
            <Text className="mt-2 text-center text-[10px] italic text-slate-500">
              Private by default. Swipe-ready in seconds.
            </Text>
          </View>
        </View>
      </KeyboardAvoidingView>
    </LinearGradient>
  );
}

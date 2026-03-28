import { useEffect, useMemo, useRef, useState } from "react";
import { Ionicons } from "@expo/vector-icons";
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { SafeAreaView } from "react-native-safe-area-context";

import { useAppContext } from "../context/AppContext";
import { formatCurrency } from "../utils/finance";
import { BubblesAvatar, SpeechBubble } from "../components/Bubbles";
import { T } from "../components/theme";

const titleCase = (value) => value.charAt(0).toUpperCase() + value.slice(1);

const buildFallbackReply = ({ topLeak, primaryGoal, riskVibe, income }) => {
  const leaks = topLeak.amount ? titleCase(topLeak.key) : "lifestyle spend";
  const templates = [
    `I see your primary goal is ${primaryGoal.toLowerCase()}. Automating even 10% of that ${formatCurrency(income)} income builds your safety net instantly. Try capping your ${leaks.toLowerCase()} this weekend!`,
    `Hmm, a ${riskVibe.toLowerCase()} approach. Smart! Let's divert a little bit of that ${leaks.toLowerCase()} cash toward your actual goals.`,
    `Remember, paying down your expensive debt first is a guaranteed return on investment. The math never lies! 📈`,
    `You've got this! Start by tracking your ${leaks.toLowerCase()} closely this week. Every rupee counts.`,
  ];
  return templates[Math.floor(Math.random() * templates.length)];
};

const extractGeminiText = (payload) => {
  const parts = payload?.candidates?.[0]?.content?.parts;
  if (!Array.isArray(parts)) return "";
  return parts.map((part) => part?.text || "").join("\n").trim();
};

export default function CoachScreen() {
  const scrollViewRef = useRef(null);
  const [input, setInput] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [messages, setMessages] = useState([
    {
      id: "welcome",
      sender: "ai",
      text: "I've analyzed your score. What financial decision can I help you with today? ✨",
    },
  ]);

  const { income, needsSliderAmount, primaryGoal, riskVibe, swipedTotals, topLeak, totalSwipedAmount } = useAppContext();

  const systemPrompt = useMemo(() => {
    return [
      "You are FinBuddy (specifically Bubbles), a cute, sharp, caring financial companion for young earners.",
      "Keep responses concise, warm, actionable, and formatted in short bullet points or distinct paragraphs.",
      `User monthly income: ${formatCurrency(income)}. Need expenses: ${formatCurrency(needsSliderAmount)}.`,
      `Goal: ${primaryGoal}. Risk: ${riskVibe}.`,
      `Swipe totals: Food ${formatCurrency(swipedTotals.food)}, Shopping ${formatCurrency(swipedTotals.shopping)}.`,
      `Top leak: ${topLeak.name} (${formatCurrency(topLeak.amount)}).`,
      "Never give boring generic advice. Be specific to their exact numbers! Stay in character as Bubbles.",
    ].join(" ");
  }, [income, needsSliderAmount, primaryGoal, riskVibe, swipedTotals, topLeak]);

  useEffect(() => {
    scrollViewRef.current?.scrollToEnd({ animated: true });
  }, [messages, isSending]);

  const fetchGeminiReply = async (conversation) => {
    const apiKey = process.env.EXPO_PUBLIC_GEMINI_API_KEY;
    if (!apiKey) return buildFallbackReply({ topLeak, primaryGoal, riskVibe, income });

    const response = await fetch(
      "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent",
      {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-goog-api-key": apiKey },
        body: JSON.stringify({
          system_instruction: { parts: [{ text: systemPrompt }] },
          contents: conversation.map((msg) => ({ role: msg.sender === "user" ? "user" : "model", parts: [{ text: msg.text }] })),
          generationConfig: { temperature: 0.7, maxOutputTokens: 250 },
        }),
      }
    );

    if (!response.ok) throw new Error("Gemini request failed");
    const payload = await response.json();
    return extractGeminiText(payload) || buildFallbackReply({ topLeak, primaryGoal, riskVibe, income });
  };

  const handleSend = async () => {
    const trimmed = input.trim();
    if (!trimmed || isSending) return;

    const userMsg = { id: `user-${Date.now()}`, sender: "user", text: trimmed };
    const nextConvo = [...messages, userMsg];

    setMessages(nextConvo);
    setInput("");
    setIsSending(true);

    try {
      const reply = await fetchGeminiReply(nextConvo);
      setMessages((curr) => [...curr, { id: `ai-${Date.now()}`, sender: "ai", text: reply }]);
    } catch {
      setMessages((curr) => [...curr, { id: `ai-${Date.now()}`, sender: "ai", text: buildFallbackReply({ topLeak, primaryGoal, riskVibe, income }) }]);
    } finally {
      setIsSending(false);
    }
  };

  return (
    <SafeAreaView style={S.container}>
      <LinearGradient colors={T.bgGrad} style={StyleSheet.absoluteFillObject} />
      
      {/* Header with Bubbles Avatar */}
      <View style={S.header}>
        <BubblesAvatar mood={isSending ? "thinking" : "happy"} size={80} />
        <View style={S.headerTextContainer}>
          <Text style={S.title}>AI Coach Bubbles</Text>
          <Text style={S.subtitle}>Your interactive financial companion.</Text>
        </View>
      </View>

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <ScrollView
          ref={scrollViewRef}
          contentContainerStyle={S.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          {messages.map((msg) => {
            const isAI = msg.sender === "ai";
            return (
              <View key={msg.id} style={[S.messageWrapper, isAI ? S.aiWrapper : S.userWrapper]}>
                {isAI ? (
                  <View style={S.aiChatContainer}>
                    <SpeechBubble text={msg.text} />
                  </View>
                ) : (
                  <View style={S.userBubble}>
                    <Text style={S.userText}>{msg.text}</Text>
                  </View>
                )}
              </View>
            );
          })}
          {isSending && (
            <View style={[S.messageWrapper, S.aiWrapper]}>
               <SpeechBubble text="Bubbles is thinking... 🤔" />
            </View>
          )}
        </ScrollView>

        <View style={S.inputArea}>
          <TextInput
            style={S.input}
            value={input}
            onChangeText={setInput}
            placeholder="Type your money question..."
            placeholderTextColor={T.textSec}
            multiline
          />
          <Pressable
            style={[S.sendBtn, isSending && S.sendBtnDisabled]}
            disabled={isSending}
            onPress={handleSend}
          >
            <Ionicons name="send" size={20} color={T.textOnAccent} />
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const S = StyleSheet.create({
  container: { flex: 1, backgroundColor: T.bg },
  header: { flexDirection: "row", alignItems: "center", paddingHorizontal: 20, paddingTop: 10, paddingBottom: 20, borderBottomWidth: 1, borderBottomColor: T.cardBorder },
  headerTextContainer: { marginLeft: 16, flex: 1 },
  title: { fontSize: 22, fontWeight: "900", color: T.gold, fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif' },
  subtitle: { fontSize: 13, color: T.textSec, marginTop: 4 },
  scrollContent: { padding: 20, paddingBottom: 40 },
  messageWrapper: { marginBottom: 20, width: "100%" },
  aiWrapper: { alignItems: "flex-start", maxWidth: "90%" },
  userWrapper: { alignItems: "flex-end", maxWidth: "88%", alignSelf: "flex-end" },
  userBubble: { backgroundColor: T.gold, borderRadius: 20, padding: 16, borderBottomRightRadius: 4 },
  userText: { color: T.textOnAccent, fontSize: 15, fontWeight: "600", lineHeight: 22 },
  aiChatContainer: { flexDirection: "row", alignItems: "flex-end" },
  inputArea: { flexDirection: "row", padding: 16, backgroundColor: T.card, borderTopColor: T.cardBorder, borderTopWidth: 1 },
  input: { flex: 1, backgroundColor: "rgba(255,255,255,0.06)", borderRadius: 24, paddingHorizontal: 16, paddingVertical: 12, color: T.text, fontSize: 15, maxHeight: 100 },
  sendBtn: { marginLeft: 12, width: 44, height: 44, borderRadius: 22, backgroundColor: T.teal, alignItems: "center", justifyContent: "center" },
  sendBtnDisabled: { opacity: 0.5 },
});

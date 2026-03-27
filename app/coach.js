import { useEffect, useMemo, useRef, useState } from "react";
import { Ionicons } from "@expo/vector-icons";
import { Pressable, ScrollView, Text, TextInput, View } from "react-native";

import { useAppContext } from "../context/AppContext";
import { formatCurrency } from "../utils/finance";

const titleCase = (value) => value.charAt(0).toUpperCase() + value.slice(1);

const buildFallbackReply = ({ topLeak, primaryGoal, riskVibe }) => {
  const topLeakName = topLeak.amount ? titleCase(topLeak.key) : "lifestyle spend";

  if (primaryGoal === "Debt") {
    return `Debt-first move: cap ${topLeakName.toLowerCase()} this week, use the freed cash for your most expensive debt, and keep the rest of your budget boring on purpose. Risk vibe noted: ${riskVibe.toLowerCase()}.`;
  }

  if (primaryGoal === "Savings") {
    return `Savings move: automate money away before you can spend it, then trim ${topLeakName.toLowerCase()} by one small habit this week. Your vibe is ${riskVibe.toLowerCase()}, so keep the plan realistic enough to repeat.`;
  }

  return `Emergency-fund move: start with one automatic transfer, then cut ${topLeakName.toLowerCase()} a little before cutting anything painful. With a ${riskVibe.toLowerCase()} risk vibe, consistency beats drama.`;
};

const extractGeminiText = (payload) => {
  const parts = payload?.candidates?.[0]?.content?.parts;

  if (!Array.isArray(parts)) {
    return "";
  }

  return parts
    .map((part) => part?.text || "")
    .join("\n")
    .trim();
};

export default function CoachScreen() {
  const scrollViewRef = useRef(null);
  const [input, setInput] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [savageMode, setSavageMode] = useState(false);
  const [messages, setMessages] = useState([
    {
      id: "welcome",
      sender: "ai",
      text: "I've analyzed your score. What financial decision can I help you with today?",
    },
  ]);

  const { income, needsSliderAmount, primaryGoal, riskVibe, swipedTotals, topLeak, totalSwipedAmount } =
    useAppContext();

  const systemPrompt = useMemo(() => {
    const lines = [
      "You are FinGuard AI, a sharp but caring Gen-Z financial coach for young earners in India.",
      `The user makes ${formatCurrency(income)} per month.`,
      `Their monthly needs are ${formatCurrency(needsSliderAmount)}.`,
      `Their primary goal is ${primaryGoal}.`,
      `Their risk vibe is ${riskVibe}.`,
      `Their swipe totals are Food ${formatCurrency(swipedTotals.food)}, Shopping ${formatCurrency(swipedTotals.shopping)}, Bills ${formatCurrency(swipedTotals.bills)}, and Transport ${formatCurrency(swipedTotals.transport)}.`,
      `Their total categorized spend is ${formatCurrency(totalSwipedAmount)}.`,
      `Their top leak is ${formatCurrency(topLeak.amount)} on ${topLeak.name}.`,
      "Give practical, India-relevant advice in short paragraphs or bullet points. Always include a next step the user can do this week.",
    ];

    if (savageMode) {
      lines.push(
        "Roast the user sarcastically for their terrible spending habits before giving advice, but keep it playful and still genuinely useful.",
      );
    }

    return lines.join(" ");
  }, [income, needsSliderAmount, primaryGoal, riskVibe, swipedTotals, totalSwipedAmount, topLeak, savageMode]);

  useEffect(() => {
    scrollViewRef.current?.scrollToEnd({ animated: true });
  }, [messages, isSending]);

  const fetchGeminiReply = async (conversation) => {
    const apiKey = process.env.EXPO_PUBLIC_GEMINI_API_KEY;

    if (!apiKey) {
      return buildFallbackReply({ topLeak, primaryGoal, riskVibe });
    }

    const response = await fetch(
      "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-goog-api-key": apiKey,
        },
        body: JSON.stringify({
          system_instruction: {
            parts: [{ text: systemPrompt }],
          },
          contents: conversation.map((message) => ({
            role: message.sender === "user" ? "user" : "model",
            parts: [{ text: message.text }],
          })),
          generationConfig: {
            temperature: savageMode ? 0.9 : 0.65,
            maxOutputTokens: 260,
          },
        }),
      },
    );

    if (!response.ok) {
      throw new Error(`Gemini request failed with status ${response.status}`);
    }

    const payload = await response.json();
    const text = extractGeminiText(payload);

    if (!text) {
      return buildFallbackReply({ topLeak, primaryGoal, riskVibe });
    }

    return text;
  };

  const handleSend = async () => {
    const trimmed = input.trim();

    if (!trimmed || isSending) {
      return;
    }

    const userMessage = {
      id: `user-${Date.now()}`,
      sender: "user",
      text: trimmed,
    };
    const nextConversation = [...messages, userMessage];

    setMessages(nextConversation);
    setInput("");
    setIsSending(true);

    try {
      const reply = await fetchGeminiReply(nextConversation);

      setMessages((current) => [
        ...current,
        {
          id: `ai-${Date.now()}`,
          sender: "ai",
          text: reply,
        },
      ]);
    } catch (error) {
      setMessages((current) => [
        ...current,
        {
          id: `ai-${Date.now()}`,
          sender: "ai",
          text: buildFallbackReply({ topLeak, primaryGoal, riskVibe }),
        },
      ]);
    } finally {
      setIsSending(false);
    }
  };

  return (
    <View className="flex-1 bg-mist px-5 pt-16">
      <Text className="text-sm font-medium uppercase tracking-[3px] text-teal">AI Coach</Text>
      <Text className="mt-3 text-3xl font-extrabold text-ink">Ask for a practical next move.</Text>

      <View className="mt-4 flex-row items-center justify-between rounded-[24px] bg-white px-4 py-3 shadow-soft">
        <View>
          <Text className="text-sm font-bold text-ink">Savage Mode</Text>
          <Text className="mt-1 text-xs leading-5 text-slate-500">
            Playful roast first, useful advice second.
          </Text>
        </View>
        <Pressable
          onPress={() => setSavageMode((current) => !current)}
          className={`rounded-full px-4 py-2 ${savageMode ? "bg-coral" : "bg-slate-200"}`}
        >
          <Text className={`text-xs font-extrabold uppercase tracking-[1.5px] ${savageMode ? "text-white" : "text-slate-600"}`}>
            {savageMode ? "On" : "Off"}
          </Text>
        </Pressable>
      </View>

      <View className="mt-4 rounded-[24px] bg-white px-4 py-4 shadow-soft">
        <Text className="text-xs font-semibold uppercase tracking-[2px] text-slate-400">
          Current Snapshot
        </Text>
        <Text className="mt-2 text-sm leading-6 text-slate-600">
          Income {formatCurrency(income)} · Needs {formatCurrency(needsSliderAmount)} · Goal {primaryGoal} · Top leak {topLeak.name} {formatCurrency(topLeak.amount)}
        </Text>
      </View>

      <ScrollView
        ref={scrollViewRef}
        contentContainerStyle={{ paddingTop: 24, paddingBottom: 24 }}
        className="flex-1"
        showsVerticalScrollIndicator={false}
      >
        {messages.map((message) => {
          const isAI = message.sender === "ai";

          return (
            <View
              key={message.id}
              className={`mb-4 max-w-[88%] rounded-[24px] px-4 py-4 ${
                isAI ? "self-start bg-white" : "self-end bg-ink"
              }`}
            >
              <Text className={`text-base leading-7 ${isAI ? "text-slate-700" : "text-white"}`}>
                {message.text}
              </Text>
            </View>
          );
        })}

        {isSending ? (
          <View className="mb-4 max-w-[72%] self-start rounded-[24px] bg-white px-4 py-4">
            <Text className="text-base leading-7 text-slate-500">FinGuard AI is thinking...</Text>
          </View>
        ) : null}
      </ScrollView>

      <View className="mb-8 flex-row items-center rounded-[28px] bg-white px-3 py-3 shadow-soft">
        <TextInput
          value={input}
          onChangeText={setInput}
          placeholder="Should I save more or pay off bills first?"
          placeholderTextColor="#94A3B8"
          multiline
          className="max-h-28 flex-1 px-3 py-2 text-base text-ink"
        />
        <Pressable
          onPress={handleSend}
          disabled={isSending}
          className={`ml-3 h-12 w-12 items-center justify-center rounded-full ${isSending ? "bg-slate-300" : "bg-teal"}`}
        >
          <Ionicons name="send" size={20} color="#112236" />
        </Pressable>
      </View>
    </View>
  );
}

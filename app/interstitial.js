import { router } from "expo-router";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { Pressable, Text, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";

const VALUE_PROPS = [
  { icon: "cash-remove", label: "Detect hidden expenses", desc: "Auto-categorize your bank transactions" },
  { icon: "chart-line", label: "Improve score accuracy", desc: "Replace estimates with real numbers" },
  { icon: "magnify-scan", label: "Auto-analyze investments", desc: "XIRR, overlap, TER drag — instantly" },
];

export default function InterstitialScreen() {
  return (
    <LinearGradient colors={["#F6F7F4", "#F6FBF7", "#FFFDF8"]} style={{ flex: 1, justifyContent: "center", paddingHorizontal: 24 }}>
      {/* ── Progress Bar ── */}
      <View style={{ position: "absolute", top: 54, left: 24, right: 24 }}>
        <View style={{ flexDirection: "row", gap: 6 }}>
          {["Setup", "Docs", "Dashboard"].map((label, i) => (
            <View key={label} style={{ flex: 1, alignItems: "center" }}>
              <View style={{ height: 4, borderRadius: 2, width: "100%", backgroundColor: i <= 1 ? "#16A34A" : "#E2E8F0" }} />
              <Text style={{ fontSize: 9, fontWeight: "700", color: i <= 1 ? "#16A34A" : "#94A3B8", marginTop: 4 }}>{label}</Text>
            </View>
          ))}
        </View>
      </View>

      {/* ── Illustration area ── */}
      <View style={{ alignItems: "center", marginBottom: 28 }}>
        <View style={{
          width: 80, height: 80, borderRadius: 40, backgroundColor: "#E6F9F1",
          alignItems: "center", justifyContent: "center", marginBottom: 16,
        }}>
          <MaterialCommunityIcons name="file-document-multiple-outline" size={36} color="#00684F" />
        </View>

        <Text style={{ fontSize: 24, fontWeight: "900", color: "#2C2F30", textAlign: "center" }}>
          Connect your financial documents
        </Text>
        <Text style={{ marginTop: 8, fontSize: 14, color: "#64748B", textAlign: "center", lineHeight: 22 }}>
          Upload your bank statement, mutual fund report, or Form 16 for deeper, more accurate insights.
        </Text>
      </View>

      {/* ── Value Props ── */}
      <View style={{ gap: 12, marginBottom: 32 }}>
        {VALUE_PROPS.map((item) => (
          <View key={item.label} style={{
            flexDirection: "row", alignItems: "center", gap: 14, borderRadius: 18,
            backgroundColor: "#FFFFFF", padding: 16,
            shadowColor: "#112236", shadowOpacity: 0.05, shadowRadius: 10, shadowOffset: { width: 0, height: 4 }, elevation: 2,
          }}>
            <View style={{ width: 44, height: 44, borderRadius: 14, backgroundColor: "#E6F9F1", alignItems: "center", justifyContent: "center" }}>
              <MaterialCommunityIcons name={item.icon} size={22} color="#00684F" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 14, fontWeight: "800", color: "#2C2F30" }}>{item.label}</Text>
              <Text style={{ fontSize: 12, color: "#64748B", marginTop: 2 }}>{item.desc}</Text>
            </View>
            <Ionicons name="checkmark-circle" size={20} color="#16A34A" />
          </View>
        ))}
      </View>

      {/* ── CTAs ── */}
      <Pressable
        onPress={() => router.push("/swipe")}
        style={{
          borderRadius: 20, backgroundColor: "#00684F", paddingVertical: 18,
          alignItems: "center", marginBottom: 12,
        }}
      >
        <Text style={{ fontSize: 17, fontWeight: "900", color: "#FFFFFF" }}>Upload Documents</Text>
      </Pressable>

      <Pressable
        onPress={() => router.push("/dashboard")}
        style={{ paddingVertical: 14, alignItems: "center" }}
      >
        <Text style={{ fontSize: 14, fontWeight: "700", color: "#94A3B8" }}>Skip for now</Text>
      </Pressable>
    </LinearGradient>
  );
}

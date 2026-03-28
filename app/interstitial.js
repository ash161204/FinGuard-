import { router } from "expo-router";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { Pressable, Text, View, StyleSheet } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { SafeAreaView } from "react-native-safe-area-context";
import { T } from "../components/theme";

const VALUE_PROPS = [
  { icon: "cash-remove", label: "Detect Hidden Leaks", desc: "Auto-categorize transactions" },
  { icon: "chart-line", label: "Uncover True XIRR", desc: "Mutual fund analysis instantly" },
  { icon: "magnify-scan", label: "Tax Wizard Output", desc: "Replace estimates with precise tax logic" },
];

export default function InterstitialScreen() {
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: T.bg }}>
      <LinearGradient colors={T.bgGrad} style={StyleSheet.absoluteFillObject} />

      <View style={{ flex: 1, paddingHorizontal: 24, justifyContent: "center" }}>
        {/* Progress Bar */}
        <View style={{ position: "absolute", top: 16, left: 24, right: 24 }}>
          <View style={{ flexDirection: "row", gap: 6 }}>
            {["Setup", "Docs", "Dashboard"].map((label, i) => (
              <View key={label} style={{ flex: 1, alignItems: "center" }}>
                <View style={{ height: 4, borderRadius: 2, width: "100%", backgroundColor: i <= 1 ? T.gold : "rgba(255,255,255,0.06)" }} />
                <Text style={{ fontSize: 9, fontWeight: "800", textTransform: "uppercase", color: i <= 1 ? T.gold : T.textSec, marginTop: 4 }}>{label}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Hero Area */}
        <View style={{ alignItems: "center", marginBottom: 32, marginTop: 48 }}>
          <View style={{ width: 80, height: 80, borderRadius: 40, backgroundColor: "rgba(126, 206, 193, 0.1)", alignItems: "center", justifyContent: "center", marginBottom: 16 }}>
             <MaterialCommunityIcons name="file-document-multiple-outline" size={36} color={T.teal} />
          </View>

          <Text style={{ fontSize: 26, fontWeight: "900", color: T.text, textAlign: "center", fontFamily: "Georgia" }}>Unlock your Dashboard</Text>
          <Text style={{ marginTop: 12, fontSize: 13, color: T.textSec, textAlign: "center", lineHeight: 22, paddingHorizontal: 16 }}>
             Your baseline is ready. Upload a PDF bank statement, Mutual Fund CAS, or Form 16 for deeper insights.
          </Text>
        </View>

        {/* Value Props */}
        <View style={{ gap: 14, marginBottom: 40 }}>
          {VALUE_PROPS.map((item) => (
            <View key={item.label} style={S.propCard}>
              <View style={S.iconBox}>
                <MaterialCommunityIcons name={item.icon} size={22} color={T.gold} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={S.propTitle}>{item.label}</Text>
                <Text style={S.propDesc}>{item.desc}</Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={T.textSec} style={{ opacity: 0.5 }} />
            </View>
          ))}
        </View>

        {/* Connect Action */}
        <Pressable onPress={() => router.push("/swipe")} style={S.primaryBtn}>
          <Text style={S.primaryText}>Upload Local Documents</Text>
        </Pressable>

        {/* Skip Action */}
        <Pressable onPress={() => router.push("/dashboard")} style={S.secondaryBtn}>
           <Text style={S.secondaryText}>Skip to Baseline Dashboard</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const S = StyleSheet.create({
  propCard: { flexDirection: "row", alignItems: "center", gap: 16, borderRadius: T.radiusSm, backgroundColor: T.card, padding: 18, borderWidth: 1, borderColor: T.cardBorder },
  iconBox: { width: 44, height: 44, borderRadius: 22, backgroundColor: "rgba(232, 184, 109, 0.1)", alignItems: "center", justifyContent: "center" },
  propTitle: { fontSize: 14, fontWeight: "800", color: T.text },
  propDesc: { fontSize: 11, color: T.textSec, marginTop: 4 },
  primaryBtn: { borderRadius: T.radiusFull, backgroundColor: T.gold, paddingVertical: 18, alignItems: "center" },
  primaryText: { fontSize: 15, fontWeight: "900", color: T.textOnAccent },
  secondaryBtn: { paddingVertical: 18, alignItems: "center", marginTop: 8 },
  secondaryText: { fontSize: 13, fontWeight: "700", color: T.textSec },
});

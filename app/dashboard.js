import { useMemo, useState } from "react";
import { router } from "expo-router";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { Platform, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { useAppContext } from "../context/AppContext";
import { formatCurrency } from "../utils/finance";
import { buildMfXRayReport, buildTaxWizardReport, buildMoneyHealthScore, buildBankStatementAnalysis, unwrapAnalysis } from "../utils/insightEngine";
import { ScoreRing } from "../components/Bubbles";
import { T } from "../components/theme";

const formatPercent = (value, digits = 1) => `${(Number(value || 0) * 100).toFixed(digits)}%`;
const formatSignedCurrency = (value) => `${value >= 0 ? "+" : "-"}${formatCurrency(Math.abs(value || 0))}`;
const fmtInr = (n) => `\u20B9${Math.round(n || 0).toLocaleString("en-IN")}`;

// ── UI Components ──────────────────────────────────────────────

function MetricCard({ label, value, hint, accent = T.gold }) {
  return (
    <View style={[S.metricCard, { borderLeftColor: accent, borderLeftWidth: 3 }]}>
      <Text style={S.metricLabel}>{label}</Text>
      <Text style={[S.metricValue, { color: T.text }]}>{value}</Text>
      {hint ? <Text style={S.metricHint}>{hint}</Text> : null}
    </View>
  );
}

function SectionContainer({ title, children }) {
  return (
    <View style={S.sectionContainer}>
      {title && <Text style={S.sectionTitle}>{title}</Text>}
      {children}
    </View>
  );
}

function AlertCard({ alert }) {
  const isDanger = alert.type === "danger";
  const bgColor = isDanger ? "rgba(248, 113, 113, 0.15)" : "rgba(251, 191, 36, 0.15)";
  const bColor = isDanger ? T.red : T.amber;
  return (
    <View style={[S.alertCard, { backgroundColor: bgColor, borderColor: bColor }]}>
      <View style={S.alertIconBox}>
        <Ionicons name="warning" size={20} color={bColor} />
      </View>
      <View style={{ flex: 1, paddingLeft: 12 }}>
        <Text style={[S.alertTitle, { color: bColor }]}>{alert.title}</Text>
        <Text style={S.alertMessage}>{alert.message}</Text>
      </View>
    </View>
  );
}

// ═══════════════════════════════════════════════════════
// DASHBOARD SCREEN
// ═══════════════════════════════════════════════════════

export default function DashboardScreen() {
  const { documentResults, riskVibe, healthInputs, income, needsSliderAmount } = useAppContext();
  const [expandedEngine, setExpandedEngine] = useState(null);

  const taxReport = useMemo(() => buildTaxWizardReport(documentResults), [documentResults]);
  const mfReport = useMemo(() => buildMfXRayReport(documentResults, { riskVibe }), [documentResults, riskVibe]);
  const documents = useMemo(() => documentResults.map((d) => ({ filename: d.filename, analysis: unwrapAnalysis(d) })), [documentResults]);

  const bankReport = useMemo(() => {
    const txns = [];
    for (const doc of documentResults) {
      const a = unwrapAnalysis(doc);
      if (a && Array.isArray(a.transactions)) txns.push(...a.transactions);
    }
    return txns.length > 0 ? buildBankStatementAnalysis(txns) : null;
  }, [documentResults]);

  const healthReport = useMemo(() => {
    let merged = healthInputs;
    if (bankReport && bankReport.emiFixed.total > 0) {
      const bankEMI = bankReport.emiFixed.total / Math.max(bankReport.monthlySummary.length, 1);
      merged = { ...healthInputs, totalMonthlyEMI: Math.max(healthInputs.totalMonthlyEMI || 0, bankEMI) };
    }
    if (bankReport && bankReport.ccTrap.detected && !merged.hasRevolvingCCDebt) {
      merged = { ...merged, hasRevolvingCCDebt: true };
    }
    return buildMoneyHealthScore(merged, income, needsSliderAmount || 0, taxReport.available ? taxReport : null, mfReport.available ? mfReport : null);
  }, [healthInputs, income, needsSliderAmount, taxReport, mfReport, bankReport]);

  const allAlerts = [
    ...healthReport.alerts.map((a) => ({ title: a.dimension, message: a.text, type: a.severity === "red" ? "danger" : "warn" })),
    ...(bankReport ? bankReport.alerts.map((a) => ({ title: a.rule, message: a.text, type: a.severity === "red" ? "danger" : "warn" })) : []),
  ];

  return (
    <SafeAreaView style={S.screen} edges={["top", "bottom"]}>
      <ScrollView contentContainerStyle={S.content}>
        
        {/* SCORE RING HERO SECTION */}
        <View style={S.heroContainer}>
          <ScoreRing score={healthReport.overallScore} grade={healthReport.overallGrade} color={T.gold} size={180} />
          <Text style={S.heroQuote}>
            {healthReport.overallScore >= 80 ? "Golden standards achieved! ⭐" : healthReport.overallScore >= 60 ? "Solid base, let's keep growing." : "Let's build that financial safety net together."}
          </Text>
        </View>

        {/* ALERTS SECTION */}
        {allAlerts.length > 0 && (
          <SectionContainer title="Action Required">
            {allAlerts.slice(0, 3).map((alert, i) => (
              <AlertCard key={i} alert={alert} />
            ))}
          </SectionContainer>
        )}

        {/* HEALTH DIMENSIONS GRID */}
        <SectionContainer title="Health Dimensions">
          <View style={S.gridContainer}>
            {healthReport.dimensions.map((d) => {
               const c = d.score >= 70 ? T.green : d.score >= 40 ? T.amber : T.red;
               return (
                <View key={d.id} style={S.gridCard}>
                  <Text style={S.gridHeader}>{d.name}</Text>
                  <Text style={[S.gridScore, { color: c }]}>{d.score}</Text>
                  <View style={S.progressBarBg}>
                    <View style={[S.progressBarFill, { backgroundColor: c, width: `${d.score}%` }]} />
                  </View>
                </View>
               );
            })}
          </View>
        </SectionContainer>

        {/* CASHFLOW OVERVIEW */}
        {bankReport && (
          <SectionContainer title="Cashflow Overview">
            <View style={{ flexDirection: "row", gap: 8 }}>
              <MetricCard label="Inflow" value={fmtInr(bankReport.totalInflow)} accent={T.teal} />
              <MetricCard label="Outflow" value={fmtInr(bankReport.totalOutflow)} accent={T.red} />
              <MetricCard label="Savings Rate" value={`${bankReport.savingsRate.rate.toFixed(0)}%`} accent={T.gold} />
            </View>
            {bankReport.discretionary.breakdown.length > 0 && (
               <View style={S.breakdownContainer}>
                 <Text style={S.breakdownTitle}>Top Spends</Text>
                 {bankReport.discretionary.breakdown.slice(0, 3).map((cat) => (
                   <View key={cat.category} style={S.breakdownRow}>
                     <Text style={S.breakdownLabel}>{cat.category}</Text>
                     <Text style={S.breakdownValue}>{fmtInr(cat.amount)}</Text>
                   </View>
                 ))}
               </View>
            )}
          </SectionContainer>
        )}

        {/* TAX WIZARD / MF XRAY ENGINE TABS */}
        <SectionContainer title="Deep Insights">
          <View style={{ flexDirection: "row", gap: 12 }}>
            <Pressable
              onPress={() => setExpandedEngine(expandedEngine === "tax" ? null : "tax")}
              style={[S.engineCard, expandedEngine === "tax" && S.engineCardActive]}
            >
              <MaterialCommunityIcons name="calculator-variant" size={24} color={taxReport.available ? T.teal : T.textSec} />
              <View>
                <Text style={[S.engineLabel, taxReport.available && { color: T.teal }]}>Tax Wizard</Text>
                <Text style={{ fontSize: 10, color: T.textSec, marginTop: 2 }}>{taxReport.available ? "Active" : "Locked"}</Text>
              </View>
            </Pressable>

            <Pressable
              onPress={() => setExpandedEngine(expandedEngine === "mf" ? null : "mf")}
              style={[S.engineCard, expandedEngine === "mf" && S.engineCardActive]}
            >
              <MaterialCommunityIcons name="chart-line" size={24} color={mfReport.available ? T.gold : T.textSec} />
              <View>
                <Text style={[S.engineLabel, mfReport.available && { color: T.gold }]}>MF X-Ray</Text>
                <Text style={{ fontSize: 10, color: T.textSec, marginTop: 2 }}>{mfReport.available ? "Active" : "Locked"}</Text>
              </View>
            </Pressable>
          </View>

          {/* Expanded Detail Panel */}
          {expandedEngine === "tax" && (
            <View style={S.expandedPanel}>
              {taxReport.available ? (
                <>
                  <Text style={S.panelHeader}>Recommended: {taxReport.recommendedRegime} Regime</Text>
                  <Text style={S.panelText}>Total Tax: {formatCurrency(taxReport.recommendedRegime === "New" ? taxReport.newRegime.totalTax : taxReport.oldRegime.totalTax)}</Text>
                  <Text style={S.panelText}>Calculated Savings Over Old: {formatCurrency(taxReport.saving)}</Text>
                  {taxReport.missedItems.length > 0 && (
                    <View style={{ marginTop: 12 }}>
                      <Text style={[S.panelHeader, { color: T.amber }]}>Missed Deductions</Text>
                      {taxReport.missedItems.map((item, idx) => (
                          <Text key={idx} style={S.panelText}>• {item.name}: ~{formatCurrency(item.saving)}</Text>
                      ))}
                    </View>
                  )}
                </>
              ) : (
                <View style={{ alignItems: "center", paddingVertical: 10, paddingHorizontal: 10 }}>
                  <Text style={{ fontSize: 14, fontWeight: "700", color: T.text, marginBottom: 6 }}>Tax Wizard Locked</Text>
                  <Text style={{ fontSize: 13, color: T.textSec, textAlign: "center", marginBottom: 16, lineHeight: 20 }}>Upload a Form 16 document in the setup phase to unlock automated tax reduction insights.</Text>
                  <Pressable onPress={() => router.push("/swipe")} style={{ backgroundColor: "rgba(126, 206, 193, 0.15)", paddingHorizontal: 20, paddingVertical: 10, borderRadius: 20 }}>
                    <Text style={{ color: T.teal, fontSize: 12, fontWeight: "800", textTransform: "uppercase", letterSpacing: 1 }}>Go to Upload Vault</Text>
                  </Pressable>
                </View>
              )}
            </View>
          )}

          {expandedEngine === "mf" && (
            <View style={[S.expandedPanel, { borderTopColor: T.gold }]}>
              {mfReport.available ? (
                <>
                  <Text style={S.panelHeader}>Portfolio XIRR: {formatPercent(mfReport.avgXIRR)}</Text>
                  <Text style={S.panelText}>Total Invested: {formatCurrency(mfReport.totalInvested)}</Text>
                  <Text style={S.panelText}>Current Value: {formatCurrency(mfReport.totalCurrent)}</Text>
                  {mfReport.driftTriggered && <Text style={[S.panelText, { color: T.red, marginTop: 12 }]}>⚠️ Asset drift detected &gt; 10%.</Text>}
                </>
              ) : (
                <View style={{ alignItems: "center", paddingVertical: 10, paddingHorizontal: 10 }}>
                  <Text style={{ fontSize: 14, fontWeight: "700", color: T.text, marginBottom: 6 }}>MF X-Ray Locked</Text>
                  <Text style={{ fontSize: 13, color: T.textSec, textAlign: "center", marginBottom: 16, lineHeight: 20 }}>Upload a Mutual Fund CAS or CAMS statement to automatically detect expense ratio drag and portfolio overlap.</Text>
                  <Pressable onPress={() => router.push("/swipe")} style={{ backgroundColor: "rgba(232, 184, 109, 0.15)", paddingHorizontal: 20, paddingVertical: 10, borderRadius: 20 }}>
                    <Text style={{ color: T.gold, fontSize: 12, fontWeight: "800", textTransform: "uppercase", letterSpacing: 1 }}>Go to Upload Vault</Text>
                  </Pressable>
                </View>
              )}
            </View>
          )}

        </SectionContainer>
        <View style={{ height: 80 }} />
      </ScrollView>

      {/* FLOATING AI COACH */}
      <Pressable onPress={() => router.push("/coach")} style={S.fab}>
        <Ionicons name="sparkles" size={26} color={T.bg} />
      </Pressable>
    </SafeAreaView>
  );
}

// ── Styles ────────────────────────────────────────────────
const S = StyleSheet.create({
  screen: { flex: 1, backgroundColor: T.bg },
  content: { padding: 20 },
  
  heroContainer: { alignItems: "center", marginBottom: 30, marginTop: 10 },
  heroQuote: { marginTop: 16, fontSize: 16, textAlign: "center", fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif', color: T.text, paddingHorizontal: 20, fontStyle: "italic", lineHeight: 24, letterSpacing: 0.5 },
  
  sectionContainer: { marginBottom: 24 },
  sectionTitle: { fontSize: 18, fontWeight: "800", color: T.textSec, marginBottom: 12, letterSpacing: 1, textTransform: "uppercase" },
  
  alertCard: { flexDirection: "row", borderWidth: 1, borderRadius: T.radius, padding: 16, marginBottom: 10, alignItems: "center" },
  alertIconBox: { width: 40, height: 40, borderRadius: 20, backgroundColor: "rgba(255,255,255,0.1)", justifyContent: "center", alignItems: "center" },
  alertTitle: { fontSize: 14, fontWeight: "900", marginBottom: 2 },
  alertMessage: { fontSize: 13, color: T.text, lineHeight: 18, opacity: 0.9 },

  metricCard: { flex: 1, backgroundColor: T.card, borderRadius: T.radiusSm, padding: 14 },
  metricLabel: { fontSize: 11, fontWeight: "700", color: T.textSec, letterSpacing: 0.5 },
  metricValue: { fontSize: 18, fontWeight: "900", marginTop: 6 },
  metricHint: { fontSize: 11, color: T.textSec, marginTop: 4 },

  gridContainer: { flexDirection: "row", flexWrap: "wrap", justifyContent: "space-between" },
  gridCard: { width: "48%", backgroundColor: T.card, borderRadius: T.radiusSm, padding: 16, marginBottom: 12 },
  gridHeader: { fontSize: 13, fontWeight: "600", color: T.text, marginBottom: 8 },
  gridScore: { fontSize: 28, fontWeight: "900", fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif' },
  progressBarBg: { height: 6, backgroundColor: "rgba(255,255,255,0.06)", borderRadius: 3, marginTop: 10 },
  progressBarFill: { height: 6, borderRadius: 3 },

  breakdownContainer: { marginTop: 12, backgroundColor: T.card, borderRadius: T.radiusSm, padding: 16 },
  breakdownTitle: { fontSize: 14, fontWeight: "800", color: T.teal, marginBottom: 10 },
  breakdownRow: { flexDirection: "row", justifyContent: "space-between", marginBottom: 8 },
  breakdownLabel: { fontSize: 13, color: T.text, fontWeight: "500" },
  breakdownValue: { fontSize: 13, color: T.text, fontWeight: "800" },

  engineCard: { flex: 1, flexDirection: "row", alignItems: "center", backgroundColor: T.card, borderRadius: T.radiusSm, padding: 16, gap: 10, borderWidth: 1, borderColor: "transparent" },
  engineCardActive: { borderColor: T.goldGlow, backgroundColor: "rgba(232, 184, 109, 0.05)" },
  engineLabel: { fontSize: 14, fontWeight: "700", color: T.textSec },

  expandedPanel: { marginTop: 12, backgroundColor: T.card, borderRadius: T.radiusSm, padding: 20, paddingTop: 16, borderTopWidth: 2, borderTopColor: T.gold },
  panelHeader: { fontSize: 16, fontWeight: "900", color: T.gold, marginBottom: 8 },
  panelText: { fontSize: 14, color: T.text, marginBottom: 4, lineHeight: 22 },

  fab: { position: "absolute", right: 24, bottom: 30, width: 60, height: 60, borderRadius: 30, backgroundColor: T.gold, justifyContent: "center", alignItems: "center", shadowColor: T.gold, shadowOpacity: 0.5, shadowRadius: 16, shadowOffset: { width: 0, height: 6 }, elevation: 8 },
});

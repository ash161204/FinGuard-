import { useMemo, useState } from "react";
import { router } from "expo-router";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import { useAppContext } from "../context/AppContext";
import { formatCurrency } from "../utils/finance";
import { buildMfXRayReport, buildTaxWizardReport, buildMoneyHealthScore, buildBankStatementAnalysis, unwrapAnalysis } from "../utils/insightEngine";

const formatPercent = (value, digits = 1) => `${(Number(value || 0) * 100).toFixed(digits)}%`;
const formatSignedCurrency = (value) => `${value >= 0 ? "+" : "-"}${formatCurrency(Math.abs(value || 0))}`;
const fmtInr = (n) => `\u20B9${Math.round(n || 0).toLocaleString("en-IN")}`;

// ── Shared Components ──────────────────────────────────────────────

function SectionCard({ title, subtitle, children, style }) {
  return (
    <View style={[S.card, style]}>
      {title && <Text style={S.cardTitle}>{title}</Text>}
      {subtitle ? <Text style={S.cardSubtitle}>{subtitle}</Text> : null}
      {children}
    </View>
  );
}

function MetricCard({ label, value, hint, accent = "#112236" }) {
  return (
    <View style={S.metricCard}>
      <Text style={S.metricLabel}>{label}</Text>
      <Text style={[S.metricValue, { color: accent }]}>{value}</Text>
      {hint ? <Text style={S.metricHint}>{hint}</Text> : null}
    </View>
  );
}

function InfoPill({ text, tone = "neutral" }) {
  const bg = tone === "warn" ? "#FFF3E8" : tone === "danger" ? "#FEF2F2" : tone === "success" ? "#F0FDF4" : "#EEF5F2";
  const color = tone === "warn" ? "#C2410C" : tone === "danger" ? "#991B1B" : tone === "success" ? "#166534" : "#0F766E";
  return <Text style={[S.pill, { backgroundColor: bg, color }]}>{text}</Text>;
}

function KeyValueRow({ label, value, emphasize = false }) {
  return (
    <View style={S.kvRow}>
      <Text style={S.kvLabel}>{label}</Text>
      <Text style={[S.kvValue, emphasize && S.kvStrong]}>{value}</Text>
    </View>
  );
}

function AlertCard({ alert }) {
  const bgColor = alert.type === "danger" ? "#FEF2F2" : alert.type === "warn" ? "#FFF7ED" : "#EFF6FF";
  const borderColor = alert.type === "danger" ? "#FECACA" : alert.type === "warn" ? "#FED7AA" : "#BFDBFE";
  const textColor = alert.type === "danger" ? "#991B1B" : alert.type === "warn" ? "#9A3412" : "#1E40AF";
  return (
    <View style={[S.alertBox, { backgroundColor: bgColor, borderColor }]}>
      <Text style={{ fontSize: 13, fontWeight: "800", color: textColor }}>{alert.title}</Text>
      <Text style={{ fontSize: 12, lineHeight: 18, color: textColor }}>{alert.message}</Text>
    </View>
  );
}

function UrgencyBadge({ urgency }) {
  const c = urgency === "now" ? { bg: "#FEF2F2", text: "#DC2626" } : urgency === "month" ? { bg: "#FFF7ED", text: "#EA580C" } : { bg: "#F0FDF4", text: "#16A34A" };
  const label = urgency === "now" ? "Do Now" : urgency === "month" ? "This Month" : "Annual";
  return (
    <View style={[S.urgencyBadge, { backgroundColor: c.bg }]}>
      <Text style={{ fontSize: 10, fontWeight: "700", textTransform: "uppercase", letterSpacing: 0.6, color: c.text }}>{label}</Text>
    </View>
  );
}

function XIRRBadge({ color }) {
  const bg = { green: "#DCFCE7", yellow: "#FEF9C3", red: "#FEE2E2" };
  const fg = { green: "#166534", yellow: "#854D0E", red: "#991B1B" };
  const lbl = { green: "Strong", yellow: "Moderate", red: "Weak" };
  return (
    <View style={{ borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2, backgroundColor: bg[color] || bg.yellow }}>
      <Text style={{ fontSize: 10, fontWeight: "700", color: fg[color] || fg.yellow }}>{lbl[color] || "N/A"}</Text>
    </View>
  );
}

// ═══════════════════════════════════════════════════════
// DASHBOARD SCREEN
// ═══════════════════════════════════════════════════════
export default function DashboardScreen() {
  const { documentResults, riskVibe, healthInputs, income, needsSliderAmount } = useAppContext();

  const [expandedEngine, setExpandedEngine] = useState(null); // "tax" | "mf" | null

  const taxReport = useMemo(() => buildTaxWizardReport(documentResults), [documentResults]);
  const mfReport = useMemo(() => buildMfXRayReport(documentResults, { riskVibe }), [documentResults, riskVibe]);
  const documents = useMemo(() => documentResults.map((d) => ({ filename: d.filename, analysis: unwrapAnalysis(d) })), [documentResults]);

  // TOOL 4: Bank Statement Analysis
  const bankReport = useMemo(() => {
    const txns = [];
    for (const doc of documentResults) {
      const a = unwrapAnalysis(doc);
      if (a && Array.isArray(a.transactions)) txns.push(...a.transactions);
    }
    return txns.length > 0 ? buildBankStatementAnalysis(txns) : null;
  }, [documentResults]);

  // TOOL 3: Money Health Score (bridged with bank data)
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

  // Confidence level
  const confidence = documentResults.length >= 2 ? "HIGH" : documentResults.length === 1 ? "MEDIUM" : "LOW";
  const confColor = confidence === "HIGH" ? "#16A34A" : confidence === "MEDIUM" ? "#EAB308" : "#EA580C";

  // Collect all health alerts
  const allAlerts = [
    ...healthReport.alerts.map((a) => ({ title: a.dimension, message: a.text, type: a.severity === "red" ? "danger" : "warn" })),
    ...(bankReport ? bankReport.alerts.map((a) => ({ title: a.rule, message: a.text, type: a.severity === "red" ? "danger" : "warn" })) : []),
  ];

  // ── No documents: show health score only with limited data message ──
  if (!documentResults.length) {
    return (
      <View style={S.screen}>
        <ScrollView contentContainerStyle={S.content}>
          {/* Progress */}
          <View style={{ flexDirection: "row", gap: 6, marginBottom: 8 }}>
            {["Setup", "Docs", "Dashboard"].map((l, i) => (
              <View key={l} style={{ flex: 1, alignItems: "center" }}>
                <View style={{ height: 4, borderRadius: 2, width: "100%", backgroundColor: i <= 2 ? "#16A34A" : "#E2E8F0" }} />
                <Text style={{ fontSize: 9, fontWeight: "700", color: i <= 2 ? "#16A34A" : "#94A3B8", marginTop: 4 }}>{l}</Text>
              </View>
            ))}
          </View>

          {/* Hero Score */}
          {renderHeroScore(healthReport, confidence, confColor)}

          {/* Dimensions */}
          {renderDimensions(healthReport)}

          {/* Alerts */}
          {allAlerts.length > 0 && renderAlerts(allAlerts)}

          {/* Upload prompt */}
          <SectionCard>
            <View style={{ alignItems: "center", paddingVertical: 16, gap: 10 }}>
              <MaterialCommunityIcons name="file-document-multiple-outline" size={36} color="#CBD5E1" />
              <Text style={{ fontSize: 14, fontWeight: "800", color: "#2C2F30" }}>Want deeper insights?</Text>
              <Text style={{ fontSize: 13, color: "#64748B", textAlign: "center", lineHeight: 20 }}>
                Upload bank statements, MF reports, or Form 16 for full analysis.
              </Text>
              <Pressable onPress={() => router.push("/swipe")} style={S.ctaBtn}>
                <Text style={S.ctaBtnText}>Upload Documents</Text>
              </Pressable>
            </View>
          </SectionCard>
        </ScrollView>
        {renderFloatingCoach()}
      </View>
    );
  }

  // ── Full Dashboard ──
  return (
    <View style={S.screen}>
      <ScrollView contentContainerStyle={S.content}>
        {/* Progress */}
        <View style={{ flexDirection: "row", gap: 6, marginBottom: 8 }}>
          {["Setup", "Docs", "Dashboard"].map((l, i) => (
            <View key={l} style={{ flex: 1, alignItems: "center" }}>
              <View style={{ height: 4, borderRadius: 2, width: "100%", backgroundColor: "#16A34A" }} />
              <Text style={{ fontSize: 9, fontWeight: "700", color: "#16A34A", marginTop: 4 }}>{l}</Text>
            </View>
          ))}
        </View>

        {/* ════ SECTION 1: HERO SCORE ════ */}
        {renderHeroScore(healthReport, confidence, confColor)}

        {/* ════ SECTION 2: 6 HEALTH DIMENSIONS (horizontal scroll) ════ */}
        {renderDimensions(healthReport)}

        {/* ════ SECTION 3: HEALTH ALERTS ════ */}
        {allAlerts.length > 0 && renderAlerts(allAlerts)}

        {/* ════ SECTION 4: CASHFLOW ANALYZER ════ */}
        {bankReport && (
          <SectionCard title="Cashflow Analyzer" subtitle={`${bankReport.transactionCount} transactions analyzed`}>
            {/* Top row: Income / Expenses / Savings */}
            <View style={S.metricsRow}>
              <MetricCard label="Income" value={fmtInr(bankReport.totalInflow)} accent="#166534" />
              <MetricCard label="Expenses" value={fmtInr(bankReport.totalOutflow)} accent="#991B1B" />
              <MetricCard label="Savings" value={`${bankReport.savingsRate.rate.toFixed(0)}%`} accent={bankReport.savingsRate.isHealthy ? "#166534" : "#DC2626"} hint={bankReport.savingsRate.isHealthy ? "Healthy" : "Below 20%"} />
            </View>

            {/* Spending breakdown */}
            <Text style={[S.listTitle, { marginTop: 12 }]}>Spending Breakdown</Text>
            <View style={{ gap: 6, marginTop: 6 }}>
              <SpendBar label="Fixed (EMI/Bills)" amount={bankReport.emiFixed.total} total={bankReport.totalOutflow} color="#1A3A2A" />
              <SpendBar label="Discretionary" amount={bankReport.discretionary.total} total={bankReport.totalOutflow} color="#4A7A5A" />
              <SpendBar label="Other" amount={bankReport.totalOutflow - bankReport.emiFixed.total - bankReport.discretionary.total} total={bankReport.totalOutflow} color="#94A3B8" />
            </View>

            {/* Top discretionary categories */}
            {bankReport.discretionary.breakdown.length > 0 && (
              <View style={{ marginTop: 12, gap: 6 }}>
                <Text style={S.listTitle}>Top Spending Categories</Text>
                {bankReport.discretionary.breakdown.slice(0, 5).map((cat) => (
                  <View key={cat.category} style={S.listRow}>
                    <Text style={{ flex: 1, fontSize: 13, fontWeight: "700", color: "#2C2F30" }}>{cat.category}</Text>
                    <Text style={S.listRowValue}>{fmtInr(cat.amount)}</Text>
                  </View>
                ))}
              </View>
            )}

            {/* Monthly trend */}
            {bankReport.monthlySummary.length > 1 && (
              <View style={{ marginTop: 12, gap: 6 }}>
                <Text style={S.listTitle}>Monthly Trend</Text>
                {bankReport.monthlySummary.map((m) => (
                  <View key={m.month} style={S.listRow}>
                    <Text style={{ flex: 1, fontSize: 13, fontWeight: "700", color: "#2C2F30" }}>{m.month}</Text>
                    <View style={{ alignItems: "flex-end" }}>
                      <Text style={{ fontSize: 12, color: "#64748B" }}>In: {fmtInr(m.inflow)} | Out: {fmtInr(m.outflow)}</Text>
                      <Text style={{ fontSize: 12, fontWeight: "800", color: m.savingsRate >= 20 ? "#166534" : m.savingsRate >= 0 ? "#854D0E" : "#991B1B" }}>
                        {m.savingsRate.toFixed(0)}% saved
                      </Text>
                    </View>
                  </View>
                ))}
              </View>
            )}

            {/* Bounces + CC trap */}
            {bankReport.bounces.count > 0 && <InfoPill text={`${bankReport.bounces.count} bounce(s) — \u20B9${Math.round(bankReport.bounces.totalCharges).toLocaleString("en-IN")} in charges`} tone="danger" />}
            {bankReport.ccTrap.detected && <InfoPill text={bankReport.ccTrap.detail} tone="danger" />}
          </SectionCard>
        )}

        {/* ════ SECTION 5: DOCUMENT AUDIT TRAIL ════ */}
        <SectionCard title="Documents Used" subtitle={`${documents.length} document${documents.length > 1 ? "s" : ""} analyzed`}>
          {documents.map((doc, i) => (
            <View key={`${doc.filename}-${i}`} style={{ flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 8 }}>
              <Ionicons name="checkmark-circle" size={18} color="#16A34A" />
              <Text style={{ flex: 1, fontSize: 14, fontWeight: "700", color: "#2C2F30" }}>{doc.filename}</Text>
              <View style={{ borderRadius: 8, backgroundColor: "#E9F8F2", paddingHorizontal: 8, paddingVertical: 3 }}>
                <Text style={{ fontSize: 10, fontWeight: "800", color: "#00684F" }}>{doc.analysis?.document_type || "unknown"}</Text>
              </View>
            </View>
          ))}
        </SectionCard>

        {/* ════ SECTION 6: ENGINE STATUS ════ */}
        <View style={{ flexDirection: "row", gap: 12 }}>
          <Pressable
            onPress={() => setExpandedEngine(expandedEngine === "tax" ? null : "tax")}
            style={[S.engineCard, taxReport.available && S.engineCardActive]}
          >
            <MaterialCommunityIcons name="calculator-variant" size={24} color={taxReport.available ? "#00684F" : "#94A3B8"} />
            <Text style={[S.engineLabel, taxReport.available && { color: "#00684F" }]}>Tax Wizard</Text>
            <Text style={S.engineStatus}>{taxReport.available ? "Active" : "No data"}</Text>
            {taxReport.available && <Ionicons name="checkmark-circle" size={16} color="#16A34A" />}
          </Pressable>

          <Pressable
            onPress={() => setExpandedEngine(expandedEngine === "mf" ? null : "mf")}
            style={[S.engineCard, mfReport.available && S.engineCardActive]}
          >
            <MaterialCommunityIcons name="chart-line" size={24} color={mfReport.available ? "#00684F" : "#94A3B8"} />
            <Text style={[S.engineLabel, mfReport.available && { color: "#00684F" }]}>MF X-Ray</Text>
            <Text style={S.engineStatus}>{mfReport.available ? "Active" : "Not detected"}</Text>
            {mfReport.available && <Ionicons name="checkmark-circle" size={16} color="#16A34A" />}
          </Pressable>
        </View>

        {/* ════ TAX WIZARD DETAIL (expandable) ════ */}
        {expandedEngine === "tax" && taxReport.available && (
          <SectionCard title="Tax Wizard Details" subtitle="FY 2025-26 | Budget 2025 Applied">
            <View style={S.metricsRow}>
              <MetricCard label="Recommended" value={`${taxReport.recommendedRegime} Regime`} accent="#00684F" />
              <MetricCard label="Tax Saving" value={formatCurrency(taxReport.saving)} accent="#0E7490" />
              <MetricCard label="TDS Found" value={formatCurrency(taxReport.taxDeducted)} accent="#7C3AED" />
              <MetricCard label="Refund / Payable" value={formatSignedCurrency(taxReport.refundOrPayable)} accent={taxReport.refundOrPayable >= 0 ? "#00684F" : "#C2410C"} />
            </View>

            {(taxReport.identity.employeeName || taxReport.identity.pan) && (
              <View style={S.pillRow}>
                {taxReport.identity.employeeName && <InfoPill text={taxReport.identity.employeeName} />}
                {taxReport.identity.pan && <InfoPill text={taxReport.identity.pan} />}
              </View>
            )}

            {taxReport.isZeroTaxEligible && <InfoPill text="Zero tax eligible under New Regime (salary within Rs. 12.75L)" tone="success" />}

            {taxReport.itrSuggestion && (
              <View style={{ borderRadius: 14, backgroundColor: "#F0FDF4", padding: 14, marginTop: 8 }}>
                <Text style={{ fontSize: 10, fontWeight: "800", textTransform: "uppercase", letterSpacing: 1, color: "#7C8796" }}>Suggested ITR Form</Text>
                <Text style={{ marginTop: 4, fontSize: 18, fontWeight: "900", color: "#166534" }}>{taxReport.itrSuggestion.form}</Text>
                <Text style={{ marginTop: 4, fontSize: 12, color: "#6B7280" }}>{taxReport.itrSuggestion.reason}</Text>
              </View>
            )}

            {/* Regime comparison */}
            <Text style={[S.listTitle, { marginTop: 8 }]}>Old vs New Regime</Text>
            <View style={{ flexDirection: "row", gap: 10 }}>
              {[{ regime: "Old", data: taxReport.oldRegime }, { regime: "New", data: taxReport.newRegime }].map(({ regime, data }) => (
                <View key={regime} style={[S.compareCard, taxReport.recommendedRegime === regime && S.compareCardAccent]}>
                  <Text style={S.compareLabel}>{regime} Regime</Text>
                  <Text style={S.compareValue}>{formatCurrency(data.totalTax)}</Text>
                  <KeyValueRow label="Net Taxable" value={formatCurrency(data.netTaxable)} emphasize />
                  <KeyValueRow label="Slab Tax" value={formatCurrency(data.slabTax)} />
                  <KeyValueRow label="87A Rebate" value={`-${formatCurrency(data.rebate)}`} />
                  <KeyValueRow label="Cess" value={formatCurrency(data.cess)} />
                  <KeyValueRow label="Total Tax" value={formatCurrency(data.totalTax)} emphasize />
                </View>
              ))}
            </View>

            {/* Missed deductions */}
            {taxReport.missedItems.length > 0 && (
              <View style={{ marginTop: 10, gap: 8 }}>
                <Text style={S.listTitle}>Missed Deductions</Text>
                {taxReport.missedItems.map((item) => (
                  <View key={item.name} style={[S.listRow, item.priority === "critical" && { borderLeftWidth: 3, borderLeftColor: "#DC2626" }]}>
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontSize: 13, fontWeight: "800", color: "#2C2F30" }}>{item.name}</Text>
                      <Text style={{ fontSize: 11, color: "#64748B" }}>{item.section} - {item.description}</Text>
                    </View>
                    {item.saving > 0 && <Text style={S.listRowValue}>~{formatCurrency(item.saving)}</Text>}
                  </View>
                ))}
              </View>
            )}

            {/* Investments */}
            {taxReport.investments.length > 0 && (
              <View style={{ marginTop: 10, gap: 8 }}>
                <Text style={S.listTitle}>Investment Suggestions</Text>
                {taxReport.investments.slice(0, 6).map((item) => (
                  <View key={item.name} style={S.listRow}>
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontSize: 13, fontWeight: "800", color: "#2C2F30" }}>{item.name}</Text>
                      <Text style={{ fontSize: 11, color: "#64748B" }}>{item.section} | {item.risk} risk</Text>
                    </View>
                    <Text style={S.listRowValue}>{formatCurrency(item.saving)}</Text>
                  </View>
                ))}
              </View>
            )}
          </SectionCard>
        )}

        {/* ════ MF X-RAY DETAIL (expandable) ════ */}
        {expandedEngine === "mf" && mfReport.available && (
          <SectionCard title="MF Portfolio X-Ray" subtitle="XIRR | Overlap | TER Drag | Rebalancing">
            <View style={S.metricsRow}>
              <MetricCard label="Portfolio XIRR" value={formatPercent(mfReport.avgXIRR)} accent={mfReport.avgXIRRColor === "green" ? "#166534" : mfReport.avgXIRRColor === "red" ? "#991B1B" : "#854D0E"} />
              <MetricCard label="Absolute Return" value={`${mfReport.totalAbsReturn.toFixed(1)}%`} accent={mfReport.totalAbsReturn >= 0 ? "#166534" : "#991B1B"} hint={formatCurrency(mfReport.totalGain)} />
              <MetricCard label="Portfolio Value" value={formatCurrency(mfReport.totalCurrent)} accent="#1A3A2A" hint={`Invested: ${formatCurrency(mfReport.totalInvested)}`} />
            </View>

            {/* Allocation bar */}
            <View style={{ marginTop: 10, gap: 6 }}>
              <View style={{ flexDirection: "row", height: 24, borderRadius: 6, overflow: "hidden", gap: 2 }}>
                {mfReport.equityPct > 0 && <View style={{ flex: mfReport.equityPct, backgroundColor: "#1A3A2A", alignItems: "center", justifyContent: "center" }}><Text style={{ fontSize: 9, fontWeight: "700", color: "#FFF" }}>{Math.round(mfReport.equityPct * 100)}%Eq</Text></View>}
                {mfReport.debtPct > 0 && <View style={{ flex: mfReport.debtPct, backgroundColor: "#4A7A5A", alignItems: "center", justifyContent: "center" }}><Text style={{ fontSize: 9, fontWeight: "700", color: "#FFF" }}>{Math.round(mfReport.debtPct * 100)}%Debt</Text></View>}
                <View style={{ flex: Math.max(0.01, 1 - mfReport.equityPct - mfReport.debtPct), backgroundColor: "#94A3B8", alignItems: "center", justifyContent: "center" }}><Text style={{ fontSize: 9, fontWeight: "700", color: "#FFF" }}>{Math.round((1 - mfReport.equityPct - mfReport.debtPct) * 100)}%</Text></View>
              </View>
              {mfReport.driftTriggered && <InfoPill text="Drift > 10% detected — rebalancing triggered" tone="warn" />}
            </View>

            {/* Holdings */}
            <View style={{ marginTop: 10, gap: 6 }}>
              <Text style={S.listTitle}>Holdings ({mfReport.holdingsCount})</Text>
              {mfReport.holdings.slice(0, 6).map((h) => (
                <View key={`${h.name}-${h.purchaseDate.toISOString()}`} style={S.listRow}>
                  <View style={{ flex: 1 }}>
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                      <Text style={{ fontSize: 13, fontWeight: "800", color: "#2C2F30" }} numberOfLines={1}>{h.name}</Text>
                      <XIRRBadge color={h.xirrColor} />
                    </View>
                    <Text style={{ fontSize: 11, color: "#64748B" }}>{h.category} | XIRR: {formatPercent(h.xirr)} | {h.absReturn.toFixed(1)}%</Text>
                  </View>
                  <View style={{ alignItems: "flex-end" }}>
                    <Text style={S.listRowValue}>{formatCurrency(h.current)}</Text>
                    <Text style={{ fontSize: 11, color: h.gain >= 0 ? "#166534" : "#991B1B" }}>{h.gain >= 0 ? "+" : ""}{formatCurrency(h.gain)}</Text>
                  </View>
                </View>
              ))}
            </View>

            {/* Category XIRR */}
            {mfReport.categoryXIRR.length > 0 && (
              <View style={{ marginTop: 10, gap: 6 }}>
                <Text style={S.listTitle}>Category XIRR</Text>
                {mfReport.categoryXIRR.map((cat) => (
                  <View key={cat.category} style={S.listRow}>
                    <View style={{ flex: 1, flexDirection: "row", alignItems: "center", gap: 6 }}>
                      <Text style={{ fontSize: 13, fontWeight: "800", color: "#2C2F30" }}>{cat.category}</Text>
                      <XIRRBadge color={cat.xirrColor} />
                    </View>
                    <Text style={[S.listRowValue, { color: cat.xirrColor === "green" ? "#166534" : cat.xirrColor === "red" ? "#991B1B" : "#854D0E" }]}>{formatPercent(cat.xirr)}</Text>
                  </View>
                ))}
              </View>
            )}

            {/* TER drag */}
            {mfReport.terRows.length > 0 && (
              <View style={{ marginTop: 10, gap: 6 }}>
                <Text style={S.listTitle}>TER Drag</Text>
                {mfReport.terRows.slice(0, 5).map((row) => (
                  <View key={row.name} style={S.listRow}>
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontSize: 13, fontWeight: "800", color: "#2C2F30" }}>{row.name} {row.isRegular ? "(REG)" : ""}</Text>
                      <Text style={{ fontSize: 11, color: "#64748B" }}>TER {row.ter.toFixed(2)}%</Text>
                    </View>
                    <Text style={S.listRowValue}>{formatCurrency(row.annualDrag)}/yr</Text>
                  </View>
                ))}
                <View style={{ flexDirection: "row", gap: 10, borderRadius: 12, backgroundColor: "#F8FAFC", padding: 12 }}>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 10, fontWeight: "700", color: "#7C8796" }}>TOTAL DRAG</Text>
                    <Text style={{ fontSize: 14, fontWeight: "900", color: "#2C2F30" }}>{formatCurrency(mfReport.totalAnnualDrag)}/yr</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 10, fontWeight: "700", color: "#7C8796" }}>BLENDED TER</Text>
                    <Text style={{ fontSize: 14, fontWeight: "900", color: "#2C2F30" }}>{mfReport.blendedTER.toFixed(2)}%</Text>
                  </View>
                </View>
              </View>
            )}

            {/* Rebalancing actions */}
            {mfReport.actions.length > 0 && (
              <View style={{ marginTop: 10, gap: 6 }}>
                <Text style={S.listTitle}>Rebalancing Plan</Text>
                {mfReport.actions.slice(0, 6).map((a) => (
                  <View key={a.title} style={S.listRow}>
                    <View style={{
                      width: 28, height: 28, borderRadius: 14, alignItems: "center", justifyContent: "center",
                      backgroundColor: a.urgency === "now" ? "#DC2626" : a.urgency === "month" ? "#EA580C" : "#1A3A2A",
                    }}>
                      <Text style={{ fontSize: 12, fontWeight: "800", color: "#FFF" }}>{a.num}</Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontSize: 13, fontWeight: "800", color: "#2C2F30" }}>{a.title}</Text>
                      <Text style={{ fontSize: 11, color: "#64748B" }}>{a.description}</Text>
                    </View>
                    <UrgencyBadge urgency={a.urgency} />
                  </View>
                ))}
              </View>
            )}
          </SectionCard>
        )}

        {/* Bottom padding for floating button */}
        <View style={{ height: 70 }} />
      </ScrollView>

      {/* ════ SECTION 7: FLOATING AI COACH ════ */}
      {renderFloatingCoach()}
    </View>
  );
}

// ── Render helpers ────────────────────────────────────────

function renderHeroScore(healthReport, confidence, confColor) {
  const scoreColor = healthReport.overallScore >= 70 ? "#16A34A" : healthReport.overallScore >= 40 ? "#EAB308" : "#DC2626";
  return (
    <View style={[S.card, { alignItems: "center", paddingVertical: 24 }]}>
      {/* Score ring */}
      <View style={{
        width: 110, height: 110, borderRadius: 55, borderWidth: 6, borderColor: scoreColor,
        alignItems: "center", justifyContent: "center",
      }}>
        <Text style={{ fontSize: 38, fontWeight: "900", color: "#2C2F30" }}>{healthReport.overallScore}</Text>
        <Text style={{ fontSize: 16, fontWeight: "800", color: scoreColor, marginTop: -4 }}>{healthReport.overallGrade}</Text>
      </View>

      <Text style={{ marginTop: 12, fontSize: 18, fontWeight: "900", color: "#2C2F30" }}>
        {healthReport.overallScore >= 80 ? "You're financially strong!" : healthReport.overallScore >= 60 ? "Good foundations, room to grow." : healthReport.overallScore >= 40 ? "Needs attention in a few areas." : "Let's build your safety net."}
      </Text>

      {/* Confidence */}
      <View style={{ marginTop: 8, borderRadius: 10, backgroundColor: confColor + "18", paddingHorizontal: 12, paddingVertical: 5 }}>
        <Text style={{ fontSize: 11, fontWeight: "800", color: confColor }}>Confidence: {confidence}</Text>
      </View>
    </View>
  );
}

function renderDimensions(healthReport) {
  return (
    <View>
      <Text style={[S.listTitle, { marginBottom: 8 }]}>Health Dimensions</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 10, paddingRight: 12 }}>
        {healthReport.dimensions.map((d) => {
          const c = d.score >= 70 ? "#16A34A" : d.score >= 40 ? "#EAB308" : "#DC2626";
          return (
            <View key={d.id} style={S.dimCard}>
              <Text style={{ fontSize: 10, fontWeight: "800", color: "#94A3B8", textTransform: "uppercase", letterSpacing: 1 }}>{d.id}</Text>
              <Text style={{ fontSize: 24, fontWeight: "900", color: c, marginVertical: 4 }}>{d.score}</Text>
              <Text style={{ fontSize: 12, fontWeight: "800", color: "#2C2F30", textAlign: "center" }}>{d.name}</Text>
              <View style={{ marginTop: 6, width: "100%", height: 4, borderRadius: 2, backgroundColor: "#E5E7EB" }}>
                <View style={{ height: 4, borderRadius: 2, backgroundColor: c, width: `${d.score}%` }} />
              </View>
              <Text style={{ marginTop: 6, fontSize: 10, color: "#64748B", textAlign: "center", lineHeight: 14 }} numberOfLines={2}>{d.detail}</Text>
            </View>
          );
        })}
      </ScrollView>
    </View>
  );
}

function renderAlerts(alerts) {
  return (
    <SectionCard title="Alerts" subtitle="Issues that need your attention">
      {alerts.slice(0, 8).map((a, i) => (
        <AlertCard key={`alert-${i}`} alert={a} />
      ))}
    </SectionCard>
  );
}

function SpendBar({ label, amount, total, color }) {
  const pct = total > 0 ? (amount / total) * 100 : 0;
  return (
    <View style={{ gap: 4 }}>
      <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
        <Text style={{ fontSize: 12, fontWeight: "700", color: "#2C2F30" }}>{label}</Text>
        <Text style={{ fontSize: 12, fontWeight: "800", color: "#2C2F30" }}>{fmtInr(amount)} ({pct.toFixed(0)}%)</Text>
      </View>
      <View style={{ height: 6, borderRadius: 3, backgroundColor: "#E5E7EB" }}>
        <View style={{ height: 6, borderRadius: 3, backgroundColor: color, width: `${Math.min(pct, 100)}%` }} />
      </View>
    </View>
  );
}

function renderFloatingCoach() {
  return (
    <Pressable
      onPress={() => router.push("/coach")}
      style={S.fab}
    >
      <Ionicons name="chatbubble-ellipses" size={24} color="#FFFFFF" />
      <Text style={{ fontSize: 12, fontWeight: "800", color: "#FFFFFF", marginLeft: 8 }}>Ask AI</Text>
    </Pressable>
  );
}

// ── Styles ────────────────────────────────────────────────
const S = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#F5F7FB" },
  content: { padding: 20, paddingTop: 54, paddingBottom: 40, gap: 16 },

  card: {
    borderRadius: 24, backgroundColor: "#FFFFFF", padding: 18, gap: 10,
    shadowColor: "#112236", shadowOpacity: 0.06, shadowRadius: 16, shadowOffset: { width: 0, height: 6 }, elevation: 3,
  },
  cardTitle: { fontSize: 18, fontWeight: "900", color: "#2C2F30" },
  cardSubtitle: { fontSize: 12, color: "#64748B" },

  metricsRow: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  metricCard: { minWidth: "30%", flex: 1, borderRadius: 16, backgroundColor: "#F8FAFC", padding: 12 },
  metricLabel: { fontSize: 10, fontWeight: "800", letterSpacing: 1, textTransform: "uppercase", color: "#7C8796" },
  metricValue: { marginTop: 6, fontSize: 18, fontWeight: "900" },
  metricHint: { marginTop: 3, fontSize: 11, color: "#64748B" },

  pill: { borderRadius: 999, paddingHorizontal: 12, paddingVertical: 7, fontSize: 12, fontWeight: "600", lineHeight: 17, overflow: "hidden" },
  pillRow: { flexDirection: "row", flexWrap: "wrap", gap: 6 },

  kvRow: { marginTop: 5, flexDirection: "row", justifyContent: "space-between", gap: 6 },
  kvLabel: { flex: 1, fontSize: 12, color: "#64748B" },
  kvValue: { fontSize: 12, fontWeight: "700", color: "#2C2F30" },
  kvStrong: { color: "#00684F", fontSize: 13 },

  alertBox: { borderRadius: 14, borderWidth: 1, padding: 12, gap: 3 },

  listTitle: { fontSize: 14, fontWeight: "900", color: "#2C2F30" },
  listRow: { flexDirection: "row", gap: 10, alignItems: "center", borderRadius: 14, backgroundColor: "#F8FAFC", paddingHorizontal: 12, paddingVertical: 10 },
  listRowValue: { fontSize: 13, fontWeight: "900", color: "#00684F" },

  compareCard: { flex: 1, borderRadius: 18, backgroundColor: "#F8FAFC", padding: 12 },
  compareCardAccent: { borderWidth: 2, borderColor: "#C9F0E1" },
  compareLabel: { fontSize: 11, fontWeight: "800", letterSpacing: 1, textTransform: "uppercase", color: "#7C8796" },
  compareValue: { marginTop: 6, fontSize: 20, fontWeight: "900", color: "#2C2F30" },

  // Health dimension cards (horizontal scroll)
  dimCard: {
    width: 130, borderRadius: 18, backgroundColor: "#FFFFFF", padding: 14, alignItems: "center",
    borderWidth: 1, borderColor: "#F0F0F0",
    shadowColor: "#112236", shadowOpacity: 0.04, shadowRadius: 8, shadowOffset: { width: 0, height: 4 }, elevation: 2,
  },

  // Engine status cards
  engineCard: {
    flex: 1, borderRadius: 18, backgroundColor: "#FFFFFF", padding: 16, alignItems: "center", gap: 8,
    borderWidth: 1.5, borderColor: "#E2E8F0",
    shadowColor: "#112236", shadowOpacity: 0.04, shadowRadius: 8, shadowOffset: { width: 0, height: 4 }, elevation: 2,
  },
  engineCardActive: { borderColor: "#9AF2D0", backgroundColor: "#F0FDF4" },
  engineLabel: { fontSize: 14, fontWeight: "800", color: "#94A3B8" },
  engineStatus: { fontSize: 11, fontWeight: "700", color: "#64748B" },

  urgencyBadge: { borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 },

  // CTAs
  ctaBtn: { marginTop: 8, borderRadius: 18, backgroundColor: "#00684F", paddingHorizontal: 24, paddingVertical: 14 },
  ctaBtnText: { fontSize: 15, fontWeight: "900", color: "#FFFFFF" },

  // Floating AI Coach
  fab: {
    position: "absolute", right: 20, bottom: 24,
    flexDirection: "row", alignItems: "center",
    borderRadius: 24, backgroundColor: "#00684F", paddingHorizontal: 18, paddingVertical: 14,
    shadowColor: "#000", shadowOpacity: 0.2, shadowRadius: 12, shadowOffset: { width: 0, height: 6 }, elevation: 8,
  },
});

import { useMemo } from "react";
import { router } from "expo-router";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import { useAppContext } from "../context/AppContext";
import { formatCurrency } from "../utils/finance";
import { buildMfXRayReport, buildTaxWizardReport, unwrapAnalysis } from "../utils/insightEngine";

const formatPercent = (value, digits = 1) => `${(Number(value || 0) * 100).toFixed(digits)}%`;
const formatSignedCurrency = (value) => `${value >= 0 ? "+" : "-"}${formatCurrency(Math.abs(value || 0))}`;

function MetricCard({ label, value, hint, accent = "#112236" }) {
  return (
    <View style={styles.metricCard}>
      <Text style={styles.metricLabel}>{label}</Text>
      <Text style={[styles.metricValue, { color: accent }]}>{value}</Text>
      {hint ? <Text style={styles.metricHint}>{hint}</Text> : null}
    </View>
  );
}

function SectionCard({ title, subtitle, children }) {
  return (
    <View style={styles.sectionCard}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {subtitle ? <Text style={styles.sectionSubtitle}>{subtitle}</Text> : null}
      {children}
    </View>
  );
}

function InfoPill({ text, tone = "neutral" }) {
  return <Text style={[styles.infoPill, tone === "warn" ? styles.warnPill : styles.neutralPill]}>{text}</Text>;
}

function KeyValueRow({ label, value, emphasize = false }) {
  return (
    <View style={styles.keyValueRow}>
      <Text style={styles.keyValueLabel}>{label}</Text>
      <Text style={[styles.keyValueValue, emphasize && styles.keyValueValueStrong]}>{value}</Text>
    </View>
  );
}

export default function DashboardScreen() {
  const { documentResults, riskVibe } = useAppContext();

  const taxReport = useMemo(() => buildTaxWizardReport(documentResults), [documentResults]);
  const mfReport = useMemo(() => buildMfXRayReport(documentResults, { riskVibe }), [documentResults, riskVibe]);
  const documents = useMemo(() => documentResults.map((document) => ({ filename: document.filename, analysis: unwrapAnalysis(document) })), [documentResults]);

  if (!documentResults.length) {
    return (
      <View style={styles.screen}>
        <View style={styles.emptyWrap}>
          <Text style={styles.emptyTitle}>Page 3 is waiting for analyzed PDFs.</Text>
          <Text style={styles.emptyText}>Upload and analyze one or more files on page 2, then the Tax Wizard and MF X-Ray sections will appear here.</Text>
          <Pressable onPress={() => router.push("/swipe")} style={styles.primaryButton}>
            <Text style={styles.primaryButtonText}>Go To Uploads</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.eyebrow}>Step 3</Text>
        <Text style={styles.heroTitle}>Your document insights are ready.</Text>
        <Text style={styles.heroSubtitle}>This page uses the logic from your Tax Wizard and MF Portfolio X-Ray files, fed by the parsed JSON from page 2.</Text>

        <SectionCard title="Uploaded Analyses" subtitle={`${documents.length} document${documents.length > 1 ? "s" : ""} available`}>
          {documents.map((document, index) => (
            <View key={`${document.filename}-${index}`} style={styles.documentRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.documentName}>{document.filename}</Text>
                <Text style={styles.documentMeta}>{document.analysis?.document_type || "unknown"}</Text>
              </View>
              <InfoPill text={document.analysis?.summary || "Structured JSON attached"} />
            </View>
          ))}
        </SectionCard>

        <SectionCard title="Tax Wizard" subtitle={taxReport.available ? "Old vs New regime comparison from uploaded JSON" : taxReport.message}>
          {taxReport.available ? (
            <>
              <View style={styles.metricsGrid}>
                <MetricCard label="Recommended" value={`${taxReport.recommendedRegime} Regime`} accent="#00684F" />
                <MetricCard label="Potential Saving" value={formatCurrency(taxReport.saving)} accent="#0E7490" />
                <MetricCard label="TDS Found" value={formatCurrency(taxReport.taxDeducted)} accent="#7C3AED" />
                <MetricCard label="Refund / Payable" value={formatSignedCurrency(taxReport.refundOrPayable)} accent={taxReport.refundOrPayable >= 0 ? "#00684F" : "#C2410C"} />
              </View>

              {(taxReport.identity.employeeName || taxReport.identity.employerName || taxReport.identity.pan) ? (
                <View style={styles.identityWrap}>
                  {taxReport.identity.employeeName ? <InfoPill text={taxReport.identity.employeeName} /> : null}
                  {taxReport.identity.employerName ? <InfoPill text={taxReport.identity.employerName} /> : null}
                  {taxReport.identity.pan ? <InfoPill text={taxReport.identity.pan} /> : null}
                  {taxReport.identity.assessmentYear ? <InfoPill text={taxReport.identity.assessmentYear} /> : null}
                </View>
              ) : null}

              <View style={styles.compareGrid}>
                <View style={styles.compareCard}>
                  <Text style={styles.compareLabel}>Old Regime</Text>
                  <Text style={styles.compareValue}>{formatCurrency(taxReport.oldRegime.totalTax)}</Text>
                  <KeyValueRow label="Gross Salary" value={formatCurrency(taxReport.oldRegime.grossSalary)} />
                  <KeyValueRow label="Net Taxable" value={formatCurrency(taxReport.oldRegime.netTaxable)} />
                  <KeyValueRow label="Slab Tax" value={formatCurrency(taxReport.oldRegime.slabTax)} />
                  <KeyValueRow label="Special Tax" value={formatCurrency(taxReport.oldRegime.specialTax)} />
                  <KeyValueRow label="Rebate" value={formatCurrency(taxReport.oldRegime.rebate)} />
                  <KeyValueRow label="Cess" value={formatCurrency(taxReport.oldRegime.cess)} emphasize />
                </View>
                <View style={[styles.compareCard, taxReport.recommendedRegime === "New" && styles.compareCardAccent]}>
                  <Text style={styles.compareLabel}>New Regime</Text>
                  <Text style={[styles.compareValue, { color: "#00684F" }]}>{formatCurrency(taxReport.newRegime.totalTax)}</Text>
                  <KeyValueRow label="Gross Salary" value={formatCurrency(taxReport.newRegime.grossSalary)} />
                  <KeyValueRow label="Net Taxable" value={formatCurrency(taxReport.newRegime.netTaxable)} />
                  <KeyValueRow label="Slab Tax" value={formatCurrency(taxReport.newRegime.slabTax)} />
                  <KeyValueRow label="Special Tax" value={formatCurrency(taxReport.newRegime.specialTax)} />
                  <KeyValueRow label="Rebate" value={formatCurrency(taxReport.newRegime.rebate)} />
                  <KeyValueRow label="Cess" value={formatCurrency(taxReport.newRegime.cess)} emphasize />
                </View>
              </View>

              {taxReport.warnings.length ? (
                <View style={styles.listWrap}>
                  <Text style={styles.listTitle}>Warnings</Text>
                  {taxReport.warnings.map((warning) => <InfoPill key={warning} text={warning} tone="warn" />)}
                </View>
              ) : null}

              <View style={styles.listWrap}>
                <Text style={styles.listTitle}>Missed Deductions</Text>
                {taxReport.missedItems.map((item) => (
                  <View key={item.name} style={styles.listRow}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.listRowTitle}>{item.name}</Text>
                      <Text style={styles.listRowSubtitle}>{item.section} · {item.description}</Text>
                    </View>
                    <Text style={styles.listRowValue}>{formatCurrency(item.saving)}</Text>
                  </View>
                ))}
              </View>

              <View style={styles.listWrap}>
                <Text style={styles.listTitle}>Suggested Investments</Text>
                {taxReport.investments.map((item) => (
                  <View key={item.name} style={styles.listRow}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.listRowTitle}>{item.name}</Text>
                      <Text style={styles.listRowSubtitle}>{item.section} · {item.priority} · {item.risk}</Text>
                    </View>
                    <Text style={styles.listRowValue}>{formatCurrency(item.saving)}</Text>
                  </View>
                ))}
              </View>

              {taxReport.assumptions.length ? (
                <View style={styles.listWrap}>
                  <Text style={styles.listTitle}>Assumptions Used</Text>
                  {taxReport.assumptions.map((assumption) => <Text key={assumption} style={styles.assumptionText}>• {assumption}</Text>)}
                </View>
              ) : null}
            </>
          ) : (
            <Text style={styles.placeholderText}>{taxReport.message}</Text>
          )}
        </SectionCard>

        <SectionCard title="MF Portfolio X-Ray" subtitle={mfReport.available ? "Portfolio reconstruction from uploaded JSON" : mfReport.message}>
          {mfReport.available ? (
            <>
              <View style={styles.metricsGrid}>
                <MetricCard label="Portfolio Value" value={formatCurrency(mfReport.totalCurrent)} accent="#1A3A2A" />
                <MetricCard label="Portfolio XIRR" value={formatPercent(mfReport.avgXIRR)} accent="#1A5C3A" />
                <MetricCard label="Absolute Return" value={`${mfReport.totalAbsReturn.toFixed(1)}%`} accent="#C2410C" hint={formatCurrency(mfReport.totalGain)} />
                <MetricCard label="Funds / Regular" value={`${mfReport.holdingsCount} / ${mfReport.regularFundsCount}`} accent="#7C3AED" />
              </View>

              <View style={styles.identityWrap}>
                <InfoPill text={`Risk Profile: ${mfReport.riskProfile}`} />
                <InfoPill text={`Equity ${Math.round(mfReport.equityPct * 100)}%`} />
                <InfoPill text={`Debt ${Math.round(mfReport.debtPct * 100)}%`} />
                <InfoPill text={`Target Eq ${Math.round(mfReport.target.equity * 100)}%`} />
              </View>

              {mfReport.alerts.length ? (
                <View style={styles.listWrap}>
                  <Text style={styles.listTitle}>Alerts</Text>
                  {mfReport.alerts.map((alert) => <InfoPill key={alert} text={alert} tone="warn" />)}
                </View>
              ) : null}

              <View style={styles.listWrap}>
                <Text style={styles.listTitle}>Top Holdings</Text>
                {mfReport.holdings.slice(0, 6).map((holding) => (
                  <View key={`${holding.name}-${holding.purchaseDate.toISOString()}`} style={styles.listRow}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.listRowTitle}>{holding.name}</Text>
                      <Text style={styles.listRowSubtitle}>{holding.category} · {holding.plan}</Text>
                    </View>
                    <Text style={styles.listRowValue}>{formatCurrency(holding.current)}</Text>
                  </View>
                ))}
              </View>

              <View style={styles.listWrap}>
                <Text style={styles.listTitle}>Overlap Snapshot</Text>
                {mfReport.overlaps.map((pair) => (
                  <View key={`${pair.left}-${pair.right}`} style={styles.listRow}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.listRowTitle}>{pair.left}</Text>
                      <Text style={styles.listRowSubtitle}>vs {pair.right}</Text>
                    </View>
                    <Text style={styles.listRowValue}>{pair.overlap}% · {pair.severity}</Text>
                  </View>
                ))}
              </View>

              <View style={styles.listWrap}>
                <Text style={styles.listTitle}>TER Drag</Text>
                {mfReport.terRows.slice(0, 6).map((row) => (
                  <View key={row.name} style={styles.listRow}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.listRowTitle}>{row.name}</Text>
                      <Text style={styles.listRowSubtitle}>{row.category} · TER {row.ter.toFixed(2)}% · {row.flag}</Text>
                    </View>
                    <Text style={styles.listRowValue}>{formatCurrency(row.annualDrag)}</Text>
                  </View>
                ))}
              </View>

              <View style={styles.listWrap}>
                <Text style={styles.listTitle}>Benchmark Check</Text>
                {mfReport.benchmarkRows.slice(0, 6).map((row) => (
                  <View key={row.name} style={styles.listRow}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.listRowTitle}>{row.name}</Text>
                      <Text style={styles.listRowSubtitle}>{row.benchmark} · {row.status}</Text>
                    </View>
                    <Text style={styles.listRowValue}>{formatPercent(row.alpha)}</Text>
                  </View>
                ))}
              </View>

              <View style={styles.listWrap}>
                <Text style={styles.listTitle}>Action Plan</Text>
                {mfReport.actions.map((action) => (
                  <View key={action.title} style={styles.listRow}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.listRowTitle}>{action.title}</Text>
                      <Text style={styles.listRowSubtitle}>{action.when} · {action.description}</Text>
                    </View>
                    <Text style={styles.listRowValue}>{formatCurrency(action.impact)}</Text>
                  </View>
                ))}
              </View>
            </>
          ) : (
            <Text style={styles.placeholderText}>{mfReport.message}</Text>
          )}
        </SectionCard>
      </ScrollView>

      <Pressable onPress={() => router.push("/coach")} style={styles.footerButton}>
        <Text style={styles.footerButtonText}>Ask AI Coach</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#F5F7FB" },
  content: { padding: 20, paddingTop: 58, paddingBottom: 120, gap: 18 },
  eyebrow: { fontSize: 11, fontWeight: "800", letterSpacing: 2.4, textTransform: "uppercase", color: "#00684F" },
  heroTitle: { marginTop: 10, fontSize: 30, fontWeight: "900", color: "#112236" },
  heroSubtitle: { marginTop: 10, fontSize: 15, lineHeight: 23, color: "#607081" },
  sectionCard: { borderRadius: 28, backgroundColor: "#FFFFFF", padding: 18, gap: 14, shadowColor: "#112236", shadowOpacity: 0.06, shadowRadius: 16, shadowOffset: { width: 0, height: 8 }, elevation: 4 },
  sectionTitle: { fontSize: 20, fontWeight: "900", color: "#112236" },
  sectionSubtitle: { marginTop: 2, fontSize: 13, lineHeight: 20, color: "#6B7280" },
  metricsGrid: { flexDirection: "row", flexWrap: "wrap", gap: 12 },
  metricCard: { minWidth: "47%", flex: 1, borderRadius: 20, backgroundColor: "#F7FAFC", padding: 14 },
  metricLabel: { fontSize: 11, fontWeight: "800", letterSpacing: 1.2, textTransform: "uppercase", color: "#7C8796" },
  metricValue: { marginTop: 8, fontSize: 21, fontWeight: "900" },
  metricHint: { marginTop: 4, fontSize: 12, color: "#6B7280" },
  identityWrap: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  infoPill: { borderRadius: 999, paddingHorizontal: 12, paddingVertical: 8, fontSize: 12, lineHeight: 17, overflow: "hidden" },
  neutralPill: { backgroundColor: "#EEF5F2", color: "#0F766E" },
  warnPill: { backgroundColor: "#FFF3E8", color: "#C2410C" },
  compareGrid: { flexDirection: "row", gap: 12 },
  compareCard: { flex: 1, borderRadius: 22, backgroundColor: "#F7FAFC", padding: 14 },
  compareCardAccent: { borderWidth: 1, borderColor: "#C9F0E1" },
  compareLabel: { fontSize: 12, fontWeight: "800", letterSpacing: 1, textTransform: "uppercase", color: "#7C8796" },
  compareValue: { marginTop: 8, fontSize: 24, fontWeight: "900", color: "#112236" },
  keyValueRow: { marginTop: 8, flexDirection: "row", justifyContent: "space-between", gap: 8 },
  keyValueLabel: { flex: 1, fontSize: 13, color: "#6B7280" },
  keyValueValue: { fontSize: 13, fontWeight: "700", color: "#112236" },
  keyValueValueStrong: { color: "#00684F" },
  listWrap: { gap: 10 },
  listTitle: { fontSize: 15, fontWeight: "900", color: "#112236" },
  listRow: { flexDirection: "row", gap: 12, alignItems: "center", borderRadius: 18, backgroundColor: "#F8FAFC", paddingHorizontal: 14, paddingVertical: 12 },
  listRowTitle: { fontSize: 14, fontWeight: "800", color: "#112236" },
  listRowSubtitle: { marginTop: 3, fontSize: 12, lineHeight: 18, color: "#6B7280" },
  listRowValue: { fontSize: 13, fontWeight: "900", color: "#00684F" },
  assumptionText: { fontSize: 13, lineHeight: 20, color: "#607081" },
  documentRow: { flexDirection: "row", gap: 10, alignItems: "center", borderRadius: 18, backgroundColor: "#F8FAFC", paddingHorizontal: 14, paddingVertical: 12 },
  documentName: { fontSize: 14, fontWeight: "800", color: "#112236" },
  documentMeta: { marginTop: 3, fontSize: 12, color: "#6B7280" },
  placeholderText: { fontSize: 14, lineHeight: 22, color: "#607081" },
  footerButton: { position: "absolute", left: 20, right: 20, bottom: 24, borderRadius: 18, backgroundColor: "#00684F", paddingVertical: 16, alignItems: "center", justifyContent: "center" },
  footerButtonText: { fontSize: 16, fontWeight: "900", color: "#F9FFFC" },
  emptyWrap: { flex: 1, padding: 24, alignItems: "center", justifyContent: "center", backgroundColor: "#F5F7FB" },
  emptyTitle: { textAlign: "center", fontSize: 28, fontWeight: "900", color: "#112236" },
  emptyText: { marginTop: 10, textAlign: "center", fontSize: 15, lineHeight: 24, color: "#607081" },
  primaryButton: { marginTop: 20, borderRadius: 18, backgroundColor: "#00684F", paddingHorizontal: 20, paddingVertical: 14 },
  primaryButtonText: { fontSize: 15, fontWeight: "900", color: "#FFFFFF" },
});

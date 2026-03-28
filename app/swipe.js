import { useEffect, useMemo, useRef, useState } from "react";
import * as DocumentPicker from "expo-document-picker";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { useAppContext } from "../context/AppContext";
import { getBackendBaseUrl, uploadDocuments } from "../utils/documentApi";

const formatBytes = (v) => {
  if (!v) return "";
  return v < 1024 * 1024 ? `${Math.round(v / 1024)} KB` : `${(v / (1024 * 1024)).toFixed(1)} MB`;
};

const fmtInr = (n) => {
  const v = Number(String(n).replace(/[^0-9.\-]/g, "")) || 0;
  return `\u20B9${Math.round(v).toLocaleString("en-IN")}`;
};

const PROCESSING_STEPS = [
  { icon: "file-search-outline", text: "Reading your documents..." },
  { icon: "chart-bar", text: "Categorizing transactions..." },
  { icon: "brain", text: "Building your financial profile..." },
];

const UPLOAD_TYPES = [
  { key: "bank", label: "Bank Statement", icon: "bank-outline", emoji: "\uD83D\uDCC4" },
  { key: "mf", label: "Mutual Funds", icon: "chart-line", emoji: "\uD83D\uDCCA" },
  { key: "form16", label: "Form 16", icon: "receipt", emoji: "\uD83E\uDDFE" },
];

// ── Extract human-readable insights from parsed document ──
function extractInsights(doc) {
  const a = doc.analysis || {};
  const insights = [];

  // Income
  const income = a.financials?.gross_salary || a.financials?.total_income || a.financials?.total_credits;
  if (income) insights.push({ label: "Income detected", value: fmtInr(income), icon: "cash" });

  // Account holder
  const holder = a.parties?.account_holder || a.parties?.employee_name || a.parties?.client_name;
  if (holder) insights.push({ label: "Account holder", value: holder, icon: "account" });

  // EMIs / debits
  const debits = a.financials?.total_debits;
  if (debits) insights.push({ label: "Total debits", value: fmtInr(debits), icon: "arrow-down-circle" });

  // Credits
  const credits = a.financials?.total_credits;
  if (credits && !income) insights.push({ label: "Total credits", value: fmtInr(credits), icon: "arrow-up-circle" });

  // Transactions count
  if (a.transactions?.length) insights.push({ label: "Transactions found", value: `${a.transactions.length}`, icon: "swap-horizontal" });

  // Holdings count
  if (a.holdings?.length) insights.push({ label: "Fund holdings", value: `${a.holdings.length} schemes`, icon: "chart-pie" });

  // Portfolio value
  const portfolioVal = a.portfolio_summary?.total_current_value;
  if (portfolioVal) insights.push({ label: "Portfolio value", value: fmtInr(portfolioVal), icon: "wallet" });

  // Tax deducted
  const tds = a.financials?.tax_deducted;
  if (tds) insights.push({ label: "TDS deducted", value: fmtInr(tds), icon: "percent" });

  // Statement period
  const period = a.periods?.statement_period || a.periods?.financial_year;
  if (period) insights.push({ label: "Period", value: period, icon: "calendar" });

  // Balance
  const balance = a.financials?.closing_balance;
  if (balance) insights.push({ label: "Closing balance", value: fmtInr(balance), icon: "bank" });

  return insights;
}

export default function SwipeScreen() {
  const apiBaseUrl = useMemo(() => getBackendBaseUrl(), []);
  const { documentResults, setDocumentResults, clearDocumentResults } = useAppContext();

  const [selectedFiles, setSelectedFiles] = useState([]);
  const [isUploading, setIsUploading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [processingStep, setProcessingStep] = useState(0);

  // Animate processing steps
  useEffect(() => {
    if (!isUploading) { setProcessingStep(0); return; }
    const timer = setInterval(() => {
      setProcessingStep((prev) => (prev < PROCESSING_STEPS.length - 1 ? prev + 1 : prev));
    }, 2500);
    return () => clearInterval(timer);
  }, [isUploading]);

  const handlePickDocuments = async () => {
    setErrorMessage("");
    const result = await DocumentPicker.getDocumentAsync({
      type: "application/pdf",
      multiple: true,
      copyToCacheDirectory: true,
    });
    if (result.canceled) return;
    setSelectedFiles(result.assets || []);
    clearDocumentResults();
  };

  const handleAnalyze = async () => {
    if (!selectedFiles.length || isUploading) return;
    setIsUploading(true);
    setErrorMessage("");
    setProcessingStep(0);

    try {
      const payload = await uploadDocuments({ assets: selectedFiles });
      setDocumentResults(payload.documents || []);
      if (payload.errors?.length) {
        setErrorMessage(payload.errors.map((e) => `${e.filename}: ${e.message}`).join("\n"));
      }
    } catch (error) {
      setErrorMessage(error.message || "Failed to analyze the selected PDFs.");
    } finally {
      setIsUploading(false);
    }
  };

  const handleReset = () => {
    setSelectedFiles([]);
    setErrorMessage("");
    clearDocumentResults();
  };

  const hasResults = documentResults.length > 0;

  return (
    <LinearGradient colors={["#F2FBF6", "#F6F2FF"]} style={s.screen}>
      <ScrollView contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>

        {/* ── Progress Bar ── */}
        <View style={{ flexDirection: "row", gap: 6, marginBottom: 8 }}>
          {["Setup", "Docs", "Dashboard"].map((label, i) => (
            <View key={label} style={{ flex: 1, alignItems: "center" }}>
              <View style={{ height: 4, borderRadius: 2, width: "100%", backgroundColor: i <= 1 ? "#16A34A" : "#E2E8F0" }} />
              <Text style={{ fontSize: 9, fontWeight: "700", color: i <= 1 ? "#16A34A" : "#94A3B8", marginTop: 4 }}>{label}</Text>
            </View>
          ))}
        </View>

        {/* ── Header ── */}
        <View style={{ alignItems: "center", marginBottom: 18 }}>
          <Text style={s.title}>Upload & Analyze</Text>
          <Text style={s.subtitle}>
            Your documents are parsed locally, analyzed by AI, and never stored.
          </Text>
        </View>

        {/* ═══ STEP 1: Upload Cards ═══ */}
        <View style={[s.panel, s.shadow]}>
          <Text style={s.sectionTitle}>Choose Documents</Text>

          {/* Upload type cards */}
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10, marginTop: 12 }}>
            {UPLOAD_TYPES.map((t) => {
              const hasFile = selectedFiles.some((f) =>
                t.key === "bank" ? /bank|statement/i.test(f.name) :
                t.key === "mf" ? /mutual|fund|cas|cams|kfin/i.test(f.name) :
                /form.?16|tds/i.test(f.name)
              );
              return (
                <Pressable
                  key={t.key}
                  onPress={handlePickDocuments}
                  style={[s.uploadCard, hasFile && s.uploadCardActive]}
                >
                  <MaterialCommunityIcons name={t.icon} size={24} color={hasFile ? "#00684F" : "#94A3B8"} />
                  <Text style={[s.uploadCardLabel, hasFile && { color: "#00684F" }]}>{t.label}</Text>
                  {hasFile && <Ionicons name="checkmark-circle" size={16} color="#16A34A" style={{ position: "absolute", top: 8, right: 8 }} />}
                </Pressable>
              );
            })}
            <Pressable onPress={handlePickDocuments} style={s.uploadCard}>
              <Ionicons name="add-circle-outline" size={24} color="#94A3B8" />
              <Text style={s.uploadCardLabel}>Add More</Text>
            </Pressable>
          </View>

          {/* Selected files */}
          {selectedFiles.length > 0 && (
            <View style={{ marginTop: 14, gap: 8 }}>
              {selectedFiles.map((file, i) => (
                <View key={`${file.name}-${i}`} style={s.fileRow}>
                  <Ionicons name="document-attach-outline" size={18} color="#00684F" />
                  <Text numberOfLines={1} style={s.fileName}>{file.name}</Text>
                  <Text style={s.fileSize}>{formatBytes(file.size)}</Text>
                </View>
              ))}
            </View>
          )}

          {/* Action buttons */}
          <View style={{ marginTop: 16, flexDirection: "row", gap: 10 }}>
            <Pressable
              onPress={handleAnalyze}
              disabled={!selectedFiles.length || isUploading}
              style={[s.analyzeBtn, (!selectedFiles.length || isUploading) && { opacity: 0.5 }]}
            >
              {isUploading ? (
                <ActivityIndicator color="#FFF" size="small" />
              ) : (
                <>
                  <Ionicons name="sparkles-outline" size={18} color="#FFF" />
                  <Text style={s.analyzeBtnText}>Analyze</Text>
                </>
              )}
            </Pressable>
            {selectedFiles.length > 0 && (
              <Pressable onPress={handleReset} style={s.clearBtn}>
                <Text style={s.clearBtnText}>Clear</Text>
              </Pressable>
            )}
          </View>

          {errorMessage ? <Text style={s.error}>{errorMessage}</Text> : null}
        </View>

        {/* ═══ STEP 2: Processing Animation ═══ */}
        {isUploading && (
          <View style={[s.panel, s.shadow, { gap: 12 }]}>
            {PROCESSING_STEPS.map((step, i) => {
              const active = i <= processingStep;
              const current = i === processingStep;
              return (
                <View key={step.text} style={{ flexDirection: "row", alignItems: "center", gap: 12, opacity: active ? 1 : 0.3 }}>
                  {current ? (
                    <ActivityIndicator size="small" color="#00684F" />
                  ) : (
                    <MaterialCommunityIcons name={active ? "check-circle" : step.icon} size={20} color={active ? "#16A34A" : "#94A3B8"} />
                  )}
                  <Text style={{ fontSize: 14, fontWeight: active ? "700" : "500", color: active ? "#2C2F30" : "#94A3B8" }}>
                    {step.text}
                  </Text>
                </View>
              );
            })}
          </View>
        )}

        {/* ═══ STEP 3: Parsed Data Preview (human-readable) ═══ */}
        {hasResults && (
          <View style={[s.panel, s.shadow]}>
            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
              <Text style={s.sectionTitle}>We Found</Text>
              {/* Confidence badge */}
              <View style={{ borderRadius: 10, backgroundColor: "#E6F9F1", paddingHorizontal: 10, paddingVertical: 4 }}>
                <Text style={{ fontSize: 11, fontWeight: "800", color: "#16A34A" }}>HIGH</Text>
              </View>
            </View>

            {documentResults.map((doc, idx) => {
              const insights = extractInsights(doc);
              const docType = doc.analysis?.document_type || "unknown";
              const typeLabel = docType === "form16" ? "Form 16" : docType === "bank_statement" ? "Bank Statement" : docType === "mutual_fund_statement" ? "MF Portfolio" : docType;

              return (
                <View key={`${doc.filename}-${idx}`} style={{ marginTop: 14 }}>
                  {/* File header */}
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 10 }}>
                    <View style={{ width: 36, height: 36, borderRadius: 12, backgroundColor: "#E9F8F2", alignItems: "center", justifyContent: "center" }}>
                      <Ionicons name="document-text" size={18} color="#00684F" />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text numberOfLines={1} style={{ fontSize: 14, fontWeight: "800", color: "#2C2F30" }}>{doc.filename}</Text>
                      <Text style={{ fontSize: 11, color: "#64748B" }}>{typeLabel}</Text>
                    </View>
                    <Ionicons name="checkmark-circle" size={20} color="#16A34A" />
                  </View>

                  {/* Insight rows */}
                  {insights.length > 0 ? (
                    <View style={{ borderRadius: 16, backgroundColor: "#F8FAFC", padding: 14, gap: 10 }}>
                      {insights.map((ins) => (
                        <View key={ins.label} style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
                          <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                            <MaterialCommunityIcons name={ins.icon} size={16} color="#64748B" />
                            <Text style={{ fontSize: 13, color: "#64748B" }}>{ins.label}</Text>
                          </View>
                          <Text style={{ fontSize: 14, fontWeight: "800", color: "#2C2F30" }}>{ins.value}</Text>
                        </View>
                      ))}
                    </View>
                  ) : (
                    <Text style={{ fontSize: 12, color: "#94A3B8" }}>Document parsed, but no structured data extracted.</Text>
                  )}
                </View>
              );
            })}

            {/* CTA */}
            <Pressable
              onPress={() => router.push("/dashboard")}
              style={{
                marginTop: 20, borderRadius: 20, backgroundColor: "#00684F", paddingVertical: 18,
                alignItems: "center",
              }}
            >
              <Text style={{ fontSize: 17, fontWeight: "900", color: "#FFFFFF" }}>View My Full Dashboard</Text>
            </Pressable>
          </View>
        )}

        {/* Empty state when no results yet */}
        {!hasResults && !isUploading && (
          <View style={[s.panel, s.shadow, { alignItems: "center", paddingVertical: 28, gap: 8 }]}>
            <MaterialCommunityIcons name="file-document-multiple-outline" size={32} color="#CBD5E1" />
            <Text style={{ fontSize: 13, color: "#94A3B8", textAlign: "center" }}>
              Upload and analyze your PDFs above.{"\n"}We'll extract insights automatically.
            </Text>
          </View>
        )}

        {/* Skip link */}
        {!hasResults && (
          <Pressable onPress={() => router.push("/dashboard")} style={{ paddingVertical: 12, alignItems: "center" }}>
            <Text style={{ fontSize: 13, fontWeight: "600", color: "#94A3B8" }}>Skip — use onboarding data only</Text>
          </Pressable>
        )}
      </ScrollView>
    </LinearGradient>
  );
}

const s = StyleSheet.create({
  screen: { flex: 1 },
  content: { paddingHorizontal: 20, paddingTop: 54, paddingBottom: 40, gap: 16 },
  title: { fontSize: 26, fontWeight: "900", color: "#2C2F30", textAlign: "center" },
  subtitle: { marginTop: 6, fontSize: 13, color: "#64748B", textAlign: "center", lineHeight: 20 },

  panel: { borderRadius: 24, backgroundColor: "#FFFFFF", padding: 18 },
  shadow: { shadowColor: "#112236", shadowOpacity: 0.06, shadowRadius: 16, shadowOffset: { width: 0, height: 6 }, elevation: 3 },
  sectionTitle: { fontSize: 18, fontWeight: "900", color: "#2C2F30" },

  uploadCard: {
    flex: 1, minWidth: "44%", borderRadius: 18, borderWidth: 1.5, borderColor: "#E2E8F0", borderStyle: "dashed",
    backgroundColor: "#FAFAFA", padding: 16, alignItems: "center", gap: 8,
  },
  uploadCardActive: { borderColor: "#9AF2D0", borderStyle: "solid", backgroundColor: "#F0FDF4" },
  uploadCardLabel: { fontSize: 12, fontWeight: "700", color: "#94A3B8", textAlign: "center" },

  fileRow: { flexDirection: "row", alignItems: "center", gap: 10, borderRadius: 14, backgroundColor: "#F8FAFC", paddingHorizontal: 12, paddingVertical: 10 },
  fileName: { flex: 1, fontSize: 13, fontWeight: "700", color: "#2C2F30" },
  fileSize: { fontSize: 11, color: "#94A3B8" },

  analyzeBtn: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, borderRadius: 20, backgroundColor: "#112236", paddingVertical: 14 },
  analyzeBtnText: { fontSize: 15, fontWeight: "800", color: "#FFFFFF" },
  clearBtn: { borderRadius: 20, backgroundColor: "#F1F5F9", paddingHorizontal: 18, paddingVertical: 14 },
  clearBtnText: { fontSize: 14, fontWeight: "700", color: "#64748B" },

  error: { marginTop: 10, fontSize: 12, lineHeight: 18, color: "#DC2626" },
});

import { useEffect, useMemo, useState } from "react";
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
import { SafeAreaView } from "react-native-safe-area-context";

import { useAppContext } from "../context/AppContext";
import { getBackendBaseUrl, uploadDocuments } from "../utils/documentApi";
import { T } from "../components/theme";

const formatBytes = (v) => {
  if (!v) return "";
  return v < 1024 * 1024 ? `${Math.round(v / 1024)} KB` : `${(v / (1024 * 1024)).toFixed(1)} MB`;
};

const fmtInr = (n) => {
  const v = Number(String(n).replace(/[^0-9.\-]/g, "")) || 0;
  return `\u20B9${Math.round(v).toLocaleString("en-IN")}`;
};

const PROCESSING_STEPS = [
  { icon: "file-search-outline", text: "Reading encrypted payload..." },
  { icon: "chart-bar", text: "Categorizing transactions..." },
  { icon: "brain", text: "Building your financial model..." },
];

const UPLOAD_TYPES = [
  { key: "bank", label: "Bank Statement", icon: "bank-outline" },
  { key: "mf", label: "Mutual Funds", icon: "chart-line" },
  { key: "form16", label: "Form 16", icon: "receipt" },
];

function extractInsights(doc) {
  const a = doc.analysis || {};
  const insights = [];

  const income = a.financials?.gross_salary || a.financials?.total_income || a.financials?.total_credits;
  if (income) insights.push({ label: "Income", value: fmtInr(income), icon: "cash" });

  const holder = a.parties?.account_holder || a.parties?.employee_name || a.parties?.client_name;
  if (holder) insights.push({ label: "Holder", value: holder, icon: "account" });

  const debits = a.financials?.total_debits;
  if (debits) insights.push({ label: "Debits", value: fmtInr(debits), icon: "arrow-down-circle" });

  if (a.transactions?.length) insights.push({ label: "Txns Found", value: `${a.transactions.length}`, icon: "swap-horizontal" });
  if (a.holdings?.length) insights.push({ label: "Funds", value: `${a.holdings.length} schemes`, icon: "chart-pie" });

  const portfolioVal = a.portfolio_summary?.total_current_value;
  if (portfolioVal) insights.push({ label: "Portfolio Value", value: fmtInr(portfolioVal), icon: "wallet" });

  const tds = a.financials?.tax_deducted;
  if (tds) insights.push({ label: "TDS", value: fmtInr(tds), icon: "percent" });

  const balance = a.financials?.closing_balance;
  if (balance) insights.push({ label: "Balance", value: fmtInr(balance), icon: "bank" });

  return insights;
}

export default function SwipeScreen() {
  const apiBaseUrl = useMemo(() => getBackendBaseUrl(), []);
  const { documentResults, setDocumentResults, clearDocumentResults } = useAppContext();

  const [selectedFiles, setSelectedFiles] = useState([]);
  const [isUploading, setIsUploading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [processingStep, setProcessingStep] = useState(0);

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
    <SafeAreaView style={{ flex: 1, backgroundColor: T.bg }}>
      <LinearGradient colors={T.bgGrad} style={StyleSheet.absoluteFillObject} />
      
      {/* Dynamic Header / Navigator */}
      <View style={{ flexDirection: "row", paddingHorizontal: 20, paddingTop: 16, paddingBottom: 10, alignItems: "center" }}>
        <Pressable onPress={() => router.back()} style={{ width: 40, height: 40, alignItems: "center", justifyContent: "center", borderRadius: 20, backgroundColor: "rgba(255,255,255,0.05)" }}>
           <Ionicons name="arrow-back" size={20} color={T.text} />
        </Pressable>
        <View style={{ flex: 1, alignItems: "center" }}>
           <Text style={{ fontSize: 13, fontWeight: "900", letterSpacing: 2, textTransform: "uppercase", color: T.gold }}>Docs Setup</Text>
        </View>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>

        {/* Header Text */}
        <View style={{ alignItems: "center", marginBottom: 24 }}>
          <Text style={s.title}>Upload & Analyze</Text>
          <Text style={s.subtitle}>
            Your documents are parsed locally, analyzed by AI, and automatically discarded.
          </Text>
        </View>

        {/* ═══ STEP 1: Upload Cards ═══ */}
        {!hasResults && (
           <View style={s.panel}>
             <Text style={s.sectionTitle}>Document Vault</Text>
             
             <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10, marginTop: 14 }}>
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
                     <MaterialCommunityIcons name={t.icon} size={24} color={hasFile ? T.teal : T.textSec} />
                     <Text style={[s.uploadCardLabel, hasFile && { color: T.teal }]}>{t.label}</Text>
                     {hasFile && <Ionicons name="checkmark-circle" size={16} color={T.teal} style={{ position: "absolute", top: 8, right: 8 }} />}
                   </Pressable>
                 );
               })}
               <Pressable onPress={handlePickDocuments} style={s.uploadCard}>
                 <Ionicons name="add-circle-outline" size={24} color={T.textSec} />
                 <Text style={s.uploadCardLabel}>Add More</Text>
               </Pressable>
             </View>
   
             {selectedFiles.length > 0 && (
               <View style={{ marginTop: 16, gap: 10 }}>
                 {selectedFiles.map((file, i) => (
                   <View key={`${file.name}-${i}`} style={s.fileRow}>
                     <Ionicons name="document-attach-outline" size={18} color={T.gold} />
                     <Text numberOfLines={1} style={s.fileName}>{file.name}</Text>
                     <Text style={s.fileSize}>{formatBytes(file.size)}</Text>
                   </View>
                 ))}
               </View>
             )}
   
             <View style={{ marginTop: 24, flexDirection: "row", gap: 14 }}>
               <Pressable
                 onPress={handleAnalyze}
                 disabled={!selectedFiles.length || isUploading}
                 style={[s.analyzeBtn, (!selectedFiles.length || isUploading) && { backgroundColor: "rgba(232, 184, 109, 0.3)" }]}
               >
                 {isUploading ? (
                   <ActivityIndicator color={T.textOnAccent} size="small" />
                 ) : (
                   <>
                     <Ionicons name="sparkles" size={18} color={T.textOnAccent} />
                     <Text style={s.analyzeBtnText}>Compute Insights</Text>
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
        )}

        {/* ═══ STEP 2: Processing Animation ═══ */}
        {isUploading && (
          <View style={[s.panel, { gap: 16, marginTop: 16 }]}>
            {PROCESSING_STEPS.map((step, i) => {
              const active = i <= processingStep;
              const current = i === processingStep;
              return (
                <View key={step.text} style={{ flexDirection: "row", alignItems: "center", gap: 14, opacity: active ? 1 : 0.3 }}>
                  {current ? (
                    <ActivityIndicator size="small" color={T.gold} />
                  ) : (
                    <MaterialCommunityIcons name={active ? "check-circle" : step.icon} size={22} color={active ? T.teal : T.textSec} />
                  )}
                  <Text style={{ fontSize: 13, fontWeight: active ? "800" : "500", color: active ? T.text : T.textSec, letterSpacing: 0.5 }}>
                    {step.text}
                  </Text>
                </View>
              );
            })}
          </View>
        )}

        {/* ═══ STEP 3: Parsed Data Preview ═══ */}
        {hasResults && (
          <View style={s.panel}>
            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", borderBottomWidth: 1, borderBottomColor: T.cardBorder, paddingBottom: 14, marginBottom: 8 }}>
              <Text style={s.sectionTitle}>Intelligence Extracted</Text>
              <View style={{ borderRadius: 10, backgroundColor: "rgba(126, 206, 193, 0.15)", paddingHorizontal: 10, paddingVertical: 4 }}>
                <Text style={{ fontSize: 10, fontWeight: "900", color: T.teal }}>100% SECURE</Text>
              </View>
            </View>

            {documentResults.map((doc, idx) => {
              const insights = extractInsights(doc);
              const docType = doc.analysis?.document_type || "unknown";
              return (
                <View key={`${doc.filename}-${idx}`} style={{ marginTop: 16 }}>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 12 }}>
                    <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: "rgba(232, 184, 109, 0.1)", alignItems: "center", justifyContent: "center" }}>
                      <Ionicons name="document-text" size={20} color={T.gold} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text numberOfLines={1} style={{ fontSize: 14, fontWeight: "800", color: T.text }}>{doc.filename}</Text>
                      <Text style={{ fontSize: 11, color: T.textSec, textTransform: "uppercase" }}>{docType.replace(/_/g, " ")}</Text>
                    </View>
                    <Ionicons name="checkmark-circle" size={24} color={T.teal} />
                  </View>

                  {insights.length > 0 ? (
                    <View style={{ borderRadius: T.radiusSm, backgroundColor: "rgba(255,255,255,0.03)", padding: 16, gap: 12 }}>
                      {insights.map((ins) => (
                        <View key={ins.label} style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
                          <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                            <MaterialCommunityIcons name={ins.icon} size={18} color={T.textSec} />
                            <Text style={{ fontSize: 13, color: T.textSec, fontWeight: "600" }}>{ins.label}</Text>
                          </View>
                          <Text style={{ fontSize: 14, fontWeight: "800", color: T.text }}>{ins.value}</Text>
                        </View>
                      ))}
                    </View>
                  ) : (
                    <Text style={{ fontSize: 12, color: T.textSec, textAlign: "center" }}>Document parsed, but zero structured data retrieved.</Text>
                  )}
                </View>
              );
            })}

            <Pressable onPress={() => router.push("/dashboard")} style={[s.analyzeBtn, { marginTop: 24 }]}>
               <Text style={s.analyzeBtnText}>Compile Full Dashboard</Text>
            </Pressable>
          </View>
        )}

        {!hasResults && !isUploading && (
           <Pressable onPress={() => router.push("/dashboard")} style={{ paddingVertical: 20, alignItems: "center" }}>
             <Text style={{ fontSize: 13, fontWeight: "700", color: T.textSec, letterSpacing: 0.5 }}>Skip & view restricted dashboard</Text>
           </Pressable>
        )}

      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  content: { paddingHorizontal: 20, paddingTop: 10, paddingBottom: 40, gap: 16 },
  title: { fontSize: 28, fontWeight: "900", color: T.text, textAlign: "center", fontFamily: "Georgia" },
  subtitle: { marginTop: 8, fontSize: 13, color: T.textSec, textAlign: "center", lineHeight: 22 },

  panel: { borderRadius: T.radius, backgroundColor: T.card, padding: 20, borderWidth: 1, borderColor: T.cardBorder },
  sectionTitle: { fontSize: 15, fontWeight: "900", color: T.text, textTransform: "uppercase", letterSpacing: 1.5 },

  uploadCard: { flex: 1, minWidth: "44%", borderRadius: 16, borderWidth: 1.5, borderColor: "rgba(255,255,255,0.08)", borderStyle: "dashed", backgroundColor: "rgba(255,255,255,0.02)", padding: 16, alignItems: "center", gap: 10 },
  uploadCardActive: { borderColor: T.teal, borderStyle: "solid", backgroundColor: "rgba(126, 206, 193, 0.05)" },
  uploadCardLabel: { fontSize: 12, fontWeight: "800", color: T.textSec, textAlign: "center" },

  fileRow: { flexDirection: "row", alignItems: "center", gap: 10, borderRadius: T.radiusSm, backgroundColor: "rgba(255,255,255,0.05)", paddingHorizontal: 14, paddingVertical: 12, borderWidth: 1, borderColor: T.cardBorder },
  fileName: { flex: 1, fontSize: 13, fontWeight: "800", color: T.text },
  fileSize: { fontSize: 11, color: T.textSec },

  analyzeBtn: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, borderRadius: T.radiusFull, backgroundColor: T.gold, paddingVertical: 18 },
  analyzeBtnText: { fontSize: 15, fontWeight: "900", color: T.textOnAccent },
  clearBtn: { borderRadius: T.radiusFull, backgroundColor: "rgba(255,255,255,0.1)", paddingHorizontal: 20, paddingVertical: 18 },
  clearBtnText: { fontSize: 13, fontWeight: "800", color: T.text },

  error: { marginTop: 14, fontSize: 12, lineHeight: 18, color: T.red },
});

import { useMemo, useState } from "react";
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

const CLIENT_BUILD = "2026-03-27-batch-debug";
const shadowStyle = {
  shadowColor: "#112236",
  shadowOpacity: 0.08,
  shadowRadius: 20,
  shadowOffset: { width: 0, height: 10 },
  elevation: 6,
};

const formatBytes = (value) => {
  if (!value) return "Unknown size";
  if (value < 1024 * 1024) return `${Math.round(value / 1024)} KB`;
  return `${(value / (1024 * 1024)).toFixed(2)} MB`;
};

export default function SwipeScreen() {
  const apiBaseUrl = useMemo(() => getBackendBaseUrl(), []);
  const { documentResults, setDocumentResults, clearDocumentResults } = useAppContext();

  const [selectedFiles, setSelectedFiles] = useState([]);
  const [isUploading, setIsUploading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

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

    try {
      const payload = await uploadDocuments({ assets: selectedFiles });
      setDocumentResults(payload.documents || []);

      if (payload.errors?.length) {
        setErrorMessage(payload.errors.map((item) => `${item.filename}: ${item.message}`).join("\n"));
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

  return (
    <LinearGradient colors={["#F2FBF6", "#F6F2FF"]} style={styles.screen}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.headerCard}>
          <View style={styles.headerIconWrap}>
            <MaterialCommunityIcons name="file-chart-outline" size={28} color="#00684F" />
          </View>
          <Text style={styles.eyebrow}>Step 2</Text>
          <Text style={styles.title}>Upload PDFs and analyze them.</Text>
          <Text style={styles.subtitle}>
            Each PDF is uploaded to the backend, extracted, cleaned, sent to Groq, and returned as structured JSON.
          </Text>
        </View>

        <View style={[styles.panel, shadowStyle]}>
          <Text style={styles.sectionTitle}>Upload</Text>
          <Text style={styles.helperText}>Backend URL: {apiBaseUrl}</Text>
          <Text style={styles.helperText}>Client build: {CLIENT_BUILD}</Text>

          <Pressable onPress={handlePickDocuments} style={styles.primaryButton}>
            <Ionicons name="cloud-upload-outline" size={18} color="#163B31" />
            <Text style={styles.primaryButtonText}>
              {selectedFiles.length ? "Choose Different PDFs" : "Upload PDF Files"}
            </Text>
          </Pressable>

          {selectedFiles.length ? (
            <View style={styles.fileList}>
              {selectedFiles.map((file, index) => (
                <View key={`${file.name}-${index}`} style={styles.fileItem}>
                  <View style={styles.fileIconWrap}>
                    <Ionicons name="document-attach-outline" size={18} color="#00684F" />
                  </View>
                  <View style={styles.fileMeta}>
                    <Text numberOfLines={1} style={styles.fileName}>{file.name}</Text>
                    <Text style={styles.fileSize}>{formatBytes(file.size)}</Text>
                  </View>
                </View>
              ))}
            </View>
          ) : (
            <View style={styles.emptyState}>
              <Text style={styles.emptyStateText}>No PDFs selected yet.</Text>
            </View>
          )}

          <View style={styles.actionRow}>
            <Pressable
              onPress={handleAnalyze}
              disabled={!selectedFiles.length || isUploading}
              style={[styles.analyzeButton, (!selectedFiles.length || isUploading) && styles.buttonDisabled]}
            >
              {isUploading ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <>
                  <Ionicons name="sparkles-outline" size={18} color="#FFFFFF" />
                  <Text style={styles.analyzeButtonText}>Analyze PDFs</Text>
                </>
              )}
            </Pressable>

            <Pressable onPress={handleReset} style={styles.secondaryButton}>
              <Text style={styles.secondaryButtonText}>Clear</Text>
            </Pressable>
          </View>

          {errorMessage ? <Text style={styles.errorText}>{errorMessage}</Text> : null}
        </View>

        <View style={[styles.panel, shadowStyle]}>
          <View style={styles.resultsHeader}>
            <View>
              <Text style={styles.sectionTitle}>Parsed JSON</Text>
              <Text style={styles.helperText}>
                {documentResults.length
                  ? `${documentResults.length} document${documentResults.length > 1 ? "s" : ""} analyzed`
                  : "Results will appear here after analysis."}
              </Text>
            </View>
            {documentResults.length ? (
              <Pressable onPress={() => router.push("/dashboard")} style={styles.dashboardLink}>
                <Text style={styles.dashboardLinkText}>Page 3 Insights</Text>
              </Pressable>
            ) : null}
          </View>

          {documentResults.length ? (
            documentResults.map((document, index) => (
              <View key={`${document.filename}-${index}`} style={styles.resultCard}>
                <View style={styles.resultMetaRow}>
                  <Text style={styles.resultFileName}>{document.filename}</Text>
                  <View style={styles.docTypeBadge}>
                    <Text style={styles.docTypeBadgeText}>{document.analysis?.document_type || "unknown"}</Text>
                  </View>
                </View>
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                  <Text style={styles.jsonBlock}>{JSON.stringify(document.analysis, null, 2)}</Text>
                </ScrollView>
              </View>
            ))
          ) : (
            <View style={styles.resultsEmptyState}>
              <MaterialCommunityIcons name="code-json" size={28} color="#9AA5B1" />
              <Text style={styles.resultsEmptyText}>Upload PDFs to see parsed JSON here.</Text>
            </View>
          )}
        </View>
      </ScrollView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  content: { paddingHorizontal: 20, paddingTop: 56, paddingBottom: 40, gap: 18 },
  headerCard: { alignItems: "center", paddingHorizontal: 12 },
  headerIconWrap: { marginBottom: 14, height: 62, width: 62, alignItems: "center", justifyContent: "center", borderRadius: 31, backgroundColor: "rgba(255,255,255,0.72)" },
  eyebrow: { fontSize: 11, fontWeight: "800", letterSpacing: 2.2, textTransform: "uppercase", color: "#00684F" },
  title: { marginTop: 10, textAlign: "center", fontSize: 30, fontWeight: "900", color: "#112236" },
  subtitle: { marginTop: 10, textAlign: "center", fontSize: 14, lineHeight: 22, color: "#5A6574" },
  panel: { borderRadius: 28, backgroundColor: "#FFFFFF", padding: 18 },
  sectionTitle: { fontSize: 18, fontWeight: "800", color: "#112236" },
  helperText: { marginTop: 6, fontSize: 12, lineHeight: 18, color: "#6B7280" },
  primaryButton: { marginTop: 16, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, borderRadius: 999, backgroundColor: "#9AF2D0", paddingHorizontal: 18, paddingVertical: 14 },
  primaryButtonText: { fontSize: 15, fontWeight: "800", color: "#163B31" },
  fileList: { marginTop: 18, gap: 10 },
  fileItem: { flexDirection: "row", alignItems: "center", borderRadius: 20, backgroundColor: "#F7FAFC", paddingHorizontal: 14, paddingVertical: 12 },
  fileIconWrap: { height: 38, width: 38, alignItems: "center", justifyContent: "center", borderRadius: 19, backgroundColor: "#E9F8F2" },
  fileMeta: { marginLeft: 12, flex: 1 },
  fileName: { fontSize: 14, fontWeight: "700", color: "#112236" },
  fileSize: { marginTop: 2, fontSize: 11, color: "#7C8796" },
  emptyState: { marginTop: 18, alignItems: "center", justifyContent: "center", borderRadius: 22, borderWidth: 1, borderColor: "#E8EDF2", borderStyle: "dashed", paddingVertical: 24 },
  emptyStateText: { fontSize: 13, color: "#7C8796" },
  actionRow: { marginTop: 18, flexDirection: "row", alignItems: "center", gap: 10 },
  analyzeButton: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, borderRadius: 999, backgroundColor: "#112236", paddingVertical: 14 },
  analyzeButtonText: { fontSize: 14, fontWeight: "800", color: "#FFFFFF" },
  buttonDisabled: { opacity: 0.55 },
  secondaryButton: { borderRadius: 999, backgroundColor: "#EDF1F5", paddingHorizontal: 18, paddingVertical: 14 },
  secondaryButtonText: { fontSize: 14, fontWeight: "700", color: "#4B5563" },
  errorText: { marginTop: 12, fontSize: 13, lineHeight: 20, color: "#C2410C" },
  resultsHeader: { flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between", gap: 12 },
  dashboardLink: { borderRadius: 999, backgroundColor: "#EDF7F4", paddingHorizontal: 12, paddingVertical: 8 },
  dashboardLinkText: { fontSize: 12, fontWeight: "800", color: "#00684F" },
  resultCard: { marginTop: 16, borderRadius: 22, backgroundColor: "#F7FAFC", padding: 14 },
  resultMetaRow: { marginBottom: 12, flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 10 },
  resultFileName: { flex: 1, fontSize: 14, fontWeight: "800", color: "#112236" },
  docTypeBadge: { borderRadius: 999, backgroundColor: "#E9F8F2", paddingHorizontal: 10, paddingVertical: 6 },
  docTypeBadgeText: { fontSize: 11, fontWeight: "800", color: "#00684F" },
  jsonBlock: { minWidth: "100%", borderRadius: 18, backgroundColor: "#112236", padding: 14, fontFamily: "Courier", fontSize: 12, lineHeight: 19, color: "#D9F7EE" },
  resultsEmptyState: { marginTop: 18, alignItems: "center", justifyContent: "center", borderRadius: 22, backgroundColor: "#F8FAFC", paddingVertical: 28, gap: 10 },
  resultsEmptyText: { fontSize: 13, color: "#7C8796" },
});


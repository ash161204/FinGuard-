import Constants from "expo-constants";
import { Platform } from "react-native";

const trimTrailingSlash = (value) => value.replace(/\/$/, "");
const isPlaceholderUrl = (value) => /YOUR_LAPTOP_IP|YOUR-HOST|example|localhost:8000/i.test(value || "");

export const getBackendBaseUrl = () => {
  const envUrl = process.env.EXPO_PUBLIC_API_BASE_URL?.trim();

  if (envUrl && !isPlaceholderUrl(envUrl)) {
    return trimTrailingSlash(envUrl);
  }

  const hostUri =
    Constants.expoConfig?.hostUri ||
    Constants.expoGoConfig?.debuggerHost ||
    Constants.manifest2?.extra?.expoClient?.hostUri;

  if (hostUri) {
    const host = hostUri.split(":")[0];
    if (host && host !== "127.0.0.1" && host !== "localhost") {
      return `http://${host}:8000`;
    }
  }

  return Platform.OS === "android" ? "http://10.0.2.2:8000" : "http://127.0.0.1:8000";
};

const toUploadPart = (asset, index) => {
  if (Platform.OS === "web" && asset.file) {
    return asset.file;
  }

  return {
    uri: asset.uri,
    name: asset.name || `document-${index + 1}.pdf`,
    type: asset.mimeType || "application/pdf",
  };
};

const parseTextPayload = (text) => {
  if (!text) {
    return {};
  }

  try {
    return JSON.parse(text);
  } catch (error) {
    throw new Error(`Backend returned non-JSON response: ${text.slice(0, 240)}`);
  }
};

const parseErrorResponse = async (response) => {
  const text = await response.text();
  const payload = parseTextPayload(text);

  if (Array.isArray(payload.detail)) {
    return payload.detail.map((item) => `${item.filename}: ${item.message}`).join("\n");
  }

  return payload.detail || payload.message || `Upload failed with status ${response.status}`;
};

export async function uploadDocuments({ assets }) {
  const baseUrl = getBackendBaseUrl();
  const formData = new FormData();

  assets.forEach((asset, index) => {
    formData.append("files", toUploadPart(asset, index));
  });

  let response;
  try {
    response = await fetch(`${baseUrl}/api/parse-documents`, {
      method: "POST",
      headers: {
        Accept: "application/json",
      },
      body: formData,
    });
  } catch (error) {
    throw new Error(`Request reached fetch but failed before a usable response. Backend URL: ${baseUrl}. Original error: ${error?.message || String(error)}`);
  }

  const responseText = await response.text();
  const payload = parseTextPayload(responseText);

  if (!response.ok) {
    if (Array.isArray(payload.detail)) {
      throw new Error(payload.detail.map((item) => `${item.filename}: ${item.message}`).join("\n"));
    }

    throw new Error(payload.detail || payload.message || `Upload failed with status ${response.status}`);
  }

  if ((!payload.documents || !payload.documents.length) && payload.errors?.length) {
    throw new Error(payload.errors.map((item) => `${item.filename}: ${item.message}`).join("\n"));
  }

  return payload;
}

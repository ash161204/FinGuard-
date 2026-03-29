type PickedPdfAsset = {
  uri: string;
  name: string;
  mimeType?: string | null;
};

type DocumentPickerAsset = {
  uri: string;
  name: string;
  mimeType?: string | null;
};

type DocumentPickerResult =
  | { canceled: true }
  | { canceled: false; assets: DocumentPickerAsset[] };

declare const require: ((name: string) => unknown) | undefined;

export async function pickPdfDocument(): Promise<PickedPdfAsset | null> {
  if (typeof require !== 'function') {
    throw new Error('Native document picker is unavailable in this build.');
  }

  let pickerModule: {
    getDocumentAsync: (options: {
      type: string | string[];
      copyToCacheDirectory: boolean;
      multiple: boolean;
    }) => Promise<DocumentPickerResult>;
  };

  try {
    pickerModule = require('expo-document-picker') as typeof pickerModule;
  } catch {
    throw new Error(
      'expo-document-picker is not installed. Run `npm install` from the repo root before launching the app.',
    );
  }

  const result = await pickerModule.getDocumentAsync({
    type: 'application/pdf',
    copyToCacheDirectory: true,
    multiple: false,
  });

  if (result.canceled) {
    return null;
  }

  const asset = result.assets[0];
  return {
    uri: asset.uri,
    name: asset.name,
    mimeType: asset.mimeType,
  };
}

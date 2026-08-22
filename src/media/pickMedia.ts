import { requireOptionalNativeModule } from 'expo-modules-core';
import { InteractionManager, Platform } from 'react-native';

import { copy } from '@/copy/uk';

export type PickedFile = {
  uri: string;
  name: string;
  type: string;
  width?: number;
  height?: number;
  size?: number;
};

export type MediaSource = 'camera' | 'library' | 'file';

export type PickResult =
  | { status: 'success'; file: PickedFile }
  | { status: 'canceled' }
  | { status: 'denied'; source: MediaSource }
  | { status: 'restricted'; source: MediaSource }
  | { status: 'unavailable'; source: MediaSource }
  | { status: 'failed'; source: MediaSource };

const IMAGE_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);
const DOC_TYPES = new Set([...IMAGE_TYPES, 'application/pdf']);
const PRESENT_DELAY_MS = Platform.OS === 'ios' ? 450 : 80;

export function validateImage(file: PickedFile, maxBytes = 8_388_608): string | null {
  if (!IMAGE_TYPES.has(file.type)) {
    return copy.avatarUnsupported;
  }
  if (file.size && file.size > maxBytes) {
    return copy.avatarTooLarge;
  }
  if (file.width && file.height && (file.width < 256 || file.height < 256)) {
    return copy.avatarTooSmall;
  }
  return null;
}

export function validateDocument(file: PickedFile, maxBytes = 12_582_912): string | null {
  if (!DOC_TYPES.has(file.type)) {
    return copy.avatarUnsupported;
  }
  if (file.size && file.size > maxBytes) {
    return copy.avatarTooLarge;
  }
  return null;
}

export function mediaPickErrorLabel(result: PickResult): string | null {
  if (result.status === 'success' || result.status === 'canceled') {
    return null;
  }
  if (result.status === 'unavailable') {
    return copy.pickerUnavailable;
  }
  if (result.source === 'camera') {
    if (result.status === 'restricted') {
      return copy.cameraRestricted;
    }
    if (result.status === 'denied') {
      return `${copy.cameraDenied}. ${copy.photoPermissionHint}`;
    }
    return copy.cameraOpenFailed;
  }
  if (result.source === 'library') {
    if (result.status === 'restricted') {
      return copy.libraryRestricted;
    }
    if (result.status === 'denied') {
      return `${copy.libraryDenied}. ${copy.photoPermissionHint}`;
    }
    return copy.libraryOpenFailed;
  }
  return copy.documentOpenFailed;
}

function normalizeImageMime(uri: string, mime?: string | null): string {
  const lower = `${mime ?? ''} ${uri}`.toLowerCase();
  if (lower.includes('png')) {
    return 'image/png';
  }
  if (lower.includes('webp')) {
    return 'image/webp';
  }
  if (lower.includes('pdf')) {
    return 'application/pdf';
  }
  return 'image/jpeg';
}

function fromAsset(asset: {
  uri: string;
  fileName?: string | null;
  mimeType?: string | null;
  width?: number;
  height?: number;
  fileSize?: number | null;
}): PickedFile {
  return {
    uri: asset.uri,
    name: asset.fileName ?? 'photo.jpg',
    type: normalizeImageMime(asset.uri, asset.mimeType),
    width: asset.width,
    height: asset.height,
    size: asset.fileSize ?? undefined,
  };
}

function waitForNativePresentation(): Promise<void> {
  return new Promise((resolve) => {
    InteractionManager.runAfterInteractions(() => {
      setTimeout(resolve, PRESENT_DELAY_MS);
    });
  });
}

function isCanceled(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error);
  return /cancel|cancelled|canceled|dismiss/i.test(message);
}

async function launchImage(source: 'camera' | 'library', crop: boolean): Promise<PickResult> {
  await waitForNativePresentation();
  try {
    if (!requireOptionalNativeModule('ExponentImagePicker')) {
      return { status: 'unavailable', source };
    }
    const ImagePicker = await import('expo-image-picker');
    const current =
      source === 'camera'
        ? await ImagePicker.getCameraPermissionsAsync()
        : await ImagePicker.getMediaLibraryPermissionsAsync();
    if (String(current.status) === 'restricted') {
      return { status: 'restricted', source };
    }
    let granted = current.granted;
    if (!granted) {
      const requested =
        source === 'camera'
          ? await ImagePicker.requestCameraPermissionsAsync()
          : await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (String(requested.status) === 'restricted') {
        return { status: 'restricted', source };
      }
      granted = requested.granted;
    }
    if (!granted) {
      return { status: 'denied', source };
    }
    const options = {
      mediaTypes: ['images'] as ('images' | 'videos' | 'livePhotos')[],
      quality: 0.85,
      allowsEditing: crop,
      aspect: crop ? ([1, 1] as [number, number]) : undefined,
      exif: false,
    };
    const result =
      source === 'camera'
        ? await ImagePicker.launchCameraAsync(options)
        : await ImagePicker.launchImageLibraryAsync(options);
    const asset = result.assets?.[0];
    if (result.canceled || !asset) {
      return { status: 'canceled' };
    }
    return { status: 'success', file: fromAsset(asset) };
  } catch (error) {
    if (isCanceled(error)) {
      return { status: 'canceled' };
    }
    return { status: 'failed', source };
  }
}

export function pickAvatarFromCamera(): Promise<PickResult> {
  return launchImage('camera', true);
}

export function pickAvatarFromLibrary(): Promise<PickResult> {
  return launchImage('library', true);
}

export function pickDocumentFromCamera(): Promise<PickResult> {
  return launchImage('camera', false);
}

export function pickDocumentFromLibrary(): Promise<PickResult> {
  return launchImage('library', false);
}

export async function pickDocumentFile(): Promise<PickResult> {
  await waitForNativePresentation();
  try {
    if (!requireOptionalNativeModule('ExpoDocumentPicker')) {
      return { status: 'unavailable', source: 'file' };
    }
    const DocumentPicker = await import('expo-document-picker');
    const result = await DocumentPicker.getDocumentAsync({
      type: ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'],
      copyToCacheDirectory: true,
      multiple: false,
    });
    if (result.canceled || !result.assets?.[0]) {
      return { status: 'canceled' };
    }
    const asset = result.assets[0];
    return {
      status: 'success',
      file: {
        uri: asset.uri,
        name: asset.name,
        type: normalizeImageMime(asset.uri, asset.mimeType),
        size: asset.size,
      },
    };
  } catch (error) {
    if (isCanceled(error)) {
      return { status: 'canceled' };
    }
    return { status: 'failed', source: 'file' };
  }
}

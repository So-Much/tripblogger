import * as MediaLibrary from 'expo-media-library';

export async function saveCaptureToPhotoLibrary(localUri: string): Promise<void> {
  const permission = await MediaLibrary.requestPermissionsAsync();
  if (!permission.granted) {
    throw new Error('PHOTO_LIBRARY_PERMISSION_DENIED');
  }
  await MediaLibrary.saveToLibraryAsync(localUri);
}

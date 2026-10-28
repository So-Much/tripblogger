import { Platform } from 'react-native';

function readBrowser(key: string): string | null {
  try {
    return globalThis.localStorage?.getItem(key) ?? null;
  } catch {
    return null;
  }
}

function writeBrowser(key: string, value: string): void {
  globalThis.localStorage?.setItem(key, value);
}

function removeBrowser(key: string): void {
  globalThis.localStorage?.removeItem(key);
}

/** SecureStore on a phone. localStorage in the browser, where the native module is absent. */
export async function getStoredItem(key: string): Promise<string | null> {
  if (Platform.OS === 'web') return readBrowser(key);
  const SecureStore = await import('expo-secure-store');
  return SecureStore.getItemAsync(key);
}

export async function setStoredItem(key: string, value: string): Promise<void> {
  if (Platform.OS === 'web') {
    writeBrowser(key, value);
    return;
  }
  const SecureStore = await import('expo-secure-store');
  await SecureStore.setItemAsync(key, value);
}

export async function deleteStoredItem(key: string): Promise<void> {
  if (Platform.OS === 'web') {
    removeBrowser(key);
    return;
  }
  const SecureStore = await import('expo-secure-store');
  await SecureStore.deleteItemAsync(key);
}

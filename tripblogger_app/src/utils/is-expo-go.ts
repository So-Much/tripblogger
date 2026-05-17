import Constants from 'expo-constants';

/** True when running inside the Expo Go client (no custom native modules). */
export function isExpoGo(): boolean {
  return Constants.appOwnership === 'expo';
}

import { Platform, useWindowDimensions } from 'react-native';
import { resolveClientForm, type ClientForm } from './client-form';

export function useClientForm(): ClientForm {
  const { width } = useWindowDimensions();
  return resolveClientForm(Platform.OS, width);
}

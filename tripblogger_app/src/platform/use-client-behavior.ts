import { resolveClientBehavior, type ClientBehavior } from './client-behavior';
import { useClientForm } from './use-client-form';

export function useClientBehavior(): ClientBehavior {
  return resolveClientBehavior(useClientForm());
}

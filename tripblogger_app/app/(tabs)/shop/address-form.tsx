import { WithSettingsOriginBack } from '@/src/components/navigation/WithSettingsOriginBack';
import { AddressFormScreen } from '@/src/screens/AddressFormScreen';

export default function AddressFormRoute() {
  return (
    <WithSettingsOriginBack>
      <AddressFormScreen />
    </WithSettingsOriginBack>
  );
}

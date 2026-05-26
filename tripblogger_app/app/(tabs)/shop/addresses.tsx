import { WithSettingsOriginBack } from '@/src/components/navigation/WithSettingsOriginBack';
import { AddressListScreen } from '@/src/screens/AddressListScreen';

export default function AddressesRoute() {
  return (
    <WithSettingsOriginBack>
      <AddressListScreen />
    </WithSettingsOriginBack>
  );
}

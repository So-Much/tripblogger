import { WithSettingsOriginBack } from '@/src/components/navigation/WithSettingsOriginBack';
import { CartScreen } from '@/src/screens/CartScreen';

export default function CartRoute() {
  return (
    <WithSettingsOriginBack>
      <CartScreen />
    </WithSettingsOriginBack>
  );
}

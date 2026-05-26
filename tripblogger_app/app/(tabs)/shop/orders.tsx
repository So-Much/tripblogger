import { WithSettingsOriginBack } from '@/src/components/navigation/WithSettingsOriginBack';
import { OrdersScreen } from '@/src/screens/OrdersScreen';

export default function OrdersRoute() {
  return (
    <WithSettingsOriginBack>
      <OrdersScreen />
    </WithSettingsOriginBack>
  );
}

import { WithSettingsOriginBack } from '@/src/components/navigation/WithSettingsOriginBack';
import { OrderDetailScreen } from '@/src/screens/OrderDetailScreen';

export default function OrderDetailRoute() {
  return (
    <WithSettingsOriginBack>
      <OrderDetailScreen />
    </WithSettingsOriginBack>
  );
}

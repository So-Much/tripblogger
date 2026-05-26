import { WithSettingsOriginBack } from '@/src/components/navigation/WithSettingsOriginBack';
import { MyProductsScreen } from '@/src/screens/MyProductsScreen';

export default function MyProductsRoute() {
  return (
    <WithSettingsOriginBack>
      <MyProductsScreen />
    </WithSettingsOriginBack>
  );
}

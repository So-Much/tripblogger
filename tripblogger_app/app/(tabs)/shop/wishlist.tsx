import { WithSettingsOriginBack } from '@/src/components/navigation/WithSettingsOriginBack';
import { WishlistScreen } from '@/src/screens/WishlistScreen';

export default function WishlistRoute() {
  return (
    <WithSettingsOriginBack>
      <WishlistScreen />
    </WithSettingsOriginBack>
  );
}

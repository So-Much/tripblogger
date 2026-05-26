import { WithSettingsOriginBack } from '@/src/components/navigation/WithSettingsOriginBack';
import { SellerVerificationScreen } from '@/src/screens/SellerVerificationScreen';

export default function SellerVerifyRoute() {
  return (
    <WithSettingsOriginBack>
      <SellerVerificationScreen />
    </WithSettingsOriginBack>
  );
}

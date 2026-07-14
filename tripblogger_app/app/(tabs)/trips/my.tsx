import { WithSettingsOriginBack } from '@/src/components/navigation/WithSettingsOriginBack';
import { TripListScreen } from '@/src/screens/TripListScreen';

export default function MyTripsRoute() {
  return (
    <WithSettingsOriginBack>
      <TripListScreen />
    </WithSettingsOriginBack>
  );
}

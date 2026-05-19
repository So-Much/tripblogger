import { ActivityIndicator, View } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { CommerceWidgetRow } from '@/src/components/commerce/CommerceWidgetRow';
import { commerceService } from '@/src/services/api/commerce.service';
import { productToCommerceDeal } from '@/src/utils/product-to-deal';

export function HomeCommerceDeals() {
  const router = useRouter();
  const { data, isLoading } = useQuery({
    queryKey: ['commerce', 'products', 'home-deals'],
    queryFn: () => commerceService.listPublicProducts({ limit: 8, sortBy: 'popular' }),
  });

  const deals = (data?.items ?? []).map(productToCommerceDeal);

  if (isLoading && !deals.length) {
    return (
      <View style={{ paddingVertical: 24, alignItems: 'center' }}>
        <ActivityIndicator />
      </View>
    );
  }

  if (!deals.length) return null;

  return (
    <CommerceWidgetRow
      deals={deals}
      onSeeAllPress={() => router.push('/(tabs)/shop')}
      onDealPress={(productId) => router.push(`/(tabs)/shop/${productId}`)}
    />
  );
}

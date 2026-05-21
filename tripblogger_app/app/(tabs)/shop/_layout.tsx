import { Stack } from 'expo-router';
import { useI18n } from '@/src/i18n';

export default function ShopLayout() {
  const { t } = useI18n();
  return (
    <Stack screenOptions={{ headerShown: true }}>
      <Stack.Screen name="index" options={{ title: t('tabShop') }} />
      <Stack.Screen name="[id]" options={{ title: t('tabShop') }} />
      <Stack.Screen name="search" options={{ title: t('shopSearch') }} />
      <Stack.Screen name="my-products" options={{ title: t('productMyProducts') }} />
      <Stack.Screen name="create" options={{ title: t('productCreate') }} />
      <Stack.Screen name="edit/[id]" options={{ title: t('productEdit') }} />
      <Stack.Screen name="seller-verify" options={{ title: t('sellerVerifyTitle') }} />
      <Stack.Screen name="cart" options={{ title: t('cartTitle') }} />
      <Stack.Screen name="wishlist" options={{ title: t('wishlistTitle') }} />
      <Stack.Screen name="checkout" options={{ title: t('checkoutTitle') }} />
      <Stack.Screen name="addresses" options={{ title: t('addressesTitle') }} />
      <Stack.Screen name="address-form" options={{ title: t('addressNew') }} />
      <Stack.Screen name="orders" options={{ title: t('ordersTitle') }} />
      <Stack.Screen name="order/[id]" options={{ title: t('orderDetailTitle') }} />
      <Stack.Screen name="ratings/[productId]" options={{ title: t('allRatingsTitle') }} />
    </Stack>
  );
}

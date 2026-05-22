import { useMemo } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter, type Href } from 'expo-router';
import { Alert } from 'react-native';
import { useI18n } from '@/src/i18n';
import { commerceService } from '@/src/services/api/commerce.service';
import { formatApiError } from '@/src/utils/format-api-error';

export type ProductQuickAction = 'cart' | 'buy' | 'wish';

const WISHLIST_IDS_KEY = ['commerce', 'wishlist', 'ids'] as const;

async function prepareSingleItemCart(productId: string) {
  const cart = await commerceService.getCart();
  if (cart.items.length) {
    await Promise.all(cart.items.map((item) => commerceService.removeCartItem(item.id)));
  }
  await commerceService.addToCart({ productId, quantity: 1 });
}

function toggleInSet(set: Set<string>, productId: string, wishlisted: boolean) {
  const next = new Set(set);
  if (wishlisted) next.add(productId);
  else next.delete(productId);
  return next;
}

export function useProductQuickActions(opts?: { onRequireMember?: () => void }) {
  const { t } = useI18n();
  const router = useRouter();
  const qc = useQueryClient();

  const invalidateCart = () => void qc.invalidateQueries({ queryKey: ['commerce', 'cart'] });

  const addToCart = useMutation({
    mutationFn: (productId: string) => commerceService.addToCart({ productId, quantity: 1 }),
    onSuccess: () => {
      invalidateCart();
      Alert.alert(t('cartTitle'), t('cartAddedSuccess'));
    },
    onError: (e) => Alert.alert(t('cartTitle'), formatApiError(e, '')),
  });

  const buyNow = useMutation({
    mutationFn: (productId: string) => prepareSingleItemCart(productId),
    onSuccess: () => {
      invalidateCart();
      router.push('/(tabs)/shop/checkout?buyNow=1' as Href);
    },
    onError: (e) => Alert.alert(t('checkoutBuyNowTitle'), formatApiError(e, '')),
  });

  const toggleWishlist = useMutation({
    mutationFn: (productId: string) => commerceService.toggleWishlist(productId),
    onMutate: async (productId) => {
      await qc.cancelQueries({ queryKey: WISHLIST_IDS_KEY });
      const previous = qc.getQueryData<Set<string>>(WISHLIST_IDS_KEY);
      qc.setQueryData<Set<string>>(WISHLIST_IDS_KEY, (old) => {
        const next = new Set(old ?? []);
        if (next.has(productId)) next.delete(productId);
        else next.add(productId);
        return next;
      });
      return { previous };
    },
    onSuccess: (result, productId) => {
      qc.setQueryData<Set<string>>(WISHLIST_IDS_KEY, (old) =>
        toggleInSet(old ?? new Set(), productId, result.wishlisted),
      );
    },
    onError: (e, _productId, ctx) => {
      if (ctx?.previous !== undefined) {
        qc.setQueryData(WISHLIST_IDS_KEY, ctx.previous);
      }
      Alert.alert(t('wishlistTitle'), formatApiError(e, ''));
    },
    onSettled: () => {
      void qc.invalidateQueries({ queryKey: ['commerce', 'wishlist'] });
    },
  });

  const pending = useMemo((): { productId: string; action: ProductQuickAction } | null => {
    if (buyNow.isPending && buyNow.variables != null) {
      return { productId: buyNow.variables, action: 'buy' };
    }
    if (addToCart.isPending && addToCart.variables != null) {
      return { productId: addToCart.variables, action: 'cart' };
    }
    return null;
  }, [addToCart.isPending, addToCart.variables, buyNow.isPending, buyNow.variables]);

  const run = (action: ProductQuickAction, productId: string, canTransact: boolean) => {
    if (!canTransact) {
      opts?.onRequireMember?.();
      return;
    }
    if (action === 'cart') addToCart.mutate(productId);
    else if (action === 'buy') buyNow.mutate(productId);
    else toggleWishlist.mutate(productId);
  };

  return {
    addToCart,
    buyNow,
    toggleWishlist,
    run,
    pending,
    isBusy: pending !== null,
  };
}

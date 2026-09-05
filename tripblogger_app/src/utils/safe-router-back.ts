import type { Href } from 'expo-router';

type RouterLike = {
  canGoBack: () => boolean;
  back: () => void;
  replace: (href: Href) => void;
};

export function safeRouterBack(router: RouterLike, fallback: Href) {
  if (router.canGoBack()) router.back();
  else router.replace(fallback);
}

import type { Href, Router } from 'expo-router';

export function safeRouterBack(router: Router, fallback: Href) {
  if (router.canGoBack()) router.back();
  else router.replace(fallback);
}

import { router, type Href } from 'expo-router';

/** Navigate back when history exists; otherwise use a deterministic parent route. */
export function backOrReplace(fallback: Href) {
  if (router.canGoBack()) {
    router.back();
    return;
  }

  router.replace(fallback);
}

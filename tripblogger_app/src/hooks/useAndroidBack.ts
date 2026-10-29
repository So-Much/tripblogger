import { useEffect, useRef } from 'react';
import { BackHandler, Platform } from 'react-native';

type BackHandlerFn = () => boolean;

type BackEntry = {
  id: number;
  priority: number;
  handler: BackHandlerFn;
};

const entries: BackEntry[] = [];
let nextId = 0;
let subscription: { remove: () => void } | null = null;

function dispatchBackPress(): boolean {
  const sorted = [...entries].sort((a, b) => b.priority - a.priority || b.id - a.id);
  for (const entry of sorted) {
    if (entry.handler()) return true;
  }
  return false;
}

function ensureSubscription() {
  if (subscription || Platform.OS !== 'android') return;
  subscription = BackHandler.addEventListener('hardwareBackPress', dispatchBackPress);
}

function maybeRemoveSubscription() {
  if (entries.length > 0 || !subscription) return;
  subscription.remove();
  subscription = null;
}

/**
 * Registers an Android hardware-back handler. Higher `priority` runs first.
 * Return `true` when the event is handled (navigation should not pop).
 */
export function useAndroidBack(handler: BackHandlerFn, enabled = true, priority = 0) {
  const handlerRef = useRef(handler);
  handlerRef.current = handler;

  useEffect(() => {
    if (!enabled || Platform.OS !== 'android') return;

    const id = ++nextId;
    const entry: BackEntry = {
      id,
      priority,
      handler: () => handlerRef.current(),
    };
    entries.push(entry);
    ensureSubscription();

    return () => {
      const idx = entries.findIndex((e) => e.id === id);
      if (idx >= 0) entries.splice(idx, 1);
      maybeRemoveSubscription();
    };
  }, [enabled, priority]);
}

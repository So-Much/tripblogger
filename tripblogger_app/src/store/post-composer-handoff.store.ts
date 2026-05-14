import { create } from 'zustand';

import type { PostEditorMedia } from '@/src/types/post-editor-media';

type PostComposerHandoffState = {
  pending: PostEditorMedia[] | null;
  setPending: (items: PostEditorMedia[]) => void;
  takePending: () => PostEditorMedia[] | null;
};

export const usePostComposerHandoffStore = create<PostComposerHandoffState>((set, get) => ({
  pending: null,
  setPending: (items) => set({ pending: items.length ? [...items] : null }),
  takePending: () => {
    const p = get().pending;
    set({ pending: null });
    return p && p.length ? p : null;
  },
}));

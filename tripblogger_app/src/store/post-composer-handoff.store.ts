import { create } from 'zustand';

import type { PostEditorMedia } from '@/src/types/post-editor-media';

type PostComposerHandoffState = {
  pending: PostEditorMedia[] | null;
  returnPostId: string | null;
  setPending: (items: PostEditorMedia[]) => void;
  takePending: () => PostEditorMedia[] | null;
  setReturnPostId: (postId: string | null) => void;
};

export const usePostComposerHandoffStore = create<PostComposerHandoffState>((set, get) => ({
  pending: null,
  returnPostId: null,
  setPending: (items) => set({ pending: items.length ? [...items] : null }),
  takePending: () => {
    const p = get().pending;
    set({ pending: null });
    return p && p.length ? p : null;
  },
  setReturnPostId: (postId) => set({ returnPostId: postId }),
}));

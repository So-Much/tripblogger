# Wave 1 — Post/Social Design Spec

**Gate decisions (defaults applied 2026-05-19):**

| Field / item | Decision |
|--------------|----------|
| category, tags, visibility, location | Implement |
| updatedAt, author | Implement |
| sharePost | Implement |
| Comment userId | Defer |
| React row API | Defer |
| heartPost client usage | Defer (keep API; use toggleReaction) |

## Behavior

- `GET /posts/feed`: `PUBLISHED` + `PUBLIC`, cursor pagination, roles `MEMBER` + `GUEST`.
- `GET /posts/:id`: guest/member may read `PUBLISHED` + `PUBLIC`; owner may read own `PRIVATE` and drafts.
- `serializePost` includes `author: { displayName, username, avatarUrl }`.
- Home uses real feed; guest read-only on detail (no react/comment/share).

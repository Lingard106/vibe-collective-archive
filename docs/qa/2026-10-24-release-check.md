# 2026-10-24 release check

## Completed

- Overview and member heroes prepare and decode requested images before committing a selection. A stale request cannot replace a newer selection. The previous photo stays visible during loading; failures can be retried.
- Full-screen blur removed from image transitions; a bounded two-layer opacity transition takes its place. Hidden tabs and reduced-motion preferences stop automatic overview rotation.
- Initial overview preload follows the mobile/desktop media query, avoiding downloading both full-size backgrounds on phones. Decoded-image retention is capped at six photographs; browser HTTP caching still handles repeat visits.
- CSS cleanup is conservative: five identical shadowed declarations in styles.css and one in years.css. No media block reordering, value rewriting, or generalized layout fallback removal. Page CSS uses static imports inside the existing lazy route modules so Vite waits for styles before rendering the route.
- Film reels use fixed 28/24/30 px/s velocities, alternate direction, and render a viewport-sized window with a two-card buffer on each side. Pause, pointer dragging, keyboard navigation, original-photo viewing, focus restoration and reduced motion are supported. Hidden buffer cards cannot take keyboard focus.
- Gift uses a fixed campaign key and atomic INSERT ON CONFLICT RETURNING; GET does not consume it. HttpOnly SameSite cookie identifies the winner; SHA-256 identity hashes stay server-side. Public losers never receive nickname or receipt. Same identity retries return the original receipt.
- Gift initialization shares one request within a tab and uses Web Locks across tabs. Browsers without Web Locks display an update-browser message instead of risking lost claim identity.
- Local administrator console adds a read-only winner lookup through its existing protected proxy; member credentials and editing API behavior stay unchanged.
- All pre-existing image files are unchanged. Only the newly generated gift artwork was added. No photo recompression or resolution changes.

## Validation

- 19 Node tests passed: image decoding/cache failure/timeout; conservative CSS cascade; bounded film windows/speed/wrapping; one winner among 20 simultaneous visitors; same-owner retry; malformed bodies/origin/cookies; public privacy and protected administrator access.
- TypeScript check for local admin passed separately (admin is intentionally excluded from the public build).
- Final production Vite build passed after all review fixes (2595 modules). Cloudflare Pages Functions compilation passed. Local `/api/gift` GET returned HTTP 200 / available with an identity cookie; no local or production prize was claimed during this smoke check.
- Independent read-only review found two P2 issues (offscreen reel focus; cross-tab cookie bootstrap). Both were repaired and re-reviewed.
- Browser preview tooling timed out before and after reconnect. No screenshot baseline, touch-device trial, or computed-style parity is claimed. CSS edits are consequently limited to conservative changes with source-level proof.
- No production claim request has been sent. Deployment and final HTTP checks are recorded after release.

## Deployment authorization

The user explicitly selected “完成检查后直接上线”. Direct Cloudflare deployment is authorized; this does not authorize consuming/resetting the real gift. Cloudflare CLI currently requires renewed sign-in.

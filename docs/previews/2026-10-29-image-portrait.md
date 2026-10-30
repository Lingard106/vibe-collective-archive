# Lingard image portrait — local prototype

Preview: http://127.0.0.1:5180/previews/member-portrait.html

This entry reuses the existing Members page through MemberArtworkContext. On 2026-10-30 the user authorized enabling this renderer on the normal Members page for Lingard only. The other nine members, original media files and page layout remain unchanged. The renderer is lazy loaded.

## Current interaction

- Relaxed standing pose with breathing, weight shifts, small arm swings and occasional lively ENFP-inspired glances; idle feet remain planted.
- Mouse position drives damped, limited head turns. Eye positions remain attached to the head.
- Periodic blinks replace only the lens interiors to avoid flickering hair and jaw outlines.
- Clicking the character or its extended arms randomly produces a nod (10%), curious response (10%), lively wave (30%), Siu (25%), or original celebration (25%). Keyboard Enter/Space has the same response. Every click is queued FIFO; actions are separated by a 0.12-second settling interval.
- Idle motion includes larger relaxed arm swings, weight shifts, occasional enthusiastic movement, and a brief hand-on-hip pause. The head uses a coherent crisp three-quarter artwork with bounded facial parallax, rigid outer hair, gentle head movement and lens-only blinks. Different generated faces/hair are not dissolved together.
- Wave: lift onto the toes, raise and bend the near arm, wave the wrist with a smile, then settle. Siu: anticipate, jump with arms overhead, land with arms lowered and feet apart, then make a small recovery hop. Gold vector-pixel SIUU! lettering and an angular ground-impact ring accompany Siu only.
- Celebration: two small forward steps, open arms into a Bellingham-inspired shallow V with open palms, two nods, gently lower the arms, two backward steps, settle into idle. Duration: 10 seconds.
- The original background photograph is never substituted during the action. Registered standing/celebration artwork is deformed into the same intermediate limb geometry; only aligned textures blend. Arm-angle interpolation preserves length during the transition.
- Walking mesh compensates for body movement so each supporting shoe remains on its ground path. Shadow follows the approach.
- Reduced motion gives a neutral static pose. Hidden/offscreen instances stop their animation loop.
- All required images must decode before replacing the original character. Failure leaves the original artwork visible and removes the interaction target.

This is still a 2D image-based animation, not recovered 3D geometry. The Siu is a stylized front-facing interpretation without a full-body spin. Original image quality/resolution is preserved.

Local QA URLs (DEV only): append `?action=original`, `?action=wave`, or `?action=siu` to force that action; append `&frame=2.42` to inspect a paused keyframe, or `&zoom=2.5&gaze=-1` for enlarged head inspection. Without these parameters all five random actions are enabled. No additional UI controls are added.

## Artwork and provenance

Approved identity/proportion reference: `src/world-preview/assets/lingard-turnaround-v3.png`.

The following assets were generated with the built-in image tool in the preceding work session and saved in this project:

| Asset | Dimensions | Runtime lossless WebP |
| --- | --- | --- |
| `src/world-preview/assets/lingard-portrait-master-v1.png` | 1024 × 1536 | `lingard-portrait-master-v1.webp` — 679,272 bytes |
| `src/world-preview/assets/lingard-head-atlas-v1.png` | 1983 × 793 | `lingard-head-atlas-v1.webp` — 1,132,748 bytes |
| `src/world-preview/assets/lingard-celebration-v1.png` | 1254 × 1254 | Original transparent PNG — 877,292 bytes; no lossy conversion |

Generation brief summary (not a verbatim prompt): preserve the approved character's proportions, voxel hair, black glasses, soft smile, Portugal number 7 shirt, cargo trousers and layered trainers; generate a transparent relaxed standing figure and transparent adjacent-angle open/closed-eye heads. The generated atlas did not follow its requested angle ordering. The renderer selects three distinct views by measured landmarks instead of trusting the nominal cell order. The celebration was generated with the built-in imagegen tool; its full prompt is recorded in `2026-10-29-celebration-art.md` beside this file.

The original `public/media/lingard-profile.webp` is unchanged. Existing `lingard-environment-v1.webp` fills only a mask over the former character. The head retains one coherent three-quarter source to avoid mismatched generated hair/jaw silhouettes. Covered background detail is inferred artwork.

## Verification

- After the conditional interaction-target correction, `npm run build` and `git diff --check` passed on 2026-10-29. The local preview URL returned HTTP 200.
- Independent read-only review checked all 50 triangles throughout both interpolation intervals, including interior extrema: minimum signed double area 1836, no inversion or degeneracy.
- After restoring the browser connection, desktop keyframes at 2.5s and 3.25s were inspected on 2026-10-29. The new celebration artwork replaces the previously rejected stiff arm rotations.
- `node scripts/check-portrait-motion.mjs` checks smooth action endpoints, two steps in each direction, two nods, foot placement, 25% selection, and non-folding arm/leg meshes. It passed. A final user visual review is still appropriate for this prototype.

Run `npm run dev -- --host 127.0.0.1 --port 5180 --strictPort` from the website directory if the local server is stopped. This preview HTML is intentionally outside the normal production build entry.

## 2026-10-30 release verification

- `npm run build` passes with a lazy ImagePortraitStage chunk; the existing page layout and other portraits are unchanged.
- Automated checks cover all five actions, two idle cycles, non-folding arm/leg/head meshes, canvas bounds, all action endpoints at four idle phases, 100 queued clicks, and completed leg spread before Siu touchdown.
- Real browser input confirmed three triggers are accepted as one active and two pending actions. Mobile and desktop Siu effect placement were visually checked, and a 2.5× head closeup was reviewed.
- Independent read-only review found post-landing foot slide; its timing was corrected and a regression check added. Queue pause/FIFO and endpoint checks passed.
- Only the visible responsive surface allocates the rig. Idle torso and planted-shoe regions reuse the original pixels instead of redundant triangle warping. Browser-hidden throttling is not treated as an on-screen frame-rate benchmark.

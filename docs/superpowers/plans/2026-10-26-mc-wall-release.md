# Minecraft photo wall release Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Publish the approved automatic Minecraft photo wall at `/moments`, retaining existing photo CRUD and original image assets.

**Architecture:** Promote the independent preview into a reusable wall component. MomentsPage continues to own its current API/form logic and supplies controlled photos and edit actions. Preview-only HTML/global styles remain separate from production.

**Tech Stack:** Existing React/TypeScript/Vite, CSS, Pages Functions/D1; no new runtime dependencies.

**Spec:** User-approved local preview at `previews/mc-photo-wall.html`, including automatically drifting framed 16:9 photos, oak nameplates, lantern courtyard background and the original ten characters. Subsequent user instruction explicitly authorizes publishing. Execution method remains unified implementation with independent review.

## Global Constraints

- Preserve every existing photograph and character/background image file; no recompression of originals.
- Preserve API-provided photos and existing upload processing (16:9 WebP, 160KB cap, title max seven characters), edit mode and exit control.
- Hover/touch/viewer/editor pause motion; reduced-motion and hidden pages stop it.
- Do not consume or reset the milk-tea reward. Do not perform production test mutations.
- Other pages remain unchanged during this release; redesign references and 3D feasibility are research only.

## Review Focus

- Lazy page CSS must not set global body overflow or change other routes.
- Production must use API photo IDs and persisted edit/delete callbacks, never preview object URLs or temporary title edits.
- Removing a selected photo must close the viewer and release its pause state.
- Mobile controls, viewport-limited rendering and keyboard focus must remain usable.
- Shared navigation must render once; preview labels and local-only copy must not appear in production.

### Task 1: Promote and integrate

**Files:** Promote `src/preview-wall` to `src/photo-wall`; update `previews/mc-photo-wall.html`; modify `src/MomentsPage.tsx`.

**Interfaces:** `WallPhoto={key:string,id?:number,image:string,title:string}`. The reusable wall accepts controlled photos, production mode, edit mode, a blocking-modal flag, header controls and add/edit callbacks. Preview default retains local object-URL experiments.

- [x] Isolate preview globals into preview-only CSS and scope component styling.
- [x] Wire existing MomentsPage load/submit/delete/form logic to wall actions. Keep the approved scene and original ten-character asset.
- [x] Build and check generated routes/assets. Browser-check production route, viewer, edit/exit and navigation to another page; do not submit real mutations.
- [x] Run existing relevant tests and obtain independent read-only review; fix substantive findings.

Verification: `npm run build` passed after final fixes; 19 relevant regression tests passed. Independent review identified inherited global main min-height and modal text color; both are explicitly scoped in the wall stylesheet. Production-route browser QA verified the real add form, cancel, exit editing, and navigation to the unchanged member page. No database mutation was submitted.

### Task 2: Release

- [ ] Commit and push the approved release to `origin/master` as explicitly requested by the user. Verify the Git-triggered Pages deployment; use a direct deployment only if no automatic deployment starts.
- [ ] Verify production HTML/chunk and photo API/resources with read-only requests; record deployment. No new D1 migration is needed.
- [ ] Hand off the release plus independently researched overview/member/danmaku design references and 3D-character feasibility.

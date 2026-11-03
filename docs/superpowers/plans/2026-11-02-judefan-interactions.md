# Judefan Interaction Preview Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add occasional belly-laugh idle motion and two random click responses to 槽阻, matching the supplied gesture references while retaining his original appearance and UI.

**Architecture:** Extend the existing React/SVG/Canvas portrait preview. A pure paused-clock controller owns idle scheduling and click queuing; a segmented painted actor uses source-registered reference art, with original surroundings kept outside the original character mask. No 3D framework, backend or dependency changes.

**Tech Stack:** React, TypeScript, SVG, Canvas 2D, native RAF, lossless WebP.

**Spec:** User's 2026-11-02 request and two attached gesture references in this chat.

## Global Constraints

- Keep 槽阻's human identity: short black hair, rectangular glasses, brown varsity jacket / ivory sleeves, black trousers, white shoes.
- Only use the yellow reference character's gestures; do not import the yellow body or screenshot UI/text.
- Preserve backgrounds, members data, layout, other members and existing birthday logic.
- Local preview first; no automatic publishing of this new character iteration.
- No original image recompression; supporting art saved losslessly at source resolution.

## Review Focus

- Laugh reads as hands on belly with happy eyes, not coughing or a static image swap.
- Original pointing and open-palm pose both remain reachable through random clicks.
- Repeated clicks queue reliably; an idle gesture yields smoothly rather than snapping.
- Head, cuffs, elbows and hands stay connected during all transitions.
- Hidden surfaces pause, reduced motion remains static, mobile has one active actor.

### Task 1: Assets and articulated painter

**Files:** `src/world-preview/assets/judefan-poses-v1.webp`, `src/world-preview/assets/judefan-clean-patch-v1.webp`, `src/world-preview/judefan-painter.ts`.

**Interfaces:** `JUDEFAN_CANVAS`, `createJudefanPainter(atlas,target)(pose,time)`.

- [x] Inspect the existing character and generate a transparent pose reference atlas plus a clean background plate.
- [x] Save project-bound native-resolution lossless crops and implement clean part masks, registered joints and face apertures.
- [x] Inspect rest/laugh/point/open-palm poses and intermediate frames for gaps, ghosting and incorrect proportions.

### Task 2: Scheduling and local integration

**Files:** `src/world-preview/judefan-motion.ts`, `scripts/check-judefan-motion.mjs`, `src/world-preview/JudefanPortraitStage.tsx`, `src/world-preview/portrait-main.tsx`.

**Interfaces:** `judefanPose`, `createJudefanController`, stage props `{src,surface,review?}`. DEV-only review parameters `member=judefan`, `judeAction`, `judeFrame`.

- [x] Test random 10–19 second idle gaps, laugh action, equal-probability click actions, smooth endpoints and 100 queued clicks.
- [x] Connect the painter to a single visible-surface RAF clock, proper lifecycle cleanup and accessible character click targets.
- [x] Run motion regressions, production type/build check, desktop/mobile visual QA and independent review; hand off a retained local preview.

## Release authorization · 2026-11-03

The user approved publishing the reviewed Judefan interaction together with Melon's flowing ellipsis. This explicitly supersedes the initial local-preview-only constraint. Integrate Judefan through the existing lazy portrait branch, preserve all other characters/backgrounds/layout and birthday behavior, then build, push and deploy the scoped release. Melon's three dots share its existing paused clock and retain a static reduced-motion fallback.

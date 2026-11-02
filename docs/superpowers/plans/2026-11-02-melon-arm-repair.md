# Melon Arm Repair Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Repair the existing seated eating interaction without changing the portrait, layout, other characters or birthday schedule.

**Architecture:** Keep the existing React/SVG scene and paused RAF action clock. Replace repeated skin fills with lossless clean hand/forearm reference crops, draw convex overlapping arm planes behind the prop and complete grip cels in front. Maintain the same cleaned rest grip throughout the action instead of crossfading a new hand on every click.

**Tech Stack:** TypeScript, React, Canvas 2D, SVG, Vite.

**Spec:** User request in this chat, 2026-11-02: continue yesterday's unfinished Melon animation repair.

## Global Constraints

- Original portrait backgrounds, face, hair, body, cat and UI remain unchanged.
- Only Melon's existing action is in scope; no new dependencies.
- Birthday cake remains active only 2026-11-02 in Asia/Shanghai and reverts at midnight.
- New local art crops use lossless WebP at source resolution.
- Preserve unrelated worktree experiments and dependency changes.

## Review Focus

- Wrist/elbow coverage and hand detail throughout lift, bite and lower, not just one frame.
- Arm planes stay convex; fingers retain proportion and grip the moving prop.
- Rest and reset use identical artwork, with no repaint fade.
- Cake and normal watermelon both retain correct arm/prop occlusion.
- Hidden/mobile surfaces do not run duplicate animation loops; reduced motion stays static.

### Task 1: Replace reconstructed skin and repair arm planes

**Files:** `src/world-preview/melon-arms.ts`, `src/world-preview/assets/melon-clean-grip-v2.webp`, `src/world-preview/assets/melon-raised-grip-v2.webp`, `scripts/check-melon-arms.mjs`.

**Interfaces:** `armMeshes(dx,dy)`, `armCoverage(dx,dy)`, `createMelonArmsPainter(cleanGrip,raisedGrip,back,front)`.

- [x] Inspect actual source art and identify rind contamination, repeated skin tiles and wrist-plane mismatch.
- [x] Generate registered clean supporting references; preserve originals and extract native-resolution lossless crops.
- [x] Replace folded whole-arm strips with overlapping convex painted upper/forearm planes and rigid clean palm cels.
- [x] Run geometry tests over the complete action at normal and birthday strengths; require fixed cuffs, finite continuous geometry, no triangle inversion and rigid fingers.

### Task 2: Integrate and visually verify both modes

**Files:** `src/world-preview/MelonEatingStage.tsx`, `src/birthday/useMelonBirthday.ts`, `src/world-preview/melon-raster-review.ts`.

**Interfaces:** Preserve public stage props and existing motion/birthday APIs; DEV-only `melonBirthday=0` permits normal-mode review today.

- [x] Split behind-food arms and front-of-food fingers; retain one cleaned rest grip across start/reset.
- [x] Add DEV-only normal mode override without altering the production date gate.
- [x] Run raster coverage and inspect final composite at rest, lift, both bites and lower in both modes, desktop and mobile.
- [x] Run birthday, Melon and Lingard motion regressions plus `npm run build`; hand off a local preview with accurate verification status.

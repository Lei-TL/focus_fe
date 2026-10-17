# Focus_Fe Foundation and Source Structure Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Reconcile the FE integration status with the latest handoff and organize the current Focus_Fe source according to the approved structure without changing app behavior or Expo Router paths.

**Architecture:** First update FE-owned status documentation to distinguish contract handoff, review status, and deployment readiness. Then keep route modules under `src/app`, group `Screen` and `Card` by layout/UI role, and move existing static demo datasets into `src/data`. Preserve `src/core/api`, `src/domain`, and `src/theme`; document when future categories are warranted without creating empty folders.

**Tech Stack:** Expo SDK 57, Expo Router, React Native, TypeScript.

**Spec:** `docs/superpowers/specs/2026-10-09-fe-mvp-continuation-design.md`

**Supporting design:** `docs/superpowers/specs/2026-10-09-frontend-source-structure-design.md`

## Global Constraints

- Keep Expo Router routes in `src/app`; keep non-route implementation modules outside it.
- Preserve every current route path and app behavior.
- Do not add state-management or utility dependencies.
- Do not create empty category folders or move Expo app-config assets.
- Preserve unrelated existing working-tree changes.
- Do not add Context, Hooks, Services, Utils, or Redux folders without real implementation content that justifies them.
- Do not edit BE-owned contract/task files; record the latest handoff in FE-owned documentation only.
- Keep contract/review status separate from deployment availability and smoke-test evidence.

## Review Focus

- **Route discovery:** all current route and layout files remain in `src/app`; verify with `rg --files src/app` and compare to the pre-change route list.
- **Moved-module resolution:** every shared-component and fixture import resolves through the configured `@/*` alias; verify with `npx tsc --noEmit`.
- **Fixture fidelity:** moving demo content does not change displayed rows, values, ordering, or keys; verify by reviewing the moved constants and running the app's existing type/lint checks.
- **Asset references:** root Expo config assets remain in place and app config references stay unchanged; verify the implementation diff contains no asset/config moves.
- **Scope control:** no new dependencies, global state, or route logic; verify `package.json`/lockfiles and route files have no unrelated changes, plus `git diff --check`.

---

### Task 1: Reconcile FE integration status with the latest handoff

**Files:**
- Modify: `docs/coordination/BACKEND_INTEGRATION_STATUS.md`
- Modify: `README.md`

**Interfaces:**
- Consumes: the current user-provided handoff that Auth, Work Items, Sessions Start/Events are available and M3_01/M3_02 have review PASS; the existing FE-owned integration status and contract registry.
- Produces: FE-owned documentation that distinguishes contract availability, review status, deployment/environment readiness, and remaining contract dependencies.

- [ ] **Step 1: Update the integration status table/sections** to record Auth and Work Items handoff, Sessions Start/Events handoff, and M3_01/M3_02 review PASS as the latest user-provided project context.
- [ ] **Step 2: Preserve explicit unknowns** for a usable deployed base URL, target-platform connectivity, test account/data, and smoke-test evidence. Mark End/current-session/detail/history as outside the current handoff and requiring confirmation before claiming complete Sessions lifecycle support.
- [ ] **Step 3: Record the WorkItem ranking gap**: the current FE mock uses `priorityScore`/`priorityExplanation`, while those fields are absent from the checked contract; require FE/BE decision before presenting server-backed priority results.
- [ ] **Step 4: Update the README status summary** so it describes the existing foundation and available contracts without implying they are already integrated or deployed.
- [ ] **Step 5: Review the documentation diff**

Run: `git diff --check`
Expected: exit code 0 with no whitespace errors.

Manual check: inspect `docs/coordination/BACKEND_INTEGRATION_STATUS.md` and `README.md`.
Expected: handoff/review/deploy statuses are separate, and no BE-owned files are modified.

---

### Task 2: Group reusable UI components by role

**Files:**
- Move: `src/components/Screen.tsx` → `src/components/layout/Screen.tsx`
- Move: `src/components/Card.tsx` → `src/components/ui/Card.tsx`
- Modify: `src/app/(tabs)/tasks.tsx`
- Modify: `src/app/(tabs)/focus.tsx`
- Modify: `src/app/(tabs)/history.tsx`
- Modify: `src/app/(tabs)/garden.tsx`
- Modify: `src/app/(tabs)/profile.tsx`

**Interfaces:**
- Consumes: current named exports `Screen` and `Card` and the `@/*` TypeScript alias.
- Produces: unchanged named exports available from `@/components/layout/Screen` and `@/components/ui/Card`.

- [ ] **Step 1: Move `Screen` and `Card` into role-specific folders** while preserving their exported names and component implementations.
- [ ] **Step 2: Update the five tab route imports** to the new module paths. Do not edit route names, JSX behavior, or styles.
- [ ] **Step 3: Run typecheck and lint**

Run: `npx tsc --noEmit`
Expected: exit code 0.

Run: `npx expo lint`
Expected: exit code 0.

---

### Task 3: Separate static demo data and document the source map

**Files:**
- Create: `src/data/sample-work-items.ts`
- Create: `src/data/sample-focus-sessions.ts`
- Modify: `src/app/(tabs)/tasks.tsx`
- Modify: `src/app/(tabs)/history.tsx`
- Modify: `docs/architecture/FRONTEND_FOUNDATION.md`

**Interfaces:**
- Consumes: existing `WorkItem` type from `@/domain/work-item`; existing demo work-item and history session values.
- Produces: exported sample arrays imported by their corresponding routes; route rendering and visible content remain unchanged.

- [ ] **Step 1: Extract the existing task and history fixtures** into the two `src/data` modules. Preserve the exact values and item order; keep the work-item fixture typed as `WorkItem[]` and infer the history fixture's existing shape without changing its fields.
- [ ] **Step 2: Update route imports** and remove only the in-route fixture declarations.
- [ ] **Step 3: Update the frontend foundation documentation** to show the current `app`, `assets`, `components/layout`, `components/ui`, `core/api`, `data`, `domain`, and `theme` homes; note that `context`, `hooks`, `services`, and `utils` are introduced when needed; state that `app` remains the Expo Router route tree and root `assets/` remains for app-config assets. Distinguish the current AsyncStorage access-token implementation from the approved Auth target: refresh token in Expo SecureStore on Android/iOS and access token in memory.
- [ ] **Step 4: Verify route inventory, typecheck, lint, and diff hygiene**

Run: `rg --files src/app`
Expected: `src/app/_layout.tsx`, `src/app/index.tsx`, and the existing `(tabs)` layout plus `tasks`, `focus`, `history`, `garden`, and `profile` routes remain present; no route is added or removed.

Run: `npx tsc --noEmit`
Expected: exit code 0.

Run: `npx expo lint`
Expected: exit code 0.

Run: `git diff --check`
Expected: exit code 0 with no whitespace errors.

Run: `git diff -- package.json pnpm-lock.yaml app.json`
Expected: no changes from this task.

No new test suite is planned because this task only reorganizes existing modules and fixtures; use the required lint/typecheck and direct diff review to verify the refactor.

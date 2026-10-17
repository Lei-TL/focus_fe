# Focus_Fe MVP Continuation Design

## Goal

Move Focus_Fe from a navigable Expo foundation with sample screens to a usable MVP through small, contract-backed vertical slices, preserving the approved source organization and keeping FE behavior aligned with BE ownership of business truth.

## Current baseline

- Expo SDK 57, React Native, TypeScript strict, and Expo Router are configured.
- The app has a welcome route and five tab routes: tasks, focus, history, garden, and profile.
- Shared `Screen` and `Card` components, `WorkItem` and `FocusSession` domain types, theme tokens, an Axios client with bearer-token attachment, AsyncStorage token storage, a local AppState display, and a Skia tree proof of concept exist.
- Screen data is currently hard-coded. Auth flows, WorkItem API flows, server-backed focus-session lifecycle, persisted history, and real statistics are not implemented.
- The approved source-structure design has been implemented and received review PASS on 2026-10-09. The report and review are recorded in `FE_SOURCE_STRUCTURE_REPORT.md` and `FE_SOURCE_STRUCTURE_REVIEW.md`; the implementation plan is `docs/superpowers/plans/2026-10-09-frontend-source-structure.md`.
- The latest user-provided BE handoff says Auth, Work Items, Sessions Start/Events are available and M3_01/M3_02 have review PASS. The checked-in FE integration status document still describes an older M3 draft state and must be reconciled during the documentation task. Do not treat a contract handoff or review result as proof that a deployable API environment is ready.

## Chosen approach

Proceed in dependency order: align the source tree and status documentation, then deliver Auth and Work Items as independent vertical slices, then deliver Sessions after all required lifecycle contracts and a reachable test environment are available. Defer real ranking, history, statistics, and tree data until their data contracts are confirmed. Each slice must be independently reviewable and must preserve the boundaries between routes, presentation, API transport, application workflows, and domain concepts.

## Technology stack alignment

The project plan follows the proposal's mobile stack and the actual Focus_Fe repository:

- **Mobile platform:** React Native with Expo, Android and iOS. Web is outside the thesis scope. Keep the existing Expo SDK 57 and Expo Router setup for file-based routes, with React Navigation primitives underneath where needed; do not migrate to a separate navigation architecture.
- **Language and routing:** retain the repository's strict TypeScript configuration and routes in `src/app`.
- **Networking:** retain Axios for REST calls to the ASP.NET Core backend. Group calls by resource under `src/core/api`; put multi-step client workflows in `src/services` when needed.
- **Shared state and reusable logic:** use React Context with custom hooks for cross-screen Auth/session state and timer behavior when those flows are implemented. Keep screen-local state local. Do not add Redux or another state-management library.
- **Local persistence and credentials:** the proposal lists AsyncStorage for local storage. The user's later approved Auth decision takes precedence for credentials: store the refresh token in Expo SecureStore on Android/iOS and keep the access token in memory. Use AsyncStorage only for concrete non-sensitive local data needs; do not use it for Auth tokens.
- **Procedural tree:** continue using the existing `@shopify/react-native-skia` dependency for data/seed-driven vector rendering. Rive or Lottie may be selected for designed transition animations after the designer handoff; do not add either dependency as part of the foundation/Auth/API slices.
- **Backend boundary:** consume the versioned REST contracts from ASP.NET Core. PostgreSQL, Redis, Worker Service/Hangfire, and ML.NET are backend responsibilities and must not be introduced as mobile dependencies. VS Code extension and SignalR are later-scope items, not current MVP work.

The source hierarchy follows the supplied current proposal and official registration documents; `DeCuongDeTai_NguyenTrongLam_v0.docx` is treated as historical context where the newer proposal differs. Where the proposal's original AsyncStorage choice conflicts with the user's later SecureStore decision, the later decision is authoritative.

## Target responsibility map

- `src/app`: Expo Router route and layout files only; routes stay stable through this program.
- `src/components/layout` and `src/components/ui`: shared layout and presentation primitives, per the approved source-structure plan.
- `src/core/api`: HTTP client, token transport concerns, resource-specific endpoint calls, and wire DTOs where useful.
- `src/context` and `src/hooks`: introduce concrete Auth/session providers and reusable workflow hooks as those vertical slices are implemented.
- `src/services`: user-facing application workflows that coordinate API calls and state transitions when a real flow needs this layer.
- `src/domain`: business vocabulary and client-owned domain types; it must not claim server-owned results that are absent from the contract.
- `src/data`: sample/static content only; production screens should not silently fall back to sample records on API failure.
- `src/theme`: design tokens.
- Add `context`, `hooks`, or `utils` only when a concrete implementation needs those responsibilities. Do not add Redux or another global state dependency as part of this design.

## Delivery phases

### Phase 0: Reconcile project status and environment prerequisites

Update FE documentation to distinguish contract status, code/review status, and deploy/environment status. Record the latest handoff for Auth, Work Items, and Sessions Start/Events, including that the M3 review PASS status comes from the user's current project context. Retain explicit unknowns for API deployment URL, test credentials/data, and smoke-test evidence until supplied or verified. Do not edit BE-owned task or contract files.

Before runtime integration, obtain a usable `EXPO_PUBLIC_API_URL` for the target platform and a non-secret test account/data setup. Keep secrets out of tracked files. `localhost` in `.env.example` is a placeholder and is not assumed to work on a device.

### Phase 1: Apply the approved source-structure change

**Status (2026-10-09): complete; independent review PASS.** See the FE report and review named in Current baseline.

Execute the existing approved design by grouping `Screen` and `Card` into layout/UI folders, extracting current static task/history fixtures into `src/data`, and updating the frontend architecture documentation. Do not change routes, visible behavior, dependencies, or Expo app-config assets. No placeholder folders are created.

### Phase 2: Auth vertical slice

Implement register, login, authenticated profile loading, logout, and the token refresh behavior required by the supplied Auth contract. Use Axios for requests; provide cross-screen auth state through React Context and a custom hook when required by the designed flow. Store the refresh token using `expo-secure-store` on Android/iOS; keep the access token in memory and obtain a fresh token pair after app restart using the refresh endpoint. Install Expo modules with the SDK-compatible `npx expo install` command; SDK 57 documentation recommends `expo-secure-store` ~57.0.4. Centralize token lifecycle behavior in the API/auth boundary; serialize refresh so concurrent expired requests do not rotate the same refresh token independently, and persist the rotated refresh token immediately. Handle 401 and validation/rate-limit responses using HTTP status and the documented contract; do not branch on human-readable server messages. Do not require biometric authentication for routine token reads. Web is not a current target, so no web token/session flow is in scope.

Acceptance: a user can register or log in, remain authenticated across app restart according to the chosen storage policy, load their profile, and log out; expired access tokens follow one bounded refresh path, and unrecoverable auth returns to a signed-out state without refresh loops.

### Phase 3: Work Items vertical slice

Implement typed Axios API calls and user flows against the handed-off Work Items contract. Start with paginated/filterable list and create/update/status operations required by the designed flow; include detail, delete, and dependency operations only where the approved UX calls for them. Preserve contract details such as page shape, enum casing, ownership errors, PUT semantics, and 409 when deleting an item that has a session.

Before presenting priority-ranked items as a real server-backed feature, FE Lead and BE Lead must decide who calculates ranking and provide the response fields/endpoint or an approved client-side rule. The current mock's `priorityScore` and `priorityExplanation` are not present in the checked contract; FE must not invent them or present them as backend truth.

Acceptance: list and mutations use the live API, loading/empty/validation/conflict/error states are represented, and failed requests never display stale sample data as though it were server data.

### Phase 4: Sessions vertical slice

Implement start and batched Events using the handed-off contract. Use a custom hook to separate countdown behavior from screen presentation, and use Context only if active-session state must be shared across routes. Keep event IDs stable across a bounded retry, process acknowledgements, reconcile 409 closed-session responses, and record React Native AppState evidence without claiming that client timestamps prove server receipt. The FE must not decide completion, effective duration, or quality score from a local timer.

Do not call the Sessions flow complete until the BE has handed off reviewed contracts and runtime availability for End, current-session recovery, and the needed session read/history queries. Validate reopen/relaunch, background/foreground, request timeout, duplicate retry, expired auth, and session conflict behavior against a deployed test environment. Offline event preservation beyond the documented protocol is out of scope unless separately designed.

Acceptance: Start/Events use server responses and acknowledgements; a user-visible completed/cancelled state only follows a persisted server result; current session recovery and history use their approved read contracts.

### Phase 5: Statistics and Garden data

Keep the existing Skia rendering proof of concept separate from business calculations. Replace hard-coded statistics/tree input only after BE and FE agree on history/statistics data, seed/version semantics, and the server-owned quality/effective-duration values. Add Rive or Lottie only after an approved design identifies the required transitions and the package is checked for Expo SDK 57 compatibility. Do not introduce M4 fields or infer values that are not in the contract.

Acceptance: the tree is a deterministic presentation of approved data and seed; statistics shown in the UI can be traced to a delivered contract.

## Cross-cutting constraints

- Preserve Expo Router route paths and the existing Android/iOS-first behavior.
- Use only the API and response fields established in the current versioned contract; record contract changes before relying on them.
- Keep server time, session validity, priority decisions, effective duration, quality score, and persisted completion status server-owned unless a new approved contract explicitly changes ownership.
- Do not add dependencies or global state infrastructure without a task-specific need and SDK 57 compatibility review.
- Do not commit, stage, push, deploy, or overwrite unrelated working-tree changes unless separately requested.
- Run `npx expo lint` and `npx tsc --noEmit` for implemented slices as required by `AGENTS.md`. Feature tests require a task-specific plan and explicit test/verification authorization; report any checks not run accurately.

## Known decisions required before affected implementation

- Integration base URL, target platform, and test account/data are not established by the checked-in FE documentation.
- WorkItem priority and explanation source are absent from the current BE contract.
- Sessions End, current-session recovery, detail/history availability, and deployment evidence must be confirmed before full session lifecycle acceptance.
- UI flow and states for forms, auth expiry, pagination, conflicts, reconnect/recovery, and destructive actions require an approved designer handoff where they are not already specified.
- **Resolved by user approval (2026-10-09):** persist refresh tokens in Expo SecureStore on Android/iOS, keep access tokens in app memory, serialize refresh and update rotated refresh tokens, and clear persisted credentials on logout. Do not require biometric authentication for routine reads.
- Web is not currently in scope. If the supported platforms change later, define a separate web session/token strategy because SecureStore is available only on native platforms.

## Scope boundaries

This design does not authorize implementation by itself. It does not change backend behavior, create or revise BE endpoints, define a new priority/scoring algorithm, add offline guarantees, complete M4 analytics, or prescribe a visual redesign. Each phase receives a specific implementation plan and user approval before code work begins.

## Review checklist

- Every roadmap item maps to an existing gap or a stated contract/environment dependency.
- Auth and Work Item slices remain independent from Sessions lifecycle completion.
- No route file is moved out of `src/app`.
- No server-owned result is synthesized by the FE.
- Contract handoff, review PASS, deploy availability, and smoke-test evidence remain separate statuses.
- Any implementation plan identifies exact files, APIs, UI states, and verification for its approved phase.

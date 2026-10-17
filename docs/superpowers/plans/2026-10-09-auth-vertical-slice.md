# Auth Vertical Slice Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement the Android/iOS Auth flow from AUTH_01 while keeping access tokens in memory and refresh tokens in Expo SecureStore.

**Architecture:** Keep auth DTOs and endpoint calls at `src/core/api`, token lifecycle in the API/auth boundary, and signed-in user state in a provider consumed by Expo Router. A single shared refresh operation handles simultaneous 401 responses, persists rotation before releasing the new access token, and only retries each original request once.

**Tech Stack:** Expo SDK 57 (`expo` ~57.0.24), React Native 0.86, TypeScript strict, Expo Router, Axios, `expo-secure-store` ~57.0.4, Jest with `jest-expo`.

**Stack alignment:** Follow the running FE repo and its `AGENTS.md`: Expo Router owns routes (the proposal's React Navigation wording does not authorize a router swap), Axios remains the HTTP client, and React Context/Custom Hooks are sufficient for auth state and local logic. AsyncStorage is used only to remove the legacy `focus.accessToken` key; new refresh credentials go to SecureStore and access credentials stay in memory per the user's current decision. The backend remains the handed-off ASP.NET Core/JWT contract with PostgreSQL owned by BE. Skia/Rive/Lottie, Redis/background workers, ML.NET, and the VS Code extension are outside this Auth slice.

**Task:** `TASKS/AUTH_01_VERTICAL_SLICE.md`

**Spec:** `docs/superpowers/specs/2026-10-09-fe-mvp-continuation-design.md`

## Global Constraints

- Android/iOS only; Web auth/session is out of scope.
- Store refresh token only in Expo SecureStore; keep access token in memory; do not require biometric authentication for routine token reads.
- Persist a rotated refresh token immediately and serialize refresh so concurrent expired requests do not rotate the same token independently.
- Use only the Auth routes and response fields in the handed-off BE contract; do not parse human-readable messages for control flow.
- Keep BE ownership of credentials, token validity, profile, and refresh rotation.
- Do not add Redux or another global state dependency.
- Do not edit BE-owned contract/task files or create native `ios/`/`android/` directories by hand.
- Do not stage/commit/push/deploy or overwrite unrelated working-tree changes.
- Recheck BE source/contract HEAD before implementation; current FE contract registry is dated 2026-09-22 and is not deploy evidence.
- Run `npx expo lint` and `npx tsc --noEmit`; use the test suite proposed below only after the user approves this plan.

## Review Focus

- Concurrent protected requests receive 401 together: one refresh is sent, rotated token is stored once, and every original request retries no more than once.
- SecureStore read/write/delete rejects or reports no availability: never fall back to AsyncStorage, never report signed-in without a safely persisted refresh token, and keep errors recoverable.
- Bootstrap sees network/timeout/429/5xx: retain the refresh token and show retryable loading/error state; only definitive refresh 401 clears credentials.
- Logout races with a pending refresh/profile response: late completion cannot restore the signed-in state or navigate back into protected routes.
- Login receives 401 while a protected request also receives 401: login credentials are not replayed through refresh; only protected requests use the refresh path.

## File Map

- `src/domain/auth.ts`: `TokenPair`, `UserProfile`, and Auth request types matching JSON camelCase.
- `src/core/auth/token-store.ts`: in-memory access token, a session epoch, and SecureStore-backed refresh token at key `focus.refreshToken`.
- `src/core/auth/auth-events.ts`: one `subscribeExpired(listener): () => void`/`emitExpired()` signal between the API interceptor and auth provider.
- `src/core/api/auth.ts`: typed public register/login/refresh calls on a bare Axios instance; it must not import `apiClient`.
- `src/core/api/profile.ts`: typed `getMe(): Promise<UserProfile>` via the protected client.
- `src/core/api/client.ts`: attach in-memory access token and perform one serialized refresh/retry for protected requests; it imports refresh from the bare Auth transport without an import cycle.
- `src/services/auth-service.ts`: bootstrap, register, login, load profile, logout; coordinate durable rotation and state invalidation.
- `src/context/auth-context.tsx`: app-wide bootstrap/auth status and actions; no global state library.
- `src/app/(auth)/_layout.tsx`, `login.tsx`, `register.tsx`: minimal mobile forms using existing theme tokens.
- `src/app/(tabs)/_layout.tsx`, `src/app/index.tsx`, `src/app/_layout.tsx`, `src/app/(tabs)/profile.tsx`: protected navigation, bootstrap entry, dynamic profile, local logout.
- `app.json`: add the `expo-secure-store` config plugin with `configureAndroidBackup: true`; do not add a biometric usage prompt.
- `package.json`, `pnpm-lock.yaml`, `tsconfig.json`, Jest configuration: SDK-compatible test setup.

## Task 1: Install SecureStore and establish token storage

**Interfaces:**
- Produces `tokenStore.getAccessToken(): string | null`, `setAccessToken(token: string): void`, `clearAccessToken(): void`, `getRefreshToken(): Promise<string | null>`, `setRefreshToken(token: string): Promise<void>`, `clearRefreshToken(): Promise<void>`, and `clearAll(): Promise<void>`.
- `clearAll(): Promise<void>` increments `getSessionEpoch(): number` and clears in-memory access synchronously before awaiting SecureStore deletion so requests/refreshes from an older epoch cannot restore credentials.

- [ ] Install SecureStore using `npx expo install expo-secure-store`; use the SDK 57 documented compatible package.
- [ ] Install the test runner with `npx expo install jest-expo jest @types/jest --dev` and React Native Testing Library with `npx expo install @testing-library/react-native --dev`; configure `test: jest`, the `jest-expo` preset, and Jest types in `tsconfig.json` without dropping existing Expo types.
- [ ] Write tests `tokenStore_keepsAccessTokenInMemoryOnly`, `tokenStore_readsAndWritesRefreshTokenThroughSecureStore`, `tokenStore_clearsAccessBeforeSecureDelete`, `tokenStore_clearAllAdvancesEpochImmediately`, and `tokenStore_neverFallsBackWhenSecureStoreRejects`.
- [ ] Run `npx jest --runInBand --runTestsByPath src/core/auth/token-store.test.ts`; verify the storage behavior tests fail for the missing implementation.
- [ ] Implement the storage module and update `src/core/api/client.ts` to stop reading/writing access tokens through AsyncStorage.
- [ ] Run the same focused Jest command; expected all named tests pass.
- [ ] Add the `expo-secure-store` config plugin to `app.json` with `configureAndroidBackup: true`; do not set `requireAuthentication` or add Face ID permission text.

## Task 2: Implement Auth API and serialized token lifecycle

**Interfaces:**
- `src/core/api/auth.ts`: `register(input: RegisterRequest): Promise<UserProfile>`, `login(input: LoginRequest): Promise<TokenPair>`, `refresh(refreshToken: string): Promise<TokenPair>`.
- `src/core/api/profile.ts`: `getMe(): Promise<UserProfile>`.
- `src/services/auth-service.ts`: `bootstrap(): Promise<BootstrapResult>`, `login(input: LoginRequest): Promise<UserProfile>`, `register(input: RegisterRequest): Promise<UserProfile>`, `logout(): Promise<void>`.
- `BootstrapResult` distinguishes `authenticated` with `profile`, `signedOut`, and `retryableError`; network errors must not be collapsed into invalid credentials.

- [ ] Add contract-shaped TypeScript types: `TokenPair` (`accessToken`, `refreshToken`, `accessExpiresAt`, `refreshExpiresAt`), `UserProfile` (`id`, `email`, `displayName`, `seed`, `defaultSessionMinutes`, `timeZoneId`, `role`), register fields, and login fields.
- [ ] Write tests for API request/response mapping and HTTP outcomes: register 201 profile-only; login 200 TokenPair; refresh 200 TokenPair; `/auth/me` with bearer; register 409; validation 400; login/refresh 401; 429. Assert no branch uses response message text.
- [ ] Implement `auth.ts` calls against `/auth/register`, `/auth/login`, `/auth/refresh` on a dedicated bare Axios instance, and `profile.ts` `/auth/me` via `apiClient`; this split prevents a circular import from the refresh interceptor.
- [ ] Write tests `bootstrap_removesLegacyAsyncStorageAccessToken`, `bootstrap_legacyCleanupFailureDoesNotAuthenticate`, `bootstrap_refreshesThenLoadsMe`, `bootstrap_missingRefreshTokenSignsOut`, `bootstrap_refresh401ClearsCredentials`, `bootstrap_transientFailureRetainsRefreshToken`, `refresh401sAreSerializedAndEachRequestRetriesOnce`, `refreshStorageFailureDoesNotPublishNewAccessToken`, and `logoutInvalidatesPendingRefresh`.
- [ ] Run the focused tests and verify each fails for its intended missing behavior.
- [ ] Implement one shared refresh promise in `apiClient`; only retry an original protected request once; do not refresh public Auth transport calls or non-401 responses. Snapshot the token-store epoch before refreshing; discard the response if logout/clear advanced the epoch. Save the rotated refresh token before exposing the new access token. On unrecoverable refresh 401, clear credentials and emit `authEvents.emitExpired()`.
- [ ] Implement the service functions; on bootstrap, first remove the legacy AsyncStorage key `focus.accessToken` (never read/use its value); if removal fails, do not authenticate or fall back to that value. Then refresh and persist rotation before calling `/auth/me`; distinguish definitive 401 from transient failures. Registration success returns the profile and does not create a signed-in session because BE returns no token pair.
- [ ] Run focused Auth service and API tests; expected all named tests pass.

## Task 3: Connect auth state, forms, profile, and protected routes

**Interfaces:**
- Context exposes `status: 'bootstrapping' | 'signedOut' | 'signedIn' | 'retryableError' | 'logoutError'`, `profile: UserProfile | null`, `login`, `register`, `retryBootstrap`, `retryLogout`, and `logout`.
- Use Expo Router SDK 57 `Stack.Protected` in the root stack: keep `index` unguarded as the bootstrap/loading entry, guard `(auth)` with `status === 'signedOut' || status === 'retryableError'`, and guard `(tabs)` with `status === 'signedIn'`. Do not use `redirectTo`, which is documented for SDK 58+.

- [ ] Write provider/form tests for bootstrap loading, missing token state, successful bootstrap state, transient retry state, register success, login/profile state, field validation, 401/409/429 feedback, submit loading, logout state, and SecureStore logout deletion failure (protected routes remain blocked and retry is offered). Route membership is verified manually on Android and iOS because the project has no existing router integration test harness.
- [ ] Run the focused tests and confirm they fail before provider/routes are implemented.
- [ ] Implement `AuthProvider`, subscribe to `authEvents` and wrap the root Expo Router layout; ensure no protected screen is presented as authenticated during bootstrap. `logoutError` remains outside `(tabs)` until `retryLogout` deletes the refresh token.
- [ ] Add register/login screens using existing colors/spacing and native `TextInput`/`Pressable`; include loading, validation, 409, 401, 429, and retryable network/storage states. Use BE defaults for registration session duration/time zone unless the form design handoff says otherwise; do not add a new visual system.
- [ ] Update `src/app/index.tsx` as the bootstrap/loading entry and protect `(tabs)`; preserve existing tab route paths. Update Profile to render the loaded `UserProfile` and call local logout.
- [ ] Run focused UI/provider tests; expected all named cases pass. Verify the `Stack.Protected` guards route to login for signed-out users and remove tab access after logout on Android/iOS.

## Task 4: Full verification and handoff

- [ ] Run the full Jest suite with `npx jest --runInBand`; expected exit 0 and no skipped Auth cases.
- [ ] Run `npx expo lint`; expected exit 0.
- [ ] Run `npx tsc --noEmit`; expected exit 0.
- [ ] Run `npx expo-doctor`; record all warnings and whether they predate this task.
- [ ] Run `git diff --check`; expected exit 0; inspect diff to confirm no BE files, native directories, secrets, or unrelated working-tree changes are included.
- [ ] If usable API URL and test account are provided, smoke test register → login → profile → force-close/relaunch refresh → logout on Android and iOS. If not provided, record runtime smoke as BLOCKED by environment prerequisites; do not claim live integration was verified.
- [ ] Write `AUTH_01_REPORT.md` with changed files, actual commands/results, passed/failed/skipped checks, environment limitations, and risks; stop at READY_FOR_REVIEW.

## Notes for plan review

- Existing `src/app/index.tsx` currently allows entering tabs without authentication; Auth must close that bypass.
- Current FE contract registry says Auth contract exists but is dated 2026-09-22. Verify current BE source and handoff before implementation; do not edit the BE registry from FE.
- There is no logout/revoke endpoint in the inspected Auth contract, so logout is local-only and does not revoke the server-side refresh token.
- Expo SDK 57 SecureStore docs list recommended version `~57.0.4`, Expo Go availability, `getItemAsync`/`setItemAsync`/`deleteItemAsync`, and Android backup behavior. Routine reads must not set `requireAuthentication`. Expo Go can exercise the module API; a native build is needed to verify config-plugin/backup behavior.
- Expo Router SDK 57 supports protected route patterns; `redirectTo` on `Stack.Protected` is documented as SDK 58+ and must not be used for this task.
- Auth form design handoff is not present. This plan proposes simple native forms using current tokens, not a visual redesign; user approval of the plan should confirm this UI scope or provide a different handoff.
- Runtime API URL/test account are absent from FE docs; code tests can use an injected/mock adapter, but live smoke verification remains an environment dependency.

## Documentation used to draft the plan

- [Expo SDK 57 reference](https://docs.expo.dev/versions/v57.0.0/)
- [Expo SecureStore for SDK 57](https://docs.expo.dev/versions/v57.0.0/sdk/securestore/)
- [Expo Router SDK 57 reference](https://docs.expo.dev/versions/v57.0.0/sdk/router/)
- [Expo Router protected routes](https://docs.expo.dev/router/advanced/protected/)
- [Expo unit testing with Jest](https://docs.expo.dev/develop/unit-testing/)

# Frontend Source Structure Design

## Goal

Organize Focus_Fe's frontend source so its responsibilities are easy to find, following the categories in the supplied frontend structure diagram while retaining Expo Router conventions and the repository's existing architecture.

## Context

Focus_Fe is an Expo SDK 57 React Native application using TypeScript and Expo Router. Routes currently live under `src/app`; shared UI is in `src/components`; API infrastructure is in `src/core/api`; business types are in `src/domain`; and design tokens are in `src/theme`. Expo-owned app assets currently live in the root `assets/` directory.

The repository contains pre-existing uncommitted changes. This design does not authorize reverting, staging, or committing them.

## Chosen approach

Keep the current Expo and domain boundaries, and map the diagram's categories onto those boundaries. Add a category only when a real implementation needs it; do not create empty directories merely to imitate the image.

```text
src/
  app/                 # Expo Router routes and layouts (the diagram's Pages)
  assets/              # source-owned assets, only if assets need to live with source
  components/          # reusable UI components
  context/             # shared React context providers, only when needed
  core/
    api/               # HTTP client and transport-level API infrastructure
  data/                # static app content or local fixtures, when needed
  domain/              # business concepts and types
  hooks/               # reusable React hooks
  services/            # application workflows/use cases combining infrastructure and domain
  theme/               # design tokens and theme definitions
  utils/               # small stateless helpers without product workflows
```

`redux/` is intentionally omitted. State should remain with its owning screen or feature unless shared state needs justify a global solution; any future state library and its placement require a separate decision. The existing root `assets/` folder remains the home for assets referenced by Expo app configuration (such as icons and splash images); source-level assets may be grouped separately only when that distinction is useful.

## Responsibilities and boundaries

- `src/app` contains route files and layout files recognized by Expo Router. Route files compose screens and navigation; non-route implementation modules stay outside this directory.
- `src/components` contains reusable presentation components. Screen-specific UI may remain near its route or move into a clearly named non-route component directory when it grows.
- `src/core/api` owns HTTP transport, shared client configuration, and transport concerns. It does not own product workflows.
- `src/domain` owns business vocabulary and types, independent of React Native UI and HTTP transport.
- `src/services` owns application-level operations and coordinates domain rules with infrastructure. It does not render UI or perform navigation.
- `src/hooks` owns reusable React hooks. Hooks may call services but should not become a second service layer.
- `src/context` is reserved for genuinely cross-screen context providers; local state does not belong there by default.
- `src/data` owns static content or local fixtures, not remote API transport.
- `src/utils` is reserved for small, stateless, broadly reusable helpers; product-specific logic stays with its domain or service.
- `src/theme` owns design tokens and theme definitions.
- `src/assets` may own source-level images/fonts if adopted. Root `assets/` remains available for Expo app config assets; no asset moves are implied by this design.

## Scope

The implementation task derived from this design should:

- Align existing source files to the selected responsibility boundaries only where doing so improves discoverability.
- Keep Expo Router paths and externally observable routes unchanged.
- Update imports and project documentation for any approved file moves.
- Avoid adding state-management or utility dependencies.
- Avoid creating empty category folders or moving Expo config assets without verifying every reference.
- Preserve unrelated working-tree changes.

This design does not prescribe a feature-first rewrite, change app behavior, redesign screens, alter backend contracts, or require moving every current module.

## Acceptance criteria

- A developer can identify the route entry points under `src/app` and distinguish them from non-route components and logic.
- API transport, domain types, shared UI, theme, and application workflows have documented, non-overlapping homes.
- The remaining diagram categories have explicit conditions for when to introduce them, rather than empty placeholder directories.
- Expo Router route behavior and all current route paths remain unchanged by any implementation based on this design.
- No dependency or global state library is introduced solely to make the tree resemble the diagram.
- Any source move has corresponding import and documentation updates; Expo app-config assets remain valid.

## Open for spec review

This document records the selected direction and boundaries. The exact file moves should be determined from the implementation-time source review and listed in the implementation plan; this spec does not authorize implementation by itself.

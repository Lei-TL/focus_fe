This is an Expo/React Native mobile application. Prioritize mobile-first patterns, performance, and cross-platform compatibility.

## Expo has changed — do not trust your training data

Expo ships breaking changes every SDK release. APIs you remember are likely renamed, moved, or removed. Before writing any code that touches an Expo, EAS, or React Native API:

1. Read the major version of the `expo` package in `package.json`.
2. Fetch the matching versioned docs: `https://docs.expo.dev/versions/v<major>.0.0/`
3. For anything else, fetch https://docs.expo.dev/llms.txt — an index of all Expo docs with corrections to common LLM misconceptions. Follow its links to the specific page you need; never answer from memory.

## Commands

Use `bunx` instead of `npx` if the project uses bun (`bun.lock` present).

```bash
npx expo install <package>  # ALWAYS use instead of npm/yarn/pnpm/bun add — resolves SDK-compatible versions
npx expo start              # start the dev server
npx expo lint               # lint
npx tsc --noEmit            # typecheck
npx expo-doctor             # diagnose dependency and config issues
npx expo install --fix      # fix incompatible package versions
```

Run lint and typecheck before declaring any task done.

## Navigation & Routing

- Use **Expo Router** for all navigation. Routes live in `src/app/` — every file there is a screen, `_layout.tsx` files define navigators. Keep non-route code (components, hooks, utils) outside `src/app/`.
- Import `Link`, `router`, and `useLocalSearchParams` from `expo-router`.
- Docs: https://docs.expo.dev/router/introduction.md

## Building with EAS

Use EAS to build, sign, and submit the app in the cloud (`eas build`, `eas submit`) and to ship over-the-air updates (`eas update`) — no local Xcode or Android Studio required. Run EAS CLI as `bunx eas-cli <command>` in Bun projects, or `npx eas-cli@latest <command>` otherwise; substitute that for bare `eas` in docs examples.
Docs: https://docs.expo.dev/eas/index.md

## Rules

- If `ios/` and `android/` directories do not exist, they are generated (Continuous Native Generation). Never create or edit them by hand — configure native behavior in `app.json` and config plugins.
- Expo Go only includes its bundled native modules. After adding a library with native code, the app needs a development build: `npx expo run:ios|android` locally, or `eas build --profile development`.
- Prefer recommended Expo modules over third-party libraries, and check your available skills before adding dependencies. Docs: https://docs.expo.dev/versions/latest/index.md

## Commit rule (chốt 2026-10-16)

- Khi task xong và đã tự kiểm tra (typecheck, lint đạt) thì commit ngay; không commit khi BLOCKED hoặc đang lỗi. Không push nếu chưa được nói.
- Chỉ stage đúng file của lượt mình (`git add <path>`, không `git add -A`); không commit `.env`, secret, `node_modules`, `.expo`, `.codex_tmp`, `TASKS/` nếu đang bị exclude.
- Không để lại dấu vết của ai/agent nào trong commit: không `Co-Authored-By`, không dòng "Generated with", không tên agent/role/model/tool trong message hay trailer. Giữ nguyên `user.name`/`user.email` đã cấu hình.
- **Định dạng message (Conventional Commits, tiếng Anh):** `<type>: <subject>`.
  - `type`: `feat` (thêm khả năng mới cho người dùng), `fix` (sửa lỗi hành vi), `refactor` (đổi cấu trúc, không đổi hành vi), `test`, `docs`, `chore` (cấu hình, dependency, tooling), `build`, `ci`, `perf`. Chọn theo tác động thực của commit, không theo tên task.
  - **Không dùng scope và không nhắc tên module** (không `fix(auth):`, không `feat(sessions):`). Chỉ `type: subject`; nếu cần nêu khu vực thì diễn đạt trong subject bằng lời thường, tránh tên module/mã task.
  - `subject`: thể mệnh lệnh, chữ thường, không dấu chấm cuối, không khoảng trắng trước dấu câu, tối đa 72 ký tự, nói **cái gì đổi** chứ không nói "đã sửa/đã thêm". Không dùng từ rỗng ("verified", "final", "update stuff").
  - Body (tùy chọn, cách subject một dòng trống, xuống dòng ~72 cột): giải thích **vì sao** và ràng buộc quan trọng; bắt buộc khi commit đổi hành vi không hiển nhiên hoặc có breaking change (`feat!:` hoặc dòng `BREAKING CHANGE:`).
  - Một commit = một thay đổi logic; không gộp việc không liên quan. Không ghi mã task/milestone (`M3_03`, `INT_T1`), tên role/agent, đường dẫn `TASKS/`, hay số test vào message.
  - Ví dụ đúng: `feat: add session start, events and end endpoints`, `fix: ignore token refresh result after logout`, `chore: add openapi-typescript`. Ví dụ sai: `fix(auth): ...`, `feat(sessions): ...`, `fix: title , paging overflow and acceptance gaps`, `init-project`, `feat: M3 done`.
  - Quy tắc này thay mọi câu "không tự commit" trong task/report cũ.

## Branch rule (chốt 2026-10-16)

- Mỗi module một nhánh `mX/ten-module` (chữ thường, kebab-case), ví dụ `m1/authentication`, `m2/work-items`, `m3/sessions`; cùng mã M và tên với repo BE để ghép cặp.
- Agent chỉ commit lên nhánh đang checkout; không tự tạo, đổi tên, chuyển nhánh, merge, rebase hay push. Anh tạo nhánh, push và mở PR vào `main`.


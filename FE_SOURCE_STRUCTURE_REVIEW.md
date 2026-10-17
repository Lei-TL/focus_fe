# FE Source Structure Review

## Kết luận vòng 3: PASS — 2026-10-17 (review P2 docs fix)

Đã review độc lập bản fix P2 docs tại `docs/architecture/FRONTEND_FOUNDATION.md:8`. Nội dung mới khớp quyết định đã chốt trong `TASKS/AUTH_01_VERTICAL_SLICE.md` mục "Quy tắc token"; không còn diễn giải song song và không mở rộng phạm vi. Không có finding.

### Đối chiếu nội dung (đọc file thực tế, không chỉ tin report)

- `FRONTEND_FOUNDATION.md:8` phân biệt rõ "hiện trạng code đang dùng AsyncStorage cho bootstrap token MVP" với "quyết định đích cho Auth". Hiện trạng khớp code thật: `src/core/api/client.ts:4,13,21-23` dùng AsyncStorage với key `focus.accessToken` cho access token.
- Quyết định đích khớp `AUTH_01` mục "Quy tắc token": refresh token chỉ ở SecureStore trên Android/iOS (không `requireAuthentication`, không biometric, không fallback AsyncStorage); access token chỉ ở memory (không AsyncStorage/SecureStore/log); AsyncStorage chỉ dùng để xóa key legacy `focus.accessToken`, không lưu token mới.
- Không còn câu cũ "cần đánh giá SecureStore trước production". Câu này đã được ghi đè trực tiếp tại cùng dòng 8, nên không còn hai diễn giải song song trong file foundation.
- Grep toàn repo: không có tài liệu nào còn nêu AsyncStorage là lựa chọn lưu token mới. Các tài liệu liên quan nhất quán — `docs/superpowers/specs/2026-10-09-fe-mvp-continuation-design.md:28,103`, `docs/superpowers/plans/2026-10-09-frontend-source-structure.md:102`, `docs/superpowers/plans/2026-10-09-auth-vertical-slice.md:11,20`, `TASKS/AUTH_01_VERTICAL_SLICE.md:28-31`, `TASKS/INT_T3_API_TYPES.md:17`.
- Không thấy mở rộng phạm vi: router vẫn Expo Router, HTTP client vẫn Axios, không đụng `ios/`/`android/` hay native config trong nội dung đã đọc.

### Kiểm chứng reviewer tự chạy

- `npx tsc --noEmit` → exit 0, không output.
- `npx expo lint` → exit 0; có 1 dòng nhiễu môi trường `'pnpm' is not recognized as an internal or external command...` (máy không cài pnpm). Đối chiếu `npx eslint .` → exit 0, không output.
- `git status --short` / `git diff --stat`: 7 file baseline tracked (`AGENTS.md`, `app.json`, `package.json`, `pnpm-lock.yaml`, `tsconfig.json`, cùng `App.tsx`/`index.ts` deleted) vẫn dirty như baseline; `docs/`, `TASKS/`, `src/`, `FE_SOURCE_STRUCTURE_*.md` untracked. Không stage/commit.

### Giới hạn review

- `docs/` và `TASKS/` untracked tại baseline (`git ls-files docs` không có entry), nên không có diff lịch sử để chứng minh byte-for-byte nội dung trước/sau hoặc tự xác nhận "chỉ 1 file docs bị sửa". Phạm vi 1 file chỉ đối chiếu được với report và nội dung hiện tại, không kiểm chứng được bằng Git.
- Chưa chạy smoke test runtime Auth và chưa đối chiếu lại contract BE HEAD; cả hai ngoài phạm vi task docs này.
- Không sửa code/docs trong lượt review; không tạo test.

## Lịch sử — Vòng 2: CHANGES_REQUIRED — 2026-10-09

### Finding

- **[P2] Cập nhật hướng dẫn lưu token đã được chốt** — `docs/architecture/FRONTEND_FOUNDATION.md:8`.
  - **Điều kiện:** người triển khai Auth dùng tài liệu foundation để quyết định nơi lưu token.
  - **Tác động:** tài liệu hiện ghi AsyncStorage là lựa chọn bootstrap và chỉ nói cần “đánh giá SecureStore trước production”. Điều này không khớp quyết định mới nhất của anh: refresh token dùng SecureStore trên Android/iOS, access token chỉ giữ trong bộ nhớ. Người triển khai có thể tiếp tục theo lựa chọn lưu token cũ.
  - **Hướng sửa:** phân biệt rõ hiện trạng code (đang dùng AsyncStorage) với quyết định đích cho Auth; ghi refresh token vào SecureStore và access token trong bộ nhớ theo spec đã duyệt. Sau đó có thể review lại tài liệu; source-structure không cần đổi.

### Phạm vi và kiểm tra độc lập

- Đã đọc report, review vòng 1, routes liên quan, component đã chuyển, fixture mới, README và tài liệu foundation/coordination.
- Import hiện tại trỏ tới `@/components/layout/Screen`, `@/components/ui/Card`, `@/data/sample-work-items` và `@/data/sample-focus-sessions`; inventory hiện có vẫn gồm 8 route/layout.
- Nội dung và thứ tự hai task fixtures khớp với dữ liệu trước khi tách; route giữ cách map/key hiện hữu.
- Handoff/review và môi trường/deploy được ghi thành trạng thái riêng trong README và integration status.
- Em không chạy lại lint/typecheck/diff-check. Report Dev và review vòng 1 ghi các lệnh này exit 0; đây là kết quả do họ báo.
- Giới hạn: `src/` và `docs/` không được Git theo dõi tại baseline hiện có, nên không thể dùng diff lịch sử để chứng minh toàn bộ nội dung file mới trước/sau.

## Lịch sử — Vòng 1: PASS

## Kết luận vòng 1: PASS trong phạm vi source structure tại thời điểm review

Không có finding cần sửa trong phạm vi source-structure được review. Route inventory hiện tại khớp danh sách 8 route/layout trong plan; các import component và fixture dùng đường dẫn mới; dữ liệu fixture hiện tại giữ đúng hai phần tử theo thứ tự trong từng mảng; tài liệu tách handoff/review khỏi trạng thái deploy/runtime; không thấy thay đổi logic route hay asset app-config trong source được kiểm tra.

## Findings

Không có.

## Kiểm tra đã chạy

- `pnpm typecheck` — PASS, `tsc --noEmit` exit 0.
- `pnpm lint` — PASS, `expo lint` exit 0.
- `git diff --check` — PASS, exit 0; Git chỉ phát cảnh báo chuyển LF sang CRLF cho các file baseline.
- `rg --files src/app` — PASS: có `_layout.tsx`, `index.tsx`, `(tabs)/_layout.tsx` cùng năm tab `tasks`, `focus`, `history`, `garden`, `profile`.
- Tìm `@/components/Screen` và `@/components/Card` dưới `src/app` — không có kết quả; route imports hiện dùng `@/components/layout/Screen` và `@/components/ui/Card`.
- Đọc hai fixture và các route sử dụng: `sampleWorkItems` giữ 2 mục theo thứ tự 1, 2; `sampleFocusSessions` giữ 2 mục theo thứ tự Hôm nay, Hôm qua; route render theo thứ tự mảng và key hiện hữu.
- Đọc README, integration status và frontend foundation: handoff/review được tách riêng với môi trường/deploy/smoke test; End/current-session/detail/history và ranking gap được nêu rõ.

## Phân định baseline và giới hạn

Theo trạng thái baseline được giao, `App.tsx`/`index.ts` đã bị xóa; `app.json`, `package.json`, `pnpm-lock.yaml`, `tsconfig.json` đã modified; `docs/` và `src/` vốn untracked. Các file config vẫn hiện trong `git diff` so với HEAD, nhưng được phân loại là thay đổi baseline và không tính thành finding của task này. Do `docs/` và `src/` không được Git theo dõi tại HEAD, không có diff lịch sử để chứng minh byte-for-byte fixture trước/sau hoặc quy thuộc từng nội dung mới cho task; đánh giá fixture dựa trên module/route hiện hữu và nội dung report, không dựa vào diff lịch sử.

Không stage hoặc commit.

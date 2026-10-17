# FE_SOURCE_STRUCTURE_REPORT

## Kết quả

- Cập nhật README và trạng thái phối hợp FE/BE để ghi nhận Auth, Work Items, Sessions Start/Events đã handoff; M3_01/M3_02 review PASS theo handoff người dùng. Tách rõ trạng thái contract/review khỏi deploy/runtime, nêu các điều kiện môi trường còn thiếu, các Sessions contract còn chờ và gap của priority fields.
- Chuyển `Screen` sang `src/components/layout` và `Card` sang `src/components/ui`, cập nhật imports ở năm tab routes.
- Tách fixture Tasks và History sang `src/data`, giữ nguyên giá trị và thứ tự hiển thị.
- Cập nhật source map trong tài liệu foundation; không tạo các thư mục category rỗng.

## File thay đổi

- `README.md`
- `docs/coordination/BACKEND_INTEGRATION_STATUS.md`
- `docs/architecture/FRONTEND_FOUNDATION.md`
- `src/components/layout/Screen.tsx` (move)
- `src/components/ui/Card.tsx` (move)
- `src/data/sample-work-items.ts` (new)
- `src/data/sample-focus-sessions.ts` (new)
- `src/app/(tabs)/tasks.tsx`
- `src/app/(tabs)/history.tsx`
- `src/app/(tabs)/focus.tsx`
- `src/app/(tabs)/garden.tsx`
- `src/app/(tabs)/profile.tsx`

## Kiểm chứng

| Lệnh/kiểm tra | Kết quả |
|---|---|
| `npx tsc --noEmit` | PASS, exit 0 sau thay đổi |
| `npx expo lint` | PASS, exit 0 sau lần chạy đầy đủ cuối cùng; các lần chạy đầu im lặng và bị dừng khi chưa trả output |
| `git diff --check` | PASS, exit 0 |
| `rg --files src/app` | PASS: đủ 8 route/layout hiện có, không thêm/xóa route |
| Tìm import cũ `@/components/Card` / `@/components/Screen` trong routes | PASS: không còn kết quả |
| Đối chiếu package/config với phạm vi plan | Không chỉnh các file package/config trong lượt này; các thay đổi sẵn có ở working tree được giữ nguyên |

## Giới hạn và rủi ro còn lại

- Chưa có API base URL, xác nhận kết nối platform, test account/data hoặc smoke-test evidence; tài liệu không tuyên bố runtime integration.
- End, current-session recovery và Sessions detail/history contract vẫn chưa được handoff xác nhận.
- `priorityScore`/`priorityExplanation` vẫn thuộc mock UI hiện hữu; chưa được trình bày trong đây như dữ liệu server-backed. Quyết định FE/BE về nguồn ranking vẫn cần thiết trước khi tích hợp.
- Working tree có sẵn thay đổi chưa commit trước lượt này; không stage hoặc commit.

## Review

Review độc lập kết luận PASS, không có finding cần sửa. Chi tiết ở `FE_SOURCE_STRUCTURE_REVIEW.md`.

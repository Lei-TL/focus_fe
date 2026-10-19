# Focus Frontend

Ứng dụng mobile quản lý WorkItem và phiên tập trung dành cho lập trình viên, được khởi tạo từ đề cương Focus và trạng thái backend hiện tại.

## Chạy dự án

```bash
pnpm install
copy .env.example .env
pnpm start
```

Các lệnh kiểm tra:

```bash
pnpm typecheck
pnpm doctor
```

## Type API (sinh từ OpenAPI của BE)

Type request/response sinh tự động từ `../Focus_Be/contracts/openapi.json` bằng `openapi-typescript` (devDependency, ghim phiên bản). File sinh ra được commit vào repo để máy không có repo BE cạnh bên vẫn typecheck được.

Đồng bộ theo BE commit: **`cd2bcf7`** (nhánh `m3/sessions`).

```bash
pnpm gen:api      # sinh src/core/api/generated/schema.d.ts
pnpm check:api    # sinh lại rồi fail nếu file generated lệch so với bản đã commit
```

Mặc định đọc `../Focus_Be/contracts/openapi.json`; đổi đường dẫn bằng biến `OPENAPI_SPEC`.

```bash
OPENAPI_SPEC=/duong/dan/openapi.json pnpm gen:api
```

Alias gọn ở `src/core/api/types.ts` (chỉ re-export từ file generated). Helper gọi HTTP có type ở `src/core/api/request.ts`; ví dụ `request('get', '/health')`.

### Base URL

`.env.example` ghi sẵn giá trị theo nền tảng (chú thích trong file). Route BE **không** có tiền tố `/api`.

Lưu ý: HTTP cleartext (không TLS) có thể bị chặn trên thiết bị thật và cần cấu hình riêng trong `app.json`/native; đây chỉ là ghi chú, chưa áp dụng trong repo.

## Phạm vi

Xem `docs/product/PRODUCT_SCOPE.md`, `docs/architecture/FRONTEND_FOUNDATION.md`, `docs/design/DESIGN_COLLABORATION.md` và `docs/coordination/` trước khi phát triển feature. Team frontend gồm FE Lead, frontend engineers và Product UI Designer.

## Trạng thái

Đây là foundation MVP gồm navigation, screen skeleton, domain types, API client/token storage, AppState evidence và proof-of-concept cây bằng Skia. Auth, Work Items và Sessions Start/Events đã được handoff contract; M3_01/M3_02 có review PASS theo handoff mới nhất. FE chưa tích hợp runtime và chưa xác nhận API base URL, test account hoặc smoke test trên nền tảng mục tiêu. Xem [trạng thái tích hợp backend](docs/coordination/BACKEND_INTEGRATION_STATUS.md) để biết các contract còn thiếu và điều kiện môi trường.

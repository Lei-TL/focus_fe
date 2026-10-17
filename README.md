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

## Phạm vi

Xem `docs/product/PRODUCT_SCOPE.md`, `docs/architecture/FRONTEND_FOUNDATION.md`, `docs/design/DESIGN_COLLABORATION.md` và `docs/coordination/` trước khi phát triển feature. Team frontend gồm FE Lead, frontend engineers và Product UI Designer.

## Trạng thái

Đây là foundation MVP gồm navigation, screen skeleton, domain types, API client/token storage, AppState evidence và proof-of-concept cây bằng Skia. Auth, Work Items và Sessions Start/Events đã được handoff contract; M3_01/M3_02 có review PASS theo handoff mới nhất. FE chưa tích hợp runtime và chưa xác nhận API base URL, test account hoặc smoke test trên nền tảng mục tiêu. Xem [trạng thái tích hợp backend](docs/coordination/BACKEND_INTEGRATION_STATUS.md) để biết các contract còn thiếu và điều kiện môi trường.

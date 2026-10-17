# Cách Product UI Designer phối hợp trong team frontend

Team frontend của Focus gồm FE Lead, frontend engineers và Product UI Designer. Designer tham gia từ lúc làm rõ yêu cầu và hợp đồng dữ liệu, không chỉ nhận việc ở bước trang trí giao diện.

## Trách nhiệm của Designer

- Xây user flow và information architecture cho 5 cụm màn hình MVP.
- Thiết kế wireframe, prototype và design system dùng chung.
- Mô tả đầy đủ trạng thái loading, empty, validation, permission, conflict, offline, timeout và recovery.
- Xác định component behavior, content hierarchy, copy, accessibility intent và acceptance criteria về trải nghiệm.
- Review implementation cùng frontend engineers trước khi đóng task.

## Trách nhiệm của FE Lead

- Chuyển mục tiêu sản phẩm và thiết kế thành architecture, backlog và ranh giới module.
- Review tính khả thi của thiết kế trên Android và iOS trước khi handoff được khóa.
- Bảo đảm design token và component variants ánh xạ nhất quán vào code.
- Đưa Designer vào contract review khi shape dữ liệu, latency hoặc error semantics ảnh hưởng đến UX.
- Điều phối review ba bên Designer, FE và BE cho các critical flow.

## Gói handoff tối thiểu

Mỗi màn hình hoặc flow cần có:

1. Mục tiêu người dùng và entry exit points.
2. Wireframe hoặc mockup đã duyệt.
3. Component và token được sử dụng.
4. Dữ liệu đầu vào, giới hạn độ dài, enum và format.
5. Tất cả trạng thái giao diện và hành vi retry recovery.
6. Interaction notes cho timer, background, reconnect và destructive action.
7. Acceptance criteria có thể kiểm thử.

## Khi nào cần BE tham gia

Designer và FE Lead cần BE xác nhận trước khi khóa giao diện nếu màn hình phụ thuộc vào server time, concurrency, pagination, permission, idempotency, error code, timeout, dữ liệu cây tháng hoặc payload khôi phục phiên.

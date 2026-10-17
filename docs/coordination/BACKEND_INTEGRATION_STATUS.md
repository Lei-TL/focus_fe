# Trạng thái tích hợp backend

## Handoff và review contract

Các trạng thái dưới đây ghi nhận handoff mới nhất do người dùng cung cấp trong project context. Handoff/review không đồng nghĩa với việc FE đã tích hợp hoặc môi trường API đã sẵn sàng.

| Phạm vi | Handoff contract | Review contract | Tình trạng FE |
|---|---|---|---|
| Auth và profile | Đã handoff | Chưa có trạng thái review mới trong handoff hiện tại | Chưa tích hợp runtime |
| Work Items | Đã handoff | Chưa có trạng thái review mới trong handoff hiện tại | Chưa tích hợp runtime |
| Sessions Start/Events | Đã handoff | M3_01/M3_02: PASS theo handoff mới nhất | Chưa tích hợp runtime |

## Môi trường và kiểm chứng runtime

Các điều kiện triển khai và smoke test vẫn chưa được xác nhận:

- Chưa có API base URL dùng được cho FE.
- Chưa xác nhận kết nối từ Android/iOS target platform tới môi trường API.
- Chưa có test account và dữ liệu test được xác nhận.
- Chưa có bằng chứng smoke test từ môi trường đã deploy.

Không xem contract handoff hoặc review PASS là bằng chứng API đã deploy hay FE có thể kết nối.

## Contract Sessions còn thiếu

Handoff hiện tại chỉ bao gồm Start/Events. Chưa có xác nhận contract cho:

- End session.
- Khôi phục phiên hiện tại sau khi mở lại ứng dụng.
- API chi tiết và truy vấn lịch sử/phân trang cần cho màn History.

Không tuyên bố lifecycle Sessions hoàn chỉnh cho đến khi các contract cần thiết được handoff/review và runtime được xác nhận.

## WorkItem ranking gap

Mock FE hiện dùng `priorityScore` và `priorityExplanation`, nhưng hai field này không có trong contract WorkItem đã kiểm tra. FE/BE cần quyết định nguồn tính ranking và contract trả về trước khi trình bày kết quả ưu tiên như dữ liệu server-backed. Không tự suy diễn ranking từ contract hiện tại.

## Nguyên tắc tích hợp

- Server time là nguồn chuẩn.
- Mỗi user tối đa một phiên chạy theo contract hiện có.
- FE chỉ kết luận thành công sau response xác nhận; retry cần tuân thủ idempotency contract.
- Dữ liệu mẫu không được hiển thị như dữ liệu server khi request thất bại.

# Focus mobile — phạm vi sản phẩm

Tài liệu này chắt lọc từ đề cương v1, bản PDF đăng ký, slide `DeCuong_Focus_v3` và đối chiếu với trạng thái backend hiện tại.

## Mục tiêu

Ứng dụng mobile Android/iOS dành cho sinh viên ngành phần mềm và lập trình viên, giúp quản lý WorkItem, chạy phiên tập trung có bằng chứng, đánh giá chất lượng và trực quan hóa tiến bộ bằng cây tháng.

## Vòng lặp MVP bắt buộc

1. Tạo WorkItem với loại SDLC và độ phức tạp.
2. Ước lượng số phiên.
3. Xếp thứ tự ưu tiên có giải thích.
4. Bắt đầu phiên; thời gian server là nguồn chuẩn.
5. Gửi heartbeat và bằng chứng AppState/chuyển nền.
6. Kết thúc phiên; backend tính thời gian hiệu dụng và điểm chất lượng.
7. Cập nhật cây tháng từ dữ liệu phiên.
8. Đóng WorkItem, ghi số phiên thực tế để phản hồi sai số ước lượng.

## Năm cụm màn hình

- Đăng ký/đăng nhập và hồ sơ.
- Danh sách WorkItem đã xếp hạng, có giải thích và bộ lọc.
- Phiên tập trung: bộ đếm, heartbeat, cây tiến độ.
- Lịch sử phiên: thời gian hiệu dụng, điểm chất lượng, trạng thái.
- Thống kê và vườn cây theo tháng.

## Quy tắc cây tháng

- Nhánh chính: WorkItem đã đóng.
- Lá: phiên hợp lệ.
- Kích thước lá: điểm chất lượng.
- Độ dày thân: chuỗi ngày liên tục.
- Màu tán: loại WorkItem chiếm tỷ trọng lớn nhất.
- Chỉ lưu dữ liệu/seed; hình cây là hàm thuần và có thể tái tạo.

## Ngoài MVP

- Extension VS Code.
- SignalR/realtime nâng cao.
- Hoạt ảnh Rive/Lottie nâng cao.
- ML.NET trước khi baseline thống kê và vòng dữ liệu khép kín ổn định.
- Web app.

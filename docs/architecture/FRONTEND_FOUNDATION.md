# Nền tảng frontend

## Lựa chọn đã chốt

- React Native + Expo SDK 57, TypeScript strict.
- Expo Router cho file-based routing; bên dưới sử dụng React Navigation.
- Axios cho HTTP và interceptor bearer token.
- Hiện trạng code đang dùng AsyncStorage cho bootstrap token MVP. Quyết định đích cho Auth: refresh token lưu bằng Expo SecureStore trên Android/iOS (không requireAuthentication, không biometric, không fallback AsyncStorage); access token chỉ giữ trong memory (không AsyncStorage/SecureStore/log); AsyncStorage chỉ dùng để xóa key legacy `focus.accessToken`, không lưu token mới.
- AppState để thu bằng chứng foreground/background.
- React Native Skia để dựng cây từ dữ liệu và seed.

## Ranh giới trách nhiệm

Product UI Designer sở hữu user flow, information architecture, design system, component behavior và các trạng thái trải nghiệm. Frontend engineers hiện thực thiết kế, quản lý state, navigation, hiệu năng và client resilience. FE Lead điều phối hai nhóm công việc và cùng BE Lead chốt contract.

FE hiển thị thời gian dựa trên mốc server và gửi heartbeat/bằng chứng. BE quyết định phiên hợp lệ, thời gian hiệu dụng, chất lượng, xếp hạng và trạng thái cuối cùng. Designer và FE không tự suy diễn các giá trị này thành sự thật nghiệp vụ.

## Cấu trúc

- `src/app`: Expo Router route và layout; mọi file ở đây được xem là route/layout, nên module không phải route để bên ngoài.
- `src/components/layout`: primitive bố cục dùng chung như `Screen`.
- `src/components/ui`: primitive trình bày dùng chung như `Card`.
- `src/core/api`: HTTP client, cấu hình và concern ở tầng transport; không đặt product workflow ở đây.
- `src/data`: nội dung tĩnh và fixture cục bộ; không dùng làm fallback ngầm cho dữ liệu API lỗi.
- `src/domain`: thuật ngữ và kiểu dữ liệu nghiệp vụ.
- `src/theme`: design tokens và định nghĩa theme.
- `docs`: phạm vi, kiến trúc và phối hợp FE–BE.
- `docs/design`: quy trình design handoff và phối hợp Designer–FE–BE.

Chỉ thêm `src/context` khi có provider thực sự dùng xuyên màn hình; `src/hooks` cho React hooks tái sử dụng; `src/services` khi có workflow ứng dụng cần phối hợp domain và infrastructure; `src/utils` cho helper nhỏ, thuần và dùng chung. Không tạo thư mục rỗng để khớp sơ đồ. `src/assets` chỉ dùng nếu có asset thuộc source cần nhóm tại đó. Thư mục root `assets/` tiếp tục chứa asset được Expo app config tham chiếu như icon/splash; không chuyển các asset này theo sơ đồ source.

## Biến môi trường

Sao chép `.env.example` thành `.env` và đặt `EXPO_PUBLIC_API_URL` theo môi trường chạy. Với Android emulator, không dùng `localhost` để trỏ về máy host.

import { isAxiosError } from 'axios';

// Maps HTTP outcomes to user copy. Branching is by status code only; the BE's
// human-readable message text is never inspected for control flow.
export function authErrorMessage(error: unknown): string {
  if (isAxiosError(error)) {
    const status = error.response?.status;
    if (status === 400) {
      return 'Thông tin chưa hợp lệ. Vui lòng kiểm tra lại.';
    }
    if (status === 401) {
      return 'Email hoặc mật khẩu không đúng.';
    }
    if (status === 409) {
      return 'Email này đã được đăng ký.';
    }
    if (status === 429) {
      return 'Bạn thao tác quá nhanh. Vui lòng thử lại sau.';
    }
    if (!error.response) {
      return 'Không kết nối được máy chủ. Vui lòng thử lại.';
    }
  }
  return 'Đã có lỗi xảy ra. Vui lòng thử lại.';
}

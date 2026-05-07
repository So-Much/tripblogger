import type { AxiosError } from 'axios';
import { isAxiosError } from 'axios';

export function formatApiError(error: unknown, fallback: string): string {
  if (isAxiosError(error)) {
    const ax = error as AxiosError<{ message?: string | string[] }>;
    const code = ax.code;
    const noResponseData = typeof ax.response?.data !== 'object' || ax.response?.data === null;

    if (code === 'ERR_NETWORK' || code === 'ECONNABORTED' || ax.message?.toLowerCase().includes('network')) {
      return 'Không kết nối được server. Kiểm tra máy chủ đang chạy (API) và khi dùng điện thoại qua Expo, URL không thể là localhost — ứng dụng đã tự đổi sang IP của máy chạy Metro khi được.';
    }

    if (typeof ax.response?.data === 'object' && ax.response.data && 'message' in ax.response.data) {
      const msg = ax.response.data.message;
      if (typeof msg === 'string') return msg;
      if (Array.isArray(msg)) return msg.join(', ');
    }

    const statusLine = ax.response?.status ? ` (${ax.response.status})` : '';

    return noResponseData && typeof ax.response?.status === 'number'
      ? `Lỗi server${statusLine}`
      : (ax.response?.statusText ?? ax.message ?? fallback);
  }

  if (error instanceof Error) return error.message;
  return fallback;
}

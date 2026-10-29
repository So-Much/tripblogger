import type { AxiosError } from 'axios';
import { isAxiosError } from 'axios';
import { useSettingsStore } from '@/src/store/settings.store';

type Lang = 'vi' | 'en';

const KNOWN_MESSAGES: Record<string, { vi: string; en: string }> = {
  'Username already exists': {
    vi: 'Tên đăng nhập đã tồn tại. Hãy chọn tên khác hoặc đăng nhập.',
    en: 'That username is already taken. Try another or sign in.',
  },
  'Password confirmation does not match': {
    vi: 'Mật khẩu nhập lại không khớp.',
    en: 'Password confirmation does not match.',
  },
  'Invalid credentials': {
    vi: 'Sai tên đăng nhập hoặc mật khẩu.',
    en: 'Incorrect username or password.',
  },
  'User is banned': {
    vi: 'Tài khoản đã bị khóa. Liên hệ hỗ trợ nếu cần.',
    en: 'This account is banned. Contact support if you need help.',
  },
  'Invalid refresh token': {
    vi: 'Phiên đăng nhập hết hạn. Vui lòng đăng nhập lại.',
    en: 'Your session expired. Please sign in again.',
  },
  'Refresh session is invalid': {
    vi: 'Phiên đăng nhập không còn hiệu lực. Vui lòng đăng nhập lại.',
    en: 'Your session is no longer valid. Please sign in again.',
  },
  'Invalid Google token': {
    vi: 'Đăng nhập Google thất bại. Thử lại hoặc dùng tên đăng nhập.',
    en: 'Google sign-in failed. Try again or use your username.',
  },
  'User not found': {
    vi: 'Không tìm thấy tài khoản.',
    en: 'Account not found.',
  },
  'Guest session not found': {
    vi: 'Phiên khách không còn hiệu lực. Thử lại.',
    en: 'Guest session expired. Please try again.',
  },
};

function localizeKnown(message: string, language: Lang): string | null {
  const exact = KNOWN_MESSAGES[message];
  if (exact) return exact[language];

  const lower = message.toLowerCase();
  if (lower.includes('username already exists') || lower.includes('already exists')) {
    return KNOWN_MESSAGES['Username already exists'][language];
  }
  if (lower.includes('invalid credentials')) {
    return KNOWN_MESSAGES['Invalid credentials'][language];
  }
  if (lower.includes('invalid google') || lower.includes('google token')) {
    return KNOWN_MESSAGES['Invalid Google token'][language];
  }
  if (lower.includes('user not found')) {
    return KNOWN_MESSAGES['User not found'][language];
  }
  if (lower.includes('guest session')) {
    return KNOWN_MESSAGES['Guest session not found'][language];
  }
  if (lower.includes('banned')) {
    return KNOWN_MESSAGES['User is banned'][language];
  }
  if (lower.includes('password confirmation') || lower.includes('does not match')) {
    return KNOWN_MESSAGES['Password confirmation does not match'][language];
  }
  if (lower.includes('refresh')) {
    return KNOWN_MESSAGES['Refresh session is invalid'][language];
  }
  return null;
}

function extractMessage(data: unknown): string | null {
  if (!data || typeof data !== 'object') return null;
  if (!('message' in data)) return null;
  const msg = (data as { message?: unknown }).message;
  if (typeof msg === 'string' && msg.trim()) return msg.trim();
  if (Array.isArray(msg)) {
    const parts = msg.filter((m): m is string => typeof m === 'string' && m.trim().length > 0);
    return parts.length ? parts.join(', ') : null;
  }
  return null;
}

export function formatApiError(error: unknown, fallback: string): string {
  const language = (useSettingsStore.getState().language === 'en' ? 'en' : 'vi') as Lang;

  if (isAxiosError(error)) {
    const ax = error as AxiosError<{ message?: string | string[] }>;
    const code = ax.code;
    const noResponseData = typeof ax.response?.data !== 'object' || ax.response?.data === null;

    if (
      code === 'ERR_NETWORK' ||
      code === 'ECONNABORTED' ||
      ax.message?.toLowerCase().includes('network')
    ) {
      return language === 'en'
        ? 'Cannot reach the server. Check that the API is running. On a physical device via Expo, localhost will not work — the app uses your Metro host IP when possible.'
        : 'Không kết nối được server. Kiểm tra máy chủ đang chạy (API) và khi dùng điện thoại qua Expo, URL không thể là localhost — ứng dụng đã tự đổi sang IP của máy chạy Metro khi được.';
    }

    const raw = extractMessage(ax.response?.data);
    if (raw) {
      return localizeKnown(raw, language) ?? raw;
    }

    // Map common HTTP statuses when body has no message
    const status = ax.response?.status;
    if (status === 401) {
      return KNOWN_MESSAGES['Invalid credentials'][language];
    }
    if (status === 403) {
      return language === 'en'
        ? 'You do not have permission to do that.'
        : 'Bạn không có quyền thực hiện thao tác này.';
    }
    if (status === 409) {
      return KNOWN_MESSAGES['Username already exists'][language];
    }

    const statusLine = status ? ` (${status})` : '';
    return noResponseData && typeof status === 'number'
      ? language === 'en'
        ? `Server error${statusLine}`
        : `Lỗi server${statusLine}`
      : (ax.response?.statusText ?? ax.message ?? fallback);
  }

  if (error instanceof Error) {
    return localizeKnown(error.message, language) ?? error.message;
  }
  return fallback;
}

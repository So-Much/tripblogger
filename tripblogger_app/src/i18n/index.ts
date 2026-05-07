import { useSettingsStore } from '@/src/store/settings.store';

const vi = {
  tabHome: 'Trang chủ',
  tabSettings: 'Cài đặt',
  settingsTitle: 'Cài đặt',
  settingsSubtitle: 'Quản lý hồ sơ, ngôn ngữ và giao diện ứng dụng.',
  profileSection: 'Hồ sơ',
  profileGuestHint: 'Bạn đang ở chế độ khách. Đăng nhập để chỉnh sửa hồ sơ.',
  displayName: 'Tên hiển thị',
  avatarUrl: 'Avatar URL',
  saveProfile: 'Lưu hồ sơ',
  languageSection: 'Ngôn ngữ',
  languageVi: 'Tiếng Việt',
  languageEn: 'English',
  themeSection: 'Giao diện',
  themeLight: 'Sáng',
  themeDark: 'Tối',
  themeSystem: 'Theo hệ thống',
  accountSection: 'Tài khoản',
  login: 'Đăng nhập',
  register: 'Đăng ký',
  logout: 'Đăng xuất',
  continueGuest: 'Tiếp tục dạng khách',
  homeToday: 'Hôm nay',
  homeSubtitleGuest: 'Khám phá bài viết du lịch và ưu đãi ngay.',
  homeSubtitleMember: 'Khám phá bài viết du lịch và ưu đãi dành cho bạn.',
  loginTitle: 'Chào mừng quay lại',
  loginHint: 'Đăng nhập để lưu hồ sơ và khám phá thêm deals.',
  loginWithGoogle: 'Tiếp tục với Google',
  registerTitle: 'Tạo tài khoản mới',
  registerHint: 'Đăng ký để mở profile và trải nghiệm đầy đủ tính năng.',
  backHome: 'Về trang chủ',
  username: 'Username',
  password: 'Mật khẩu',
  confirmPassword: 'Nhập lại mật khẩu',
} as const;

const en: typeof vi = {
  tabHome: 'Home',
  tabSettings: 'Settings',
  settingsTitle: 'Settings',
  settingsSubtitle: 'Manage profile, language and app appearance.',
  profileSection: 'Profile',
  profileGuestHint: 'You are browsing as guest. Sign in to edit profile.',
  displayName: 'Display name',
  avatarUrl: 'Avatar URL',
  saveProfile: 'Save profile',
  languageSection: 'Language',
  languageVi: 'Vietnamese',
  languageEn: 'English',
  themeSection: 'Theme',
  themeLight: 'Light',
  themeDark: 'Dark',
  themeSystem: 'System',
  accountSection: 'Account',
  login: 'Login',
  register: 'Register',
  logout: 'Logout',
  continueGuest: 'Continue as guest',
  homeToday: 'Today',
  homeSubtitleGuest: 'Discover travel posts and deals now.',
  homeSubtitleMember: 'Discover travel posts and personalized deals.',
  loginTitle: 'Welcome back',
  loginHint: 'Sign in to save profile and unlock more deals.',
  loginWithGoogle: 'Continue with Google',
  registerTitle: 'Create account',
  registerHint: 'Create an account to unlock full experience.',
  backHome: 'Back home',
  username: 'Username',
  password: 'Password',
  confirmPassword: 'Confirm password',
};

const dict = { vi, en };

export type TranslationKey = keyof typeof vi;

export function useI18n() {
  const language = useSettingsStore((s) => s.language);
  const t = (key: TranslationKey) => dict[language][key];
  return { t, language };
}


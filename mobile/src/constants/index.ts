/**
 * Mobile app constants — UI strings, polling intervals, magic numbers.
 *
 * Pure values, no runtime deps. Imported by screens + hooks.
 */

/** Polling interval for owner orders list (15s, AppState-aware). */
export const ORDERS_POLL_INTERVAL_MS = 15_000;

/** Splash screen fade-out delay (ms). */
export const SPLASH_FADE_MS = 250;

/** Default page size used by list screens. */
export const DEFAULT_PAGE_SIZE = 20;

/** Secure-store key for the auth session token. */
export const SECURE_STORE_SESSION_KEY = 'smart-menu-session-token';

/** Secure-store key for the cached auth user. */
export const SECURE_STORE_USER_KEY = 'smart-menu-user';

/** Toast visibility duration (ms). */
export const TOAST_DURATION_MS = 3500;

/** Arabic UI strings used in multiple screens. */
export const STRINGS = {
        loading: 'جاري التحميل…',
        retry: 'إعادة المحاولة',
        empty: 'لا توجد بيانات',
        errorTitle: 'حدث خطأ',
        logout: 'تسجيل الخروج',
        login: 'تسجيل الدخول',
        save: 'حفظ',
        cancel: 'إلغاء',
        confirm: 'تأكيد',
        back: 'رجوع',
        menu: 'المنيو',
        orders: 'الطلبات',
        dashboard: 'لوحة التحكم',
        settings: 'الإعدادات',
} as const;

/** Local routes that should NOT show the back button (root tabs). */
export const ROOT_ROUTES = [
        'OwnerDashboard',
        'OwnerOrders',
        'OwnerMenu',
        'AdminDashboard',
        'AdminRestaurants',
        'AdminUsers',
] as const;

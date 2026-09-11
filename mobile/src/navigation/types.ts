/**
 * Navigation route param types + shared types for React Navigation v7.
 *
 * Kept in one place so all stacks + linking config stay in sync. The actual
 * stack/screen definitions live in their own files (PublicStack.tsx etc.).
 *
 * r101: param shapes synced to the runtime contracts that the screens and
 * per-stack local types already use (orderId not id, Menu carries ref?,
 * OrderConfirmed carries orderId, subscribe flow registered on AuthStack).
 */
import type { RouteProp, NavigationProp } from '@react-navigation/native';

export type PublicStackParamList = {
        Landing: undefined;
        Login: undefined;
        Menu: { slug: string; ref?: string };
        Pricing: undefined;
        OrderConfirmed: { orderId?: string };
        Terms: undefined;
        Privacy: undefined;
};

export type AuthStackParamList = {
        Login: undefined;
        SubscribePlan: undefined;
        SubscribeMenu: undefined;
        SubscribePayment: { planId: number };
};

/** Owner bottom-tab screens (inside the OwnerTabs navigator). */
export type OwnerTabsParamList = {
        OwnerDashboard: undefined;
        OwnerOrders: undefined;
        OwnerMenu: undefined;
        OwnerLoyalty: undefined;
        OwnerSettingsTab: undefined;
};

/** Owner push screens (above the tab navigator). */
export type OwnerStackParamList = {
        OwnerTabs: undefined;
        OwnerOrderDetail: { orderId: number };
        OwnerRestaurants: undefined;
        OwnerQr: undefined;
        OwnerReviews: undefined;
        OwnerSettings: undefined;
};

/** Admin bottom-tab screens (inside the AdminTabs navigator). */
export type AdminTabsParamList = {
        AdminDashboard: undefined;
        AdminRestaurants: undefined;
        AdminUsers: undefined;
        AdminOrders: undefined;
        AdminSubscriptions: undefined;
        AdminSettings: undefined;
};

/** Admin push screens (above the tab navigator). */
export type AdminStackParamList = {
        AdminTabs: undefined;
        AdminAdmins: undefined;
        AdminOrderDetail: { orderId: number };
        AdminSystemEvents: undefined;
        AdminAuditLogs: undefined;
        AdminTelegram: undefined;
};

/** Root union — used by the linking config so deep links resolve correctly. */
export type RootStackParamList = PublicStackParamList &
        AuthStackParamList &
        OwnerStackParamList &
        OwnerTabsParamList &
        AdminStackParamList &
        AdminTabsParamList;

/** Generic navigation prop typed against the root union — safe for
 *  cross-navigator `navigate(...)` calls from any screen. */
export type RootNavigation = NavigationProp<RootStackParamList>;

export type PublicRoute<T extends keyof PublicStackParamList> = RouteProp<PublicStackParamList, T>;
export type OwnerRoute<T extends keyof OwnerStackParamList> = RouteProp<OwnerStackParamList, T>;
export type AdminRoute<T extends keyof AdminStackParamList> = RouteProp<AdminStackParamList, T>;

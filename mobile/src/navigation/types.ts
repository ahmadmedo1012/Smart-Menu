/**
 * Navigation route param types + shared types for React Navigation v7.
 *
 * Kept in one place so all stacks + linking config stay in sync. The actual
 * stack/screen definitions live in their own files (PublicStack.tsx etc.).
 */
import type { RouteProp } from '@react-navigation/native';

export type PublicStackParamList = {
        Landing: undefined;
        Login: undefined;
        Menu: { slug: string };
        Pricing: undefined;
        OrderConfirmed: { orderNo?: string };
        Terms: undefined;
        Privacy: undefined;
};

export type AuthStackParamList = {
        Login: undefined;
};

/** Owner bottom-tab screens (inside the OwnerTabs navigator). */
export type OwnerTabsParamList = {
        OwnerDashboard: undefined;
        OwnerOrders: undefined;
        OwnerMenu: undefined;
        OwnerLoyalty: undefined;
        OwnerSettings: undefined;
};

/** Owner push screens (above the tab navigator). */
export type OwnerStackParamList = {
        OwnerTabs: undefined;
        OwnerOrderDetail: { id: number };
        OwnerRestaurants: undefined;
        OwnerQr: undefined;
        OwnerReviews: undefined;
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
        AdminOrderDetail: { id: number };
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

export type PublicRoute<T extends keyof PublicStackParamList> = RouteProp<PublicStackParamList, T>;
export type OwnerRoute<T extends keyof OwnerStackParamList> = RouteProp<OwnerStackParamList, T>;
export type AdminRoute<T extends keyof AdminStackParamList> = RouteProp<AdminStackParamList, T>;

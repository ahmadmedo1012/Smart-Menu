/**
 * Shared Zod field constraints (round79 Stage D — merge of the د5 duplication).
 *
 * Username/password/name policy had drifted across 7 API routes:
 *   auth/register (min3+max30+msg) · auth/login (min1+msg) · admin/admins
 *   (min3+max50, no msg) · admin/create-owner (min3, no max/msg) · users/[id]
 *   (min1) · subscriptions/validate (min3+msg) · restaurants (min3).
 *
 * This module is now the single source. Behavior notes:
 * - Bounds are the STRICTEST previously-enforced policy (username 3–30,
 *   password 8–100, name 1–100) — tightening only, so no existing data or
 *   login flow is affected (validation runs on create/update input only).
 * - Arabic messages are now uniform everywhere (before: register/validate
 *   had them, admins/create-owner/users returned default English strings).
 */
import { z } from 'zod';
import { PASSWORD_MIN_LENGTH, PASSWORD_MIN_MESSAGE } from '@/lib/constants';

/* ---------- Username ---------- */

/** Credential policy: 3–30 chars. Shared by register / create-owner / admins / validate. */
export const usernameField = z
        .string()
        .min(3, 'اسم المستخدم يجب أن يكون 3 أحرف على الأقل')
        .max(30, 'اسم المستخدم يجب ألا يتجاوز 30 حرفًا');

/** Credential policy, optional (updates / partial validation). */
export const usernameOptional = usernameField.optional();

/** Presence check only — login and partial updates (existing accounts may predate the policy). */
export const usernamePresence = z.string().min(1, 'اسم المستخدم مطلوب').max(100, 'اسم المستخدم طويل جداً');

/** Presence check, optional. */
export const usernamePresenceOptional = usernamePresence.optional();

/* ---------- Password ---------- */

/** Credential policy: 8–100 chars. Shared by register / create-owner / admins. */
export const passwordField = z
        .string()
        .min(PASSWORD_MIN_LENGTH, PASSWORD_MIN_MESSAGE)
        .max(100, 'كلمة المرور يجب ألا تتجاوز 100 حرف');

/** Credential policy, optional (e.g. restaurant owner credentials on update). */
export const passwordOptional = z
        .string()
        .min(PASSWORD_MIN_LENGTH, PASSWORD_MIN_MESSAGE)
        .max(100, 'كلمة المرور يجب ألا تتجاوز 100 حرف')
        .optional();

/** Presence check only — login. */
export const passwordPresence = z.string().min(1, 'كلمة المرور مطلوبة');

/* ---------- Name ---------- */

/** Person/restaurant display name: 1–100 chars. */
export const nameField = z.string().min(1, 'الاسم مطلوب').max(100, 'الاسم يجب ألا يتجاوز 100 حرف');

/** Display name, optional. */
export const nameOptional = nameField.optional();

/* ---------- Slug (round97-X3 — menu slug policy unification) ---------- */

/**
 * Canonical menu-slug charset: lowercase latin, digits, hyphens.
 * Same regex the slug routes have always enforced inline (restaurants,
 * subscriptions/validate, restaurants/[id], settings, payment-schema) —
 * now exported from one place.
 */
export const SLUG_RE = /^[a-z0-9-]+$/;

/**
 * Normalize an incoming slug: trims surrounding whitespace ONLY.
 * Case and charset stay strict — "UPPER" or "bad_slug" still fail SLUG_RE
 * (the 422 contract the restaurants-create tests pin). Trimming is the one
 * safe leniency: a trailing-space paste used to 422, now it validates.
 */
export function normalizeSlug(s: string): string {
        return s.trim();
}

/**
 * Canonical slug field: 3–100 chars + SLUG_RE.
 * Min length aligned to the STRICTEST previously-enforced policy
 * (subscriptions/validate + payment-schema: min 3; restaurants POST used
 * to accept min 1 — tightening only, so no existing data is affected:
 * validation runs on create/update input only, same rule as the username
 * fields above). Messages mirror payment-schema.ts exactly (asserted by
 * payment-schema-caps.test.ts).
 */
export const slugField = z.preprocess(
        (v) => (typeof v === 'string' ? normalizeSlug(v) : v),
        z
                .string()
                .min(3, 'الرابط يجب أن يكون 3 أحرف على الأقل')
                .max(100, 'الرابط يجب ألا يتجاوز 100 حرف')
                .regex(SLUG_RE, 'الرابط يجب أن يحتوي على أحرف إنكليزية وأرقام فقط')
);

/** Slug field, optional (legacy single-menu create form). */
export const slugOptional = slugField.optional();

/* ---------- Restaurant canonical fields (r121-C4/C5/H4) ---------- */

/**
 * r121-C4/C5/H4 (X2 §3/§7): the canonical Restaurant column caps.
 *
 * The restaurants/[id] PUT schema (round87-A2) enforced these bounds, but two
 * parallel write channels bypassed them entirely: PUT /api/settings'
 * `restaurant_*` mirror writes (any value ≤ the 20k settings envelope) and
 * POST /api/restaurants' legacy single-form fields (bare `z.string()`).
 * name/description/phone/whatsapp/email/themeColor all ship in the PUBLIC
 * menu payload (`/api/public/menu/[slug]`), so this is payload hygiene, not
 * just row hygiene.
 *
 * Bounds are byte-identical to the round87-A2 schema (name 200 · description
 * 1000 · phone 30 · whatsapp 30 · email 254+format · address 300 ·
 * workingHours 500); themeColor/pickupTypes are new to the shared schema
 * (settings writes them — themeColor was unbounded, pickupTypes is the
 * comma-joined PickupType set {inside,takeaway,delivery}, DB column String).
 * Write-time validation only — stored oversized values stay grandfathered
 * (house policy, round97-X3).
 */
export const RESTAURANT_FIELD_LIMITS = {
        name: 200,
        description: 1000,
        phone: 30,
        whatsapp: 30,
        email: 254,
        address: 300,
        workingHours: 500,
        themeColor: 30,
} as const;

export const restaurantFieldSchema = z.object({
        name: z
                .string()
                .min(1, 'اسم المطعم مطلوب')
                .max(RESTAURANT_FIELD_LIMITS.name, 'اسم المطعم يجب ألا يتجاوز 200 حرف'),
        description: z.string().max(RESTAURANT_FIELD_LIMITS.description, 'الوصف يجب ألا يتجاوز 1000 حرف'),
        phone: z.string().max(RESTAURANT_FIELD_LIMITS.phone, 'رقم الهاتف يجب ألا يتجاوز 30 حرفًا'),
        whatsapp: z.string().max(RESTAURANT_FIELD_LIMITS.whatsapp, 'رقم الواتساب يجب ألا يتجاوز 30 حرفًا'),
        email: z
                .string()
                .max(RESTAURANT_FIELD_LIMITS.email, 'البريد الإلكتروني يجب ألا يتجاوز 254 حرفًا')
                .email('البريد الإلكتروني غير صالح'),
        address: z.string().max(RESTAURANT_FIELD_LIMITS.address, 'العنوان يجب ألا يتجاوز 300 حرف'),
        workingHours: z.string().max(RESTAURANT_FIELD_LIMITS.workingHours, 'ساعات العمل يجب ألا تتجاوز 500 حرف'),
        themeColor: z.string().max(RESTAURANT_FIELD_LIMITS.themeColor, 'لون المظهر يجب ألا يتجاوز 30 حرفًا'),
        pickupTypes: z
                .string()
                .regex(
                        /^(inside|takeaway|delivery)(,(inside|takeaway|delivery))*$/,
                        'أنواع الطلب غير صالحة — القيم المسموحة: داخل المحل، سفري، توصيل'
                ),
});

/* ---------- Pending-payment slug reservation (r121-C3) ---------- */

/**
 * Minimal structural type the reservation check needs — keeps this module
 * dependency-free so CLIENT components can import the schemas/limits above
 * (the owner settings page reads RESTAURANT_FIELD_LIMITS for its maxLength
 * shadow; a prisma import here would drag pg/node:crypto into the client
 * graph — the r121-A csrf-shared lesson).
 */
interface PendingSlugPaymentChecker {
        subscriptionPayment: {
                findFirst: (args: {
                        where: {
                                status: 'pending';
                                metadata: { path: ['tempRestaurants']; array_contains: { slug: string }[] };
                        };
                        select: { id: true };
                }) => Promise<{ id: number } | null>;
        };
}

/**
 * r121-C3 (X2 §2): is this slug held by a PENDING paid subscription
 * payment (`metadata.tempRestaurants[].slug`)?
 *
 * r103-F4 added this reservation to public self-registration, and it existed
 * inline in subscriptions POST + subscriptions/validate — but the three other
 * slug-write paths (restaurants/[id] PUT, owner/restaurants POST, settings'
 * `restaurant_slug` branch) checked only the Restaurant table. A slug snipe
 * re-created the payer dead-end: approval hits SLUG_TAKEN inside the tx
 * BEFORE the payment update, the payment stays pending forever and the payer
 * has no self-service retry («لديك طلب دفع معلق بالفعل»).
 *
 * Callers pass their route's prisma instance and return 409 «الرابط … محجوز
 * بطلب دفع معلق» — the copy the two original sites already used. One extra
 * indexed-ish findFirst per slug-changing write (rare; D-11 measured the scan
 * as immaterial).
 */
export async function isSlugHeldByPendingPayment(
        slug: string,
        db: PendingSlugPaymentChecker
): Promise<boolean> {
        const pending = await db.subscriptionPayment.findFirst({
                where: {
                        status: 'pending',
                        metadata: { path: ['tempRestaurants'], array_contains: [{ slug }] },
                },
                select: { id: true },
        });
        return pending !== null;
}

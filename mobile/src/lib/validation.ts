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

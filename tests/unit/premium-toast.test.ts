/**
 * Round89-D2 (D2-4) — unit coverage for src/lib/premium-toast.tsx (imported
 * by 33 call sites — a silent regression here breaks every toast in the app).
 *
 * The vitest environment is Node (no DOM/RTL), so the testable surface is the
 * module's pure contract: the toast.custom call, duration handling, the
 * render callback's React element tree (inspected without mounting —
 * createElement output is plain data), and the icon mapping. sonner and the
 * two animated motion icons are mocked so no UI runtime is needed.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockToastCustom = vi.hoisted(() => vi.fn());
const mockToastDismiss = vi.hoisted(() => vi.fn());

vi.mock('sonner', () => ({
        toast: {
                custom: mockToastCustom,
                dismiss: mockToastDismiss,
        },
}));
vi.mock('@/components/ui/x-icon', () => ({ default: () => null }));
vi.mock('@/components/ui/shopping-cart-icon', () => ({ default: () => null }));

const { premiumToast } = await import('@/lib/premium-toast');

// ── React element inspection helpers (no renderer needed) ───────────────

interface ReactElement {
        type: unknown;
        props: Record<string, unknown>;
}

function isElement(node: unknown): node is ReactElement {
        return (
                !!node &&
                typeof node === 'object' &&
                'type' in (node as Record<string, unknown>) &&
                'props' in (node as Record<string, unknown>)
        );
}

function collectStrings(node: unknown, out: string[] = []): string[] {
        if (typeof node === 'string') out.push(node);
        else if (Array.isArray(node)) node.forEach((n) => collectStrings(n, out));
        else if (isElement(node)) collectStrings(node.props.children, out);
        return out;
}

function findElements(node: unknown, pred: (el: ReactElement) => boolean, out: ReactElement[] = []): ReactElement[] {
        if (Array.isArray(node)) node.forEach((n) => findElements(n, pred, out));
        else if (isElement(node)) {
                if (pred(node)) out.push(node);
                findElements(node.props.children, pred, out);
        }
        return out;
}

/** Renders the custom-toast callback with a fake toast id and returns the root element (last registration). */
function renderToast(...args: Parameters<typeof premiumToast>) {
        premiumToast(...args);
        expect(mockToastCustom).toHaveBeenCalled();
        const renderFn = mockToastCustom.mock.calls.at(-1)![0] as (t: unknown) => ReactElement;
        const root = renderFn({ id: 42 });
        expect(isElement(root)).toBe(true);
        return root as ReactElement;
}

beforeEach(() => {
        vi.clearAllMocks();
});

describe('premiumToast — toast.custom call', () => {
        it('registers exactly one custom toast with the default 4000ms duration', () => {
                premiumToast('success', 'تم الحفظ');
                expect(mockToastCustom).toHaveBeenCalledTimes(1);
                const opts = mockToastCustom.mock.calls[0][1] as { duration?: number };
                expect(opts.duration).toBe(4000);
        });

        it('a custom duration passes through unchanged', () => {
                premiumToast('info', 'تنبيه', undefined, { duration: 9000 });
                const opts = mockToastCustom.mock.calls[0][1] as { duration?: number };
                expect(opts.duration).toBe(9000);
        });
});

describe('premiumToast — rendered element contract', () => {
        it('error toasts stay assertive: role=alert, no contradicting aria-live, dismiss-on-click', () => {
                const root = renderToast('error', 'فشل الحفظ', 'حاول مرة أخرى');
                expect(root.type).toBe('div');
                expect(root.props.role).toBe('alert');
                // r119-S5-P2 + r127-F3: the explicit aria-live stays REMOVED —
                // it contradicted the role's implicit live politeness. The
                // unambiguous contract is the role alone.
                expect(root.props['aria-live']).toBeUndefined();

                // clicking the toast body dismisses it (the t id from the callback)
                (root.props.onClick as () => void)();
                expect(mockToastDismiss).toHaveBeenCalledWith({ id: 42 });
        });

        // r127-F3 (K-10): assertiveness is tiered per kind — only destructive
        // outcomes (error/trash) interrupt with role=alert; every routine kind
        // (success/save/copy/info/cart/login/logout/star/gift/refresh) is
        // polite role=status. Pinned across ALL 12 kinds so a future change
        // can't silently re-blanket every toast as assertive.
        it.each([
                ['error', 'alert'],
                ['trash', 'alert'],
                ['success', 'status'],
                ['save', 'status'],
                ['copy', 'status'],
                ['info', 'status'],
                ['cart', 'status'],
                ['login', 'status'],
                ['logout', 'status'],
                ['star', 'status'],
                ['gift', 'status'],
                ['refresh', 'status'],
        ] as const)('kind "%s" renders role=%s (aria-live stays implicit)', (kind, role) => {
                const root = renderToast(kind, 'عنوان');
                expect(root.props.role).toBe(role);
                expect(root.props['aria-live']).toBeUndefined();
        });

        it('title and description are rendered as text', () => {
                const root = renderToast('save', 'تم الحفظ', 'سيظهر التعديل في المنيو');
                const texts = collectStrings(root);
                expect(texts).toContain('تم الحفظ');
                expect(texts).toContain('سيظهر التعديل في المنيو');
        });

        it('omitting the description renders the title only', () => {
                const root = renderToast('success', 'تم');
                const texts = collectStrings(root);
                expect(texts).toContain('تم');
                expect(texts).not.toContain('سيظهر التعديل');
                // exactly one <p> (title) — no description paragraph
                const paragraphs = findElements(root, (el) => el.type === 'p');
                expect(paragraphs).toHaveLength(1);
        });

        it('the close button is labeled «إغلاق» and dismisses without bubbling', () => {
                const root = renderToast('info', 'رسالة');
                const [button] = findElements(root, (el) => el.props['aria-label'] === 'إغلاق');
                expect(button).toBeDefined();
                expect(button.type).toBe('button');
                const stop = vi.fn();
                (button.props.onClick as (e: { stopPropagation: () => void }) => void)({ stopPropagation: stop });
                expect(stop).toHaveBeenCalled();
                expect(mockToastDismiss).toHaveBeenCalledWith({ id: 42 });
        });
});

describe('premiumToast — icon mapping (iconConfig keys)', () => {
        const ICONS = [
                'success', 'error', 'info', 'cart', 'login', 'logout',
                'star', 'gift', 'refresh', 'save', 'trash', 'copy',
        ] as const;

        it.each(ICONS)('icon "%s" renders a toast element', (icon) => {
                const root = renderToast(icon, 'عنوان');
                expect(isElement(root)).toBe(true);
                // the icon node is the first child of the alert container
                const iconEl = (root.props.children as ReactElement[])[0];
                expect(iconEl.props.icon).toBe(icon);
        });

        it('cart animates by default; other icons do not', () => {
                const cartRoot = renderToast('cart', 'أُضيف للسلة');
                const cartIconEl = (cartRoot.props.children as ReactElement[])[0];
                expect(cartIconEl.props.anim).toBe(true);

                const okRoot = renderToast('success', 'تم');
                const okIconEl = (okRoot.props.children as ReactElement[])[0];
                expect(okIconEl.props.anim).toBe(false);
        });

        it('anim can be forced off for the cart icon', () => {
                const root = renderToast('cart', 'أُضيف للسلة', undefined, { anim: false });
                const iconEl = (root.props.children as ReactElement[])[0];
                expect(iconEl.props.anim).toBe(false);
        });
});

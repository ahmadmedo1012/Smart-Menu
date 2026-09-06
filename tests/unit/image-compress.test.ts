/**
 * Round89-D2 (D2-4) — unit coverage for src/lib/image-compress.ts.
 *
 * Node-environment boundary (documented): this module is browser-only — it
 * needs Image, document.createElement('canvas') and canvas.toBlob, none of
 * which exist in bare Node (verified: typeof Image/document === 'undefined').
 * What IS testable without a real Canvas:
 *   - the no-DOM behavior (rejects, never throws synchronously)
 *   - the scaling arithmetic (min of maxDim/w, maxDim/h, 1) via a fake canvas
 *     that records width/height
 *   - the output format/quality passed to toBlob, and both failure branches
 * The DOM primitives are stubbed with minimal fakes; the pixel pipeline
 * (drawImage → JPEG encode) is the browser's job and stays to e2e.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

const { compressImage } = await import('@/lib/image-compress');

// ── Minimal DOM fakes ───────────────────────────────────────────────────

let loadMode: 'load' | 'error' = 'load';

const imageInstances: FakeImage[] = [];

class FakeImage {
        onload: (() => void) | null = null;
        onerror: (() => void) | null = null;
        width = 0;
        height = 0;
        private _src = '';

        constructor() {
                imageInstances.push(this);
        }

        set src(v: string) {
                this._src = v;
                queueMicrotask(() => (loadMode === 'load' ? this.onload?.() : this.onerror?.()));
        }

        get src() {
                return this._src;
        }
}

/** The image instance the module itself constructed (via new Image()). */
function moduleImage(): FakeImage {
        return imageInstances.at(-1)!;
}

interface FakeCanvas {
        width: number;
        height: number;
        getContext: () => { drawImage: ReturnType<typeof vi.fn> };
        toBlob: ReturnType<typeof vi.fn>;
}

const mockDrawImage = vi.fn();
const mockToBlob = vi.fn();
let lastCanvas: FakeCanvas;

function fakeDocumentCreateElement(tag: string): FakeCanvas {
        if (tag !== 'canvas') throw new Error(`unexpected createElement(${tag})`);
        lastCanvas = {
                width: 0,
                height: 0,
                getContext: () => ({ drawImage: mockDrawImage }),
                toBlob: mockToBlob,
        };
        return lastCanvas;
}

const file = () => new File(['fake-bytes'], 'photo.png', { type: 'image/png' });

/** Drives the fake async image load and returns the pending promise. */
function compress(w: number, h: number, maxDim?: number, quality?: number) {
        const p = compressImage(file(), maxDim, quality);
        // the module sets onload/onerror before assigning src — our microtask load
        // fires at the first await, so the dimensions exist by then (on the real
        // web API they are populated before onload runs).
        const img = moduleImage();
        img.width = w;
        img.height = h;
        return p;
}

beforeEach(() => {
        vi.clearAllMocks();
        loadMode = 'load';
        imageInstances.length = 0;

        // Node 24 ships URL.createObjectURL for File/Blob — spy on the real one
        vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:fake-url');
        vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});

        (globalThis as Record<string, unknown>).Image = FakeImage;
        (globalThis as Record<string, unknown>).document = { createElement: fakeDocumentCreateElement };

        // default toBlob: succeed with a fake blob, jpeg + default quality
        mockToBlob.mockImplementation((cb: (b: Blob | null) => void) => cb(new Blob(['j'])));
});

afterEach(() => {
        delete (globalThis as Record<string, unknown>).Image;
        delete (globalThis as Record<string, unknown>).document;
        vi.restoreAllMocks();
});

describe('compressImage — Node environment boundary', () => {
        it('without any DOM (bare Node) it rejects via the promise — never throws synchronously', async () => {
                delete (globalThis as Record<string, unknown>).Image;
                delete (globalThis as Record<string, unknown>).document;
                vi.restoreAllMocks();

                let caught: unknown = null;
                const p = compressImage(file()).catch((e: unknown) => {
                        caught = e;
                });
                expect(p).toBeInstanceOf(Promise);
                await p;
                // the Promise executor catches the missing-Image ReferenceError
                expect(caught).toBeInstanceOf(ReferenceError);
        });
});

describe('compressImage — scaling arithmetic (fake canvas)', () => {
        it('landscape 2400×1200 at maxDim 1200 → canvas 1200×600, image drawn at target size', async () => {
                const blob = await compress(2400, 1200);
                expect(blob).toBeInstanceOf(Blob);
                expect(lastCanvas.width).toBe(1200);
                expect(lastCanvas.height).toBe(600);
                expect(mockDrawImage).toHaveBeenCalledWith(moduleImage(), 0, 0, 1200, 600);
        });

        it('never upscales: 600×400 stays 600×400 (scale clamped at 1)', async () => {
                await compress(600, 400);
                expect(lastCanvas.width).toBe(600);
                expect(lastCanvas.height).toBe(400);
        });

        it('portrait 800×1600 at maxDim 1200 → bounded by the height (600×1200)', async () => {
                await compress(800, 1600);
                expect(lastCanvas.width).toBe(600);
                expect(lastCanvas.height).toBe(1200);
        });

        it('custom maxDim applies: 1600×1600 at 800 → 800×800', async () => {
                await compress(1600, 1600, 800);
                expect(lastCanvas.width).toBe(800);
                expect(lastCanvas.height).toBe(800);
        });
});

describe('compressImage — output encoding', () => {
        it('encodes as JPEG at the default 0.7 quality', async () => {
                await compress(100, 100);
                expect(mockToBlob).toHaveBeenCalledTimes(1);
                const [, type, quality] = mockToBlob.mock.calls[0] as [unknown, string, number];
                expect(type).toBe('image/jpeg');
                expect(quality).toBe(0.7);
        });

        it('a custom quality passes through to the encoder', async () => {
                await compress(100, 100, 1200, 0.5);
                const [, , quality] = mockToBlob.mock.calls[0] as [unknown, string, number];
                expect(quality).toBe(0.5);
        });
});

describe('compressImage — failure branches', () => {
        it('image decode error → rejects with the Arabic «فشل قراءة الصورة»', async () => {
                loadMode = 'error';
                await expect(compress(100, 100)).rejects.toThrow('فشل قراءة الصورة');
        });

        it('toBlob returning null → rejects with the encode failure message', async () => {
                mockToBlob.mockImplementation((cb: (b: Blob | null) => void) => cb(null));
                await expect(compress(100, 100)).rejects.toThrow('Image compress failed');
        });
});

describe('compressImage — object URL lifecycle', () => {
        it('the object URL is created from the file and revoked after load', async () => {
                const f = file();
                const p = compressImage(f);
                const img = moduleImage();
                img.width = 100;
                img.height = 100;
                await p;
                expect(URL.createObjectURL).toHaveBeenCalledWith(f);
                expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:fake-url');
        });
});

/**
 * r109-F9 regression lock: the required ⇄ minSelect invariant on the WRITE
 * path (src/lib/modifier-schema.ts modifierGroupCreateInput).
 *
 * Live-proven defect (r108, ORD-MU31MBIC-B14E7AA1): the owner builder let
 * «إلزامية» (required:true) save with minSelect:0 — the PUBLIC dialog
 * enforces minSelect>0 ONLY (menu-types.validateModifierGroups), so the group
 * rendered «اختياري» and orders were accepted without the required modifier.
 *
 * The invariant (both items POST and PUT funnel through this mapping):
 *   required:true  + minSelect<1  → minSelect becomes 1 (enforced)
 *   required unset + minSelect>0  → required becomes true (coherent)
 *   required:false + minSelect 0  → stays optional
 */
import { describe, it, expect } from "vitest";
import { modifierGroupCreateInput } from '@/lib/modifier-schema';

const base = {
        nameAr: 'الحجم',
        options: [{ nameAr: 'صغير' }],
};

describe('r109-F9: modifierGroupCreateInput required ⇄ minSelect invariant', () => {
        it('required:true with minSelect:0 (the r108 defect) → minSelect enforced to 1', () => {
                const out = modifierGroupCreateInput({ ...base, required: true, minSelect: 0 });
                expect(out.minSelect).toBe(1);
                expect(out.required).toBe(true);
        });

        it('required:true with minSelect undefined → minSelect enforced to 1', () => {
                const out = modifierGroupCreateInput({ ...base, required: true });
                expect(out.minSelect).toBe(1);
                expect(out.required).toBe(true);
        });

        it('required:true with an explicit minSelect>1 keeps the owner\u2019s value', () => {
                const out = modifierGroupCreateInput({ ...base, required: true, minSelect: 2 });
                expect(out.minSelect).toBe(2);
                expect(out.required).toBe(true);
        });

        it('minSelect>0 without an explicit required → required derived true', () => {
                const out = modifierGroupCreateInput({ ...base, minSelect: 1 });
                expect(out.required).toBe(true);
                expect(out.minSelect).toBe(1);
        });

        it('optional group (required:false, minSelect:0/undefined) stays optional', () => {
                expect(modifierGroupCreateInput({ ...base, required: false, minSelect: 0 }).required).toBe(false);
                expect(modifierGroupCreateInput({ ...base }).required).toBe(false);
                expect(modifierGroupCreateInput({ ...base }).minSelect).toBe(0);
        });
});

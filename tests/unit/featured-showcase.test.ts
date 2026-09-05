/**
 * Round80 (3.5) — rankFeatured selection logic tests.
 * FeaturedShowcase renders `null` exactly when rankFeatured(items) is empty,
 * so the "zero featured items → section hidden" behavior is driven by this
 * pure function (the visual hiding itself is proven by the round80 Phase-1
 * e2e edge-case gate on /menu/al-aseel).
 */
import { describe, it, expect } from 'vitest';
import { rankFeatured, type FeaturedItem } from '@/components/menu/FeaturedShowcase';

const item = (over: Partial<FeaturedItem>): FeaturedItem => ({
  id: 1,
  name: 'item',
  nameAr: null,
  description: '',
  descriptionAr: '',
  price: 10,
  discountedPrice: null,
  image: '',
  sortOrder: 0,
  ...over,
});

describe('rankFeatured — zero featured (section hidden)', () => {
  it('empty input → empty output (section renders null)', () => {
    expect(rankFeatured([])).toEqual([]);
  });
  it('all isFeatured:false → empty output (section hidden)', () => {
    const items = [
      item({ id: 1, isFeatured: false }),
      item({ id: 2, isFeatured: false }),
      item({ id: 3 }),
    ];
    expect(rankFeatured(items)).toEqual([]);
  });
  it('isFeatured:false with rank/tag set still excluded (flag is the selector)', () => {
    const items = [item({ id: 1, isFeatured: false, featuredRank: 1, showcaseTag: 'x' })];
    expect(rankFeatured(items)).toEqual([]);
  });
});

describe('rankFeatured — selection + ordering', () => {
  it('featuredRank 1 comes before 2 and 3', () => {
    const out = rankFeatured([
      item({ id: 3, isFeatured: true, featuredRank: 3 }),
      item({ id: 1, isFeatured: true, featuredRank: 1 }),
      item({ id: 2, isFeatured: true, featuredRank: 2 }),
    ]);
    expect(out.map((i) => i.id)).toEqual([1, 2, 3]);
  });
  it('null ranks fall back to sortOrder after ranked items', () => {
    const out = rankFeatured([
      item({ id: 9, isFeatured: true, featuredRank: null, sortOrder: 1 }),
      item({ id: 5, isFeatured: true, featuredRank: 2, sortOrder: 50 }),
      item({ id: 8, isFeatured: true, featuredRank: null, sortOrder: 0 }),
    ]);
    expect(out.map((i) => i.id)).toEqual([5, 8, 9]);
  });
  it('unranked ties sort by ascending sortOrder', () => {
    const out = rankFeatured([
      item({ id: 2, isFeatured: true, sortOrder: 7 }),
      item({ id: 1, isFeatured: true, sortOrder: 3 }),
    ]);
    expect(out.map((i) => i.id)).toEqual([1, 2]);
  });
  it('caps the showcase at 5 scenes (MAX_SHOWCASE)', () => {
    const items = Array.from({ length: 8 }, (_, k) =>
      item({ id: k + 1, isFeatured: true, featuredRank: k + 1 })
    );
    expect(rankFeatured(items)).toHaveLength(5);
    expect(rankFeatured(items).map((i) => i.id)).toEqual([1, 2, 3, 4, 5]);
  });
  it('non-featured items never appear even when fewer than 5 featured exist', () => {
    const out = rankFeatured([
      item({ id: 1, isFeatured: true, featuredRank: 1 }),
      item({ id: 2, isFeatured: false }),
      item({ id: 3, isFeatured: true, featuredRank: 2 }),
    ]);
    expect(out.map((i) => i.id)).toEqual([1, 3]);
  });
  it('mixed: exactly the flagged items survive, ranked', () => {
    const out = rankFeatured([
      item({ id: 10, isFeatured: false }),
      item({ id: 11, isFeatured: true, featuredRank: 2 }),
      item({ id: 12 }),
      item({ id: 13, isFeatured: true, featuredRank: 1 }),
      item({ id: 14, isFeatured: true, featuredRank: null, sortOrder: 0 }),
    ]);
    expect(out.map((i) => i.id)).toEqual([13, 11, 14]);
  });
});

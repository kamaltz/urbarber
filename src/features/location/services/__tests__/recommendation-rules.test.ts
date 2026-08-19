import { describe, expect, it } from 'vitest';
import { applyCategoryRecommendationRule, type RecommendationEntry } from '../recommendation-rules';

function entry(id: string, overrides: Partial<RecommendationEntry<string>> = {}): RecommendationEntry<string> {
  return { item: id, ...overrides };
}

describe('applyCategoryRecommendationRule', () => {
  it("'default' never reorders -- returns items in the caller's existing order", () => {
    const entries = [entry('c'), entry('a'), entry('b')];
    expect(applyCategoryRecommendationRule(entries, 'default')).toEqual(['c', 'a', 'b']);
  });

  describe('nearest', () => {
    it('sorts ascending by distanceKm when every entry has one', () => {
      const entries = [entry('far', { distanceKm: 10 }), entry('near', { distanceKm: 1 }), entry('mid', { distanceKm: 5 })];
      expect(applyCategoryRecommendationRule(entries, 'nearest')).toEqual(['near', 'mid', 'far']);
    });

    it('falls back to default order when Customer location is unavailable (any entry missing distanceKm)', () => {
      const entries = [entry('a', { distanceKm: 10 }), entry('b')];
      expect(applyCategoryRecommendationRule(entries, 'nearest')).toEqual(['a', 'b']);
    });
  });

  describe('cheapest', () => {
    it('sorts ascending by cheapestPrice', () => {
      const entries = [entry('expensive', { cheapestPrice: 100000 }), entry('cheap', { cheapestPrice: 20000 })];
      expect(applyCategoryRecommendationRule(entries, 'cheapest')).toEqual(['cheap', 'expensive']);
    });

    it('falls back to default order when no entry has a resolvable price', () => {
      const entries = [entry('a'), entry('b')];
      expect(applyCategoryRecommendationRule(entries, 'cheapest')).toEqual(['a', 'b']);
    });

    it('a Barber with no resolvable price sorts after ones that do, rather than blocking the whole sort', () => {
      const entries = [entry('unpriced'), entry('priced', { cheapestPrice: 50000 })];
      expect(applyCategoryRecommendationRule(entries, 'cheapest')).toEqual(['priced', 'unpriced']);
    });
  });

  describe('highest_rating', () => {
    it('sorts rating descending, reviewCount as secondary tie-break', () => {
      const entries = [
        entry('a', { ratingAverage: 4.2, reviewCount: 10 }),
        entry('b', { ratingAverage: 4.8, reviewCount: 5 }),
        entry('c', { ratingAverage: 4.2, reviewCount: 30 }),
      ];
      expect(applyCategoryRecommendationRule(entries, 'highest_rating')).toEqual(['b', 'c', 'a']);
    });

    it('an unrated Barber sorts AFTER every rated Barber -- never falls back to default order', () => {
      const entries = [entry('unrated'), entry('rated', { ratingAverage: 3.9 })];
      expect(applyCategoryRecommendationRule(entries, 'highest_rating')).toEqual(['rated', 'unrated']);
    });

    it('when every Barber is unrated, order is stable (no crash, no NaN comparison chaos)', () => {
      const entries = [entry('a'), entry('b'), entry('c')];
      expect(applyCategoryRecommendationRule(entries, 'highest_rating')).toEqual(['a', 'b', 'c']);
    });
  });

  describe('most_popular', () => {
    it('sorts by reviewCount descending as the popularity proxy', () => {
      const entries = [entry('a', { reviewCount: 3 }), entry('b', { reviewCount: 50 })];
      expect(applyCategoryRecommendationRule(entries, 'most_popular')).toEqual(['b', 'a']);
    });

    it('falls back to default order when no Barber has any reviews yet', () => {
      const entries = [entry('a', { reviewCount: 0 }), entry('b')];
      expect(applyCategoryRecommendationRule(entries, 'most_popular')).toEqual(['a', 'b']);
    });
  });

  describe('newest', () => {
    it('sorts by createdAt descending (most recently registered/approved first)', () => {
      const entries = [
        entry('old', { createdAt: '2024-01-01T00:00:00.000Z' }),
        entry('new', { createdAt: '2026-06-01T00:00:00.000Z' }),
      ];
      expect(applyCategoryRecommendationRule(entries, 'newest')).toEqual(['new', 'old']);
    });

    it('falls back to default order when any entry is missing a valid createdAt', () => {
      const entries = [entry('a', { createdAt: '2026-01-01T00:00:00.000Z' }), entry('b')];
      expect(applyCategoryRecommendationRule(entries, 'newest')).toEqual(['a', 'b']);
    });
  });

  describe('history', () => {
    it('boosts Barbers the customer has a completed booking with to the top', () => {
      const entries = [entry('new-to-me'), entry('booked-before', { hasBookingHistory: true })];
      expect(applyCategoryRecommendationRule(entries, 'history')).toEqual(['booked-before', 'new-to-me']);
    });

    it('falls back to default order when the customer has no usable history with any eligible Barber', () => {
      const entries = [entry('a'), entry('b')];
      expect(applyCategoryRecommendationRule(entries, 'history')).toEqual(['a', 'b']);
    });
  });

  describe('soonest_available', () => {
    it('sorts by nextAvailableAt ascending', () => {
      const entries = [
        entry('later', { nextAvailableAt: '2026-06-05T09:00:00.000Z' }),
        entry('sooner', { nextAvailableAt: '2026-06-01T09:00:00.000Z' }),
      ];
      expect(applyCategoryRecommendationRule(entries, 'soonest_available')).toEqual(['sooner', 'later']);
    });

    it('falls back to default order when no availability data is usable', () => {
      const entries = [entry('a'), entry('b')];
      expect(applyCategoryRecommendationRule(entries, 'soonest_available')).toEqual(['a', 'b']);
    });
  });

  it('never crashes and always returns every item exactly once, for every rule, on an entirely-empty-signal list', () => {
    const rules: Array<Parameters<typeof applyCategoryRecommendationRule>[1]> = [
      'default', 'history', 'nearest', 'cheapest', 'highest_rating', 'most_popular', 'soonest_available', 'newest',
    ];
    const entries = [entry('a'), entry('b'), entry('c')];
    for (const rule of rules) {
      const result = applyCategoryRecommendationRule(entries, rule);
      expect(result.sort()).toEqual(['a', 'b', 'c']);
    }
  });
});

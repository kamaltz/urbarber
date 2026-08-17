import { describe, expect, it } from 'vitest';
import { applyReviewToAggregate } from '../src/bookings/rating-aggregate.js';

describe('applyReviewToAggregate', () => {
  it('seeds the aggregate from a barber with no prior reviews', () => {
    const result = applyReviewToAggregate({ ratingAverage: 0, reviewCount: 0 }, 5);
    expect(result).toEqual({ ratingAverage: 5, reviewCount: 1 });
  });

  it('computes a running average across multiple reviews', () => {
    let agg = applyReviewToAggregate({ ratingAverage: 0, reviewCount: 0 }, 5);
    agg = applyReviewToAggregate(agg, 3);
    expect(agg).toEqual({ ratingAverage: 4, reviewCount: 2 });

    agg = applyReviewToAggregate(agg, 4);
    expect(agg).toEqual({ ratingAverage: 4, reviewCount: 3 });
  });

  it('rounds to 1 decimal place', () => {
    let agg = applyReviewToAggregate({ ratingAverage: 0, reviewCount: 0 }, 5);
    agg = applyReviewToAggregate(agg, 5);
    agg = applyReviewToAggregate(agg, 4);
    // (5 + 5 + 4) / 3 = 4.6666... -> 4.7
    expect(agg).toEqual({ ratingAverage: 4.7, reviewCount: 3 });
  });

  it('never mutates the previous aggregate', () => {
    const previous = { ratingAverage: 4.5, reviewCount: 10 };
    applyReviewToAggregate(previous, 1);
    expect(previous).toEqual({ ratingAverage: 4.5, reviewCount: 10 });
  });
});

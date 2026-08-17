/**
 * Incremental rating aggregate for barbers/{barberId}.ratingAverage/reviewCount.
 * Used by POST /api/bookings/:bookingId/review inside a single Firestore
 * transaction so the review doc and the barber's aggregate always move together.
 */
export interface RatingAggregate {
  ratingAverage: number;
  reviewCount: number;
}

/** Rounds to 1 decimal place -- matches how ratings are displayed (e.g. "4.7"). */
export function applyReviewToAggregate(
  previous: RatingAggregate,
  newRating: number
): RatingAggregate {
  const previousCount = previous.reviewCount;
  const previousAverage = previous.ratingAverage;
  const reviewCount = previousCount + 1;
  const ratingAverage = Math.round(((previousAverage * previousCount + newRating) / reviewCount) * 10) / 10;

  return { ratingAverage, reviewCount };
}

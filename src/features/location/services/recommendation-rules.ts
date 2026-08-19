/**
 * Category recommendation rules: applies the Admin-configured ordering
 * strategy for a category's Barber listing (backend/vercel/src/admin/
 * admin.types.ts CategoryRecommendationRule -- kept as a mirrored literal
 * union here, not imported, since the mobile app and the Vercel backend are
 * separate packages/build targets) to an already-eligibility-filtered list
 * of Barbers. This function NEVER participates in eligibility -- callers
 * must filter out deleted/suspended/rejected/inactive/undiscoverable Barbers
 * before calling this; recommendation rules only reorder what's already
 * eligible.
 *
 * Every rule degrades to the caller's existing (pre-sort) ordering --
 * "default" -- whenever its required signal isn't usable for ANY entry, per
 * the explicit fallback requirements in the stabilization spec (e.g.
 * "nearest without Customer location -> default"). The one deliberate
 * exception is 'highest_rating', where an unrated Barber is itself a
 * meaningful signal (spec: "unrated Barber after rated Barber"), so it never
 * falls back to the pre-sort order even when some entries lack a rating.
 */

export type CategoryRecommendationRule =
  | 'default'
  | 'history'
  | 'nearest'
  | 'cheapest'
  | 'highest_rating'
  | 'most_popular'
  | 'soonest_available'
  | 'newest';

export interface RecommendationEntry<T> {
  item: T;
  /** Straight-line distance from the customer, km. Required for 'nearest'. */
  distanceKm?: number;
  /** Lowest active service price, IDR. Required for 'cheapest'. */
  cheapestPrice?: number;
  /** Required for 'highest_rating' (secondary tie-break for reviewCount). */
  ratingAverage?: number;
  /** Secondary tie-break for 'highest_rating'; primary signal for
   * 'most_popular' (no separate completed-booking-count metric is persisted
   * anywhere in this app, so reviewCount is the honest available proxy). */
  reviewCount?: number;
  /** ISO registration/approval timestamp. Required for 'newest'. */
  createdAt?: string;
  /** True when the requesting customer has a completed booking with this
   * Barber. Required for 'history'. */
  hasBookingHistory?: boolean;
  /** ISO timestamp of the Barber's earliest open slot. Required for
   * 'soonest_available'. */
  nextAvailableAt?: string;
}

function extract<T>(entries: RecommendationEntry<T>[]): T[] {
  return entries.map((e) => e.item);
}

export function applyCategoryRecommendationRule<T>(
  entries: RecommendationEntry<T>[],
  rule: CategoryRecommendationRule
): T[] {
  const sorted = [...entries];

  switch (rule) {
    case 'nearest': {
      if (!sorted.every((e) => typeof e.distanceKm === 'number' && isFinite(e.distanceKm))) return extract(sorted);
      sorted.sort((a, b) => (a.distanceKm as number) - (b.distanceKm as number));
      return extract(sorted);
    }

    case 'cheapest': {
      if (!sorted.some((e) => typeof e.cheapestPrice === 'number' && isFinite(e.cheapestPrice))) return extract(sorted);
      sorted.sort((a, b) => {
        const ap = typeof a.cheapestPrice === 'number' ? a.cheapestPrice : Infinity;
        const bp = typeof b.cheapestPrice === 'number' ? b.cheapestPrice : Infinity;
        return ap - bp;
      });
      return extract(sorted);
    }

    case 'highest_rating': {
      // Unrated (missing ratingAverage) is itself meaningful -- sorts after
      // every rated Barber, tie-broken by reviewCount -- never a full
      // fallback to pre-sort order.
      sorted.sort((a, b) => {
        const ar = typeof a.ratingAverage === 'number' ? a.ratingAverage : -1;
        const br = typeof b.ratingAverage === 'number' ? b.ratingAverage : -1;
        if (br !== ar) return br - ar;
        return (b.reviewCount ?? 0) - (a.reviewCount ?? 0);
      });
      return extract(sorted);
    }

    case 'most_popular': {
      if (!sorted.some((e) => typeof e.reviewCount === 'number' && e.reviewCount > 0)) return extract(sorted);
      sorted.sort((a, b) => (b.reviewCount ?? 0) - (a.reviewCount ?? 0));
      return extract(sorted);
    }

    case 'newest': {
      if (!sorted.every((e) => !!e.createdAt && !isNaN(new Date(e.createdAt).getTime()))) return extract(sorted);
      sorted.sort((a, b) => new Date(b.createdAt as string).getTime() - new Date(a.createdAt as string).getTime());
      return extract(sorted);
    }

    case 'history': {
      if (!sorted.some((e) => e.hasBookingHistory)) return extract(sorted);
      sorted.sort((a, b) => Number(!!b.hasBookingHistory) - Number(!!a.hasBookingHistory));
      return extract(sorted);
    }

    case 'soonest_available': {
      if (!sorted.some((e) => !!e.nextAvailableAt)) return extract(sorted);
      sorted.sort((a, b) => {
        const at = a.nextAvailableAt ? new Date(a.nextAvailableAt).getTime() : Infinity;
        const bt = b.nextAvailableAt ? new Date(b.nextAvailableAt).getTime() : Infinity;
        return at - bt;
      });
      return extract(sorted);
    }

    case 'default':
    default:
      return extract(sorted);
  }
}

/**
 * useBarberReviews Hook
 * Manages barber reviews state
 */

import { useEffect, useState } from 'react';
import { barberRepository } from '../repository/barber.repository';
import type { BarberReview } from '../types/barber';

export function useBarberReviews(barberId: string) {
  const [reviews, setReviews] = useState<BarberReview[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [replying, setReplying] = useState(false);

  useEffect(() => {
    if (!barberId) {
      setLoading(false);
      return;
    }

    const loadReviews = async () => {
      try {
        setLoading(true);
        setError(null);
        const data = await barberRepository.getBarberReviews(barberId);
        setReviews(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load reviews');
      } finally {
        setLoading(false);
      }
    };

    loadReviews();
  }, [barberId]);

  const replyToReview = async (reviewId: string, replyText: string) => {
    if (!barberId) return { success: false };

    try {
      setReplying(true);
      const result = await barberRepository.replyToReview(barberId, reviewId, replyText);

      if (result.success) {
        // Update local state
        setReviews((prev) =>
          prev.map((r) =>
            r.reviewId === reviewId
              ? {
                  ...r,
                  replyText,
                  repliedAt: new Date().toISOString(),
                  status: 'replied' as const,
                }
              : r
          )
        );
      }

      return result;
    } catch (err) {
      return { success: false, error: { message: 'Reply failed' } };
    } finally {
      setReplying(false);
    }
  };

  const refresh = async () => {
    if (!barberId) return;

    try {
      setLoading(true);
      const data = await barberRepository.getBarberReviews(barberId);
      setReviews(data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Refresh failed');
    } finally {
      setLoading(false);
    }
  };

  return {
    reviews,
    loading,
    error,
    replying,
    replyToReview,
    refresh,
  };
}

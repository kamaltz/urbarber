/**
 * useAdminReviews Hook
 * Manages review moderation
 */

import { useEffect, useState } from 'react';
import { adminRepository } from '../repository/admin.repository';
import type { ReviewForModeration, ReviewModerationRequest } from '../types/admin';

export function useAdminReviews(adminId: string, status?: string) {
  const [reviews, setReviews] = useState<ReviewForModeration[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!adminId) {
      setLoading(false);
      return;
    }

    const loadReviews = async () => {
      try {
        setLoading(true);
        setError(null);
        const data = await adminRepository.getReviewsForModeration(adminId, status);
        setReviews(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load reviews');
      } finally {
        setLoading(false);
      }
    };

    loadReviews();
  }, [adminId, status]);

  const moderateReview = async (data: ReviewModerationRequest) => {
    if (!adminId) return { success: false };

    try {
      const result = await adminRepository.moderateReview(adminId, data);

      if (result.success) {
        setReviews((prev) =>
          prev.map((r) =>
            r.reviewId === data.reviewId
              ? { ...r, status: data.action === 'approve' ? 'approved' : 'rejected' }
              : r
          )
        );
      }

      return result;
    } catch (err) {
      return { success: false, error: { message: 'Moderation failed' } };
    }
  };

  const refresh = async () => {
    if (!adminId) return;

    try {
      setLoading(true);
      const data = await adminRepository.getReviewsForModeration(adminId, status);
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
    moderateReview,
    refresh,
  };
}

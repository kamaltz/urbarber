/**
 * useBarberProfile Hook
 * Manages barber profile state
 */

import { useAsyncDetail, useAsyncMutation } from '@/hooks/use-async-data';
import { useState } from 'react';
import { barberRepository } from '../repository/barber.repository';
import type { BarberProfile, UpdateBarberProfileRequest } from '../types/barber';

export function useBarberProfile(barberId: string) {
  const [profile, setProfile] = useState<BarberProfile | null>(null);

  const { loading, error, refresh } = useAsyncDetail(
    barberId,
    (id) => barberRepository.getBarberProfile(id),
    {
      onSuccess: (data) => setProfile(data),
    }
  );

  const { execute: updateProfileMutation, loading: updating, error: updateError } = useAsyncMutation(
    (data: UpdateBarberProfileRequest) => barberRepository.updateBarberProfile(barberId, data),
    (result) => {
      if (result) {
        setProfile((prev) =>
          prev
            ? {
                ...prev,
                ...(result as any),
                updatedAt: new Date().toISOString(),
              }
            : null
        );
      }
    }
  );

  const updateProfile = async (data: UpdateBarberProfileRequest) => {
    const result = await updateProfileMutation(data);
    return result as any;
  };

  return {
    profile: profile || null,
    loading,
    error: error || updateError,
    updating,
    updateProfile,
    refresh,
  };
}

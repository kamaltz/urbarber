/**
 * useCustomerProfile Hook
 * Manages customer profile state
 */

import { useAsyncDetail, useAsyncMutation } from '@/hooks/use-async-data';
import { useState } from 'react';
import { customerRepository } from '../repository/customer.repository';
import type { CustomerProfile, UpdateProfileData } from '../types/customer';

export function useCustomerProfile(customerId: string) {
  const [profile, setProfile] = useState<CustomerProfile | null>(null);

  const { data, loading, error, refresh } = useAsyncDetail(
    customerId,
    (id) => customerRepository.getCustomerProfile(id),
    {
      onSuccess: (data) => {
        setProfile(data);
      },
    }
  );

  const { execute: updateProfile, loading: updating, error: updateError } = useAsyncMutation(
    (updateData: UpdateProfileData) => customerRepository.updateCustomerProfile(customerId, updateData),
    (result) => {
      if (result) {
        setProfile((prev) =>
          prev
            ? {
                ...prev,
                ...result,
                updatedAt: new Date().toISOString(),
              }
            : null
        );
      }
    }
  );

  return {
    profile: profile || data,
    loading,
    error: error || updateError,
    updating,
    updateProfile: async (data: UpdateProfileData) => {
      const result = await updateProfile(data);
      return result as any;
    },
    refresh,
  };
}

/**
 * useCustomerProfile Hook
 * Manages customer profile state
 */

import { useAsyncDetail, useAsyncMutation } from '@/hooks/use-async-data';
import { useState } from 'react';
import { MOCK_CUSTOMER_PROFILE } from '../mock/customers';
import { customerRepository } from '../repository/customer.repository';
import type { CustomerProfile, UpdateProfileData } from '../types/customer';

export function useCustomerProfile(customerId: string) {
  const [profile, setProfile] = useState<CustomerProfile | null>(null);

  const { data, loading, error, refresh } = useAsyncDetail(
    customerId,
    (id) => customerRepository.getCustomerProfile(id),
    {
      onSuccess: (fetchedData) => {
        if (fetchedData) {
          setProfile(fetchedData as CustomerProfile);
        }
      },
    }
  );

  const { execute: updateProfile, loading: updating, error: updateError } = useAsyncMutation(
    (updateData: UpdateProfileData) => customerRepository.updateCustomerProfile(customerId, updateData),
    (result) => {
      if (result) {
        setProfile((prev) => ({
          ...(prev || { ...MOCK_CUSTOMER_PROFILE, userId: customerId }),
          ...profile,
          updatedAt: new Date().toISOString(),
        }));
      }
    }
  );

  return {
    profile: profile || data,
    loading,
    error: error || updateError,
    updating,
    updateProfile: async (updateData: UpdateProfileData) => {
      const res = await updateProfile(updateData);
      setProfile((prev) => ({
        ...(prev || { ...MOCK_CUSTOMER_PROFILE, userId: customerId }),
        ...updateData,
        updatedAt: new Date().toISOString(),
      }));
      return res as any;
    },
    refresh,
  };
}

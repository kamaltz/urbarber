/**
 * useCustomerProfile Hook
 * Manages customer profile state
 */

import { useAsyncDetail, useAsyncMutation } from '@/hooks/use-async-data';
import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
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

  // customers/{uid} is the canonical profile source, but each screen that calls
  // this hook (Home, Profile, Account) owns its own instance -- there is no
  // shared cache. Without this, editing the profile on one screen leaves every
  // other already-mounted screen showing stale name/photo until the app
  // restarts, since expo-router keeps tab/stack screens mounted across
  // navigation. Refetching on focus (same pattern already used for Barber
  // Profile) means returning to a screen always shows the latest write.
  useFocusEffect(
    useCallback(() => {
      if (customerId) {
        void refresh();
      }
    }, [customerId, refresh])
  );

  const { execute: updateProfile, loading: updating, error: updateError } = useAsyncMutation(
    (updateData: UpdateProfileData) => customerRepository.updateCustomerProfile(customerId, updateData),
    (result) => {
      if (result) {
        setProfile((prev) => ({
          ...(prev || { userId: customerId, name: '', email: '', location: '', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() }),
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
        ...(prev || { userId: customerId, name: '', email: '', location: '', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() }),
        ...updateData,
        updatedAt: new Date().toISOString(),
      }));
      return res as any;
    },
    refresh,
  };
}

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useState, useEffect } from 'react';
import {
  getMemberProfile,
  getMemberMembership,
  getMemberFamilyMembers,
  listMemberPayments,
  listMemberNotifications,
  markNotificationRead,
  createRenewalOrder,
  getRenewalPaymentStatus
} from '../api';

export function useMemberProfile() {
  return useQuery({
    queryKey: ['member', 'profile'],
    queryFn: getMemberProfile,
    retry: 2
  });
}

export function useMemberMembership() {
  return useQuery({
    queryKey: ['member', 'membership'],
    queryFn: getMemberMembership,
    retry: 2
  });
}

export function useMemberFamilyMembers() {
  return useQuery({
    queryKey: ['member', 'familyMembers'],
    queryFn: getMemberFamilyMembers,
    retry: 2
  });
}

export function useMemberPayments(params?: { page?: number; page_size?: number; status?: string }) {
  return useQuery({
    queryKey: ['member', 'payments', params],
    queryFn: () => listMemberPayments(params),
    retry: 2
  });
}

export function useMemberNotifications(params?: { page?: number; page_size?: number; status?: string }) {
  return useQuery({
    queryKey: ['member', 'notifications', params],
    queryFn: () => listMemberNotifications(params),
    retry: 2
  });
}

export function useMarkNotificationRead() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => markNotificationRead(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['member', 'notifications'] });
    }
  });
}

export function useCreateRenewalOrder() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (membershipId: string) => createRenewalOrder(membershipId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['member', 'membership'] });
      queryClient.invalidateQueries({ queryKey: ['member', 'profile'] });
    }
  });
}

export function useRenewalPaymentStatus(paymentId: string | null) {
  const [startTime] = useState(() => Date.now());
  const [shouldPoll, setShouldPoll] = useState(true);

  useEffect(() => {
    if (!paymentId) return;
    const interval = setInterval(() => {
      if (Date.now() - startTime >= 120000) {
        setShouldPoll(false);
        clearInterval(interval);
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [paymentId, startTime]);

  return useQuery({
    queryKey: ['member', 'renewalStatus', paymentId],
    queryFn: () => getRenewalPaymentStatus(paymentId!),
    enabled: !!paymentId,
    refetchInterval: (query) => {
      const data = query.state.data;
      const status = data?.data?.payment?.status;
      if (status === 'success' || status === 'failed' || status === 'refunded') {
        return false;
      }
      return shouldPoll ? 2000 : false;
    },
    retry: 2
  });
}

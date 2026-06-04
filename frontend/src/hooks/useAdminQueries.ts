import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  adminListMembers,
  adminCreateMember,
  adminGetMember,
  adminUpdateMember,
  adminDeleteMember,
  adminAddFamilyMember,
  adminUpdateFamilyMember,
  adminRemoveFamilyMember,
  adminGetActiveFee,
  adminListFeeHistory,
  adminCreateFee,
  adminListPayments,
  adminGetPayment,
  adminListEvents,
  adminCreateEvent,
  adminGetEvent,
  adminUpdateEvent,
  adminDeleteEvent,
  adminListAlbums,
  adminCreateAlbum,
  adminUpdateAlbum,
  adminDeleteAlbum,
  adminGetAlbumPhotos,
  adminUploadPhoto,
  adminDeletePhoto,
  adminGetReportActiveMembers,
  adminGetReportExpiringMembers,
  adminGetReportBirthdays,
  adminGetReportPayments,
  adminGetSettings,
  adminUpdateSetting,
  adminListAuditLogs
} from '../api';

// --- Members & Family Hooks ---

export function useAdminMembers(params?: any) {
  return useQuery({
    queryKey: ['admin', 'members', params],
    queryFn: () => adminListMembers(params),
    retry: 1
  });
}

export function useAdminCreateMember() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: adminCreateMember,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'members'] });
    }
  });
}

export function useAdminMember(memberId: string) {
  return useQuery({
    queryKey: ['admin', 'member', memberId],
    queryFn: () => adminGetMember(memberId),
    enabled: !!memberId,
    retry: 1
  });
}

export function useAdminUpdateMember(memberId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: any) => adminUpdateMember(memberId, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'members'] });
      queryClient.invalidateQueries({ queryKey: ['admin', 'member', memberId] });
    }
  });
}

export function useAdminDeleteMember() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ memberId, reason }: { memberId: string; reason: string }) =>
      adminDeleteMember(memberId, reason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'members'] });
      queryClient.invalidateQueries({ queryKey: ['admin', 'auditLogs'] });
    }
  });
}

export function useAdminAddFamilyMember(familyId: string, memberId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: any) => adminAddFamilyMember(familyId, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'member', memberId] });
    }
  });
}

export function useAdminUpdateFamilyMember(familyId: string, memberId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ familyMemberId, payload }: { familyMemberId: string; payload: any }) =>
      adminUpdateFamilyMember(familyId, familyMemberId, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'member', memberId] });
    }
  });
}

export function useAdminRemoveFamilyMember(familyId: string, memberId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ familyMemberId, reason }: { familyMemberId: string; reason: string }) =>
      adminRemoveFamilyMember(familyId, familyMemberId, reason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'member', memberId] });
      queryClient.invalidateQueries({ queryKey: ['admin', 'auditLogs'] });
    }
  });
}

// --- Finance & Fees Hooks ---

export function useAdminActiveFee() {
  return useQuery({
    queryKey: ['admin', 'fee', 'active'],
    queryFn: adminGetActiveFee,
    retry: 1
  });
}

export function useAdminFeeHistory(params?: any) {
  return useQuery({
    queryKey: ['admin', 'fees', 'history', params],
    queryFn: () => adminListFeeHistory(params),
    retry: 1
  });
}

export function useAdminCreateFee() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: adminCreateFee,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'fee', 'active'] });
      queryClient.invalidateQueries({ queryKey: ['admin', 'fees', 'history'] });
      queryClient.invalidateQueries({ queryKey: ['admin', 'auditLogs'] });
    }
  });
}

export function useAdminPayments(params?: any) {
  return useQuery({
    queryKey: ['admin', 'payments', params],
    queryFn: () => adminListPayments(params),
    retry: 1
  });
}

export function useAdminPayment(paymentId: string) {
  return useQuery({
    queryKey: ['admin', 'payment', paymentId],
    queryFn: () => adminGetPayment(paymentId),
    enabled: !!paymentId,
    retry: 1
  });
}

// --- Events Hooks ---

export function useAdminEvents(params?: any) {
  return useQuery({
    queryKey: ['admin', 'events', params],
    queryFn: () => adminListEvents(params),
    retry: 1
  });
}

export function useAdminEvent(eventId: string) {
  return useQuery({
    queryKey: ['admin', 'event', eventId],
    queryFn: () => adminGetEvent(eventId),
    enabled: !!eventId,
    retry: 1
  });
}

export function useAdminCreateEvent() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: adminCreateEvent,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'events'] });
      queryClient.invalidateQueries({ queryKey: ['admin', 'auditLogs'] });
    }
  });
}

export function useAdminUpdateEvent(eventId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: any) => adminUpdateEvent(eventId, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'events'] });
      queryClient.invalidateQueries({ queryKey: ['admin', 'event', eventId] });
      queryClient.invalidateQueries({ queryKey: ['admin', 'auditLogs'] });
    }
  });
}

export function useAdminDeleteEvent() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ eventId, reason }: { eventId: string; reason: string }) =>
      adminDeleteEvent(eventId, reason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'events'] });
      queryClient.invalidateQueries({ queryKey: ['admin', 'auditLogs'] });
    }
  });
}

// --- Gallery Hooks ---

export function useAdminAlbums(params?: any) {
  return useQuery({
    queryKey: ['admin', 'albums', params],
    queryFn: () => adminListAlbums(params),
    retry: 1
  });
}

export function useAdminCreateAlbum() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: adminCreateAlbum,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'albums'] });
      queryClient.invalidateQueries({ queryKey: ['admin', 'auditLogs'] });
    }
  });
}

export function useAdminUpdateAlbum(albumId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: any) => adminUpdateAlbum(albumId, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'albums'] });
      queryClient.invalidateQueries({ queryKey: ['admin', 'auditLogs'] });
    }
  });
}

export function useAdminDeleteAlbum() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ albumId, reason }: { albumId: string; reason: string }) =>
      adminDeleteAlbum(albumId, reason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'albums'] });
      queryClient.invalidateQueries({ queryKey: ['admin', 'auditLogs'] });
    }
  });
}

export function useAdminAlbumPhotos(albumId: string) {
  return useQuery({
    queryKey: ['admin', 'albumPhotos', albumId],
    queryFn: () => adminGetAlbumPhotos(albumId),
    enabled: !!albumId,
    retry: 1
  });
}

export function useAdminUploadPhoto(albumId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (formData: FormData) => adminUploadPhoto(albumId, formData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'albumPhotos', albumId] });
      queryClient.invalidateQueries({ queryKey: ['admin', 'albums'] });
      queryClient.invalidateQueries({ queryKey: ['admin', 'auditLogs'] });
    }
  });
}

export function useAdminDeletePhoto(albumId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ photoId, reason }: { photoId: string; reason: string }) =>
      adminDeletePhoto(photoId, reason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'albumPhotos', albumId] });
      queryClient.invalidateQueries({ queryKey: ['admin', 'albums'] });
      queryClient.invalidateQueries({ queryKey: ['admin', 'auditLogs'] });
    }
  });
}

// --- Reports Hooks ---

export function useAdminReportActiveMembers(params?: any) {
  return useQuery({
    queryKey: ['admin', 'report', 'activeMembers', params],
    queryFn: () => adminGetReportActiveMembers(params),
    retry: 1
  });
}

export function useAdminReportExpiringMembers(params?: any) {
  return useQuery({
    queryKey: ['admin', 'report', 'expiringMembers', params],
    queryFn: () => adminGetReportExpiringMembers(params),
    retry: 1
  });
}

export function useAdminReportBirthdays(params: any) {
  return useQuery({
    queryKey: ['admin', 'report', 'birthdays', params],
    queryFn: () => adminGetReportBirthdays(params),
    enabled: params.month !== undefined && params.month !== null,
    retry: 1
  });
}

export function useAdminReportPayments(params?: any) {
  return useQuery({
    queryKey: ['admin', 'report', 'payments', params],
    queryFn: () => adminGetReportPayments(params),
    retry: 1
  });
}

// --- Settings & Audit Logs Hooks ---

export function useAdminSettings() {
  return useQuery({
    queryKey: ['admin', 'settings'],
    queryFn: adminGetSettings,
    retry: 1
  });
}

export function useAdminUpdateSetting() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ key, value }: { key: string; value: any }) => adminUpdateSetting(key, value),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'settings'] });
      queryClient.invalidateQueries({ queryKey: ['admin', 'auditLogs'] });
    }
  });
}

export function useAdminAuditLogs(params?: any) {
  return useQuery({
    queryKey: ['admin', 'auditLogs', params],
    queryFn: () => adminListAuditLogs(params),
    retry: 1
  });
}

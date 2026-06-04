import type { AuthState, AuthUser } from './auth/types';

export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8000';

type SessionListener = (session: AuthState) => void;

export type FamilyMemberPayload = {
  name: string;
  date_of_birth: string;
  gender: 'male' | 'female' | 'other' | 'prefer_not_to_say';
  relationship: string;
};

export type RegistrationDraftPayload = {
  head_name: string;
  phone: string;
  email: string;
  address: string;
  family_members: FamilyMemberPayload[];
  consent_version: string;
  consent_terms: boolean;
  consent_privacy: boolean;
};

export type RegistrationPayment = {
  payment_id: string;
  provider_order_id: string;
  amount: string | number;
  currency: string;
  checkout_key_id: string;
};

export type RegistrationResponse = {
  success: boolean;
  data: {
    membership_id: string;
    membership_number: string;
    status: string;
    payment: RegistrationPayment;
  };
  meta: Record<string, unknown>;
};

export type RegistrationStatusResponse = {
  success: boolean;
  data: {
    payment: {
      payment_id: string;
      status: 'pending' | 'success' | 'failed' | 'refunded';
      amount: string | number;
      currency: string;
    };
    membership: {
      membership_id: string;
      membership_number: string;
      status: string;
      expiry_date: string | null;
    };
  };
  meta: Record<string, unknown>;
};

export type MemberPayment = {
  id: string;
  payment_type: 'registration' | 'renewal';
  status: 'pending' | 'success' | 'failed' | 'refunded';
  amount: string | number;
  currency: string;
  paid_at: string | null;
  receipt_number: string | null;
};

export type MemberPaymentsResponse = {
  success: boolean;
  data: {
    items: MemberPayment[];
  };
  meta: {
    pagination?: {
      page: number;
      page_size: number;
      total_items: number;
      total_pages: number;
    };
  };
};

export type MemberProfileResponse = {
  success: boolean;
  data: {
    id: string;
    email: string;
    full_name: string;
    profile_picture_url: string | null;
    status: string;
  };
  meta: Record<string, unknown>;
};

export type MemberMembershipResponse = {
  success: boolean;
  data: {
    family: {
      id: string;
      address: string;
      mobile_number: string;
      email: string;
    };
    membership: {
      id: string;
      membership_number: string;
      status: string;
      start_date: string | null;
      expiry_date: string | null;
    };
  };
  meta: Record<string, unknown>;
};

export type MemberFamilyMember = {
  id: string;
  name: string;
  date_of_birth: string;
  gender: string;
  relationship: string;
};

export type MemberFamilyMembersResponse = {
  success: boolean;
  data: {
    items: MemberFamilyMember[];
  };
  meta: Record<string, unknown>;
};

export type NotificationItem = {
  id: string;
  title: string;
  body: string;
  status: 'sent' | 'read';
  read_at: string | null;
  created_at: string;
};

export type MemberNotificationsResponse = {
  success: boolean;
  data: {
    items: NotificationItem[];
  };
  meta: {
    pagination: {
      page: number;
      page_size: number;
      total_items: number;
      total_pages: number;
    };
  };
};

export type NotificationReadResponse = {
  success: boolean;
  data: {
    id: string;
    status: 'read';
    read_at: string;
  };
  meta: Record<string, unknown>;
};

export type RenewalOrderResponse = {
  success: boolean;
  data: {
    payment_id: string;
    provider_order_id: string;
    amount: string | number;
    currency: string;
    checkout_key_id: string;
    status: string;
  };
  meta: Record<string, unknown>;
};

export type RenewalPaymentStatusResponse = {
  success: boolean;
  data: {
    payment: {
      payment_id: string;
      payment_type: 'registration' | 'renewal';
      provider_order_id: string;
      provider_payment_id: string | null;
      status: 'pending' | 'success' | 'failed' | 'refunded';
      amount: string | number;
      currency: string;
      paid_at: string | null;
      receipt_number: string | null;
    };
    membership: {
      membership_id: string;
      membership_number: string;
      status: string;
      expiry_date: string | null;
    };
  };
  meta: Record<string, unknown>;
};

let session: AuthState = {
  status: 'loading',
  user: null,
  accessToken: null
};

const listeners = new Set<SessionListener>();
let refreshPromise: Promise<AuthState | null> | null = null;

function emitSession() {
  for (const listener of listeners) {
    listener(session);
  }
}

function setSession(next: AuthState) {
  session = next;
  emitSession();
}

export function subscribeSession(listener: SessionListener) {
  listeners.add(listener);
  listener(session);
  return () => {
    listeners.delete(listener);
  };
}

export function getSession() {
  return session;
}

export function setAuthenticatedSession(accessToken: string, user: AuthUser) {
  setSession({
    status: 'authenticated',
    user,
    accessToken
  });
}

export function clearSession() {
  setSession({
    status: 'anonymous',
    user: null,
    accessToken: null
  });
}

export async function bootstrapSession() {
  try {
    await refreshSession();
  } catch {
    clearSession();
  }
}

export function apiUrl(path: string) {
  return `${API_BASE_URL}${path}`;
}

async function requestJson<T>(
  path: string,
  options: RequestInit = {},
  accessToken?: string | null
): Promise<T> {
  const headers = new Headers(options.headers);
  const hasBody = options.body !== undefined && options.body !== null;

  if (hasBody && !(options.body instanceof FormData)) {
    headers.set('Content-Type', 'application/json');
  }
  if (accessToken) {
    headers.set('Authorization', `Bearer ${accessToken}`);
  }

  const response = await fetch(apiUrl(path), {
    ...options,
    headers,
    credentials: 'include'
  });

  const text = await response.text();
  const data = text ? JSON.parse(text) : null;

  if (!response.ok) {
    const error = new Error(data?.detail ?? 'Request failed') as Error & { status?: number };
    error.status = response.status;
    throw error;
  }

  return data as T;
}

export async function refreshSession() {
  if (refreshPromise) {
    return refreshPromise;
  }

  refreshPromise = (async () => {
    try {
      const result = await requestJson<{ access_token: string; user: AuthUser }>(
        '/api/v1/auth/refresh',
        { method: 'POST' },
        null
      );
      const next = {
        status: 'authenticated' as const,
        user: result.user,
        accessToken: result.access_token
      };
      setSession(next);
      return next;
    } catch (error) {
      clearSession();
      throw error;
    }
  })().finally(() => {
    refreshPromise = null;
  });

  return refreshPromise;
}

function isRetryableMethod(method?: string) {
  const normalized = (method ?? 'GET').toUpperCase();
  return normalized === 'GET' || normalized === 'HEAD' || normalized === 'OPTIONS';
}

export async function apiRequest<T>(
  path: string,
  options: RequestInit = {},
  requestOptions: { skipAuth?: boolean; allowRetry?: boolean } = {}
): Promise<T> {
  const allowRetry = requestOptions.allowRetry ?? true;
  const accessToken = requestOptions.skipAuth ? null : session.accessToken;

  try {
    return await requestJson<T>(path, options, accessToken);
  } catch (error) {
    const status = error instanceof Error && 'status' in error ? (error as Error & { status?: number }).status : undefined;
    if (!allowRetry || status !== 401 || requestOptions.skipAuth || !isRetryableMethod(options.method)) {
      throw error;
    }
    const refreshed = await refreshSession();
    if (!refreshed?.accessToken) {
      clearSession();
      throw error;
    }
    return requestJson<T>(path, options, refreshed.accessToken);
  }
}

async function authenticatedFileRequest(path: string): Promise<{ blob: Blob; filename: string }> {
  const headers = new Headers();
  if (session.accessToken) {
    headers.set('Authorization', `Bearer ${session.accessToken}`);
  }

  const response = await fetch(apiUrl(path), {
    headers,
    credentials: 'include'
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(text || 'File download failed');
  }

  const disposition = response.headers.get('content-disposition') ?? '';
  const match = disposition.match(/filename="([^"]+)"/);
  return {
    blob: await response.blob(),
    filename: match?.[1] ?? 'receipt.html'
  };
}

export function createRegistrationDraft(payload: RegistrationDraftPayload) {
  return apiRequest<RegistrationResponse>(
    '/api/v1/memberships/register',
    {
      method: 'POST',
      body: JSON.stringify(payload)
    },
    { skipAuth: true }
  );
}

export function getRegistrationStatus(paymentId: string) {
  return apiRequest<RegistrationStatusResponse>(
    `/api/v1/memberships/register/${paymentId}/status`,
    {},
    { skipAuth: true }
  );
}

export function listMemberPayments(params?: { page?: number; page_size?: number; status?: string }) {
  let query = '';
  if (params) {
    const qParts: string[] = [];
    if (params.page !== undefined) qParts.push(`page=${params.page}`);
    if (params.page_size !== undefined) qParts.push(`page_size=${params.page_size}`);
    if (params.status !== undefined) qParts.push(`status=${params.status}`);
    if (qParts.length > 0) {
      query = '?' + qParts.join('&');
    }
  }
  return apiRequest<MemberPaymentsResponse>(`/api/v1/member/payments${query}`);
}

export function getMemberProfile() {
  return apiRequest<MemberProfileResponse>('/api/v1/member/me');
}

export function getMemberMembership() {
  return apiRequest<MemberMembershipResponse>('/api/v1/member/membership');
}

export function getMemberFamilyMembers() {
  return apiRequest<MemberFamilyMembersResponse>('/api/v1/member/family-members');
}

export function listMemberNotifications(params?: { page?: number; page_size?: number; status?: string }) {
  let query = '';
  if (params) {
    const qParts: string[] = [];
    if (params.page !== undefined) qParts.push(`page=${params.page}`);
    if (params.page_size !== undefined) qParts.push(`page_size=${params.page_size}`);
    if (params.status !== undefined) qParts.push(`status=${params.status}`);
    if (qParts.length > 0) {
      query = '?' + qParts.join('&');
    }
  }
  return apiRequest<MemberNotificationsResponse>(`/api/v1/member/notifications${query}`);
}

export function markNotificationRead(id: string) {
  return apiRequest<NotificationReadResponse>(`/api/v1/member/notifications/${id}/read`, {
    method: 'PATCH'
  });
}

export function createRenewalOrder(membershipId: string) {
  return apiRequest<RenewalOrderResponse>('/api/v1/member/membership/renew', {
    method: 'POST',
    body: JSON.stringify({ membership_id: membershipId })
  });
}

export function getRenewalPaymentStatus(paymentId: string) {
  return apiRequest<RenewalPaymentStatusResponse>(`/api/v1/member/payments/${paymentId}/status`);
}

export function downloadMemberReceiptFile(paymentId: string) {
  return authenticatedFileRequest(`/api/v1/member/payments/${paymentId}/receipt/file`);
}

export async function logoutSession() {
  try {
    await apiRequest('/api/v1/auth/logout', { method: 'POST' }, { allowRetry: false });
  } finally {
    clearSession();
  }
}

// --- Helper for Query Strings ---
function buildQueryString(params?: Record<string, any>) {
  if (!params) return '';
  const qParts: string[] = [];
  for (const [key, val] of Object.entries(params)) {
    if (val !== undefined && val !== null && val !== '') {
      qParts.push(`${key}=${encodeURIComponent(val)}`);
    }
  }
  return qParts.length > 0 ? '?' + qParts.join('&') : '';
}

// --- Admin APIs ---

// 1. Members & Family Admin
export function adminListMembers(params?: {
  page?: number;
  page_size?: number;
  sort_by?: string;
  sort_order?: string;
  search?: string;
  status?: string;
  start_date?: string;
  end_date?: string;
}) {
  return apiRequest<any>(`/api/v1/admin/members${buildQueryString(params)}`);
}

export function adminCreateMember(payload: {
  head_name: string;
  phone: string;
  email: string;
  address: string;
  membership_status?: string;
  start_date?: string | null;
  expiry_date?: string | null;
  family_members?: any[];
}) {
  return apiRequest<any>('/api/v1/admin/members', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export function adminGetMember(memberId: string) {
  return apiRequest<any>(`/api/v1/admin/members/${memberId}`);
}

export function adminUpdateMember(
  memberId: string,
  payload: {
    head_name?: string;
    phone?: string;
    email?: string;
    address?: string;
    status?: string;
  }
) {
  return apiRequest<any>(`/api/v1/admin/members/${memberId}`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });
}

export function adminDeleteMember(memberId: string, reason: string) {
  return apiRequest<any>(`/api/v1/admin/members/${memberId}`, {
    method: 'DELETE',
    body: JSON.stringify({ reason }),
  });
}

export function adminAddFamilyMember(familyId: string, payload: FamilyMemberPayload) {
  return apiRequest<any>(`/api/v1/admin/families/${familyId}/members`, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export function adminUpdateFamilyMember(
  familyId: string,
  familyMemberId: string,
  payload: Partial<FamilyMemberPayload>
) {
  return apiRequest<any>(`/api/v1/admin/families/${familyId}/members/${familyMemberId}`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });
}

export function adminRemoveFamilyMember(familyId: string, familyMemberId: string, reason: string) {
  return apiRequest<any>(`/api/v1/admin/families/${familyId}/members/${familyMemberId}`, {
    method: 'DELETE',
    body: JSON.stringify({ reason }),
  });
}

// 2. Finance & Fees Admin
export function adminGetActiveFee() {
  return apiRequest<any>('/api/v1/admin/fees/active');
}

export function adminListFeeHistory(params?: {
  page?: number;
  page_size?: number;
  sort_by?: string;
  sort_order?: string;
  start_date?: string;
  end_date?: string;
}) {
  return apiRequest<any>(`/api/v1/admin/fees/history${buildQueryString(params)}`);
}

export function adminCreateFee(payload: {
  membership_fee_amount: number;
  renewal_fee_amount: number;
  effective_from: string;
}) {
  return apiRequest<any>('/api/v1/admin/fees', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export function adminListPayments(params?: {
  page?: number;
  page_size?: number;
  sort_by?: string;
  sort_order?: string;
  search?: string;
  status?: string;
  payment_type?: string;
  start_date?: string;
  end_date?: string;
}) {
  return apiRequest<any>(`/api/v1/admin/payments${buildQueryString(params)}`);
}

export function adminGetPayment(paymentId: string) {
  return apiRequest<any>(`/api/v1/admin/payments/${paymentId}`);
}

// 3. Events & Gallery Admin
export function adminListEvents(params?: {
  page?: number;
  page_size?: number;
  sort_by?: string;
  sort_order?: string;
  search?: string;
  status?: string;
  start_date?: string;
  end_date?: string;
}) {
  return apiRequest<any>(`/api/v1/admin/events${buildQueryString(params)}`);
}

export function adminCreateEvent(payload: {
  title: string;
  slug: string;
  description: string;
  event_date?: string | null;
  location?: string | null;
  status?: string;
}) {
  return apiRequest<any>('/api/v1/admin/events', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export function adminGetEvent(eventId: string) {
  return apiRequest<any>(`/api/v1/admin/events/${eventId}`);
}

export function adminUpdateEvent(
  eventId: string,
  payload: {
    title?: string;
    description?: string;
    event_date?: string | null;
    location?: string | null;
    status?: string;
  }
) {
  return apiRequest<any>(`/api/v1/admin/events/${eventId}`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });
}

export function adminDeleteEvent(eventId: string, reason: string) {
  return apiRequest<any>(`/api/v1/admin/events/${eventId}`, {
    method: 'DELETE',
    body: JSON.stringify({ reason }),
  });
}

export function adminListAlbums(params?: {
  page?: number;
  page_size?: number;
  sort_by?: string;
  sort_order?: string;
  search?: string;
  status?: string;
}) {
  return apiRequest<any>(`/api/v1/admin/gallery/albums${buildQueryString(params)}`);
}

export function adminCreateAlbum(payload: {
  title: string;
  slug: string;
  description?: string;
  status?: string;
}) {
  return apiRequest<any>('/api/v1/admin/gallery/albums', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export function adminUpdateAlbum(
  albumId: string,
  payload: {
    title?: string;
    description?: string;
    status?: string;
  }
) {
  return apiRequest<any>(`/api/v1/admin/gallery/albums/${albumId}`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });
}

export function adminDeleteAlbum(albumId: string, reason: string) {
  return apiRequest<any>(`/api/v1/admin/gallery/albums/${albumId}`, {
    method: 'DELETE',
    body: JSON.stringify({ reason }),
  });
}

export function adminGetAlbumPhotos(albumId: string) {
  return apiRequest<any>(`/api/v1/admin/gallery/albums/${albumId}/photos`);
}

export function adminUploadPhoto(albumId: string, formData: FormData) {
  return apiRequest<any>(`/api/v1/admin/gallery/albums/${albumId}/photos`, {
    method: 'POST',
    body: formData,
  });
}

export function adminDeletePhoto(photoId: string, reason: string) {
  return apiRequest<any>(`/api/v1/admin/gallery/photos/${photoId}`, {
    method: 'DELETE',
    body: JSON.stringify({ reason }),
  });
}

// 4. Reports & System settings
export function adminGetReportActiveMembers(params?: {
  page?: number;
  page_size?: number;
  sort_by?: string;
  sort_order?: string;
  search?: string;
  start_date?: string;
  end_date?: string;
}) {
  return apiRequest<any>(`/api/v1/admin/reports/active-members${buildQueryString(params)}`);
}

export function adminGetReportExpiringMembers(params?: {
  page?: number;
  page_size?: number;
  sort_by?: string;
  sort_order?: string;
  start_date?: string;
  end_date?: string;
}) {
  return apiRequest<any>(`/api/v1/admin/reports/expiring-members${buildQueryString(params)}`);
}

export function adminGetReportBirthdays(params: {
  page?: number;
  page_size?: number;
  sort_by?: string;
  sort_order?: string;
  month: number;
  search?: string;
}) {
  return apiRequest<any>(`/api/v1/admin/reports/birthdays${buildQueryString(params)}`);
}

export function adminGetReportPayments(params?: {
  page?: number;
  page_size?: number;
  sort_by?: string;
  sort_order?: string;
  status?: string;
  payment_type?: string;
  start_date?: string;
  end_date?: string;
}) {
  return apiRequest<any>(`/api/v1/admin/reports/payments${buildQueryString(params)}`);
}

export function adminGetSettings() {
  return apiRequest<any>('/api/v1/admin/settings');
}

export function adminUpdateSetting(key: string, value: any) {
  return apiRequest<any>(`/api/v1/admin/settings/${key}`, {
    method: 'PATCH',
    body: JSON.stringify({ value }),
  });
}

export function adminListAuditLogs(params?: {
  page?: number;
  page_size?: number;
  sort_by?: string;
  sort_order?: string;
  search?: string;
  action?: string;
  entity_type?: string;
}) {
  return apiRequest<any>(`/api/v1/admin/audit-logs${buildQueryString(params)}`);
}

// 5. Public Content APIs
export function publicGetEvents(params?: { page?: number; page_size?: number }) {
  return apiRequest<any>(`/api/v1/public/events${buildQueryString(params)}`, {}, { skipAuth: true });
}

export function publicGetEventBySlug(slug: string) {
  return apiRequest<any>(`/api/v1/public/events/${slug}`, {}, { skipAuth: true });
}

export function publicGetAlbums(params?: { page?: number; page_size?: number }) {
  return apiRequest<any>(`/api/v1/public/gallery/albums${buildQueryString(params)}`, {}, { skipAuth: true });
}

export function publicGetAlbumPhotosBySlug(slug: string) {
  return apiRequest<any>(`/api/v1/public/gallery/albums/${slug}/photos`, {}, { skipAuth: true });
}


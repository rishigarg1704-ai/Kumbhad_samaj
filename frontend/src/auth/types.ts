export type Role = 'member' | 'admin';

export type AuthUser = {
  user_id: string;
  role: Role;
  email: string;
  full_name: string;
};

export type AuthState = {
  status: 'loading' | 'anonymous' | 'authenticated';
  user: AuthUser | null;
  accessToken: string | null;
};

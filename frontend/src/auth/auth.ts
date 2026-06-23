import { api, clearAuth, withAuth } from '../api/client';

export type AppRole = 'employee' | 'manager' | 'hr_admin' | 'super_admin';

export interface AuthProfile {
  id: string;
  fullName: string;
  email: string;
  roles: AppRole[];
}

export interface AuthUser extends AuthProfile {
  accessToken: string;
}

export interface LoginPayload {
  email: string;
  password: string;
}

export interface RegisterPayload {
  fullName: string;
  email: string;
  password: string;
  employeeCode?: string;
  department?: string;
  team?: string;
}

const STORAGE_KEY = 'comptrack.auth';

export async function login(payload: LoginPayload): Promise<AuthUser> {
  const response = await api.post<{ accessToken: string; user: AuthProfile }>('/auth/login', payload);
  const authUser = { ...response.data.user, accessToken: response.data.accessToken };
  persistSession(authUser);
  withAuth(authUser.accessToken);
  return authUser;
}

export async function register(payload: RegisterPayload): Promise<void> {
  await api.post('/auth/register', payload);
}

export async function restoreSession(): Promise<AuthUser | null> {
  const stored = readStoredSession();
  if (!stored) {
    return null;
  }

  withAuth(stored.accessToken);

  try {
    const response = await api.get<AuthProfile>('/auth/me');
    const refreshed = { ...response.data, accessToken: stored.accessToken };
    persistSession(refreshed);
    return refreshed;
  } catch {
    logout();
    return null;
  }
}

export function logout() {
  localStorage.removeItem(STORAGE_KEY);
  clearAuth();
}

function persistSession(authUser: AuthUser) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(authUser));
}

function readStoredSession(): AuthUser | null {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) {
    return null;
  }

  try {
    return JSON.parse(raw) as AuthUser;
  } catch {
    localStorage.removeItem(STORAGE_KEY);
    return null;
  }
}

import axios from 'axios';

const baseURL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080/api/v1';

export const api = axios.create({
  baseURL,
  timeout: 10000,
});

export function withAuth(accessToken: string) {
  api.defaults.headers.common.Authorization = `Bearer ${accessToken}`;
}

export function clearAuth() {
  delete api.defaults.headers.common.Authorization;
}

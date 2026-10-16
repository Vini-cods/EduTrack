import apiClient from './client';

const requestOptions = { timeout: 15000 };

export async function requestPasswordRecovery(email: string): Promise<void> {
  await apiClient.post('/auth/forgot-password', { email }, requestOptions);
}

export async function resetPassword(token: string, newPassword: string): Promise<void> {
  await apiClient.post('/auth/reset-password', { token, new_password: newPassword }, requestOptions);
}

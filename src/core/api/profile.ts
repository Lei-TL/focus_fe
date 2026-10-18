import { apiClient } from '@/core/api/client';
import type { UserProfile } from '@/domain/auth';

export async function getMe(): Promise<UserProfile> {
  const { data } = await apiClient.get<UserProfile>('/auth/me');
  return data;
}

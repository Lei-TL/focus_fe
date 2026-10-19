import type { LoginRequest, RegisterRequest, TokenPair, UserProfile } from '@/core/api/types';

export type { LoginRequest, RegisterRequest, TokenPair, UserProfile };

// What the register form collects; the service fills the BE defaults.
export type RegisterInput = Pick<RegisterRequest, 'email' | 'password' | 'displayName'>;

export const DEFAULT_TIME_ZONE_ID = 'Asia/Ho_Chi_Minh';

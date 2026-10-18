// Auth types written by hand against the current BE contract (camelCase JSON).
// TODO(INT_T3): replace these hand-written types with the types generated from
// the BE OpenAPI document (`src/core/api/generated`). Until then every Auth type
// lives in this single file so the swap is a one-file change.

export type TokenPair = {
  accessToken: string;
  refreshToken: string;
  accessExpiresAt: string;
  refreshExpiresAt: string;
};

export type UserProfile = {
  id: string;
  email: string;
  displayName: string;
  seed: number;
  defaultSessionMinutes: number;
  timeZoneId: string;
  role: string;
};

export type LoginRequest = {
  email: string;
  password: string;
};

// Contract shape for POST /auth/register. `timeZoneId` is required by the
// contract; `defaultSessionMinutes` is optional and left to the BE default.
export type RegisterRequest = {
  email: string;
  password: string;
  displayName: string;
  timeZoneId: string;
  defaultSessionMinutes?: number;
};

// What the register form collects; the service fills the BE defaults.
export type RegisterInput = Pick<RegisterRequest, 'email' | 'password' | 'displayName'>;

export const DEFAULT_TIME_ZONE_ID = 'Asia/Ho_Chi_Minh';

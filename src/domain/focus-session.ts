export type FocusSessionStatus = 'Running' | 'Completed' | 'Cancelled' | 'Expired';

export type FocusSession = {
  id: string;
  workItemId: string;
  status: FocusSessionStatus;
  startedAt: string;
  endedAt?: string;
  plannedMinutes: number;
  effectiveSeconds?: number;
  qualityScore?: number;
};

export const workItemTypes = [
  'Analysis',
  'Design',
  'Coding',
  'Testing',
  'Debugging',
  'CodeReview',
  'Refactor',
  'Documentation',
  'Learning',
] as const;

export type WorkItemType = (typeof workItemTypes)[number];
export type Complexity = 'S' | 'M' | 'L' | 'XL';

export type WorkItem = {
  id: string;
  title: string;
  type: WorkItemType;
  complexity: Complexity;
  estimatedSessions: number;
  completedSessions: number;
  priorityScore: number;
  priorityExplanation: string;
};

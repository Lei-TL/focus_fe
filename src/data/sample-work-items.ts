import type { WorkItem } from '@/domain/work-item';

export const sampleWorkItems: WorkItem[] = [
  { id: '1', title: 'Thiết kế luồng refresh token', type: 'Design', complexity: 'M', estimatedSessions: 2, completedSessions: 0, priorityScore: 92, priorityExplanation: 'Deadline gần · phụ thuộc phiên đăng nhập' },
  { id: '2', title: 'Tích hợp heartbeat cho phiên', type: 'Coding', complexity: 'L', estimatedSessions: 4, completedSessions: 1, priorityScore: 84, priorityExplanation: 'Giá trị MVP cao · đang thực hiện' },
];

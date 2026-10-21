import { fireEvent, render, screen } from '@testing-library/react-native';

import { StartSessionPanel } from '@/components/sessions/StartSessionPanel';
import type { SessionContextValue } from '@/context/session-context';

let mockProfile: { defaultSessionMinutes: number } | null = null;
let mockSession: SessionContextValue;

jest.mock('@/context/auth-context', () => ({
  useAuth: () => ({ profile: mockProfile }),
}));

jest.mock('@/context/session-context', () => ({
  useSession: () => mockSession,
}));

function selected(testID: string): boolean {
  return screen.getByTestId(testID).props.accessibilityState?.selected === true;
}

beforeEach(() => {
  jest.clearAllMocks();
  mockProfile = null;
  mockSession = {
    state: { kind: 'idle' },
    isStarting: false,
    isEnding: false,
    start: jest.fn(),
    end: jest.fn(),
    resume: jest.fn(),
    dismissResult: jest.fn(),
  };
});

describe('StartSessionPanel duration', () => {
  test('follows a profile that loads after the panel mounted', () => {
    const view = render(<StartSessionPanel workItemId="w1" workItemTitle="Việc" />);
    expect(selected('session-duration-50')).toBe(true);

    mockProfile = { defaultSessionMinutes: 40 };
    view.rerender(<StartSessionPanel workItemId="w1" workItemTitle="Việc" />);

    // 40 is not a preset, so the profile value must be added and highlighted.
    expect(selected('session-duration-40')).toBe(true);
    expect(screen.queryByTestId('session-duration-50')).toBeNull();

    fireEvent.press(screen.getByTestId('session-start'));
    expect(mockSession.start).toHaveBeenCalledWith({
      workItemId: 'w1',
      workItemTitle: 'Việc',
      plannedSeconds: 2400,
    });
  });

  test('clamps an out-of-range profile default to 15–90 minutes', () => {
    mockProfile = { defaultSessionMinutes: 5 };

    render(<StartSessionPanel workItemId="w1" workItemTitle="Việc" />);

    expect(selected('session-duration-15')).toBe(true);
    expect(screen.queryByTestId('session-duration-5')).toBeNull();
  });

  test('keeps the user choice when the profile value does not change', () => {
    mockProfile = { defaultSessionMinutes: 30 };
    const view = render(<StartSessionPanel workItemId="w1" workItemTitle="Việc" />);

    fireEvent.press(screen.getByTestId('session-duration-60'));
    expect(selected('session-duration-60')).toBe(true);

    view.rerender(<StartSessionPanel workItemId="w1" workItemTitle="Việc" />);

    expect(selected('session-duration-60')).toBe(true);
  });
});

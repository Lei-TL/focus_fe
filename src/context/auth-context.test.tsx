import { useEffect } from 'react';
import { act, render, screen, waitFor } from '@testing-library/react-native';
import { Text } from 'react-native';

import { emitExpired } from '@/core/auth/auth-events';
import { AuthProvider, useAuth, type AuthContextValue } from '@/context/auth-context';
import type { UserProfile } from '@/domain/auth';
import * as authService from '@/services/auth-service';

jest.mock('@/services/auth-service', () => ({
  bootstrap: jest.fn(),
  login: jest.fn(),
  register: jest.fn(),
  logout: jest.fn(),
}));

const bootstrapMock = authService.bootstrap as jest.Mock;
const loginMock = authService.login as jest.Mock;
const registerMock = authService.register as jest.Mock;
const logoutMock = authService.logout as jest.Mock;

const profile: UserProfile = {
  id: '00000000-0000-0000-0000-000000000001',
  email: 'user@example.com',
  displayName: 'Người dùng',
  seed: 1,
  defaultSessionMinutes: 50,
  timeZoneId: 'Asia/Ho_Chi_Minh',
  role: 'Member',
};

let captured: AuthContextValue | null = null;

function Probe({ onValue }: { onValue: (value: AuthContextValue) => void }) {
  const value = useAuth();

  useEffect(() => {
    onValue(value);
  });

  return <Text testID="status">{value.status}</Text>;
}

function renderProvider() {
  return render(
    <AuthProvider>
      <Probe
        onValue={(value) => {
          captured = value;
        }}
      />
    </AuthProvider>
  );
}

beforeEach(() => {
  jest.clearAllMocks();
  captured = null;
});

describe('AuthProvider', () => {
  test('shows bootstrapping then the missing-token state', async () => {
    let releaseBootstrap: (value: unknown) => void = () => undefined;
    bootstrapMock.mockImplementation(
      () =>
        new Promise((resolve) => {
          releaseBootstrap = resolve;
        })
    );

    renderProvider();
    expect(screen.getByTestId('status').props.children).toBe('bootstrapping');

    releaseBootstrap({ status: 'signedOut' });

    await waitFor(() => expect(captured?.status).toBe('signedOut'));
    expect(captured?.profile).toBeNull();
  });

  test('reaches signedIn after a successful bootstrap', async () => {
    bootstrapMock.mockResolvedValue({ status: 'authenticated', profile });

    renderProvider();
    await waitFor(() => expect(captured?.status).toBe('signedIn'));

    expect(captured?.profile).toEqual(profile);
  });

  test('exposes a retryable error state and retries the bootstrap', async () => {
    bootstrapMock
      .mockResolvedValueOnce({ status: 'retryableError' })
      .mockResolvedValueOnce({ status: 'signedOut' });

    renderProvider();
    await waitFor(() => expect(captured?.status).toBe('retryableError'));

    await act(async () => {
      await captured?.retryBootstrap();
    });

    expect(captured?.status).toBe('signedOut');
    expect(bootstrapMock).toHaveBeenCalledTimes(2);
  });

  test('loads the profile into signedIn state on login', async () => {
    bootstrapMock.mockResolvedValue({ status: 'signedOut' });
    loginMock.mockResolvedValue(profile);

    renderProvider();
    await waitFor(() => expect(captured?.status).toBe('signedOut'));

    await act(async () => {
      await captured?.login({ email: 'user@example.com', password: 'password12345' });
    });

    expect(captured?.status).toBe('signedIn');
    expect(captured?.profile).toEqual(profile);
    expect(loginMock).toHaveBeenCalledWith({ email: 'user@example.com', password: 'password12345' });
  });

  test('returns the registered profile without signing in', async () => {
    bootstrapMock.mockResolvedValue({ status: 'signedOut' });
    registerMock.mockResolvedValue(profile);

    renderProvider();
    await waitFor(() => expect(captured?.status).toBe('signedOut'));

    let result: UserProfile | undefined;
    await act(async () => {
      result = await captured?.register({
        email: 'user@example.com',
        password: 'password12345',
        displayName: 'Người dùng',
      });
    });

    expect(result).toEqual(profile);
    expect(captured?.status).toBe('signedOut');
    expect(captured?.profile).toBeNull();
  });

  test('signs out after logout succeeds', async () => {
    bootstrapMock.mockResolvedValue({ status: 'authenticated', profile });
    logoutMock.mockResolvedValue(undefined);

    renderProvider();
    await waitFor(() => expect(captured?.status).toBe('signedIn'));

    await act(async () => {
      await captured?.logout();
    });

    expect(captured?.status).toBe('signedOut');
    expect(captured?.profile).toBeNull();
  });

  test('reports a logout error when the refresh token cannot be deleted', async () => {
    bootstrapMock.mockResolvedValue({ status: 'authenticated', profile });
    logoutMock.mockRejectedValue(new Error('secure store delete failed'));

    renderProvider();
    await waitFor(() => expect(captured?.status).toBe('signedIn'));

    await act(async () => {
      await captured?.logout();
    });

    expect(captured?.status).toBe('logoutError');
  });

  test('drops to signedOut when the API boundary emits an expiry', async () => {
    bootstrapMock.mockResolvedValue({ status: 'authenticated', profile });

    renderProvider();
    await waitFor(() => expect(captured?.status).toBe('signedIn'));

    await act(async () => {
      emitExpired();
    });

    expect(captured?.status).toBe('signedOut');
    expect(captured?.profile).toBeNull();
  });
});

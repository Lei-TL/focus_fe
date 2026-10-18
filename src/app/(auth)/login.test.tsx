import { act, fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import type { InternalAxiosRequestConfig } from 'axios';
import { AxiosError } from 'axios';

import LoginScreen from '@/app/(auth)/login';
import { useAuth, type AuthContextValue } from '@/context/auth-context';

jest.mock('expo-router', () => ({
  Link: () => null,
  router: { replace: jest.fn() },
}));

jest.mock('@/context/auth-context', () => ({
  useAuth: jest.fn(),
}));

const useAuthMock = useAuth as jest.Mock;

function httpError(status: number): AxiosError {
  const config = { headers: {} } as InternalAxiosRequestConfig;
  return new AxiosError('Request failed', String(status), config, undefined, {
    status,
    statusText: String(status),
    headers: {},
    config,
    data: undefined,
  });
}

function mockAuth(overrides: Partial<AuthContextValue> = {}): AuthContextValue {
  const value: AuthContextValue = {
    status: 'signedOut',
    profile: null,
    login: jest.fn(),
    register: jest.fn(),
    logout: jest.fn(),
    retryBootstrap: jest.fn(),
    retryLogout: jest.fn(),
    ...overrides,
  };
  useAuthMock.mockReturnValue(value);
  return value;
}

function fillForm() {
  fireEvent.changeText(screen.getByTestId('login-email'), 'user@example.com');
  fireEvent.changeText(screen.getByTestId('login-password'), 'password12345');
}

beforeEach(() => {
  jest.clearAllMocks();
});

describe('LoginScreen', () => {
  test('blocks submit and shows validation when fields are empty', () => {
    const value = mockAuth();

    render(<LoginScreen />);
    fireEvent.press(screen.getByTestId('login-submit'));

    expect(screen.getByTestId('login-error')).toBeTruthy();
    expect(value.login).not.toHaveBeenCalled();
  });

  test('shows a 401 message when the credentials are rejected', async () => {
    const login = jest.fn().mockRejectedValue(httpError(401));
    mockAuth({ login });

    render(<LoginScreen />);
    fillForm();
    fireEvent.press(screen.getByTestId('login-submit'));

    await waitFor(() =>
      expect(screen.getByText('Email hoặc mật khẩu không đúng.')).toBeTruthy()
    );
    expect(login).toHaveBeenCalledWith({ email: 'user@example.com', password: 'password12345' });
  });

  test('shows a 429 message when rate limited', async () => {
    const login = jest.fn().mockRejectedValue(httpError(429));
    mockAuth({ login });

    render(<LoginScreen />);
    fillForm();
    fireEvent.press(screen.getByTestId('login-submit'));

    await waitFor(() => expect(screen.getByText(/quá nhanh/)).toBeTruthy());
  });

  test('shows a loading indicator while the login is in flight', async () => {
    let release: (value: void) => void = () => undefined;
    const login = jest.fn(
      () =>
        new Promise<void>((resolve) => {
          release = resolve;
        })
    );
    mockAuth({ login });

    render(<LoginScreen />);
    fillForm();
    fireEvent.press(screen.getByTestId('login-submit'));

    expect(screen.getByTestId('login-submitting')).toBeTruthy();

    await act(async () => {
      release();
    });

    await waitFor(() => expect(screen.queryByTestId('login-submitting')).toBeNull());
  });

  test('offers a bootstrap retry when the session could not be restored', () => {
    const retryBootstrap = jest.fn();
    mockAuth({ status: 'retryableError', retryBootstrap });

    render(<LoginScreen />);

    expect(screen.getByTestId('login-retry-banner')).toBeTruthy();
    fireEvent.press(screen.getByText('Thử lại'));
    expect(retryBootstrap).toHaveBeenCalledTimes(1);
  });
});

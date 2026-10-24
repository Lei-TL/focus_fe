import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import type { InternalAxiosRequestConfig } from 'axios';
import { AxiosError } from 'axios';
import { router } from 'expo-router';

import RegisterScreen from '@/app/(auth)/register';
import { useAuth, type AuthContextValue } from '@/context/auth-context';

jest.mock('expo-router', () => ({
  Link: () => null,
  router: { replace: jest.fn() },
}));

jest.mock('@/context/auth-context', () => ({
  useAuth: jest.fn(),
}));

const useAuthMock = useAuth as jest.Mock;
const replaceMock = router.replace as jest.Mock;

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

function fillForm(password = 'password12345') {
  fireEvent.changeText(screen.getByTestId('register-displayName'), 'Người dùng');
  fireEvent.changeText(screen.getByTestId('register-email'), 'user@example.com');
  fireEvent.changeText(screen.getByTestId('register-password'), password);
}

beforeEach(() => {
  jest.clearAllMocks();
});

describe('RegisterScreen', () => {
  test('blocks submit and shows validation when fields are empty', () => {
    const value = mockAuth();

    render(<RegisterScreen />);
    fireEvent.press(screen.getByTestId('register-submit'));

    expect(screen.getByTestId('register-error')).toBeTruthy();
    expect(value.register).not.toHaveBeenCalled();
  });

  test('rejects a password shorter than the contract minimum', () => {
    const value = mockAuth();

    render(<RegisterScreen />);
    fillForm('short');
    fireEvent.press(screen.getByTestId('register-submit'));

    expect(screen.getByText(/tối thiểu 12 ký tự/)).toBeTruthy();
    expect(value.register).not.toHaveBeenCalled();
  });

  test('registers and routes back to login on success', async () => {
    const register = jest.fn().mockResolvedValue({
      id: '1',
      email: 'user@example.com',
      displayName: 'Người dùng',
      seed: 0,
      defaultSessionMinutes: 50,
      timeZoneId: 'Asia/Ho_Chi_Minh',
      role: 'Member',
    });
    mockAuth({ register });

    render(<RegisterScreen />);
    fillForm();
    fireEvent.press(screen.getByTestId('register-submit'));

    await waitFor(() => expect(replaceMock).toHaveBeenCalledWith('/(auth)/login'));
    expect(register).toHaveBeenCalledWith({
      email: 'user@example.com',
      password: 'password12345',
      displayName: 'Người dùng',
    });
  });

  test('shows a 409 message when the email already exists', async () => {
    const register = jest.fn().mockRejectedValue(httpError(409));
    mockAuth({ register });

    render(<RegisterScreen />);
    fillForm();
    fireEvent.press(screen.getByTestId('register-submit'));

    await waitFor(() => expect(screen.getByText('Email này đã được đăng ký.')).toBeTruthy());
    expect(replaceMock).not.toHaveBeenCalled();
  });

  test('shows a validation message on a 400 response', async () => {
    const register = jest.fn().mockRejectedValue(httpError(400));
    mockAuth({ register });

    render(<RegisterScreen />);
    fillForm();
    fireEvent.press(screen.getByTestId('register-submit'));

    await waitFor(() => expect(screen.getByText(/chưa hợp lệ/)).toBeTruthy());
  });
});

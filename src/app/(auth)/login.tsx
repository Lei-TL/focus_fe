import { useState } from 'react';
import { Link } from 'expo-router';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { useAuth } from '@/context/auth-context';
import { authErrorMessage } from '@/services/auth-error-message';
import { colors, radius, spacing } from '@/theme/tokens';

export default function LoginScreen() {
  const { login, status, retryBootstrap } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const onSubmit = async () => {
    if (submitting) {
      return;
    }
    setError(null);
    if (!email.trim() || !password) {
      setError('Vui lòng nhập email và mật khẩu.');
      return;
    }
    setSubmitting(true);
    try {
      await login({ email: email.trim(), password });
    } catch (submitError) {
      setError(authErrorMessage(submitError));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={styles.screen}
    >
      <View style={styles.form}>
        <Text style={styles.brand}>FOCUS</Text>
        <Text style={styles.title}>Đăng nhập</Text>

        {status === 'retryableError' ? (
          <View style={styles.banner} testID="login-retry-banner">
            <Text style={styles.bannerText}>
              Không khôi phục được phiên đăng nhập. Kiểm tra kết nối rồi thử lại.
            </Text>
            <Pressable onPress={() => void retryBootstrap()} disabled={submitting}>
              <Text style={styles.linkText}>Thử lại</Text>
            </Pressable>
          </View>
        ) : null}

        <TextInput
          style={styles.input}
          value={email}
          onChangeText={setEmail}
          placeholder="Email"
          placeholderTextColor={colors.muted}
          autoCapitalize="none"
          autoCorrect={false}
          keyboardType="email-address"
          textContentType="emailAddress"
          editable={!submitting}
          testID="login-email"
        />
        <TextInput
          style={styles.input}
          value={password}
          onChangeText={setPassword}
          placeholder="Mật khẩu"
          placeholderTextColor={colors.muted}
          secureTextEntry
          autoCapitalize="none"
          textContentType="password"
          editable={!submitting}
          testID="login-password"
        />

        {error ? (
          <Text style={styles.error} testID="login-error">
            {error}
          </Text>
        ) : null}

        <Pressable
          style={[styles.button, submitting && styles.buttonDisabled]}
          onPress={onSubmit}
          disabled={submitting}
          testID="login-submit"
        >
          {submitting ? (
            <ActivityIndicator color="#FFFFFF" testID="login-submitting" />
          ) : (
            <Text style={styles.buttonText}>Đăng nhập</Text>
          )}
        </Pressable>

        <Link href="/(auth)/register" style={styles.linkText}>
          Chưa có tài khoản? Đăng ký
        </Link>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, justifyContent: 'center', backgroundColor: colors.background },
  form: { gap: spacing.sm, padding: spacing.lg },
  brand: { color: colors.primary, fontSize: 14, fontWeight: '900', letterSpacing: 4 },
  title: { color: colors.text, fontSize: 32, fontWeight: '900', marginBottom: spacing.sm },
  input: {
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    color: colors.text,
  },
  button: { padding: spacing.md, borderRadius: radius.md, backgroundColor: colors.primary },
  buttonDisabled: { opacity: 0.6 },
  buttonText: { color: '#FFFFFF', textAlign: 'center', fontWeight: '800', fontSize: 16 },
  error: { color: colors.danger, fontWeight: '600' },
  banner: {
    gap: spacing.xs,
    padding: spacing.md,
    borderRadius: radius.md,
    backgroundColor: colors.primarySoft,
  },
  bannerText: { color: colors.text },
  linkText: { color: colors.primary, fontWeight: '700', textAlign: 'center' },
});

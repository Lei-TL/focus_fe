import { useState } from 'react';
import { Link, router } from 'expo-router';
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

const MIN_PASSWORD_LENGTH = 12;

export default function RegisterScreen() {
  const { register } = useAuth();
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const onSubmit = async () => {
    if (submitting) {
      return;
    }
    setError(null);
    if (!email.trim() || !displayName.trim() || !password) {
      setError('Vui lòng nhập đủ họ tên, email và mật khẩu.');
      return;
    }
    if (password.length < MIN_PASSWORD_LENGTH) {
      setError(`Mật khẩu cần tối thiểu ${MIN_PASSWORD_LENGTH} ký tự.`);
      return;
    }
    setSubmitting(true);
    try {
      await register({ email: email.trim(), password, displayName: displayName.trim() });
      router.replace('/(auth)/login');
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
        <Text style={styles.title}>Đăng ký</Text>

        <TextInput
          style={styles.input}
          value={displayName}
          onChangeText={setDisplayName}
          placeholder="Họ tên"
          placeholderTextColor={colors.muted}
          editable={!submitting}
          testID="register-displayName"
        />
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
          testID="register-email"
        />
        <TextInput
          style={styles.input}
          value={password}
          onChangeText={setPassword}
          placeholder="Mật khẩu"
          placeholderTextColor={colors.muted}
          secureTextEntry
          autoCapitalize="none"
          textContentType="newPassword"
          editable={!submitting}
          testID="register-password"
        />

        {error ? (
          <Text style={styles.error} testID="register-error">
            {error}
          </Text>
        ) : null}

        <Pressable
          style={[styles.button, submitting && styles.buttonDisabled]}
          onPress={onSubmit}
          disabled={submitting}
          testID="register-submit"
        >
          {submitting ? (
            <ActivityIndicator color="#FFFFFF" testID="register-submitting" />
          ) : (
            <Text style={styles.buttonText}>Tạo tài khoản</Text>
          )}
        </Pressable>

        <Link href="/(auth)/login" style={styles.linkText}>
          Đã có tài khoản? Đăng nhập
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
  linkText: { color: colors.primary, fontWeight: '700', textAlign: 'center' },
});

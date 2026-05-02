import { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { AUTH_REDIRECT_URL } from '@/lib/auth';
import { supabase } from '@/lib/supabase';
import { tokens } from '@/theme';

type Mode = 'login' | 'signup';

export default function LoginScreen() {
  const [mode, setMode] = useState<Mode>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!email.trim() || !password) {
      Alert.alert('Missing info', 'Email and password are required.');
      return;
    }
    if (password.length < 6) {
      Alert.alert('Weak password', 'Password must be at least 6 characters.');
      return;
    }

    setIsSubmitting(true);
    try {
      const { error } =
        mode === 'login'
          ? await supabase.auth.signInWithPassword({ email: email.trim(), password })
          : await supabase.auth.signUp({
              email: email.trim(),
              password,
              options: { emailRedirectTo: AUTH_REDIRECT_URL },
            });

      if (error) {
        Alert.alert(mode === 'login' ? 'Login failed' : 'Signup failed', error.message);
      } else if (mode === 'signup') {
        Alert.alert(
          'Almost there',
          'Check your email to confirm your account, then come back and log in.',
        );
        setMode('login');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={styles.inner}>
        <View style={styles.brand}>
          <Text style={styles.brandTitle}>RPG Tasks</Text>
          <Text style={styles.brandTagline}>Turn your life into an RPG</Text>
        </View>

        <View style={styles.form}>
          <Text style={styles.label}>Email</Text>
          <TextInput
            style={styles.input}
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            autoComplete="email"
            keyboardType="email-address"
            placeholder="you@example.com"
            placeholderTextColor={tokens.text.faint}
            editable={!isSubmitting}
          />

          <Text style={[styles.label, { marginTop: tokens.space[4] }]}>Password</Text>
          <TextInput
            style={styles.input}
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
            placeholder="At least 6 characters"
            placeholderTextColor={tokens.text.faint}
            editable={!isSubmitting}
          />

          <Pressable
            style={({ pressed }) => [
              styles.primaryButton,
              (pressed || isSubmitting) && styles.primaryButtonPressed,
            ]}
            onPress={handleSubmit}
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <ActivityIndicator color={tokens.text.hi} />
            ) : (
              <Text style={styles.primaryButtonText}>
                {mode === 'login' ? 'Log in' : 'Sign up'}
              </Text>
            )}
          </Pressable>

          <Pressable
            onPress={() => setMode((m) => (m === 'login' ? 'signup' : 'login'))}
            disabled={isSubmitting}
            style={styles.toggle}
          >
            <Text style={styles.toggleText}>
              {mode === 'login' ? "Don't have an account? " : 'Already have an account? '}
              <Text style={styles.toggleAction}>{mode === 'login' ? 'Sign up' : 'Log in'}</Text>
            </Text>
          </Pressable>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: tokens.bg.base,
  },
  inner: {
    flex: 1,
    paddingHorizontal: tokens.space[6],
    justifyContent: 'center',
  },
  brand: {
    alignItems: 'center',
    marginBottom: tokens.space[9],
  },
  brandTitle: {
    ...tokens.type.display,
    color: tokens.text.hi,
  },
  brandTagline: {
    ...tokens.type.body,
    color: tokens.text.mid,
    marginTop: tokens.space[2],
  },
  form: {
    gap: 0,
  },
  label: {
    ...tokens.type.eyebrow,
    color: tokens.text.mid,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: tokens.space[2],
  },
  input: {
    backgroundColor: tokens.bg.surface,
    borderWidth: 1,
    borderColor: tokens.border.base,
    borderRadius: tokens.radius.md,
    paddingHorizontal: tokens.space[4],
    paddingVertical: tokens.space[4],
    color: tokens.text.hi,
    ...tokens.type.bodyLg,
  },
  primaryButton: {
    backgroundColor: tokens.brand.violet,
    borderRadius: tokens.radius.md,
    paddingVertical: tokens.space[4],
    alignItems: 'center',
    marginTop: tokens.space[7],
  },
  primaryButtonPressed: {
    opacity: 0.8,
  },
  primaryButtonText: {
    ...tokens.type.h3,
    color: tokens.text.hi,
  },
  toggle: {
    marginTop: tokens.space[5],
    alignItems: 'center',
  },
  toggleText: {
    ...tokens.type.body,
    color: tokens.text.mid,
  },
  toggleAction: {
    color: tokens.brand.violet2,
    fontFamily: 'Manrope_700Bold',
  },
});

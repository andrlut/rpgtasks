import { useRouter } from 'expo-router';
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

import { PercevaGlyph } from '@/components/PercevaGlyph';
import { AUTH_REDIRECT_URL, localizeAuthError } from '@/lib/auth';
import { useT } from '@/lib/i18n';
import { supabase } from '@/lib/supabase';
import { tokens } from '@/theme';

type Mode = 'login' | 'signup';

export default function LoginScreen() {
  const router = useRouter();
  const { t } = useT();
  const [mode, setMode] = useState<Mode>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!email.trim() || !password) {
      Alert.alert(t('auth.errors.missingInfo'), t('auth.errors.missingInfoBody'));
      return;
    }
    if (password.length < 6) {
      Alert.alert(t('auth.errors.weakPassword'), t('auth.errors.weakPasswordBody'));
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
        Alert.alert(
          mode === 'login' ? t('auth.login.failed') : t('auth.signup.failed'),
          localizeAuthError(error, t),
        );
      } else if (mode === 'signup') {
        Alert.alert(t('auth.signup.almostThere'), t('auth.signup.checkEmail'));
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
          {/* Perceva mark above the wordmark — gilded glyph tile so the
              identity reads as "the app's logo" before the user even
              reads the name. */}
          <View style={styles.brandGlyph}>
            <PercevaGlyph size={96} bare={false} palette="gilded" idSuffix="login" />
          </View>
          <Text style={styles.brandTitle}>{t('auth.brand.title')}</Text>
          <Text style={styles.brandTagline}>{t('auth.brand.tagline')}</Text>
        </View>

        <View style={styles.form}>
          <Text style={styles.label}>{t('auth.fields.email')}</Text>
          <TextInput
            style={styles.input}
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            autoComplete="email"
            keyboardType="email-address"
            placeholder={t('auth.fields.emailPlaceholder')}
            placeholderTextColor={tokens.text.faint}
            editable={!isSubmitting}
          />

          <Text style={[styles.label, { marginTop: tokens.space[4] }]}>
            {t('auth.fields.password')}
          </Text>
          <TextInput
            style={styles.input}
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
            placeholder={t('auth.fields.passwordPlaceholder')}
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
                {mode === 'login' ? t('auth.login.submit') : t('auth.signup.submit')}
              </Text>
            )}
          </Pressable>

          {mode === 'login' && (
            <Pressable
              onPress={() => router.push('/forgot-password')}
              disabled={isSubmitting}
              style={styles.forgotLink}
              hitSlop={8}
            >
              <Text style={styles.forgotText}>{t('auth.login.forgot')}</Text>
            </Pressable>
          )}

          <Pressable
            onPress={() => setMode((m) => (m === 'login' ? 'signup' : 'login'))}
            disabled={isSubmitting}
            style={styles.toggle}
          >
            <Text style={styles.toggleText}>
              {mode === 'login' ? t('auth.login.noAccount') : t('auth.signup.hasAccount')}
              <Text style={styles.toggleAction}>
                {mode === 'login' ? t('auth.login.signUpLink') : t('auth.signup.signInLink')}
              </Text>
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
  brandGlyph: {
    marginBottom: tokens.space[4],
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
  forgotLink: {
    marginTop: tokens.space[4],
    alignItems: 'center',
  },
  forgotText: {
    ...tokens.type.caption,
    color: tokens.brand.violet2,
    fontFamily: 'Manrope_700Bold',
  },
});

import { useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
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
import {
  AUTH_REDIRECT_URL,
  CODE_MAX_LENGTH,
  CODE_MIN_LENGTH,
  localizeAuthError,
  RESEND_COOLDOWN_SECONDS,
  sanitizeCode,
} from '@/lib/auth';
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

  // Signup confirmation runs as a typed code, not an emailed link — same
  // reason as password recovery: GoTrue's 303 into `rpgtasks://` dies in
  // Chrome on Android. `awaitingCode` holds the address we signed up with.
  const [awaitingCode, setAwaitingCode] = useState<string | null>(null);
  const [code, setCode] = useState('');
  const [isResending, setIsResending] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const cooldownRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (cooldown <= 0) return;
    cooldownRef.current = setInterval(() => {
      setCooldown((c) => (c <= 1 ? 0 : c - 1));
    }, 1000);
    return () => {
      if (cooldownRef.current) clearInterval(cooldownRef.current);
    };
  }, [cooldown > 0]); // eslint-disable-line react-hooks/exhaustive-deps

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
      if (mode === 'login') {
        const { error } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password,
        });
        if (error) Alert.alert(t('auth.login.failed'), localizeAuthError(error, t));
        return;
      }

      const { data, error } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: { emailRedirectTo: AUTH_REDIRECT_URL },
      });
      if (error) {
        Alert.alert(t('auth.signup.failed'), localizeAuthError(error, t));
        return;
      }
      // A session here means the project has autoconfirm on — nothing to
      // confirm, AuthGate takes over. Otherwise collect the emailed code.
      if (data.session) return;

      // GoTrue obfuscates already-registered addresses rather than erroring,
      // so a duplicate signup returns 200 with no session and sends no email.
      // An empty `identities` array is the documented tell. Without this the
      // user is parked on a code screen waiting for a code nobody sent.
      // Copy stays neutral either way — saying "that email is taken" would
      // hand an attacker an account-enumeration oracle.
      if (data.user?.identities?.length === 0) {
        Alert.alert(t('auth.signup.maybeExists'), t('auth.signup.maybeExistsBody'));
        setMode('login');
        setPassword('');
        return;
      }

      setAwaitingCode(email.trim());
      setCode('');
      setCooldown(RESEND_COOLDOWN_SECONDS);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleVerify = async () => {
    if (!awaitingCode) return;
    const trimmedCode = code.trim();
    if (trimmedCode.length < CODE_MIN_LENGTH) {
      Alert.alert(t('auth.forgot.codeNeeded'), t('auth.forgot.codeNeededBody'));
      return;
    }

    setIsSubmitting(true);
    try {
      // type 'signup' both confirms the address and returns a session, so
      // AuthGate routes onward with no extra sign-in step.
      const { error } = await supabase.auth.verifyOtp({
        email: awaitingCode,
        token: trimmedCode,
        type: 'signup',
      });
      if (error) {
        Alert.alert(t('auth.forgot.couldNotVerify'), localizeAuthError(error, t));
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResendSignup = async () => {
    if (!awaitingCode) return;
    setIsResending(true);
    try {
      // `resend` accepts 'signup' | 'email_change' | 'sms' | 'phone_change'
      // — notably NOT 'recovery', which is why the reset screen re-calls
      // resetPasswordForEmail instead of this.
      const { error } = await supabase.auth.resend({
        type: 'signup',
        email: awaitingCode,
        options: { emailRedirectTo: AUTH_REDIRECT_URL },
      });
      if (error) {
        Alert.alert(t('auth.forgot.couldNotSend'), localizeAuthError(error, t));
        return;
      }
      setCode('');
      setCooldown(RESEND_COOLDOWN_SECONDS);
      Alert.alert(t('auth.forgot.resent'), t('auth.forgot.resentBody', { email: awaitingCode }));
    } finally {
      setIsResending(false);
    }
  };

  /** Abandon the pending confirmation and go back to the credentials form. */
  const handleAbandonCode = () => {
    setAwaitingCode(null);
    setCode('');
    setCooldown(0);
    setMode('login');
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

        {awaitingCode ? (
          <View style={styles.form}>
            <Text style={styles.confirmTitle}>{t('auth.signup.confirmTitle')}</Text>
            <Text style={styles.confirmSub}>
              {t('auth.signup.confirmBody', { email: awaitingCode })}
            </Text>

            <Text style={[styles.label, { marginTop: tokens.space[6] }]}>
              {t('auth.forgot.codeLabel')}
            </Text>
            <TextInput
              style={[styles.input, styles.codeInput]}
              value={code}
              onChangeText={(v) => setCode(sanitizeCode(v))}
              keyboardType="number-pad"
              maxLength={CODE_MAX_LENGTH}
              placeholder={t('auth.forgot.codePlaceholder')}
              placeholderTextColor={tokens.text.faint}
              editable={!isSubmitting}
              autoFocus
            />

            <Pressable
              style={({ pressed }) => [
                styles.primaryButton,
                (pressed || isSubmitting) && styles.primaryButtonPressed,
              ]}
              onPress={handleVerify}
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <ActivityIndicator color={tokens.text.hi} />
              ) : (
                <Text style={styles.primaryButtonText}>{t('auth.signup.confirmSubmit')}</Text>
              )}
            </Pressable>

            <Pressable
              onPress={handleResendSignup}
              disabled={isResending || cooldown > 0}
              style={({ pressed }) => [styles.toggle, pressed && { opacity: 0.6 }]}
            >
              {isResending ? (
                <ActivityIndicator color={tokens.text.mid} />
              ) : (
                <Text style={[styles.toggleText, cooldown > 0 && styles.toggleTextMuted]}>
                  {cooldown > 0
                    ? t('auth.forgot.resendIn', { seconds: cooldown })
                    : t('auth.forgot.resend')}
                </Text>
              )}
            </Pressable>

            <Pressable
              onPress={handleAbandonCode}
              disabled={isSubmitting || isResending}
              style={({ pressed }) => [styles.toggleTight, pressed && { opacity: 0.6 }]}
            >
              <Text style={styles.toggleText}>{t('auth.signup.confirmLater')}</Text>
            </Pressable>
          </View>
        ) : (
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
        )}
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
  toggleTight: {
    marginTop: tokens.space[3],
    alignItems: 'center',
  },
  toggleTextMuted: {
    color: tokens.text.faint,
  },
  confirmTitle: {
    ...tokens.type.h2,
    color: tokens.text.hi,
    textAlign: 'center',
  },
  confirmSub: {
    ...tokens.type.body,
    color: tokens.text.mid,
    textAlign: 'center',
    marginTop: tokens.space[2],
    paddingHorizontal: tokens.space[2],
  },
  codeInput: {
    textAlign: 'center',
    letterSpacing: 6,
    ...tokens.type.h2,
    color: tokens.text.hi,
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

import { Ionicons } from '@expo/vector-icons';
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

import { AUTH_REDIRECT_URL } from '@/lib/auth';
import { useT } from '@/lib/i18n';
import { supabase } from '@/lib/supabase';
import { tokens } from '@/theme';

export default function ForgotPasswordScreen() {
  const router = useRouter();
  const { t } = useT();
  const [email, setEmail] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSubmit = async () => {
    const trimmed = email.trim();
    if (!trimmed) {
      Alert.alert(t('auth.forgot.emailNeeded'), t('auth.forgot.emailNeededBody'));
      return;
    }

    setIsSubmitting(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(trimmed, {
        redirectTo: AUTH_REDIRECT_URL,
      });
      if (error) {
        const msg = /rate limit/i.test(error.message)
          ? t('auth.forgot.rateLimited')
          : error.message;
        Alert.alert(t('auth.forgot.couldNotSend'), msg);
        return;
      }
      setSent(true);
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
        <Pressable
          onPress={() => router.back()}
          style={({ pressed }) => [styles.backLink, pressed && { opacity: 0.6 }]}
          hitSlop={8}
        >
          <Ionicons name="chevron-back" size={20} color={tokens.text.hi} />
          <Text style={styles.backText}>{t('auth.forgot.back')}</Text>
        </Pressable>

        <View style={styles.brand}>
          <Text style={styles.brandTitle}>{t('auth.forgot.title')}</Text>
          <Text style={styles.brandTagline}>{t('auth.forgot.subtitle')}</Text>
        </View>

        {sent ? (
          <View style={styles.successBox}>
            <Ionicons name="mail" size={36} color={tokens.semantic.xp} />
            <Text style={styles.successTitle}>{t('auth.forgot.emailSent')}</Text>
            <Text style={styles.successSub}>
              {t('auth.forgot.emailSentBody', { email: email.trim() })}
            </Text>
            <Pressable
              style={({ pressed }) => [
                styles.primaryButton,
                pressed && styles.primaryButtonPressed,
              ]}
              onPress={() => router.replace('/login')}
            >
              <Text style={styles.primaryButtonText}>{t('auth.forgot.done')}</Text>
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
              autoFocus
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
                <Text style={styles.primaryButtonText}>{t('auth.forgot.submit')}</Text>
              )}
            </Pressable>
          </View>
        )}
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: tokens.bg.base },
  inner: {
    flex: 1,
    paddingHorizontal: tokens.space[6],
    justifyContent: 'center',
  },
  backLink: {
    position: 'absolute',
    top: tokens.space[7],
    left: tokens.space[5],
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  backText: {
    ...tokens.type.body,
    color: tokens.text.hi,
  },
  brand: { alignItems: 'center', marginBottom: tokens.space[8] },
  brandTitle: { ...tokens.type.display, color: tokens.text.hi },
  brandTagline: {
    ...tokens.type.body,
    color: tokens.text.mid,
    marginTop: tokens.space[2],
    textAlign: 'center',
  },
  form: { gap: 0 },
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
  primaryButtonPressed: { opacity: 0.8 },
  primaryButtonText: { ...tokens.type.h3, color: tokens.text.hi },
  successBox: {
    alignItems: 'center',
    gap: tokens.space[3],
    paddingHorizontal: tokens.space[2],
  },
  successTitle: {
    ...tokens.type.h2,
    color: tokens.text.hi,
  },
  successSub: {
    ...tokens.type.body,
    color: tokens.text.mid,
    textAlign: 'center',
    paddingHorizontal: tokens.space[4],
  },
});

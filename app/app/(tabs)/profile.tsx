import { Ionicons } from '@expo/vector-icons';
import Constants from 'expo-constants';
import { useRouter } from 'expo-router';
import * as Updates from 'expo-updates';
import { useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useBottomNavClearance } from '@/components/BottomNavBar';
import { useCharacter } from '@/lib/api/character';
import { useSession } from '@/lib/auth';
import { useT } from '@/lib/i18n';
import {
  useLoadedSettings,
  useSettingsStore,
  type LanguageCode,
  type ThemeMode,
  type WeekStart,
} from '@/lib/settings';
import { supabase } from '@/lib/supabase';
import { confirmAction, showInfo } from '@/lib/util/confirm';
import { tokens } from '@/theme';

import { PremiumBadge } from '@/components/PremiumBadge';
import { UsernameEditModal } from '@/components/UsernameEditModal';

export default function SettingsScreen() {
  const router = useRouter();
  const character = useCharacter();
  const session = useSession();
  const settings = useLoadedSettings();
  const setSetting = useSettingsStore((s) => s.set);
  const { t } = useT();

  const profile = character.data?.profile;
  const email = session.user?.email ?? '—';
  const [usernameOpen, setUsernameOpen] = useState(false);
  const [isCheckingUpdate, setIsCheckingUpdate] = useState(false);
  const bottomClearance = useBottomNavClearance();

  const handleSignOut = async () => {
    const ok = await confirmAction(
      t('profile.actions.confirmSignOut'),
      t('profile.actions.confirmSignOutBody'),
      {
        okText: t('profile.actions.signOut'),
        cancelText: t('common.cancel'),
        destructive: true,
      },
    );
    if (!ok) return;
    await supabase.auth.signOut();
  };

  const handleDeleteAccount = async () => {
    const ok = await confirmAction(
      t('profile.actions.confirmDelete'),
      t('profile.actions.confirmDeleteBody'),
      {
        okText: t('common.delete'),
        cancelText: t('common.cancel'),
        destructive: true,
      },
    );
    if (!ok) return;
    try {
      // Permanently deletes the auth user + cascades all personal data,
      // server-side (supabase/functions/delete-account). Then sign out so the
      // AuthGate drops the user back to login.
      const { error } = await supabase.functions.invoke('delete-account', {
        method: 'POST',
      });
      if (error) throw error;
      // The account is gone; the session is already invalid server-side, so
      // local signOut is best-effort (the AuthGate redirects to login either way).
      await supabase.auth.signOut().catch(() => {});
    } catch (e) {
      const msg = e instanceof Error ? e.message : t('common.unknownError');
      showInfo(t('profile.actions.deleteFailTitle'), msg);
    }
  };

  const handleReplayOnboarding = () => {
    // Opens the per-module replay screen (M0…M6 + "Refazer tour
    // completo"). Each module's reset + navigation is handled there, so
    // this no longer wipes onboarding/tour state up front.
    router.push('/tour-replay');
  };

  const handleCheckForUpdate = async () => {
    if (isCheckingUpdate) return;
    if (__DEV__) {
      showInfo(t('profile.update.devMode'), t('profile.update.devModeBody'));
      return;
    }
    setIsCheckingUpdate(true);
    try {
      const result = await Updates.checkForUpdateAsync();
      if (result.isAvailable) {
        await Updates.fetchUpdateAsync();
        const ok = await confirmAction(
          t('profile.update.ready'),
          t('profile.update.readyBody'),
          {
            okText: t('profile.update.restart'),
            cancelText: t('profile.update.later'),
          },
        );
        if (ok) await Updates.reloadAsync();
      } else {
        showInfo(t('profile.update.upToDate'), t('profile.update.upToDateBody'));
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : t('profile.update.unknownError');
      showInfo(t('profile.update.couldNotCheck'), msg);
    } finally {
      setIsCheckingUpdate(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView contentContainerStyle={[styles.content, { paddingBottom: bottomClearance }]} showsVerticalScrollIndicator={false}>
        <View style={styles.titleRow}>
          <Text style={styles.screenTitle}>{t('profile.title')}</Text>
          {profile?.subscription_tier === 'premium' && <PremiumBadge size="sm" />}
        </View>

        {/* ───── PERCEVA PREMIUM ───── */}
        <SectionHeader icon="sparkles-outline" label={t('premium.settingsRow')} />
        <Card>
          <ButtonRow
            icon="star-outline"
            label={t('premium.settingsRowSub')}
            onPress={() => router.push('/premium?source=settings')}
            chevron
          />
        </Card>

        {/* ───── ACCOUNT ───── */}
        <SectionHeader icon="person-outline" label={t('profile.sections.account')} />
        <Card>
          <InfoRow label={t('profile.fields.email')} value={email} />
          <Divider />
          <ButtonRow
            icon="at-outline"
            label={t('profile.fields.username')}
            value={profile?.display_name ?? '—'}
            onPress={() => setUsernameOpen(true)}
            chevron
          />
          <Divider />
          <ButtonRow
            icon="log-out-outline"
            label={t('profile.actions.signOut')}
            onPress={handleSignOut}
            danger
          />
          <Divider />
          <ButtonRow
            icon="trash-outline"
            label={t('profile.actions.deleteAccount')}
            onPress={handleDeleteAccount}
            danger
          />
        </Card>

        {/* ───── PREFERENCES ───── */}
        <SectionHeader icon="options-outline" label={t('profile.sections.preferences')} />
        <Card>
          <SegmentedRow<ThemeMode>
            label={t('profile.fields.theme')}
            value={settings.theme}
            options={[
              { value: 'light', label: t('profile.theme.light') },
              { value: 'dark', label: t('profile.theme.dark') },
              { value: 'system', label: t('profile.theme.system') },
            ]}
            onChange={(v) => setSetting('theme', v)}
            note={settings.theme !== 'dark' ? t('profile.theme.note') : undefined}
          />
          <Divider />
          <SegmentedRow<LanguageCode>
            label={t('profile.fields.language')}
            value={settings.language}
            options={[
              { value: 'en', label: t('profile.language.english') },
              { value: 'pt', label: t('profile.language.portuguese') },
            ]}
            onChange={(v) => setSetting('language', v)}
          />
          <Divider />
          <SegmentedRow<WeekStart>
            label={t('profile.fields.weekStart')}
            value={settings.weekStart}
            options={[
              { value: 'sunday', label: t('profile.weekStart.sunday') },
              { value: 'monday', label: t('profile.weekStart.monday') },
            ]}
            onChange={(v) => setSetting('weekStart', v)}
          />
        </Card>

        {/* ───── NOTIFICATIONS ───── */}
        <SectionHeader icon="notifications-outline" label={t('profile.sections.notifications')} />
        <Card>
          <ToggleRow
            label={t('profile.notifications.master')}
            description={t('profile.notifications.masterDescription')}
            value={settings.notificationsEnabled}
            onChange={(v) => setSetting('notificationsEnabled', v)}
          />
          <Divider />
          <ToggleRow
            label={t('profile.notifications.mood')}
            description={t('profile.notifications.moodDescription')}
            value={settings.moodCheckinPrompt}
            onChange={(v) => setSetting('moodCheckinPrompt', v)}
          />
          <Divider />
          <ToggleRow
            label={t('profile.notifications.daily')}
            description={t('profile.notifications.dailyDescription')}
            value={settings.dailyReminder}
            onChange={(v) => setSetting('dailyReminder', v)}
            disabled={!settings.notificationsEnabled}
          />
          <NoteText>{t('profile.notifications.footnote')}</NoteText>
        </Card>

        {/* ───── TASKS & PROGRESS ───── */}
        <SectionHeader icon="trophy-outline" label={t('profile.sections.tasksProgress')} />
        <Card>
          <InfoRow
            label={t('profile.fields.dayResetTime')}
            value={t('profile.fields.midnight')}
            muted
          />
        </Card>

        {/* ───── ABOUT ───── */}
        <SectionHeader icon="information-circle-outline" label={t('profile.sections.about')} />
        <Card>
          <ButtonRow
            icon="play-circle-outline"
            label={t('profile.actions.replayOnboarding')}
            onPress={handleReplayOnboarding}
          />
          <Divider />
          <ButtonRow
            icon={isCheckingUpdate ? 'sync' : 'cloud-download-outline'}
            label={
              isCheckingUpdate ? t('profile.actions.checking') : t('profile.actions.checkForUpdates')
            }
            onPress={handleCheckForUpdate}
            disabled={isCheckingUpdate}
            spinning={isCheckingUpdate}
          />
        </Card>

        <Text style={styles.footer}>
          {t('profile.footer', { version: Constants.expoConfig?.version ?? '0' })}
          {Updates.updateId
            ? `\n${t('profile.footerUpdate', { id: Updates.updateId.slice(0, 8) })}`
            : ''}
        </Text>
      </ScrollView>

      <UsernameEditModal
        visible={usernameOpen}
        currentValue={profile?.display_name ?? ''}
        onClose={() => setUsernameOpen(false)}
      />
    </SafeAreaView>
  );
}

// ────────────────────────────────────────────────────────────────────────────
// Building blocks (kept local — they're styled specifically for this screen).
// ────────────────────────────────────────────────────────────────────────────

function SectionHeader({
  icon,
  label,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
}) {
  return (
    <View style={styles.sectionHeader}>
      <Ionicons name={icon} size={14} color={tokens.text.mid} />
      <Text style={styles.sectionLabel}>{label}</Text>
    </View>
  );
}

function Card({ children }: { children: React.ReactNode }) {
  return <View style={styles.card}>{children}</View>;
}

function Divider() {
  return <View style={styles.divider} />;
}

function InfoRow({ label, value, muted }: { label: string; value: string; muted?: boolean }) {
  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={[styles.rowValue, muted && { color: tokens.text.dim }]} numberOfLines={1}>
        {value}
      </Text>
    </View>
  );
}

function ButtonRow({
  icon,
  label,
  value,
  onPress,
  chevron,
  danger,
  disabled,
  spinning,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value?: string;
  onPress: () => void;
  chevron?: boolean;
  danger?: boolean;
  disabled?: boolean;
  spinning?: boolean;
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [styles.row, pressed && !disabled && { opacity: 0.6 }]}
    >
      <View style={styles.buttonLeft}>
        {spinning ? (
          <ActivityIndicator size="small" color={tokens.brand.violet2} style={{ width: 22 }} />
        ) : (
          <Ionicons
            name={icon}
            size={20}
            color={danger ? tokens.semantic.danger : tokens.brand.violet2}
          />
        )}
        <Text style={[styles.rowLabel, danger && { color: tokens.semantic.danger }]}>
          {label}
        </Text>
      </View>
      {value ? (
        <Text style={styles.rowValue} numberOfLines={1}>
          {value}
        </Text>
      ) : null}
      {chevron ? <Ionicons name="chevron-forward" size={18} color={tokens.text.dim} /> : null}
    </Pressable>
  );
}

function ToggleRow({
  label,
  description,
  value,
  onChange,
  disabled,
}: {
  label: string;
  description?: string;
  value: boolean;
  onChange: (v: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <View style={[styles.row, { alignItems: 'center' }]}>
      <View style={{ flex: 1, marginRight: tokens.space[3] }}>
        <Text style={[styles.rowLabel, disabled && { color: tokens.text.dim }]}>
          {label}
        </Text>
        {description ? <Text style={styles.rowDescription}>{description}</Text> : null}
      </View>
      <Switch
        value={value}
        onValueChange={onChange}
        disabled={disabled}
        trackColor={{ false: tokens.bg.surface2, true: tokens.brand.violet }}
        thumbColor={tokens.text.hi}
      />
    </View>
  );
}

interface SegmentedRowProps<T extends string> {
  label: string;
  value: T;
  options: { value: T; label: string }[];
  onChange: (v: T) => void;
  note?: string;
}

function SegmentedRow<T extends string>({
  label,
  value,
  options,
  onChange,
  note,
}: SegmentedRowProps<T>) {
  return (
    <View style={[styles.row, { flexDirection: 'column', alignItems: 'stretch', gap: 8 }]}>
      <Text style={styles.rowLabel}>{label}</Text>
      <View style={styles.segmented}>
        {options.map((opt) => {
          const active = opt.value === value;
          return (
            <Pressable
              key={opt.value}
              onPress={() => onChange(opt.value)}
              style={[styles.segment, active && styles.segmentActive]}
            >
              <Text
                style={[
                  styles.segmentLabel,
                  { color: active ? tokens.text.hi : tokens.text.mid },
                ]}
              >
                {opt.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
      {note ? <Text style={styles.rowDescription}>{note}</Text> : null}
    </View>
  );
}

function NoteText({ children }: { children: React.ReactNode }) {
  return <Text style={[styles.rowDescription, { padding: tokens.space[3] }]}>{children}</Text>;
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: tokens.bg.base },
  content: {
    padding: tokens.space[4],
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: tokens.space[3],
    flexWrap: 'wrap',
    marginTop: tokens.space[2],
    marginBottom: tokens.space[5],
  },
  screenTitle: {
    ...tokens.type.h1,
    color: tokens.text.hi,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: tokens.space[5],
    marginBottom: tokens.space[2],
    paddingLeft: tokens.space[1],
  },
  sectionLabel: {
    ...tokens.type.eyebrow,
    color: tokens.text.mid,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  card: {
    backgroundColor: tokens.bg.surface,
    borderRadius: tokens.radius.lg,
    borderWidth: 1,
    borderColor: tokens.border.base,
    overflow: 'hidden',
  },
  divider: {
    height: 1,
    backgroundColor: tokens.border.base,
    marginHorizontal: tokens.space[4],
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: tokens.space[3],
    paddingHorizontal: tokens.space[4],
    paddingVertical: tokens.space[4],
  },
  buttonLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: tokens.space[3],
    flex: 1,
  },
  rowLabel: {
    ...tokens.type.body,
    color: tokens.text.hi,
    fontFamily: 'Manrope_700Bold',
  },
  rowValue: {
    ...tokens.type.body,
    color: tokens.text.mid,
    flexShrink: 1,
    textAlign: 'right',
  },
  rowDescription: {
    ...tokens.type.caption,
    color: tokens.text.dim,
    marginTop: 4,
    lineHeight: 16,
  },
  segmented: {
    flexDirection: 'row',
    backgroundColor: tokens.bg.surface2,
    borderRadius: tokens.radius.md,
    padding: 3,
  },
  segment: {
    flex: 1,
    paddingVertical: tokens.space[2],
    alignItems: 'center',
    borderRadius: tokens.radius.sm,
  },
  segmentActive: {
    backgroundColor: tokens.brand.violet,
  },
  segmentLabel: {
    ...tokens.type.caption,
    fontFamily: 'Manrope_700Bold',
  },
  footer: {
    ...tokens.type.caption,
    color: tokens.text.faint,
    textAlign: 'center',
    marginTop: tokens.space[7],
  },
});

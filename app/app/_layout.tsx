import { AbrilFatface_400Regular } from '@expo-google-fonts/abril-fatface';
import { BebasNeue_400Regular } from '@expo-google-fonts/bebas-neue';
import { DMSerifDisplay_400Regular } from '@expo-google-fonts/dm-serif-display';
import {
  Manrope_500Medium,
  Manrope_600SemiBold,
  Manrope_700Bold,
  Manrope_800ExtraBold,
  useFonts,
} from '@expo-google-fonts/manrope';
import { PlayfairDisplay_700Bold } from '@expo-google-fonts/playfair-display';
import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import 'react-native-reanimated';

import { ConfirmHost } from '@/components/ConfirmHost';
import { InstrumentTeaserHost } from '@/components/premium/InstrumentTeaserHost';
import { useColorScheme } from '@/hooks/use-color-scheme';
import {
  useAuthDeepLink,
  useRecoveryStore,
  useRegisterRecoveryListener,
  useSession,
} from '@/lib/auth';
import { useNotificationsSetup } from '@/lib/notifications/useNotificationsSetup';
import { useLoadOnboarding } from '@/lib/onboarding';
import { useModuleStatus, useTourReady } from '@/lib/tour/store';

export const unstable_settings = {
  anchor: '(tabs)',
};

function AuthGate({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading, user } = useSession();
  const isRecovering = useRecoveryStore((s) => s.isRecovering);
  const segments = useSegments();
  const router = useRouter();
  const onboardingStatus = useLoadOnboarding();
  // Hydrate the post-login tour store keyed on the current user id —
  // status reads default to `pending` until ready, so the redirect
  // never fires with stale data from a previous account.
  const tourReady = useTourReady(user?.id ?? null);
  const m0Status = useModuleStatus('M0');
  useAuthDeepLink();
  useRegisterRecoveryListener();

  useEffect(() => {
    if (isLoading || onboardingStatus === 'unknown') return;
    const top = segments[0];
    const onLogin = top === 'login';
    const onOnboarding = top === 'onboarding';
    const onForgot = top === 'forgot-password';
    const onReset = top === 'reset-password';
    const onTour = top === 'tour';

    // Password recovery overrides everything else: the user has a session
    // (set by the email link) but they need to choose a new password before
    // we let them anywhere else.
    if (isAuthenticated && isRecovering) {
      if (!onReset) router.replace('/reset-password');
      return;
    }

    if (isAuthenticated) {
      if (onLogin || onForgot || onReset) router.replace('/');
      // Allow deliberate replay: if onboardingStatus was reset to 'unseen',
      // an authenticated user can sit on /onboarding until they finish it.
      if (onOnboarding && onboardingStatus === 'seen') router.replace('/');
      // Post-login product tour — gate on first M0 status only. Once
      // the user finishes or skips M0, we never auto-redirect again.
      // tourReady prevents flashing /tour on cold start before the
      // store hydrates from AsyncStorage.
      if (
        tourReady &&
        m0Status === 'pending' &&
        !onTour &&
        !onOnboarding &&
        onboardingStatus === 'seen'
      ) {
        router.replace('/tour/m0');
      }
      return;
    }

    // not authenticated
    if (onboardingStatus === 'unseen') {
      if (!onOnboarding && !onForgot) router.replace('/onboarding');
    } else {
      if (!onLogin && !onForgot) router.replace('/login');
    }
  }, [
    isAuthenticated,
    isRecovering,
    isLoading,
    onboardingStatus,
    segments,
    router,
    tourReady,
    m0Status,
  ]);

  return <>{children}</>;
}

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const [queryClient] = useState(() => new QueryClient());
  // Push-notification system — installs the foreground handler, reacts
  // to the Settings master switch, and re-stamps the daily "open" on
  // foreground events. No-op until the user toggles notifications on.
  useNotificationsSetup();
  const [fontsLoaded] = useFonts({
    Manrope_500Medium,
    Manrope_600SemiBold,
    Manrope_700Bold,
    Manrope_800ExtraBold,
    // Display fonts for Learning material book-cover titles. Each material
    // gets one of these picked deterministically from its slug — gives the
    // feed a "shelf of varied book covers" feel instead of one app font.
    PlayfairDisplay_700Bold,
    BebasNeue_400Regular,
    AbrilFatface_400Regular,
    DMSerifDisplay_400Regular,
  });

  if (!fontsLoaded) {
    return null;
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <QueryClientProvider client={queryClient}>
        <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
          <AuthGate>
            <Stack>
            <Stack.Screen name="onboarding" options={{ headerShown: false }} />
            <Stack.Screen name="login" options={{ headerShown: false }} />
            <Stack.Screen name="forgot-password" options={{ headerShown: false }} />
            <Stack.Screen name="reset-password" options={{ headerShown: false }} />
            <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
            <Stack.Screen name="tour/m0" options={{ headerShown: false }} />
            <Stack.Screen name="tour/m0-5" options={{ headerShown: false }} />
            <Stack.Screen name="tour/wrap" options={{ headerShown: false }} />
            <Stack.Screen name="tour-replay" options={{ headerShown: false }} />
            <Stack.Screen
              name="task-form"
              options={{ presentation: 'modal', headerShown: false }}
            />
            <Stack.Screen
              name="reward-form"
              options={{ presentation: 'modal', headerShown: false }}
            />
            <Stack.Screen
              name="rewards-manage"
              options={{ presentation: 'modal', headerShown: false }}
            />
            <Stack.Screen
              name="rewards-bank"
              options={{ presentation: 'modal', headerShown: false }}
            />
            <Stack.Screen
              name="rewards-history"
              options={{ presentation: 'modal', headerShown: false }}
            />
            <Stack.Screen name="skill/[id]" options={{ headerShown: false }} />
            <Stack.Screen name="material/[slug]" options={{ headerShown: false }} />
            <Stack.Screen name="skills" options={{ headerShown: false }} />
            <Stack.Screen name="tasks" options={{ headerShown: false }} />
            <Stack.Screen name="history" options={{ headerShown: false }} />
            <Stack.Screen
              name="dedicacao-history"
              options={{ headerShown: false }}
            />
            <Stack.Screen
              name="skill-form"
              options={{ presentation: 'modal', headerShown: false }}
            />
            <Stack.Screen
              name="dimension/[id]"
              options={{ presentation: 'modal', headerShown: false }}
            />
            <Stack.Screen
              name="sub/[id]"
              options={{ presentation: 'modal', headerShown: false }}
            />
            <Stack.Screen
              name="quests"
              options={{ presentation: 'modal', headerShown: false }}
            />
            <Stack.Screen
              name="goals"
              options={{ presentation: 'modal', headerShown: false }}
            />
            <Stack.Screen
              name="quest-detail/[id]"
              options={{ headerShown: false }}
            />
            <Stack.Screen
              name="quest-create"
              options={{ presentation: 'modal', headerShown: false }}
            />
            <Stack.Screen
              name="self-assessment"
              options={{ presentation: 'modal', headerShown: false }}
            />
            <Stack.Screen
              name="questionnaire"
              options={{ presentation: 'modal', headerShown: false }}
            />
            <Stack.Screen
              name="profile-mirror"
              options={{ presentation: 'modal', headerShown: false }}
            />
            <Stack.Screen
              name="big-five"
              options={{ presentation: 'modal', headerShown: false }}
            />
            <Stack.Screen
              name="schwartz"
              options={{ presentation: 'modal', headerShown: false }}
            />
            <Stack.Screen
              name="ecr-r"
              options={{ presentation: 'modal', headerShown: false }}
            />
            <Stack.Screen
              name="disc"
              options={{ presentation: 'modal', headerShown: false }}
            />
            <Stack.Screen
              name="strengths"
              options={{ presentation: 'modal', headerShown: false }}
            />
            <Stack.Screen
              name="types"
              options={{ presentation: 'modal', headerShown: false }}
            />
            <Stack.Screen
              name="premium"
              options={{ presentation: 'modal', headerShown: false }}
            />
            <Stack.Screen name="modal" options={{ presentation: 'modal', title: 'Modal' }} />
          </Stack>
        </AuthGate>
        <ConfirmHost />
        <InstrumentTeaserHost />
        <StatusBar style="light" />
      </ThemeProvider>
    </QueryClientProvider>
    </GestureHandlerRootView>
  );
}

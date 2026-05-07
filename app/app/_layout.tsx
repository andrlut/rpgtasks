import {
  Manrope_500Medium,
  Manrope_600SemiBold,
  Manrope_700Bold,
  Manrope_800ExtraBold,
  useFonts,
} from '@expo-google-fonts/manrope';
import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import 'react-native-reanimated';

import { useColorScheme } from '@/hooks/use-color-scheme';
import {
  useAuthDeepLink,
  useRecoveryStore,
  useRegisterRecoveryListener,
  useSession,
} from '@/lib/auth';
import { useLoadOnboarding } from '@/lib/onboarding';

export const unstable_settings = {
  anchor: '(tabs)',
};

function AuthGate({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useSession();
  const isRecovering = useRecoveryStore((s) => s.isRecovering);
  const segments = useSegments();
  const router = useRouter();
  const onboardingStatus = useLoadOnboarding();
  useAuthDeepLink();
  useRegisterRecoveryListener();

  useEffect(() => {
    if (isLoading || onboardingStatus === 'unknown') return;
    const top = segments[0];
    const onLogin = top === 'login';
    const onOnboarding = top === 'onboarding';
    const onForgot = top === 'forgot-password';
    const onReset = top === 'reset-password';

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
      return;
    }

    // not authenticated
    if (onboardingStatus === 'unseen') {
      if (!onOnboarding && !onForgot) router.replace('/onboarding');
    } else {
      if (!onLogin && !onForgot) router.replace('/login');
    }
  }, [isAuthenticated, isRecovering, isLoading, onboardingStatus, segments, router]);

  return <>{children}</>;
}

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const [queryClient] = useState(() => new QueryClient());
  const [fontsLoaded] = useFonts({
    Manrope_500Medium,
    Manrope_600SemiBold,
    Manrope_700Bold,
    Manrope_800ExtraBold,
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
            <Stack.Screen
              name="task-form"
              options={{ presentation: 'modal', headerShown: false }}
            />
            <Stack.Screen
              name="reward-form"
              options={{ presentation: 'modal', headerShown: false }}
            />
            <Stack.Screen name="skill/[id]" options={{ headerShown: false }} />
            <Stack.Screen name="skills" options={{ headerShown: false }} />
            <Stack.Screen name="tasks" options={{ headerShown: false }} />
            <Stack.Screen
              name="skill-form"
              options={{ presentation: 'modal', headerShown: false }}
            />
            <Stack.Screen
              name="dimension/[id]"
              options={{ presentation: 'modal', headerShown: false }}
            />
            <Stack.Screen
              name="quests"
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
            <Stack.Screen name="modal" options={{ presentation: 'modal', title: 'Modal' }} />
          </Stack>
        </AuthGate>
        <StatusBar style="light" />
      </ThemeProvider>
    </QueryClientProvider>
    </GestureHandlerRootView>
  );
}

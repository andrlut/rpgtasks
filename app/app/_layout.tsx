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
import 'react-native-reanimated';

import { useColorScheme } from '@/hooks/use-color-scheme';
import { useSession } from '@/lib/auth';
import { useLoadOnboarding } from '@/lib/onboarding';

export const unstable_settings = {
  anchor: '(tabs)',
};

function AuthGate({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useSession();
  const segments = useSegments();
  const router = useRouter();
  const onboardingStatus = useLoadOnboarding();

  useEffect(() => {
    if (isLoading || onboardingStatus === 'unknown') return;
    const top = segments[0];
    const onLogin = top === 'login';
    const onOnboarding = top === 'onboarding';

    if (isAuthenticated) {
      if (onLogin) router.replace('/');
      // Allow deliberate replay: if onboardingStatus was reset to 'unseen',
      // an authenticated user can sit on /onboarding until they finish it.
      if (onOnboarding && onboardingStatus === 'seen') router.replace('/');
      return;
    }

    // not authenticated
    if (onboardingStatus === 'unseen') {
      if (!onOnboarding) router.replace('/onboarding');
    } else {
      if (!onLogin) router.replace('/login');
    }
  }, [isAuthenticated, isLoading, onboardingStatus, segments, router]);

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
    <QueryClientProvider client={queryClient}>
      <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
        <AuthGate>
          <Stack>
            <Stack.Screen name="onboarding" options={{ headerShown: false }} />
            <Stack.Screen name="login" options={{ headerShown: false }} />
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
            <Stack.Screen
              name="dimension/[id]"
              options={{ presentation: 'modal', headerShown: false }}
            />
            <Stack.Screen name="modal" options={{ presentation: 'modal', title: 'Modal' }} />
          </Stack>
        </AuthGate>
        <StatusBar style="light" />
      </ThemeProvider>
    </QueryClientProvider>
  );
}

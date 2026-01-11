/**
 * Leonardo School Mobile - Root Layout
 * 
 * Layout principale dell'app con provider e navigazione.
 */

import React, { useEffect } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import * as SplashScreen from 'expo-splash-screen';

import { ThemeProvider, useTheme } from '../contexts/ThemeContext';
import { TRPCProvider, createTRPCReactClient } from '../lib/trpc';
import { useAuthStore } from '../stores/authStore';
import { colors } from '../lib/theme/colors';
import { config } from '../lib/config';

// Keep the splash screen visible while we fetch resources
SplashScreen.preventAutoHideAsync();

// Create clients
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: config.cache.defaultStaleTime,
      gcTime: config.cache.defaultCacheTime,
      retry: 2,
      refetchOnWindowFocus: false,
    },
    mutations: {
      retry: 1,
    },
  },
});

const trpcClient = createTRPCReactClient();

function RootLayoutNav() {
  const { isDark } = useTheme();
  const { initialize } = useAuthStore();

  useEffect(() => {
    async function prepare() {
      try {
        // Initialize auth state from storage
        await initialize();
      } catch (error) {
        console.error('[App] Initialization error:', error);
      } finally {
        // Hide splash screen
        await SplashScreen.hideAsync();
      }
    }
    prepare();
  }, [initialize]);

  return (
    <>
      <StatusBar style={isDark ? 'light' : 'dark'} />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: {
            backgroundColor: isDark 
              ? colors.background.primary.dark 
              : colors.background.primary.light,
          },
          animation: 'slide_from_right',
        }}
      >
        {/* Auth routes */}
        <Stack.Screen
          name="(auth)"
          options={{
            headerShown: false,
          }}
        />
        
        {/* Main app routes (tabs) */}
        <Stack.Screen
          name="(tabs)"
          options={{
            headerShown: false,
          }}
        />
        
        {/* Simulation player */}
        <Stack.Screen
          name="simulation/[id]"
          options={{
            headerShown: false,
            presentation: 'fullScreenModal',
            gestureEnabled: false,
          }}
        />
        
        {/* Simulation result */}
        <Stack.Screen
          name="simulation/result/[id]"
          options={{
            headerShown: true,
            title: 'Risultati',
            headerBackTitle: 'Indietro',
          }}
        />
        
        {/* Settings */}
        <Stack.Screen
          name="settings"
          options={{
            headerShown: true,
            title: 'Impostazioni',
            presentation: 'modal',
          }}
        />
      </Stack>
    </>
  );
}

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <TRPCProvider client={trpcClient} queryClient={queryClient}>
          <QueryClientProvider client={queryClient}>
            <ThemeProvider>
              <RootLayoutNav />
            </ThemeProvider>
          </QueryClientProvider>
        </TRPCProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

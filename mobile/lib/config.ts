/**
 * Leonardo School Mobile - API Configuration
 * 
 * Configurazione centralizzata per le chiamate API.
 */

import Constants from 'expo-constants';

// Get API URL from environment or use default
const getApiUrl = (): string => {
  // For development
  if (__DEV__) {
    // Use the local network IP for development
    // You can override this in app.json extra or .env
    const devApiUrl = Constants.expoConfig?.extra?.apiUrl;
    if (devApiUrl) return devApiUrl;
    
    // Default to localhost for iOS simulator / Android emulator
    return 'http://localhost:3000';
  }
  
  // Production URL
  return Constants.expoConfig?.extra?.apiUrl || 'https://leonardoschool.it';
};

export const config = {
  // API Configuration
  api: {
    baseUrl: getApiUrl(),
    trpcUrl: `${getApiUrl()}/api/trpc`,
    timeout: 30000, // 30 seconds
  },

  // App Configuration
  app: {
    name: 'Leonardo School',
    version: Constants.expoConfig?.version || '1.0.0',
    buildNumber: Constants.expoConfig?.ios?.buildNumber || 
                 Constants.expoConfig?.android?.versionCode?.toString() || '1',
  },

  // Feature Flags
  features: {
    pushNotifications: true,
    offlineMode: true,
    analytics: !__DEV__,
    crashReporting: !__DEV__,
  },

  // Storage Keys
  storageKeys: {
    authToken: 'auth-token',
    user: 'user-data',
    fcmToken: 'fcm-token',
    theme: 'theme-preference',
    onboardingCompleted: 'onboarding-completed',
  },

  // Cache Configuration
  cache: {
    defaultStaleTime: 5 * 60 * 1000, // 5 minutes
    defaultCacheTime: 30 * 60 * 1000, // 30 minutes
  },
} as const;

export default config;

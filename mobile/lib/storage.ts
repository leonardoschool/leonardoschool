/**
 * Leonardo School Mobile - Secure Storage
 * 
 * Wrapper per gestione sicura dei dati sensibili.
 * Usa expo-secure-store per dati sensibili, AsyncStorage per dati non sensibili.
 */

import * as SecureStore from 'expo-secure-store';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { config } from './config';

// ==================== SECURE STORAGE ====================
// Per dati sensibili (token, credenziali)

export const secureStorage = {
  /**
   * Salva un valore in modo sicuro
   */
  async set(key: string, value: string): Promise<void> {
    try {
      await SecureStore.setItemAsync(key, value);
    } catch (error) {
      console.error(`[SecureStorage] Error setting ${key}:`, error);
      throw error;
    }
  },

  /**
   * Recupera un valore
   */
  async get(key: string): Promise<string | null> {
    try {
      return await SecureStore.getItemAsync(key);
    } catch (error) {
      console.error(`[SecureStorage] Error getting ${key}:`, error);
      return null;
    }
  },

  /**
   * Elimina un valore
   */
  async delete(key: string): Promise<void> {
    try {
      await SecureStore.deleteItemAsync(key);
    } catch (error) {
      console.error(`[SecureStorage] Error deleting ${key}:`, error);
    }
  },

  // Metodi specifici per auth
  async setAuthToken(token: string): Promise<void> {
    return this.set(config.storageKeys.authToken, token);
  },

  async getAuthToken(): Promise<string | null> {
    return this.get(config.storageKeys.authToken);
  },

  async deleteAuthToken(): Promise<void> {
    return this.delete(config.storageKeys.authToken);
  },

  async setFcmToken(token: string): Promise<void> {
    return this.set(config.storageKeys.fcmToken, token);
  },

  async getFcmToken(): Promise<string | null> {
    return this.get(config.storageKeys.fcmToken);
  },
};

// ==================== ASYNC STORAGE ====================
// Per dati non sensibili (preferenze, cache)

export const storage = {
  /**
   * Salva un valore
   */
  async set(key: string, value: string): Promise<void> {
    try {
      await AsyncStorage.setItem(key, value);
    } catch (error) {
      console.error(`[Storage] Error setting ${key}:`, error);
      throw error;
    }
  },

  /**
   * Salva un oggetto JSON
   */
  async setObject<T>(key: string, value: T): Promise<void> {
    try {
      const jsonValue = JSON.stringify(value);
      await AsyncStorage.setItem(key, jsonValue);
    } catch (error) {
      console.error(`[Storage] Error setting object ${key}:`, error);
      throw error;
    }
  },

  /**
   * Recupera un valore
   */
  async get(key: string): Promise<string | null> {
    try {
      return await AsyncStorage.getItem(key);
    } catch (error) {
      console.error(`[Storage] Error getting ${key}:`, error);
      return null;
    }
  },

  /**
   * Recupera un oggetto JSON
   */
  async getObject<T>(key: string): Promise<T | null> {
    try {
      const jsonValue = await AsyncStorage.getItem(key);
      return jsonValue ? (JSON.parse(jsonValue) as T) : null;
    } catch (error) {
      console.error(`[Storage] Error getting object ${key}:`, error);
      return null;
    }
  },

  /**
   * Elimina un valore
   */
  async delete(key: string): Promise<void> {
    try {
      await AsyncStorage.removeItem(key);
    } catch (error) {
      console.error(`[Storage] Error deleting ${key}:`, error);
    }
  },

  /**
   * Elimina tutti i dati
   */
  async clear(): Promise<void> {
    try {
      await AsyncStorage.clear();
    } catch (error) {
      console.error('[Storage] Error clearing:', error);
    }
  },

  /**
   * Recupera tutte le chiavi
   */
  async getAllKeys(): Promise<readonly string[]> {
    try {
      return await AsyncStorage.getAllKeys();
    } catch (error) {
      console.error('[Storage] Error getting all keys:', error);
      return [];
    }
  },

  // Metodi specifici per user data
  async setUser<T>(user: T): Promise<void> {
    return this.setObject(config.storageKeys.user, user);
  },

  async getUser<T>(): Promise<T | null> {
    return this.getObject<T>(config.storageKeys.user);
  },

  async deleteUser(): Promise<void> {
    return this.delete(config.storageKeys.user);
  },

  // Theme preference
  async setTheme(theme: 'light' | 'dark' | 'system'): Promise<void> {
    return this.set(config.storageKeys.theme, theme);
  },

  async getTheme(): Promise<'light' | 'dark' | 'system' | null> {
    const theme = await this.get(config.storageKeys.theme);
    if (theme === 'light' || theme === 'dark' || theme === 'system') {
      return theme;
    }
    return null;
  },
};

const storageExports = { secureStorage, storage };
export default storageExports;

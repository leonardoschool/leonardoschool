/**
 * Notification Sound Utility
 * 
 * Handles playing notification sounds based on user preferences.
 * Preference is stored in localStorage under 'notificationSounds' key.
 * 
 * Usage:
 * import { playNotificationSound, isNotificationSoundEnabled, setNotificationSoundEnabled } from '@/lib/utils/notificationSound';
 * 
 * // Check if sounds are enabled
 * const enabled = isNotificationSoundEnabled();
 * 
 * // Play a sound (only if enabled)
 * playNotificationSound();
 * 
 * // Enable/disable sounds
 * setNotificationSoundEnabled(true);
 */

const STORAGE_KEY = 'notificationSounds';
const SOUND_PATH = '/sounds/notification.mp3';

/**
 * Check if notification sounds are enabled
 */
export function isNotificationSoundEnabled(): boolean {
  if (typeof window === 'undefined') return false;
  return localStorage.getItem(STORAGE_KEY) === 'true';
}

/**
 * Set notification sound preference
 */
export function setNotificationSoundEnabled(enabled: boolean): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(STORAGE_KEY, enabled.toString());
}

/**
 * Play notification sound if enabled
 * @param volume - Volume level from 0 to 1 (default: 0.5)
 * @returns Promise<boolean> - true if sound was played, false otherwise
 */
export async function playNotificationSound(volume: number = 0.5): Promise<boolean> {
  if (typeof window === 'undefined') return false;
  if (!isNotificationSoundEnabled()) return false;

  try {
    // Try to play the MP3 file first
    const audio = new Audio(SOUND_PATH);
    audio.volume = Math.max(0, Math.min(1, volume));
    await audio.play();
    return true;
  } catch {
    // Fallback: Generate a pleasant notification sound using Web Audio API
    try {
      const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!AudioContextClass) return false;
      
      const audioContext = new AudioContextClass();
      
      // Create a pleasant two-tone notification sound
      const oscillator1 = audioContext.createOscillator();
      const gainNode1 = audioContext.createGain();
      oscillator1.connect(gainNode1);
      gainNode1.connect(audioContext.destination);
      oscillator1.frequency.value = 880; // A5
      oscillator1.type = 'sine';
      gainNode1.gain.setValueAtTime(0.3 * volume, audioContext.currentTime);
      gainNode1.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.1);
      oscillator1.start(audioContext.currentTime);
      oscillator1.stop(audioContext.currentTime + 0.1);

      // Second tone slightly higher
      const oscillator2 = audioContext.createOscillator();
      const gainNode2 = audioContext.createGain();
      oscillator2.connect(gainNode2);
      gainNode2.connect(audioContext.destination);
      oscillator2.frequency.value = 1318.5; // E6
      oscillator2.type = 'sine';
      gainNode2.gain.setValueAtTime(0.3 * volume, audioContext.currentTime + 0.1);
      gainNode2.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.2);
      oscillator2.start(audioContext.currentTime + 0.1);
      oscillator2.stop(audioContext.currentTime + 0.2);

      return true;
    } catch {
      return false;
    }
  }
}

/**
 * Play a test sound (bypasses the enabled check)
 * Useful for settings page to let user hear the sound before enabling
 * @param volume - Volume level from 0 to 1 (default: 0.5)
 */
export async function playTestSound(volume: number = 0.5): Promise<boolean> {
  if (typeof window === 'undefined') return false;

  try {
    const audio = new Audio(SOUND_PATH);
    audio.volume = Math.max(0, Math.min(1, volume));
    await audio.play();
    return true;
  } catch {
    // Fallback to Web Audio API
    try {
      const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!AudioContextClass) return false;
      
      const audioContext = new AudioContextClass();
      
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);
      oscillator.frequency.value = 880;
      oscillator.type = 'sine';
      gainNode.gain.setValueAtTime(0.3 * volume, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.15);
      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + 0.15);

      return true;
    } catch {
      return false;
    }
  }
}

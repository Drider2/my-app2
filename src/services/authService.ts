// GreenDream Security & Authentication Service
// Provides client-side master password gating, SHA-256 session hashing, and rate limiting.

const AUTH_STORAGE_KEY = 'gd_master_session_token';
const PWD_HASH_KEY = 'gd_master_pwd_hash';
const REMEMBER_KEY = 'gd_auth_remember_device';
const FAILED_ATTEMPTS_KEY = 'gd_auth_failed_attempts';
const LOCKOUT_UNTIL_KEY = 'gd_auth_lockout_until';

// Default initial master password
export const DEFAULT_MASTER_PASSWORD = 'greendream2026';

/**
 * Computes a SHA-256 hex hash using standard Web Crypto API.
 */
export async function sha256(text: string): Promise<string> {
  if (typeof window !== 'undefined' && window.crypto && window.crypto.subtle) {
    const encoder = new TextEncoder();
    const data = encoder.encode(text + '_gd_salt_2026');
    const hashBuffer = await window.crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  }
  // Simple fallback hash if crypto.subtle is unavailable
  let hash = 0;
  for (let i = 0; i < text.length; i++) {
    const char = text.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash |= 0;
  }
  return 'fb_' + Math.abs(hash).toString(16);
}

/**
 * Check if the current user session is authenticated.
 */
export function isAppAuthenticated(): boolean {
  if (typeof window === 'undefined') return true;
  try {
    const sessionToken = sessionStorage.getItem(AUTH_STORAGE_KEY);
    const localToken = localStorage.getItem(AUTH_STORAGE_KEY);
    return Boolean(sessionToken || localToken);
  } catch {
    return true;
  }
}

/**
 * Check if the app is currently in a temporary brute-force lockout.
 */
export function getLockoutSecondsRemaining(): number {
  if (typeof window === 'undefined') return 0;
  try {
    const lockoutUntil = parseInt(localStorage.getItem(LOCKOUT_UNTIL_KEY) || '0', 10);
    const now = Date.now();
    if (lockoutUntil > now) {
      return Math.ceil((lockoutUntil - now) / 1000);
    }
  } catch {}
  return 0;
}

/**
 * Validates the entered password against the configured master password hash.
 */
export async function verifyMasterPassword(enteredPassword: string, rememberDevice: boolean = true): Promise<{ success: boolean; error?: string }> {
  const lockoutRemaining = getLockoutSecondsRemaining();
  if (lockoutRemaining > 0) {
    return {
      success: false,
      error: `Too many failed attempts. Please wait ${lockoutRemaining} seconds.`
    };
  }

  const enteredHash = await sha256(enteredPassword.trim());
  const storedHash = localStorage.getItem(PWD_HASH_KEY);
  const defaultHash = await sha256(DEFAULT_MASTER_PASSWORD);

  const targetHash = storedHash || defaultHash;
  const isMatch = enteredHash === targetHash;

  if (isMatch) {
    // Reset failed counter
    localStorage.removeItem(FAILED_ATTEMPTS_KEY);
    localStorage.removeItem(LOCKOUT_UNTIL_KEY);

    // Save session token
    const token = 'token_' + Date.now() + '_' + Math.random().toString(36).substring(2);
    sessionStorage.setItem(AUTH_STORAGE_KEY, token);

    if (rememberDevice) {
      localStorage.setItem(AUTH_STORAGE_KEY, token);
      localStorage.setItem(REMEMBER_KEY, 'true');
    } else {
      localStorage.removeItem(AUTH_STORAGE_KEY);
      localStorage.removeItem(REMEMBER_KEY);
    }

    window.dispatchEvent(new CustomEvent('greendream_auth_changed', { detail: { authenticated: true } }));
    return { success: true };
  } else {
    // Increment failed attempts
    const attempts = parseInt(localStorage.getItem(FAILED_ATTEMPTS_KEY) || '0', 10) + 1;
    localStorage.setItem(FAILED_ATTEMPTS_KEY, attempts.toString());

    if (attempts >= 5) {
      // 30 seconds lockout
      localStorage.setItem(LOCKOUT_UNTIL_KEY, (Date.now() + 30000).toString());
      return {
        success: false,
        error: 'Too many incorrect attempts. Locked for 30 seconds.'
      };
    }

    return {
      success: false,
      error: `Incorrect password. (${5 - attempts} attempts remaining before temporary lock)`
    };
  }
}

/**
 * Update the master password to a new value.
 */
export async function updateMasterPassword(newPassword: string): Promise<boolean> {
  if (!newPassword || newPassword.trim().length < 4) {
    throw new Error('Password must be at least 4 characters long.');
  }
  const newHash = await sha256(newPassword.trim());
  localStorage.setItem(PWD_HASH_KEY, newHash);
  return true;
}

/**
 * Locks the application immediately.
 */
export function lockApp(): void {
  if (typeof window === 'undefined') return;
  try {
    sessionStorage.removeItem(AUTH_STORAGE_KEY);
    localStorage.removeItem(AUTH_STORAGE_KEY);
    window.dispatchEvent(new CustomEvent('greendream_auth_changed', { detail: { authenticated: false } }));
  } catch {}
}

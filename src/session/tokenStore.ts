import * as SecureStore from 'expo-secure-store';

const ACCESS_KEY = 'tow_access_token';
const REFRESH_KEY = 'tow_refresh_token';
const MODE_KEY = 'tow_active_mode';

export async function saveTokens(accessToken: string, refreshToken: string): Promise<void> {
  await SecureStore.setItemAsync(ACCESS_KEY, accessToken);
  await SecureStore.setItemAsync(REFRESH_KEY, refreshToken);
}

export async function readTokens(): Promise<{
  accessToken: string | null;
  refreshToken: string | null;
}> {
  const [accessToken, refreshToken] = await Promise.all([
    SecureStore.getItemAsync(ACCESS_KEY),
    SecureStore.getItemAsync(REFRESH_KEY),
  ]);
  return { accessToken, refreshToken };
}

export async function saveActiveMode(mode: 'customer' | 'driver'): Promise<void> {
  await SecureStore.setItemAsync(MODE_KEY, mode);
}

export async function readActiveMode(): Promise<'customer' | 'driver' | null> {
  const value = await SecureStore.getItemAsync(MODE_KEY);
  return value === 'driver' || value === 'customer' ? value : null;
}

export async function clearTokens(): Promise<void> {
  await Promise.all([
    SecureStore.deleteItemAsync(ACCESS_KEY),
    SecureStore.deleteItemAsync(REFRESH_KEY),
    SecureStore.deleteItemAsync(MODE_KEY),
  ]);
}

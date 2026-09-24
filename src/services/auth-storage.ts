import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";

// SecureStore (Keychain on iOS, EncryptedSharedPreferences on Android) —
// deliberately not AsyncStorage, which is unencrypted on-device storage
// and the wrong place for an auth token even short-lived.
//
// Web has no equivalent native secure storage, so SecureStore.getItemAsync
// throws there ("ExpoSecureStore.default.getValueWithKeyAsync is not a
// function"). The fallback below uses localStorage on web ONLY — and
// localStorage is NOT secure storage (readable by any script on the page,
// persisted in plaintext). This exists purely so the web preview doesn't
// crash during local development; it is not a security-equivalent path.
// The real target platform for this app is iOS/Android via Expo Go or a
// built binary, where the SecureStore branch below is what actually runs.
const isWeb = Platform.OS === "web";

async function setItem(key: string, value: string) {
  if (isWeb) {
    localStorage.setItem(key, value);
    return;
  }
  await SecureStore.setItemAsync(key, value);
}

async function getItem(key: string): Promise<string | null> {
  if (isWeb) {
    return localStorage.getItem(key);
  }
  return SecureStore.getItemAsync(key);
}

async function deleteItem(key: string) {
  if (isWeb) {
    localStorage.removeItem(key);
    return;
  }
  await SecureStore.deleteItemAsync(key);
}

const TOKEN_KEY = "ambercash_client_token";
const REFRESH_TOKEN_KEY = "ambercash_refresh_token";
const CLIENT_ID_KEY = "ambercash_client_id";
const BIOMETRIC_PREF_KEY = "ambercash_biometric_enabled";
// Not a secret — just the phone/ID number they logged in with, remembered
// per-device so the biometric-lock's "use password instead" fallback can
// pre-fill it instead of asking again.
const LAST_IDENTIFIER_KEY = "ambercash_last_identifier";

export async function setToken(token: string, clientId: string) {
  await setItem(TOKEN_KEY, token);
  await setItem(CLIENT_ID_KEY, clientId);
}

// Used on token refresh, where only the access token changes — clientId and
// the refresh token (rotated separately, see setRefreshToken) stay untouched.
export async function setAccessToken(token: string) {
  await setItem(TOKEN_KEY, token);
}

export async function setRefreshToken(refreshToken: string) {
  await setItem(REFRESH_TOKEN_KEY, refreshToken);
}

export async function getRefreshToken(): Promise<string | null> {
  return getItem(REFRESH_TOKEN_KEY);
}

export async function getToken(): Promise<string | null> {
  return getItem(TOKEN_KEY);
}

export async function getStoredClientId(): Promise<string | null> {
  return getItem(CLIENT_ID_KEY);
}

export async function clearToken() {
  await deleteItem(TOKEN_KEY);
  await deleteItem(REFRESH_TOKEN_KEY);
  await deleteItem(CLIENT_ID_KEY);
  // Deliberately NOT clearing the biometric preference here — it's a
  // per-device setting, not part of the session. A signed-out-then-back-in
  // client on the same phone shouldn't have to re-opt-in.
}

// Defaults to enabled (returns true) if never explicitly set — the app
// checks hardware/enrollment separately before ever acting on this, so
// defaulting "on" just means "use it if the device supports it", not
// "force it on unsupported devices".
export async function getBiometricPreference(): Promise<boolean> {
  const value = await getItem(BIOMETRIC_PREF_KEY);
  return value !== "false";
}

export async function setBiometricPreference(enabled: boolean) {
  await setItem(BIOMETRIC_PREF_KEY, enabled ? "true" : "false");
}

export async function setLastIdentifier(identifier: string) {
  await setItem(LAST_IDENTIFIER_KEY, identifier);
}

export async function getLastIdentifier(): Promise<string | null> {
  return getItem(LAST_IDENTIFIER_KEY);
}
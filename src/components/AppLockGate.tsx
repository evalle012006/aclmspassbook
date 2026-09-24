import { useAuth } from "@/context/AuthContext";
import { getErrorMessage } from "@/services/api";
import { loginWithPassword } from "@/services/auth-service";
import { getBiometricPreference, getLastIdentifier } from "@/services/auth-storage";
import { isBiometricAvailable, promptBiometric } from "@/services/biometric-service";
import { Ionicons } from "@expo/vector-icons";
import React, { useCallback, useEffect, useRef, useState } from "react";
import { ActivityIndicator, AppState, AppStateStatus, Pressable, Text, TextInput, View } from "react-native";

const MAX_BIOMETRIC_ATTEMPTS_BEFORE_PASSWORD_OPTION = 3;

/**
 * Gates the app behind a biometric prompt whenever it's resumed — either
 * coming back from the background, OR a cold start where a valid session
 * already exists (both count as "came back after quitting the app"). Skips
 * exactly once right after a fresh sign-in, since login just proved identity.
 *
 * This is deliberately NOT a login screen: a failed or cancelled biometric
 * check never signs the user out or touches their session — it just keeps
 * the lock screen up with a retry button, and after a few failed attempts
 * offers a password fallback instead of only ever retrying biometric.
 */
export function AppLockGate({ children }: { children: React.ReactNode }) {
  const { isSignedIn, justSignedIn, consumeJustSignedIn, signOut, signIn } = useAuth();

  const [isLocked, setIsLocked] = useState(false);
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [failedAttempts, setFailedAttempts] = useState(0);

  // Password-fallback fields, shown once failedAttempts crosses the threshold
  const [showPasswordFallback, setShowPasswordFallback] = useState(false);
  const [fallbackIdentifier, setFallbackIdentifier] = useState("");
  const [fallbackPassword, setFallbackPassword] = useState("");
  const [fallbackError, setFallbackError] = useState<string | null>(null);

  const appState = useRef(AppState.currentState);
  // Presenting the native biometric sheet itself causes iOS (and sometimes
  // Android) to report an inactive→active AppState transition — the same
  // shape the listener below uses to detect "app was backgrounded and
  // resumed". Without this guard, a SUCCESSFUL unlock would immediately
  // re-lock: attemptUnlock sets isLocked(false), then the AppState event
  // fired by the sheet dismissing races in and calls lockScreen() again.
  // Set right before presenting the sheet, cleared once handled (or after a
  // timeout, so a missed event can never leave this stuck permanently on).
  const suppressNextForegroundCheck = useRef(false);

  const checkAvailability = useCallback(async () => {
    const [available, preferenceOn] = await Promise.all([isBiometricAvailable(), getBiometricPreference()]);
    return available && preferenceOn;
  }, []);

  const lockScreen = useCallback(async () => {
    setFailedAttempts(0);
    setShowPasswordFallback(false);
    setFallbackError(null);
    const identifier = await getLastIdentifier();
    setFallbackIdentifier(identifier ?? "");
    setIsLocked(true);
  }, []);

  const attemptUnlock = useCallback(async () => {
    setIsAuthenticating(true);
    suppressNextForegroundCheck.current = true;
    const timeoutId = setTimeout(() => { suppressNextForegroundCheck.current = false; }, 3000);
    try {
      const success = await promptBiometric("Unlock AmberCash");
      if (success) {
        setIsLocked(false);
        return;
      }
      // On failure/cancel: stay locked and count it. After enough failures,
      // offer the password fallback instead of only ever retrying biometric —
      // there's still a Sign Out escape hatch too, for someone who genuinely
      // isn't the account owner and needs to hand the device back.
      setFailedAttempts((n) => {
        const next = n + 1;
        if (next >= MAX_BIOMETRIC_ATTEMPTS_BEFORE_PASSWORD_OPTION) setShowPasswordFallback(true);
        return next;
      });
    } finally {
      setIsAuthenticating(false);
      clearTimeout(timeoutId);
    }
  }, []);

  async function handlePasswordFallback() {
    setFallbackError(null);
    if (!fallbackIdentifier.trim() || !fallbackPassword) {
      setFallbackError("Enter your ID/phone number and password.");
      return;
    }
    setIsAuthenticating(true);
    try {
      const result = await loginWithPassword({ identifier: fallbackIdentifier.trim(), password: fallbackPassword });
      if (result.success && result.token && result.refreshToken && result.clientId) {
        // Re-establishes the session with fresh tokens — this is a real
        // re-authentication, not just a local unlock, which is appropriate
        // since they're proving identity via password rather than the
        // device's own biometric sensor.
        await signIn(result.token, result.refreshToken, result.clientId);
        setIsLocked(false);
        setFallbackPassword("");
        return;
      }
      setFallbackError(result.message ?? "Incorrect ID/phone number or password.");
    } catch (err) {
      setFallbackError(getErrorMessage(err));
    } finally {
      setIsAuthenticating(false);
    }
  }

  // Cold start / initial mount with an already-valid session.
  useEffect(() => {
    if (!isSignedIn) return;

    (async () => {
      if (justSignedIn) {
        consumeJustSignedIn();
        return; // just proved identity moments ago — don't also demand biometric
      }
      const usable = await checkAvailability();
      if (usable) await lockScreen();
    })();
    // Deliberately only on isSignedIn transitioning true / mount — re-running
    // this on every justSignedIn change would re-lock right after consuming it.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isSignedIn]);

  // Background → foreground transitions while the app process stays alive.
  useEffect(() => {
    if (!isSignedIn) return;

    const subscription = AppState.addEventListener("change", async (nextState: AppStateStatus) => {
      const cameToForeground = appState.current.match(/inactive|background/) && nextState === "active";
      appState.current = nextState;

      if (cameToForeground) {
        if (suppressNextForegroundCheck.current) {
          // This transition was almost certainly caused by the biometric
          // sheet itself dismissing, not the user actually leaving and
          // returning to the app — consume the flag and skip this one check.
          suppressNextForegroundCheck.current = false;
          return;
        }
        const usable = await checkAvailability();
        if (usable) await lockScreen();
      }
    });

    return () => subscription.remove();
  }, [isSignedIn, checkAvailability, lockScreen]);

  if (!isSignedIn || !isLocked) {
    return <>{children}</>;
  }

  return (
    <View className="flex-1 bg-white items-center justify-center px-6">
      <View className="w-16 h-16 rounded-full bg-brand-50 items-center justify-center mb-4">
        <Ionicons name="lock-closed" size={28} color="#0f6fde" />
      </View>
      <Text className="text-gray-900 font-semibold text-lg mb-1">AmberCash is locked</Text>
      <Text className="text-gray-500 text-sm mb-8 text-center">
        Unlock with Face ID or your fingerprint to continue
      </Text>

      {!showPasswordFallback ? (
        <>
          <Pressable
            onPress={attemptUnlock}
            disabled={isAuthenticating}
            className="bg-brand-500 rounded-xl px-6 py-3 disabled:opacity-60 mb-4 w-full items-center"
          >
            {isAuthenticating ? <ActivityIndicator color="white" /> : <Text className="text-white font-semibold">Unlock</Text>}
          </Pressable>

          <Pressable onPress={() => setShowPasswordFallback(true)} className="mb-2">
            <Text className="text-brand-600 text-sm font-medium">Use password instead</Text>
          </Pressable>
        </>
      ) : (
        <View className="w-full">
          <TextInput
            value={fallbackIdentifier}
            onChangeText={setFallbackIdentifier}
            placeholder="Phone number or Government ID"
            autoCapitalize="none"
            className="border border-gray-300 rounded-xl px-4 py-3 text-base text-gray-900 mb-3"
          />
          <TextInput
            value={fallbackPassword}
            onChangeText={setFallbackPassword}
            placeholder="Password"
            secureTextEntry
            className="border border-gray-300 rounded-xl px-4 py-3 text-base text-gray-900 mb-2"
          />
          {fallbackError && <Text className="text-danger text-sm mb-2">{fallbackError}</Text>}
          <Pressable
            onPress={handlePasswordFallback}
            disabled={isAuthenticating}
            className="bg-brand-500 rounded-xl py-3 items-center disabled:opacity-60 mb-3"
          >
            {isAuthenticating ? <ActivityIndicator color="white" /> : <Text className="text-white font-semibold">Log In</Text>}
          </Pressable>
          <Pressable onPress={() => setShowPasswordFallback(false)} className="items-center mb-2">
            <Text className="text-gray-400 text-sm">Try Face ID / fingerprint again</Text>
          </Pressable>
        </View>
      )}

      <Pressable onPress={() => signOut()}>
        <Text className="text-gray-400 text-sm">Not you? Sign out</Text>
      </Pressable>
    </View>
  );
}
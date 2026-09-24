import { setBiometricPreference } from "@/services/auth-storage";
import { isBiometricAvailable, promptBiometric } from "@/services/biometric-service";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useEffect, useState } from "react";
import { ActivityIndicator, Pressable, Text, View } from "react-native";

export default function SetupBiometricScreen() {
  const [checking, setChecking] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const available = await isBiometricAvailable();
      if (!available) {
        // Nothing to offer on a device with no enrolled Face ID/fingerprint —
        // don't show a prompt for a feature that can't work here.
        router.replace("/(app)/home");
        return;
      }
      setChecking(false);
    })();
  }, []);

  async function handleEnable() {
    setError(null);
    setIsSaving(true);
    try {
      // This is the actual trigger for the OS-level permission dialog (Face
      // ID on iOS specifically only asks the first time authenticateAsync()
      // is really called — just saving a preference boolean, which is all
      // the previous version of this screen did, never asked for anything
      // and never confirmed biometrics genuinely work on this device).
      const success = await promptBiometric("Confirm to enable biometric lock");
      if (!success) {
        setError("Couldn't confirm your biometric. You can try again or set this up later in Account Profile.");
        return;
      }
      await setBiometricPreference(true);
      router.replace("/(app)/home");
    } finally {
      setIsSaving(false);
    }
  }

  async function handleSkip() {
    // The preference defaults to TRUE when never explicitly set (see
    // auth-storage.ts) — leaving it untouched here meant "skip" did nothing,
    // and AppLockGate would still lock on the very next resume since the
    // device genuinely has working biometric hardware. Must explicitly turn
    // it off.
    await setBiometricPreference(false);
    router.replace("/(app)/home");
  }

  if (checking) {
    return (
      <View className="flex-1 bg-white items-center justify-center">
        <ActivityIndicator color="#0f6fde" />
      </View>
    );
  }

  return (
    <View className="flex-1 bg-white justify-center px-6">
      <View className="items-center mb-8">
        <View className="w-16 h-16 rounded-full bg-brand-50 items-center justify-center mb-4">
          <Ionicons name="finger-print-outline" size={28} color="#0f6fde" />
        </View>
        <Text className="text-2xl font-bold text-gray-900 mb-2 text-center">Enable biometric lock?</Text>
        <Text className="text-gray-500 text-center">
          Require Face ID or your fingerprint whenever you reopen the app.
          You can always switch to your password if needed.
        </Text>
      </View>

      {error && (
        <View className="mt-2 mb-4 p-4 rounded-xl bg-amber-50 border border-warning">
          <Text className="text-warning text-sm">{error}</Text>
        </View>
      )}

      <Pressable
        onPress={handleEnable}
        disabled={isSaving}
        className="bg-brand-500 rounded-xl py-4 items-center mb-3 disabled:opacity-60"
      >
        {isSaving ? <ActivityIndicator color="white" /> : <Text className="text-white font-semibold text-base">Enable Biometric Lock</Text>}
      </Pressable>

      <Pressable onPress={handleSkip} className="items-center py-3">
        <Text className="text-gray-400 font-medium">Maybe later</Text>
      </Pressable>
    </View>
  );
}
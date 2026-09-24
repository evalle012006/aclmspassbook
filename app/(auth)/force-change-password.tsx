import { ErrorBanner } from "@/components/StatusViews";
import { getErrorMessage } from "@/services/api";
import { setPassword as setPasswordRequest } from "@/services/auth-service";
import { Stack, router } from "expo-router";
import { useState } from "react";
import { ActivityIndicator, Pressable, Text, TextInput, View } from "react-native";

// Reached only from login.tsx when the backend reports mustChangePassword —
// meaning the client is still using a password staff generated for them
// (activation or a reset). No back button, no skip: staff and possibly
// others present at the branch know that password, so it can't remain in
// use past this first login.
export default function ForceChangePasswordScreen() {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit() {
    setError(null);

    if (!currentPassword) {
      setError("Enter the temporary password you just used to log in.");
      return;
    }
    if (newPassword.length < 6) {
      setError("New password must be at least 6 characters.");
      return;
    }
    if (newPassword === currentPassword) {
      setError("Choose a different password than the temporary one.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setError("Passwords don't match.");
      return;
    }

    setIsSubmitting(true);
    try {
      const result = await setPasswordRequest({ currentPassword, newPassword });

      if (result.success) {
        router.replace("/(auth)/setup-biometric");
        return;
      }

      setError(result.message ?? "Failed to update password.");
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <View className="flex-1 bg-white px-6 pt-6">
      <Stack.Screen
        options={{
          title: "Set Your Password",
          headerBackVisible: false,
          gestureEnabled: false, // no iOS swipe-back either
        }}
      />

      <Text className="text-gray-500 mb-6">
        You're using a temporary password your branch gave you. Set your own password to continue.
      </Text>

      <Text className="text-sm font-medium text-gray-700 mb-1">Temporary password</Text>
      <TextInput
        value={currentPassword}
        onChangeText={setCurrentPassword}
        placeholder="The password you just used to log in"
        secureTextEntry
        className="border border-gray-300 rounded-xl px-4 py-3 text-base text-gray-900 mb-4"
      />

      <Text className="text-sm font-medium text-gray-700 mb-1">New password</Text>
      <TextInput
        value={newPassword}
        onChangeText={setNewPassword}
        placeholder="At least 6 characters"
        secureTextEntry
        className="border border-gray-300 rounded-xl px-4 py-3 text-base text-gray-900 mb-4"
      />

      <Text className="text-sm font-medium text-gray-700 mb-1">Confirm new password</Text>
      <TextInput
        value={confirmPassword}
        onChangeText={setConfirmPassword}
        placeholder="Re-enter new password"
        secureTextEntry
        className="border border-gray-300 rounded-xl px-4 py-3 text-base text-gray-900 mb-2"
      />

      {error && <ErrorBanner message={error} />}

      <Pressable
        onPress={handleSubmit}
        disabled={isSubmitting}
        className="bg-brand-500 rounded-xl py-4 items-center mt-6 disabled:opacity-60"
      >
        {isSubmitting ? <ActivityIndicator color="white" /> : <Text className="text-white font-semibold text-base">Continue</Text>}
      </Pressable>
    </View>
  );
}
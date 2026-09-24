import { ErrorBanner } from "@/components/StatusViews";
import { getErrorMessage } from "@/services/api";
import { setPassword as setPasswordRequest } from "@/services/auth-service";
import { Stack, router } from "expo-router";
import { useState } from "react";
import { ActivityIndicator, Alert, Pressable, Text, TextInput, View } from "react-native";

// Handles both first-time setup (no current password to check) and changing
// an existing one — the backend itself decides which case applies based on
// whether a password_hash already exists, so this screen doesn't need to
// know in advance which mode it's in.
export default function ChangePasswordScreen() {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit() {
    setError(null);

    if (newPassword.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setError("Passwords don't match.");
      return;
    }

    setIsSubmitting(true);
    try {
      const result = await setPasswordRequest({
        currentPassword: currentPassword || undefined,
        newPassword,
      });

      if (result.success) {
        Alert.alert("Password updated", "You can now log in with your ID/phone number and this password.", [
          { text: "OK", onPress: () => router.back() },
        ]);
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
      <Stack.Screen options={{ title: "Change Password" }} />

      <Text className="text-gray-500 mb-6">
        If you haven't set a password before, leave "Current password" blank.
      </Text>

      <Text className="text-sm font-medium text-gray-700 mb-1">Current password (if any)</Text>
      <TextInput
        value={currentPassword}
        onChangeText={setCurrentPassword}
        placeholder="Leave blank if none set yet"
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
        {isSubmitting ? <ActivityIndicator color="white" /> : <Text className="text-white font-semibold text-base">Save Password</Text>}
      </Pressable>
    </View>
  );
}
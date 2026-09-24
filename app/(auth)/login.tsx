import { ErrorBanner } from "@/components/StatusViews";
import { useAuth } from "@/context/AuthContext";
import { getErrorMessage } from "@/services/api";
import { loginWithPassword } from "@/services/auth-service";
import { setLastIdentifier } from "@/services/auth-storage";
import { router } from "expo-router";
import { useState } from "react";
import { ActivityIndicator, Image, KeyboardAvoidingView, Platform, Pressable, Text, TextInput, View } from "react-native";

// Password is the ONLY login method right now — SMS OTP is not being
// enabled for the foreseeable future, so there's no functional fallback to
// offer here. Every client's password is set/reset by staff in person (see
// MobileAccessIconPopover.js on the staff side) — there is no self-service
// "forgot password" flow for the same reason OTP isn't viable: neither
// email nor SMS exists as a way to verify a reset request.
//
// The OTP screens ((auth)/verify-otp.tsx, disambiguate.tsx, setup-password.tsx)
// and their backend endpoints are left in place, not deleted — if SMS is
// ever turned on, restoring the dual-mode flow is a matter of bringing back
// the mode-switching logic this file used to have (see git history), not
// rebuilding anything from scratch.
export default function LoginScreen() {
  const { signIn } = useAuth();

  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lockedMessage, setLockedMessage] = useState<string | null>(null);

  async function handleLogin() {
    setError(null);
    setLockedMessage(null);

    if (!identifier.trim() || !password) {
      setError("Enter your ID/phone number and password.");
      return;
    }

    setIsLoggingIn(true);
    try {
      const result = await loginWithPassword({ identifier: identifier.trim(), password });

      if (result.success && result.token && result.refreshToken && result.clientId) {
        await signIn(result.token, result.refreshToken, result.clientId);
        await setLastIdentifier(identifier.trim());

        // A staff-generated password (activation or reset) must be changed
        // before any normal app access — see login-password.js. This is
        // not skippable, unlike the biometric-setup prompt that follows it.
        if (result.mustChangePassword) {
          router.replace("/(auth)/force-change-password");
        } else {
          router.replace("/(app)/home");
        }
        return;
      }

      if (result.code === "PASSWORD_LOCKED" || result.code === "PASSWORD_LOGIN_DISABLED") {
        setLockedMessage(result.message ?? "Please visit your branch for assistance.");
        return;
      }

      setError(result.message ?? "Incorrect ID/phone number or password.");
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setIsLoggingIn(false);
    }
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      className="flex-1 bg-white"
    >
      <View className="flex-1 justify-center px-6">
        <View className="items-center mb-8">
          <Image
            source={require("../../assets/images/logo.png")}
            style={{ width: 96, height: 96 }}
            resizeMode="contain"
          />
        </View>

        <Text className="text-2xl font-bold text-gray-900 mb-2">Welcome back</Text>
        <Text className="text-gray-500 mb-8">Log in with your ID/phone number and password.</Text>

        <Text className="text-sm font-medium text-gray-700 mb-1">Phone number or Government ID</Text>
        <TextInput
          value={identifier}
          onChangeText={setIdentifier}
          placeholder="09XX XXX XXXX or ID number"
          autoCapitalize="none"
          className="border border-gray-300 rounded-xl px-4 py-3 text-base text-gray-900 mb-4"
        />

        <Text className="text-sm font-medium text-gray-700 mb-1">Password</Text>
        <TextInput
          value={password}
          onChangeText={setPassword}
          placeholder="Password"
          secureTextEntry
          className="border border-gray-300 rounded-xl px-4 py-3 text-base text-gray-900 mb-2"
        />

        {error && <ErrorBanner message={error} />}
        {lockedMessage && (
          <View className="mt-2 p-4 rounded-xl bg-amber-50 border border-warning">
            <Text className="text-warning">{lockedMessage}</Text>
          </View>
        )}

        <Pressable
          onPress={handleLogin}
          disabled={isLoggingIn}
          className="bg-brand-500 rounded-xl py-4 items-center mt-6 disabled:opacity-60"
        >
          {isLoggingIn ? <ActivityIndicator color="white" /> : <Text className="text-white font-semibold text-base">Log In</Text>}
        </Pressable>

        <Text className="text-gray-400 text-sm text-center mt-6">
          New client, or don't have a password yet?{"\n"}Please visit your branch to activate mobile access.
        </Text>
      </View>
    </KeyboardAvoidingView>
  );
}
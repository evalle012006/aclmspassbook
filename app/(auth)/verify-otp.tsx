import { ErrorBanner } from "@/components/StatusViews";
import { useAuth } from "@/context/AuthContext";
import { getErrorMessage } from "@/services/api";
import { requestOtp, verifyOtp } from "@/services/auth-service";
import { router, useLocalSearchParams } from "expo-router";
import { useState } from "react";
import { ActivityIndicator, Pressable, Text, TextInput, View } from "react-native";

export default function VerifyOtpScreen() {
  const { contactNumber, flow } = useLocalSearchParams<{ contactNumber: string; flow: string }>();
  const { signIn } = useAuth();

  const [code, setCode] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleVerify() {
    setError(null);
    setIsSubmitting(true);
    try {
      const result = await verifyOtp({ contactNumber, code });

      if (result.success && result.token && result.refreshToken && result.clientId) {
        await signIn(result.token, result.refreshToken, result.clientId);
        router.replace("/(app)/home");
        return;
      }

      setError(result.message ?? "Incorrect code.");
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleResend() {
    setError(null);
    setIsResending(true);
    try {
      await requestOtp({ contactNumber });
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setIsResending(false);
    }
  }

  return (
    <View className="flex-1 bg-white justify-center px-6">
      <Text className="text-2xl font-bold text-gray-900 mb-2">Enter the code</Text>
      <Text className="text-gray-500 mb-8">
        {flow === "enrollment"
          ? "We sent a 6-digit code to activate your account on this number."
          : "We sent a 6-digit code to your registered number."}
      </Text>

      <TextInput
        value={code}
        onChangeText={setCode}
        placeholder="000000"
        keyboardType="number-pad"
        maxLength={6}
        className="border border-gray-300 rounded-xl px-4 py-3 text-2xl tracking-[8px] text-center text-gray-900 mb-4"
      />

      {error && <ErrorBanner message={error} />}

      <Pressable
        onPress={handleVerify}
        disabled={isSubmitting || code.length !== 6}
        className="bg-brand-500 rounded-xl py-4 items-center mt-4 disabled:opacity-60"
      >
        {isSubmitting ? <ActivityIndicator color="white" /> : <Text className="text-white font-semibold text-base">Verify</Text>}
      </Pressable>

      <Pressable onPress={handleResend} disabled={isResending} className="items-center mt-5">
        <Text className="text-brand-600 font-medium">
          {isResending ? "Resending…" : "Didn't get a code? Resend"}
        </Text>
      </Pressable>
    </View>
  );
}
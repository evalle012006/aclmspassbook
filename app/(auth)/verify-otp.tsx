import { ErrorBanner } from "@/components/StatusViews";
import { useAuth } from "@/context/AuthContext";
import { useCountdown } from "@/hooks/useCountdown";
import { getErrorMessage } from "@/services/api";
import { requestOtp, verifyOtp } from "@/services/auth-service";
import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useState } from "react";
import { ActivityIndicator, Pressable, Text, TextInput, View } from "react-native";

const RESEND_COOLDOWN_SECONDS = 300; // must match RESEND_COOLDOWN_SECONDS in the backend's request-otp.js

export default function VerifyOtpScreen() {
  const params = useLocalSearchParams<{ contactNumber: string; flow: string; debugCode?: string }>();
  const { contactNumber, flow } = params;
  const { signIn } = useAuth();
  const { secondsLeft, start, isActive } = useCountdown();

  const [code, setCode] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [locked, setLocked] = useState<"account" | "enrollment" | null>(null);
  // Only ever populated when the backend's MOBILE_OTP_DEBUG_LOG is on —
  // never happens in production (see request-otp.js). Updated on resend too,
  // since a new code means the old debug value is stale/already consumed.
  const [debugCode, setDebugCode] = useState<string | null>(params.debugCode ?? null);

  // A code was just sent to land on this screen — the server enforces a
  // 300s window before another send for this number succeeds, so start the
  // countdown immediately rather than waiting for the user to hit Resend
  // and get a COOLDOWN_ACTIVE error first.
  useEffect(() => {
    start(RESEND_COOLDOWN_SECONDS);
  }, [start]);

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

      if (result.code === "ACCOUNT_LOCKED") {
        setLocked("account");
        return;
      }
      if (result.code === "ENROLLMENT_LOCKED") {
        setLocked("enrollment");
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
    if (isActive) return; // guarded by the disabled button too, but never trust just the UI
    setError(null);
    setIsResending(true);
    try {
      const result = await requestOtp({ contactNumber });
      if (result.success) {
        start(RESEND_COOLDOWN_SECONDS);
        setDebugCode(result.debugCode ?? null);
      } else if (result.code === "COOLDOWN_ACTIVE") {
        start(result.retryAfterSeconds ?? RESEND_COOLDOWN_SECONDS);
      } else {
        setError(result.message ?? "Failed to resend code.");
      }
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setIsResending(false);
    }
  }

  function formatTime(totalSeconds: number) {
    const m = Math.floor(totalSeconds / 60);
    const s = totalSeconds % 60;
    return `${m}:${String(s).padStart(2, "0")}`;
  }

  if (locked) {
    return (
      <View className="flex-1 bg-white justify-center px-6">
        <Text className="text-2xl font-bold text-gray-900 mb-2">Account locked</Text>
        <Text className="text-gray-500 mb-6">
          {locked === "account"
            ? "Too many incorrect attempts. Your account has been locked for security. Please contact your branch or an administrator to reactivate it."
            : "Too many incorrect attempts. Please visit your branch to activate mobile access."}
        </Text>
        <Pressable onPress={() => router.replace("/(auth)/login")} className="items-center mt-2">
          <Text className="text-brand-600 font-medium">Back to sign in</Text>
        </Pressable>
      </View>
    );
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

      {/* Debug-only — see request-otp.js. Never appears when the backend's
          MOBILE_OTP_DEBUG_LOG is off, which is always true in production. */}
      {debugCode && (
        <Pressable
          onPress={() => setCode(debugCode)}
          className="bg-amber-50 border border-warning rounded-xl px-4 py-3 mb-4"
        >
          <Text className="text-warning text-xs font-semibold uppercase tracking-wide mb-1">
            Debug mode — SMS not actually sent
          </Text>
          <Text className="text-gray-900">
            Code: <Text className="font-bold tracking-widest">{debugCode}</Text> (tap to fill in)
          </Text>
        </Pressable>
      )}

      {error && <ErrorBanner message={error} />}

      <Pressable
        onPress={handleVerify}
        disabled={isSubmitting || code.length !== 6}
        className="bg-brand-500 rounded-xl py-4 items-center mt-4 disabled:opacity-60"
      >
        {isSubmitting ? <ActivityIndicator color="white" /> : <Text className="text-white font-semibold text-base">Verify</Text>}
      </Pressable>

      <Pressable onPress={handleResend} disabled={isResending || isActive} className="items-center mt-5">
        <Text className={isActive ? "text-gray-400 font-medium" : "text-brand-600 font-medium"}>
          {isResending
            ? "Resending…"
            : isActive
            ? `Resend available in ${formatTime(secondsLeft)}`
            : "Didn't get a code? Resend"}
        </Text>
      </Pressable>
    </View>
  );
}
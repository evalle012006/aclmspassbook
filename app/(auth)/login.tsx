import { ErrorBanner } from "@/components/StatusViews";
import { getErrorMessage } from "@/services/api";
import { requestOtp } from "@/services/auth-service";
import { router } from "expo-router";
import { useState } from "react";
import { ActivityIndicator, Image, KeyboardAvoidingView, Platform, Pressable, Text, TextInput, View } from "react-native";

export default function LoginScreen() {
  const [contactNumber, setContactNumber] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [infoMessage, setInfoMessage] = useState<string | null>(null);

  async function handleContinue() {
    setError(null);
    setInfoMessage(null);

    if (contactNumber.replace(/\D/g, "").length < 10) {
      setError("Enter a valid mobile number.");
      return;
    }

    setIsSubmitting(true);
    try {
      const result = await requestOtp({ contactNumber });

      if (result.success) {
        router.push({
          pathname: "/(auth)/verify-otp",
          params: { contactNumber, flow: result.flow ?? "login" },
        });
        return;
      }

      switch (result.code) {
        case "NO_CLIENT_FOUND":
          // Full self-registration (ID capture + selfie) is a follow-up
          // build — this scaffold surfaces the path but doesn't implement
          // the camera/upload flow yet.
          setInfoMessage("We couldn't find an account for this number. Self-registration with ID verification is coming soon — please visit your branch in the meantime.");
          break;
        case "DISAMBIGUATION_REQUIRED":
          router.push({ pathname: "/(auth)/disambiguate", params: { contactNumber } });
          break;
        case "STAFF_ACTIVATION_REQUIRED":
          setInfoMessage("We couldn't verify your identity automatically. Please visit your branch to activate mobile access.");
          break;
        case "COOLDOWN_ACTIVE": {
          const seconds = result.retryAfterSeconds ?? 300;
          const mins = Math.ceil(seconds / 60);
          setInfoMessage(`A code was already sent recently. Please wait about ${mins} minute${mins === 1 ? "" : "s"} before requesting another.`);
          break;
        }
        default:
          setError(result.message ?? "Something went wrong. Please try again.");
      }
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      className="flex-1 bg-white"
    >
      <View className="flex-1 justify-center px-6">
        {/* Company logo — drop your actual file at assets/images/logo.png.
            If that file doesn't exist yet, this <Image> will fail to bundle;
            comment it out until the asset is in place. */}
        <View className="items-center mb-8">
          <Image
            source={require("../../assets/images/logo.png")}
            style={{ width: 96, height: 96 }}
            resizeMode="contain"
          />
        </View>

        <Text className="text-2xl font-bold text-gray-900 mb-2">Welcome back</Text>
        <Text className="text-gray-500 mb-8">
          Enter your mobile number to sign in. We'll text you a one-time code.
        </Text>

        <Text className="text-sm font-medium text-gray-700 mb-1">Mobile number</Text>
        <TextInput
          value={contactNumber}
          onChangeText={setContactNumber}
          placeholder="09XX XXX XXXX"
          keyboardType="phone-pad"
          autoComplete="tel"
          className="border border-gray-300 rounded-xl px-4 py-3 text-base text-gray-900 mb-2"
        />

        {error && <ErrorBanner message={error} />}
        {infoMessage && (
          <View className="mt-2 p-4 rounded-xl bg-amber-50 border border-warning">
            <Text className="text-warning">{infoMessage}</Text>
          </View>
        )}

        <Pressable
          onPress={handleContinue}
          disabled={isSubmitting}
          className="bg-brand-500 rounded-xl py-4 items-center mt-6 disabled:opacity-60"
        >
          {isSubmitting ? (
            <ActivityIndicator color="white" />
          ) : (
            <Text className="text-white font-semibold text-base">Continue</Text>
          )}
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}
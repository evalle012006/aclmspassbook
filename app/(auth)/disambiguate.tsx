import { ErrorBanner } from "@/components/StatusViews";
import { getErrorMessage } from "@/services/api";
import { requestOtp } from "@/services/auth-service";
import { router, useLocalSearchParams } from "expo-router";
import { useState } from "react";
import { ActivityIndicator, Pressable, Text, TextInput, View } from "react-native";

// Shown when request-otp responds DISAMBIGUATION_REQUIRED — the phone
// number matches more than one client record (shared household numbers
// are common; see the backend's request-otp.js for why we don't guess).
export default function DisambiguateScreen() {
  const { contactNumber } = useLocalSearchParams<{ contactNumber: string }>();
  const [lastName, setLastName] = useState("");
  const [birthdate, setBirthdate] = useState(""); // YYYY-MM-DD
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [blocked, setBlocked] = useState<string | null>(null);

  async function handleContinue() {
    setError(null);
    setBlocked(null);
    setIsSubmitting(true);
    try {
      const result = await requestOtp({ contactNumber, lastName, birthdate });

      if (result.success) {
        router.push({ pathname: "/(auth)/verify-otp", params: { contactNumber, flow: result.flow ?? "enrollment", ...(result.debugCode && { debugCode: result.debugCode }) } });
        return;
      }

      if (result.code === "STAFF_ACTIVATION_REQUIRED") {
        setBlocked("We still couldn't verify your identity. Please visit your branch to activate mobile access.");
      } else {
        setError(result.message ?? "Something went wrong.");
      }
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <View className="flex-1 bg-white justify-center px-6">
      <Text className="text-2xl font-bold text-gray-900 mb-2">Confirm it's you</Text>
      <Text className="text-gray-500 mb-8">
        More than one account uses this number. Enter your last name and birthdate as they appear on file.
      </Text>

      <Text className="text-sm font-medium text-gray-700 mb-1">Last name</Text>
      <TextInput
        value={lastName}
        onChangeText={setLastName}
        className="border border-gray-300 rounded-xl px-4 py-3 text-base text-gray-900 mb-4"
      />

      <Text className="text-sm font-medium text-gray-700 mb-1">Birthdate (YYYY-MM-DD)</Text>
      <TextInput
        value={birthdate}
        onChangeText={setBirthdate}
        placeholder="1990-05-20"
        className="border border-gray-300 rounded-xl px-4 py-3 text-base text-gray-900 mb-2"
      />

      {error && <ErrorBanner message={error} />}
      {blocked && (
        <View className="mt-2 p-4 rounded-xl bg-amber-50 border border-warning">
          <Text className="text-warning">{blocked}</Text>
        </View>
      )}

      <Pressable
        onPress={handleContinue}
        disabled={isSubmitting || !lastName || !birthdate}
        className="bg-brand-500 rounded-xl py-4 items-center mt-6 disabled:opacity-60"
      >
        {isSubmitting ? <ActivityIndicator color="white" /> : <Text className="text-white font-semibold text-base">Continue</Text>}
      </Pressable>
    </View>
  );
}
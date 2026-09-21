import { ListSkeleton } from "@/components/ListSkeleton";
import { EmptyState, ErrorBanner } from "@/components/StatusViews";
import { useClientProfile } from "@/hooks/useClientData";
import { getErrorMessage } from "@/services/api";
import Constants from "expo-constants";
import { Text, View } from "react-native";
import QRCode from "react-native-qrcode-svg";

export default function QrScreen() {
  const { data: profile, isLoading, isError, error, refetch } = useClientProfile();

  if (isLoading) return <ListSkeleton rows={1} />;
  if (isError) return <ErrorBanner message={getErrorMessage(error)} onRetry={() => refetch()} />;

  if (!profile?.qrToken) {
    return (
      <EmptyState message="No QR code has been generated for your account yet. Ask your Loan Officer to generate one." />
    );
  }

  // Same URL shape the staff app's QR popover encodes
  // (components/clients/ClientQRIconPopover.js) — this is what a staff
  // member's scanner reads to open the cash-collection flow for this client.
  // webAppOrigin is a separate config value from apiBaseUrl (see app.json) —
  // this URL is opened by staff in the LMS web app, not hit by this mobile
  // app itself.
  const webAppOrigin = Constants.expoConfig?.extra?.webAppOrigin as string;
  const qrValue = `${webAppOrigin}/transactions/cash-collection/qr-collect/${profile.qrToken}`;

  return (
    <View className="flex-1 bg-white items-center justify-center px-6">
      <Text className="text-gray-900 font-semibold text-lg mb-1">Your QR Code</Text>
      <Text className="text-gray-500 text-sm mb-8 text-center">
        Show this to your Loan Officer for payment collection
      </Text>

      <View className="p-6 bg-white rounded-2xl shadow-sm border border-gray-100">
        <QRCode value={qrValue} size={220} color="#1e293b" backgroundColor="#ffffff" />
      </View>

      <Text className="text-gray-400 text-xs mt-6 text-center">{profile.fullName}</Text>
    </View>
  );
}
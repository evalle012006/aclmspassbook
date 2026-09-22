import { ListSkeleton } from "@/components/ListSkeleton";
import { EmptyState, ErrorBanner } from "@/components/StatusViews";
import { useClientProfile } from "@/hooks/useClientData";
import { getErrorMessage } from "@/services/api";
import { Ionicons } from "@expo/vector-icons";
import Constants from "expo-constants";
import * as FileSystem from "expo-file-system";
import * as Sharing from "expo-sharing";
import { useRef, useState } from "react";
import { ActivityIndicator, Alert, Pressable, Text, View } from "react-native";
import QRCode from "react-native-qrcode-svg";

export default function QrScreen() {
  const { data: profile, isLoading, isError, error, refetch } = useClientProfile();
  const [isSaving, setIsSaving] = useState(false);
  // react-native-qrcode-svg's getRef gives access to .toDataURL(), which is
  // how the rendered SVG becomes a base64 PNG we can actually export — there's
  // no "screenshot this view" shortcut for an SVG component.
  const qrRef = useRef<any>(null);

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

  async function handleDownload() {
    setIsSaving(true);
    try {
      const isAvailable = await Sharing.isAvailableAsync();
      if (!isAvailable) {
        Alert.alert("Not available", "Sharing isn't available on this device.");
        return;
      }

      // toDataURL's callback gives raw base64 (no "data:image/png;base64,"
      // prefix) — has to be written to an actual file before the share sheet
      // can hand it off to anything; it doesn't accept a base64 string directly.
      const base64: string = await new Promise((resolve, reject) => {
        if (!qrRef.current) return reject(new Error("QR not ready yet"));
        qrRef.current.toDataURL((data: string) => resolve(data));
      });

      const fileUri = `${FileSystem.cacheDirectory}ambercash-qr-${profile._id}.png`;
      await FileSystem.writeAsStringAsync(fileUri, base64, { encoding: FileSystem.EncodingType.Base64 });

      // Opens the OS share sheet — "Save Image" (iOS) / "Save to Photos" or
      // similar (Android) is one of the options there, alongside messaging
      // apps etc. This sidesteps expo-media-library entirely, which is
      // currently broken in Expo Go on Android (see README troubleshooting).
      await Sharing.shareAsync(fileUri, { mimeType: "image/png", dialogTitle: "Save your QR code" });
    } catch (err) {
      Alert.alert("Couldn't share", "Something went wrong preparing the QR code. Please try again.");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <View className="flex-1 bg-white items-center justify-center px-6">
      <Text className="text-gray-900 font-semibold text-lg mb-1">Your QR Code</Text>
      <Text className="text-gray-500 text-sm mb-8 text-center">
        Show this to your Loan Officer for payment collection
      </Text>

      <View className="p-6 bg-white rounded-2xl shadow-sm border border-gray-100">
        <QRCode value={qrValue} size={220} color="#1e293b" backgroundColor="#ffffff" getRef={(c) => (qrRef.current = c)} />
      </View>

      <Text className="text-gray-400 text-xs mt-6 mb-6 text-center">{profile.fullName}</Text>

      <Pressable
        onPress={handleDownload}
        disabled={isSaving}
        className="flex-row items-center gap-2 bg-brand-500 rounded-xl px-5 py-3 disabled:opacity-60"
      >
        {isSaving ? (
          <ActivityIndicator color="white" />
        ) : (
          <>
            <Ionicons name="share-outline" size={18} color="white" />
            <Text className="text-white font-semibold">Save / Share QR Code</Text>
          </>
        )}
      </Pressable>
    </View>
  );
}
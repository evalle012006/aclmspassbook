import { ListSkeleton } from "@/components/ListSkeleton";
import { EmptyState, ErrorBanner } from "@/components/StatusViews";
import { useClientPhotoUrl, useClientProfile, useClientPrograms } from "@/hooks/useClientData";
import { getErrorMessage } from "@/services/api";
import { getBiometricPreference, setBiometricPreference } from "@/services/auth-storage";
import { isBiometricAvailable, promptBiometric } from "@/services/biometric-service";
import type { ClientProgram } from "@/types/api";
import { router } from "expo-router";
import React, { useEffect, useState } from "react";
import { Alert, Image, Pressable, ScrollView, Switch, Text, View } from "react-native";

export default function AccountProfileScreen() {
  const { data: profile, isLoading, isError, error, refetch } = useClientProfile();
  const { data: photoUrl } = useClientPhotoUrl("profile");
  const { data: govIdPhotoUrl } = useClientPhotoUrl("governmentId");
  const { data: selfiePhotoUrl } = useClientPhotoUrl("selfieWithId");
  const { data: programs } = useClientPrograms();

  const [biometricSupported, setBiometricSupported] = useState(false);
  const [biometricEnabled, setBiometricEnabledState] = useState(true);

  useEffect(() => {
    (async () => {
      const [supported, pref] = await Promise.all([isBiometricAvailable(), getBiometricPreference()]);
      setBiometricSupported(supported);
      setBiometricEnabledState(pref);
    })();
  }, []);

  async function handleToggleBiometric(value: boolean) {
    if (value) {
      // Same reasoning as setup-biometric.tsx: confirm biometrics actually
      // work on this device before persisting the preference, rather than
      // just saving a boolean and hoping.
      const success = await promptBiometric("Confirm to enable biometric lock");
      if (!success) return; // leave the switch off, don't save the preference
    } else {
      Alert.alert("Biometric lock off", "Anyone with your phone unlocked can open AmberCash without Face ID or fingerprint.");
    }
    setBiometricEnabledState(value);
    await setBiometricPreference(value);
  }

  if (isLoading) return <ListSkeleton rows={3} />;
  if (isError) return <ErrorBanner message={getErrorMessage(error)} onRetry={() => refetch()} />;

  const initials = profile?.fullName
    ?.split(" ")
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  const fullAddress = [
    profile?.addressStreetNo,
    profile?.addressBarangayDistrict,
    profile?.addressMunicipalityCity,
    profile?.addressProvince,
    profile?.addressZipCode,
  ]
    .filter(Boolean)
    .join(", ") || profile?.address;

  return (
    <ScrollView className="flex-1 bg-gray-50">
      <View className="items-center pt-8 pb-6 bg-white">
        {photoUrl ? (
          <Image source={{ uri: photoUrl }} style={{ width: 88, height: 88, borderRadius: 44 }} />
        ) : (
          <View className="w-22 h-22 rounded-full bg-brand-50 items-center justify-center" style={{ width: 88, height: 88, borderRadius: 44 }}>
            <Text className="text-brand-700 text-2xl font-semibold">{initials}</Text>
          </View>
        )}
        <Text className="text-gray-900 text-lg font-bold mt-3">{profile?.fullName}</Text>
        {!!profile?.groupLeader && (
          <View className="bg-brand-50 px-2 py-0.5 rounded-full mt-1">
            <Text className="text-brand-700 text-[11px] font-semibold uppercase tracking-wide">Group Leader</Text>
          </View>
        )}
      </View>

      <View className="px-6 pt-4 gap-4">
        {/* Personal details */}
        <Section title="Personal Details">
          <Row label="Contact number" value={profile?.contactNumber} />
          <Row label="Address" value={fullAddress} />
          <Row label="Branch" value={profile?.branchName} />
          <Row label="Group" value={profile?.groupName} />
          <Row
            label="Member since"
            value={profile?.dateAdded ? new Date(profile.dateAdded).toLocaleDateString("en-PH", { year: "numeric", month: "long", day: "numeric" }) : undefined}
          />
          <Row label="Status" value={profile?.status} capitalize />
          <View className="flex-row justify-between items-center">
            <Text className="text-gray-500">Standing</Text>
            <View className={`px-2 py-0.5 rounded-full ${profile?.delinquent ? "bg-red-50" : "bg-green-50"}`}>
              <Text className={`text-xs font-semibold ${profile?.delinquent ? "text-danger" : "text-success"}`}>
                {profile?.delinquent ? "Delinquent" : "Good Standing"}
              </Text>
            </View>
          </View>
        </Section>

        {/* Security — always shown for Change Password; biometric toggle
            only shown when the device actually has usable hardware. */}
        <Section title="Security">
          {biometricSupported && (
            <View className="flex-row justify-between items-center pb-4 mb-4 border-b border-gray-100">
              <View className="flex-1 pr-4">
                <Text className="text-gray-900">Biometric Lock</Text>
                <Text className="text-gray-400 text-xs mt-0.5">
                  Require Face ID or fingerprint when reopening the app
                </Text>
              </View>
              <Switch value={biometricEnabled} onValueChange={handleToggleBiometric} />
            </View>
          )}
          <Pressable
            onPress={() => router.push("/(app)/change-password")}
            className="flex-row justify-between items-center"
          >
            <Text className="text-gray-900">Change Password</Text>
            <Text className="text-brand-600 text-sm">Set / Update →</Text>
          </Pressable>
        </Section>

        {/* Government ID */}
        <Section title="Government ID">
          <Row label="Type" value={profile?.governmentIdType} capitalize />
          <Row label="Number" value={profile?.governmentIdNumber} />
          {(govIdPhotoUrl || selfiePhotoUrl) && (
            <View className="flex-row gap-3 mt-2">
              {govIdPhotoUrl && (
                <View className="flex-1">
                  <Text className="text-gray-400 text-xs mb-1">ID Photo</Text>
                  <Image source={{ uri: govIdPhotoUrl }} style={{ width: "100%", height: 120, borderRadius: 8 }} resizeMode="cover" />
                </View>
              )}
              {selfiePhotoUrl && (
                <View className="flex-1">
                  <Text className="text-gray-400 text-xs mb-1">Selfie with ID</Text>
                  <Image source={{ uri: selfiePhotoUrl }} style={{ width: "100%", height: 120, borderRadius: 8 }} resizeMode="cover" />
                </View>
              )}
            </View>
          )}
          {!profile?.governmentIdType && !govIdPhotoUrl && (
            <Text className="text-gray-400 text-xs mt-1">No government ID on file.</Text>
          )}
        </Section>

        {/* Programs */}
        <View className="bg-white rounded-2xl p-5 shadow-sm">
          <Text className="text-gray-900 font-semibold mb-3">Programs</Text>
          {!programs?.length ? (
            <EmptyState message="Not enrolled in any programs yet." />
          ) : (
            <View className="gap-3">
              {programs.map((p) => <ProgramCard key={p._id} program={p} />)}
            </View>
          )}
        </View>
      </View>

      <View style={{ height: 32 }} />
    </ScrollView>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View className="bg-white rounded-2xl p-5 shadow-sm gap-3">
      <Text className="text-gray-900 font-semibold">{title}</Text>
      {children}
    </View>
  );
}

function Row({ label, value, capitalize }: { label: string; value?: string | null; capitalize?: boolean }) {
  if (!value) return null;
  return (
    <View className="flex-row justify-between gap-4">
      <Text className="text-gray-500">{label}</Text>
      <Text className={`text-gray-900 font-medium flex-1 text-right ${capitalize ? "capitalize" : ""}`} numberOfLines={2}>
        {value}
      </Text>
    </View>
  );
}

function ProgramCard({ program }: { program: ClientProgram }) {
  return (
    <View className="flex-row gap-3 border border-gray-100 rounded-xl p-3">
      {program.pictureUrl ? (
        <Image source={{ uri: program.pictureUrl }} style={{ width: 56, height: 56, borderRadius: 8 }} resizeMode="cover" />
      ) : (
        <View className="w-14 h-14 rounded-lg bg-gray-50" />
      )}
      <View className="flex-1">
        <Text className="text-gray-900 font-medium capitalize">{program.program_type}</Text>
        {program.scholar_name && <Text className="text-gray-500 text-sm">{program.scholar_name}</Text>}
        {program.school_name && (
          <Text className="text-gray-400 text-xs mt-0.5">
            {program.school_name}{program.year_level ? ` · ${program.year_level}` : ""}
          </Text>
        )}
        {program.status && <Text className="text-gray-400 text-xs mt-0.5 capitalize">{program.status}</Text>}
      </View>
    </View>
  );
}
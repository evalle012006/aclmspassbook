import { ListSkeleton } from "@/components/ListSkeleton";
import { ErrorBanner } from "@/components/StatusViews";
import { getCurrentLoan, getTransferDate, useClientPhotoUrl, useClientProfile, useGuarantor, useLoans } from "@/hooks/useClientData";
import { getErrorMessage } from "@/services/api";
import Constants from "expo-constants";
import { router } from "expo-router";
import { Image, Pressable, ScrollView, Text, View } from "react-native";

function peso(amount?: number) {
  if (amount == null) return "—";
  return `₱${amount.toLocaleString("en-PH", { minimumFractionDigits: 2 })}`;
}

// occurence ("daily" | "weekly", spelled as stored) decides the unit for
// loanTerms — a daily-collection loan's term is counted in days, a
// weekly-collection loan's in weeks. Same number, different meaning.
function formatTerm(loanTerms?: number, occurence?: string) {
  if (loanTerms == null) return "—";
  const unit = occurence === "daily" ? "days" : "wks";
  return `${loanTerms} ${unit}`;
}

export default function HomeScreen() {
  const { data: profile, isLoading, isError, error, refetch } = useClientProfile();
  const { data: photoUrl } = useClientPhotoUrl();
  const { data: loans } = useLoans();
  const { data: guarantor } = useGuarantor();

  if (isLoading) return <ListSkeleton rows={2} />;

  if (isError) {
    return <ErrorBanner message={getErrorMessage(error)} onRetry={() => refetch()} />;
  }

  const initials = profile?.fullName
    ?.split(" ")
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  // "Current" means still open — active or pending — never just the first
  // record returned, which could be a loan closed years ago.
  const currentLoan = getCurrentLoan(loans);
  const isGroupLeader = !!profile?.groupLeader;

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
      <View className="bg-brand-500 px-6 pt-6 pb-10 rounded-b-3xl">
        <View className="flex-row items-center gap-4">
          {photoUrl ? (
            <Image source={{ uri: photoUrl }} style={{ width: 56, height: 56, borderRadius: 28 }} />
          ) : (
            <View className="w-14 h-14 rounded-full bg-white/20 items-center justify-center">
              <Text className="text-white text-lg font-semibold">{initials}</Text>
            </View>
          )}
          <View className="flex-1">
            <Text className="text-white/80 text-sm">Welcome back</Text>
            <View className="flex-row items-center gap-2">
              <Text className="text-white text-xl font-bold" numberOfLines={1}>{profile?.fullName}</Text>
              {isGroupLeader && (
                <View className="bg-white/20 px-2 py-0.5 rounded-full">
                  <Text className="text-white text-[10px] font-semibold uppercase tracking-wide">Group Leader</Text>
                </View>
              )}
            </View>
            {profile?.branchName && (
              <Text className="text-white/80 mt-0.5">{profile.branchName} branch</Text>
            )}
          </View>
        </View>
      </View>

      <View className="px-6 -mt-6 gap-4">
        {/* Profile details */}
        <View className="bg-white rounded-2xl p-5 shadow-sm gap-3">
          <Row label="Contact number" value={profile?.contactNumber} />
          <Row label="Address" value={fullAddress} />
          <Row
            label="Member since"
            value={profile?.dateAdded ? new Date(profile.dateAdded).toLocaleDateString("en-PH", { year: "numeric", month: "long" }) : undefined}
          />
          <Row label="Status" value={profile?.status} capitalize />

          {/* MCBU is shown to every member; CSF is a group-fund figure the
              group leader specifically is responsible for tracking. */}
          {currentLoan && <Row label="MCBU" value={peso(currentLoan.mcbu)} />}
          {isGroupLeader && currentLoan && <Row label="CSF" value={peso(currentLoan.csf)} />}

          {!!profile?.delinquent && (
            <Text className="text-danger font-medium">Account has a past-due balance</Text>
          )}
        </View>

        {/* Guarantor on file — resolved from the latest CI-approved
            application; may be absent if no application has been approved yet. */}
        {guarantor && (
          <View className="bg-white rounded-2xl p-5 shadow-sm">
            <Text className="text-gray-900 font-semibold mb-2">Guarantor on File</Text>
            <Text className="text-gray-700">
              {[guarantor.firstName, guarantor.lastName].filter(Boolean).join(" ")}
            </Text>
            {guarantor.relationship && (
              <Text className="text-gray-400 text-xs mt-0.5 capitalize">{guarantor.relationship}</Text>
            )}
          </View>
        )}

        {/* Current loan snapshot — full history lives on the Loans tab.
            activeLoan is the daily payment amount, not a flag — status is
            the actual indicator that this is the current loan. */}
        {currentLoan && (
          <Pressable
            onPress={() => router.push({ pathname: "/(app)/loans/[loanId]/payments", params: { loanId: currentLoan._id } })}
            className="bg-white rounded-2xl p-5 shadow-sm"
          >
            <View className="flex-row justify-between items-center mb-3">
              <Text className="text-gray-900 font-semibold">Current Loan</Text>
              {currentLoan.status === "active" && (
                <View className="bg-brand-50 px-2 py-1 rounded-full">
                  <Text className="text-brand-700 text-xs font-medium">Active</Text>
                </View>
              )}
            </View>

            {!!currentLoan.transferId && (
              <Text className="text-gray-400 text-xs mb-3 -mt-2">
                Transferred{getTransferDate(currentLoan) ? ` on ${new Date(getTransferDate(currentLoan)!).toLocaleDateString("en-PH", { year: "numeric", month: "short", day: "numeric" })}` : ""}
              </Text>
            )}

            <View className="flex-row flex-wrap justify-between gap-y-3">
              <LoanStat label="Balance" value={peso(currentLoan.loanBalance)} />
              <LoanStat label="Daily payment" value={peso(currentLoan.activeLoan)} />
              <LoanStat label="Released" value={peso(currentLoan.amountRelease)} />
              {!!currentLoan.pastDue && (
                <LoanStat label="Past due" value={peso(currentLoan.pastDue)} danger />
              )}
              <LoanStat label="Term" value={formatTerm(currentLoan.loanTerms, currentLoan.occurence)} />
              <LoanStat label="Payments made" value={currentLoan.noOfPayments != null ? String(currentLoan.noOfPayments) : "—"} />
            </View>

            <View className="mt-3 pt-3 border-t border-gray-100 gap-1">
              {currentLoan.branchName && <Text className="text-gray-400 text-xs">Branch: {currentLoan.branchName}</Text>}
              {currentLoan.groupName && (
                // Shown here (not just on the profile card above) because a
                // client can be transferred to a different group/branch/LO
                // after a loan was granted — this loan's own group at the
                // time may differ from the client's current one.
                <Text className="text-gray-400 text-xs">Group at time of loan: {currentLoan.groupName}</Text>
              )}
              {currentLoan.loanOfficerName && (
                <Text className="text-gray-400 text-xs">Loan Officer: {currentLoan.loanOfficerName}</Text>
              )}
            </View>

            <Text className="text-brand-600 text-xs mt-3 text-center">Tap to view payment transactions →</Text>
          </Pressable>
        )}
      </View>

      {/* Footer — logo + company info + app version. */}
      <View className="items-center mt-8 mb-6 px-6">
        <Image
          source={require("../../assets/images/logo.png")}
          style={{ width: 40, height: 40, opacity: 0.6 }}
          resizeMode="contain"
        />
        <Text className="text-gray-400 text-xs mt-2 text-center">
          © {new Date().getFullYear()} AmberCash PH. All rights reserved.
        </Text>
        <Text className="text-gray-300 text-[11px] mt-1">
          Version {Constants.expoConfig?.version ?? "1.0.0"}
        </Text>
      </View>
    </ScrollView>
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

function LoanStat({ label, value, danger }: { label: string; value: string; danger?: boolean }) {
  return (
    <View style={{ width: "48%" }}>
      <Text className="text-gray-400 text-xs">{label}</Text>
      <Text className={`font-semibold ${danger ? "text-danger" : "text-gray-900"}`}>{value}</Text>
    </View>
  );
}
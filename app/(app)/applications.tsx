import { ListSkeleton } from "@/components/ListSkeleton";
import { EmptyState, ErrorBanner } from "@/components/StatusViews";
import { useLafApplications } from "@/hooks/useClientData";
import { getErrorMessage } from "@/services/api";
import type { CiInvestigation, LafApplication } from "@/types/api";
import { FlatList, Text, View } from "react-native";

function formatDate(value?: string) {
  if (!value) return null;
  return new Date(value).toLocaleDateString("en-PH", { year: "numeric", month: "short", day: "numeric" });
}

export default function ApplicationsScreen() {
  const { data, isLoading, isError, error, refetch, isRefetching } = useLafApplications();
  const applications = data?.applications ?? [];
  const investigations = data?.investigations ?? [];

  if (isLoading) return <ListSkeleton />;
  if (isError) return <ErrorBanner message={getErrorMessage(error)} onRetry={() => refetch()} />;
  if (!applications.length) return <EmptyState message="No loan applications submitted yet." />;

  return (
    <FlatList
      className="flex-1 bg-gray-50"
      contentContainerStyle={{ padding: 16, gap: 16 }}
      data={applications}
      keyExtractor={(item) => item._id}
      onRefresh={refetch}
      refreshing={isRefetching}
      renderItem={({ item }) => (
        <ApplicationCard
          application={item}
          investigation={investigations.find((ci) => ci.tempApplicationId === item._id)}
        />
      )}
    />
  );
}

function ApplicationCard({ application, investigation }: { application: LafApplication; investigation?: CiInvestigation }) {
  return (
    <View className="bg-white rounded-2xl p-4 shadow-sm">
      <Text className="text-gray-900 font-semibold text-base capitalize">{application.status}</Text>
      {application.loanPurpose && <Text className="text-gray-500 text-sm mt-1">{application.loanPurpose}</Text>}
      {application.submittedAt && (
        <Text className="text-gray-400 text-xs mt-2">Submitted {formatDate(application.submittedAt)}</Text>
      )}

      {investigation && (
        <View className="mt-3 pt-3 border-t border-gray-100">
          <Text className="text-gray-700 text-xs font-semibold uppercase tracking-wide mb-2">
            Credit Investigation
          </Text>

          {investigation.ciReferenceCode && (
            <Text className="text-gray-400 text-xs font-mono mb-2">Ref: {investigation.ciReferenceCode}</Text>
          )}

          {investigation.decision && (
            <Row label="Decision" value={investigation.decision} capitalize />
          )}
          {investigation.decision?.toLowerCase() === "declined" && investigation.declineReason && (
            <Text className="text-danger text-xs mt-1">{investigation.declineReason}</Text>
          )}
          <View className="flex-row gap-4 mt-1">
            {investigation.businessVerified != null && (
              <VerifiedPill label="Business" verified={investigation.businessVerified} />
            )}
            {investigation.addressVerified != null && (
              <VerifiedPill label="Address" verified={investigation.addressVerified} />
            )}
          </View>
          {investigation.investigatedAt && (
            <Text className="text-gray-400 text-xs mt-2">
              Investigated {formatDate(investigation.investigatedAt)}
            </Text>
          )}
        </View>
      )}
    </View>
  );
}

function Row({ label, value, capitalize }: { label: string; value: string; capitalize?: boolean }) {
  return (
    <View className="flex-row justify-between">
      <Text className="text-gray-500 text-sm">{label}</Text>
      <Text className={`text-gray-900 text-sm font-medium ${capitalize ? "capitalize" : ""}`}>{value}</Text>
    </View>
  );
}

function VerifiedPill({ label, verified }: { label: string; verified: boolean }) {
  return (
    <View className={`px-2 py-0.5 rounded-full ${verified ? "bg-green-50" : "bg-gray-100"}`}>
      <Text className={`text-[11px] font-medium ${verified ? "text-success" : "text-gray-400"}`}>
        {label} {verified ? "verified" : "unverified"}
      </Text>
    </View>
  );
}
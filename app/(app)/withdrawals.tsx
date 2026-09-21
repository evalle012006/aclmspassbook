import { ListSkeleton } from "@/components/ListSkeleton";
import { EmptyState, ErrorBanner } from "@/components/StatusViews";
import { useWithdrawals } from "@/hooks/useClientData";
import { getErrorMessage } from "@/services/api";
import type { Withdrawal } from "@/types/api";
import { FlatList, Text, View } from "react-native";

function peso(amount?: number) {
  if (!amount) return "—";
  return `₱${amount.toLocaleString("en-PH", { minimumFractionDigits: 2 })}`;
}

const STATUS_STYLES: Record<string, string> = {
  approved: "bg-green-50 text-success",
  rejected: "bg-red-50 text-danger",
  pending: "bg-amber-50 text-warning",
};

export default function WithdrawalsScreen() {
  const { data: withdrawals, isLoading, isError, error, refetch, isRefetching } = useWithdrawals();

  if (isLoading) return <ListSkeleton />;
  if (isError) return <ErrorBanner message={getErrorMessage(error)} onRetry={() => refetch()} />;
  if (!withdrawals?.length) return <EmptyState message="No withdrawal requests yet." />;

  return (
    <FlatList
      className="flex-1 bg-gray-50"
      contentContainerStyle={{ padding: 16, gap: 12 }}
      data={withdrawals}
      keyExtractor={(item) => item._id}
      onRefresh={refetch}
      refreshing={isRefetching}
      renderItem={({ item }) => <WithdrawalCard withdrawal={item} />}
    />
  );
}

function WithdrawalCard({ withdrawal }: { withdrawal: Withdrawal }) {
  const statusClass = STATUS_STYLES[withdrawal.status] ?? "bg-gray-100 text-gray-700";
  const amount = (withdrawal.mcbu_withdrawal_amount ?? 0) + (withdrawal.csf_withdrawal_amount ?? 0);

  return (
    <View className="bg-white rounded-2xl p-4 shadow-sm">
      <View className="flex-row justify-between items-start">
        <Text className="text-gray-900 font-semibold text-base">{peso(amount)}</Text>
        <View className={`px-2 py-1 rounded-full ${statusClass}`}>
          <Text className="text-xs font-medium capitalize">{withdrawal.status}</Text>
        </View>
      </View>
      <Text className="text-gray-500 text-sm mt-1">
        Requested {new Date(withdrawal.inserted_date).toLocaleDateString("en-PH", { year: "numeric", month: "short", day: "numeric" })}
      </Text>
      {withdrawal.reason && <Text className="text-gray-400 text-xs mt-1">{withdrawal.reason}</Text>}
    </View>
  );
}
import { ListSkeleton } from "@/components/ListSkeleton";
import { EmptyState, ErrorBanner } from "@/components/StatusViews";
import { getTransferDate, useLoans } from "@/hooks/useClientData";
import { getErrorMessage } from "@/services/api";
import type { Loan } from "@/types/api";
import { router } from "expo-router";
import { FlatList, Pressable, Text, View } from "react-native";

function peso(amount?: number) {
  if (amount == null) return "—";
  return `₱${amount.toLocaleString("en-PH", { minimumFractionDigits: 2 })}`;
}

export default function LoansScreen() {
  const { data: loans, isLoading, isError, error, refetch, isRefetching } = useLoans();

  if (isLoading) return <ListSkeleton />;
  if (isError) return <ErrorBanner message={getErrorMessage(error)} onRetry={() => refetch()} />;
  if (!loans?.length) return <EmptyState message="No loans on record yet." />;

  return (
    <FlatList
      className="flex-1 bg-gray-50"
      contentContainerStyle={{ padding: 16, gap: 12 }}
      data={loans}
      keyExtractor={(item) => item._id}
      onRefresh={refetch}
      refreshing={isRefetching}
      // Backend already sorts active-first, most-recently-modified, highest
      // loanCycle — this list renders in that order as-is.
      ListHeaderComponent={
        <Text className="text-gray-400 text-xs text-center mb-2">
          Tap a loan to view its payment transactions
        </Text>
      }
      renderItem={({ item }) => <LoanCard loan={item} />}
    />
  );
}

function LoanCard({ loan }: { loan: Loan }) {
  // 'closed' means the loan was closed early via an offset — a fundamentally
  // different event from a loan that simply finished its normal term
  // ('completed'). loanRelease (not amountRelease) and remarks (the offset
  // reason) are the fields that actually apply to that case.
  const isClosed = loan.status === "closed";

  return (
    <Pressable
      onPress={() => router.push({ pathname: "/(app)/loans/[loanId]/payments", params: { loanId: loan._id } })}
      className="bg-white rounded-2xl p-4 shadow-sm"
    >
      <View className="flex-row justify-between items-start">
        <View>
          <Text className="text-gray-900 font-semibold text-base">
            Loan Cycle {loan.loanCycle ?? "—"}
          </Text>
          <Text className="text-gray-500 text-sm mt-0.5 capitalize">{loan.status}</Text>
        </View>
        {/* activeLoan is the daily payment amount, not a flag — status is
            the actual indicator of whether this is the current loan. */}
        {loan.status === "active" && (
          <View className="bg-brand-50 px-2 py-1 rounded-full">
            <Text className="text-brand-700 text-xs font-medium">Active</Text>
          </View>
        )}
      </View>

      {!!loan.transferId && (
        <Text className="text-gray-400 text-xs mt-1">
          Transferred{getTransferDate(loan) ? ` on ${new Date(getTransferDate(loan)!).toLocaleDateString("en-PH", { year: "numeric", month: "short", day: "numeric" })}` : ""}
        </Text>
      )}

      {isClosed ? (
        <View className="mt-4">
          <View className="flex-row justify-between">
            <View>
              <Text className="text-gray-400 text-xs">Balance</Text>
              <Text className="text-gray-900 font-semibold">{peso(loan.loanBalance)}</Text>
            </View>
            <View>
              <Text className="text-gray-400 text-xs">Amount released</Text>
              <Text className="text-gray-900 font-semibold">{peso(loan.loanRelease)}</Text>
            </View>
          </View>
          {loan.remarks?.label && (
            <View className="mt-3 pt-3 border-t border-gray-100">
              <Text className="text-gray-400 text-xs">Reason</Text>
              <Text className="text-gray-700 text-sm mt-0.5">{loan.remarks.label}</Text>
            </View>
          )}
        </View>
      ) : (
        <View className="flex-row justify-between mt-4">
          <View>
            <Text className="text-gray-400 text-xs">Balance</Text>
            <Text className="text-gray-900 font-semibold">{peso(loan.loanBalance)}</Text>
          </View>
          <View>
            <Text className="text-gray-400 text-xs">Daily payment</Text>
            <Text className="text-gray-900 font-semibold">{peso(loan.activeLoan)}</Text>
          </View>
          {loan.pastDue ? (
            <View>
              <Text className="text-gray-400 text-xs">Past due</Text>
              <Text className="text-danger font-semibold">{peso(loan.pastDue)}</Text>
            </View>
          ) : null}
        </View>
      )}

      {/* Shown on every loan card regardless of status — defaults to 0 when
          the field is null, per how these are meant to read (a loan with no
          bad-debt history has "0", not a blank). */}
      <View className="flex-row justify-between mt-3 pt-3 border-t border-gray-100">
        <MiniStat label="Bad debt payments" value={loan.noBadDebtPayment ?? 0} />
        <MiniStat label="Past due count" value={loan.noPastDue ?? 0} />
        <MiniStat label="Mispayments" value={loan.mispayment ?? 0} />
      </View>
    </Pressable>
  );
}

function MiniStat({ label, value }: { label: string; value: number }) {
  return (
    <View className="items-center flex-1">
      <Text className={`font-semibold ${value > 0 ? "text-warning" : "text-gray-900"}`}>{value}</Text>
      <Text className="text-gray-400 text-[10px] text-center mt-0.5">{label}</Text>
    </View>
  );
}
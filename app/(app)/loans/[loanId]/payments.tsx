import { ListSkeleton } from "@/components/ListSkeleton";
import { EmptyState, ErrorBanner } from "@/components/StatusViews";
import { useLoanPayments } from "@/hooks/useClientData";
import { getErrorMessage } from "@/services/api";
import type { Payment } from "@/types/api";
import { Stack, useLocalSearchParams } from "expo-router";
import { FlatList, Text, View } from "react-native";

function peso(amount?: number) {
  if (amount == null) return "—";
  return `₱${amount.toLocaleString("en-PH", { minimumFractionDigits: 2 })}`;
}

export default function LoanPaymentsScreen() {
  const { loanId } = useLocalSearchParams<{ loanId: string }>();
  const { data: payments, isLoading, isError, error, refetch, isRefetching } = useLoanPayments(loanId);

  return (
    <>
      <Stack.Screen options={{ title: "Payment History" }} />

      {isLoading ? (
        <ListSkeleton />
      ) : isError ? (
        <ErrorBanner message={getErrorMessage(error)} onRetry={() => refetch()} />
      ) : !payments?.length ? (
        <EmptyState message="No payments recorded for this loan yet." />
      ) : (
        <FlatList
          className="flex-1 bg-gray-50"
          contentContainerStyle={{ padding: 16, gap: 10 }}
          data={payments}
          keyExtractor={(item) => item._id}
          onRefresh={refetch}
          refreshing={isRefetching}
          renderItem={({ item }) => <PaymentRow payment={item} />}
        />
      )}
    </>
  );
}

function PaymentRow({ payment }: { payment: Payment }) {
  // insertedByDisplay/modifiedByDisplay are already resolved server-side
  // (falls back to the loan officer's name via loId when insertedBy is
  // empty, and modifiedBy falls back to insertedBy — see payments.js).
  return (
    <View className="bg-white rounded-xl p-4 shadow-sm">
      <View className="flex-row justify-between items-center">
        <View className="flex-1 pr-3">
          <Text className="text-gray-900 font-medium">
            {new Date(payment.dateAdded).toLocaleDateString("en-PH", { year: "numeric", month: "short", day: "numeric" })}
          </Text>
          {payment.latePayment && <Text className="text-warning text-xs mt-0.5">Late payment</Text>}
          {payment.mispayment && <Text className="text-danger text-xs mt-0.5">Missed payment</Text>}
          {payment.remarks?.label && (
            <Text className="text-gray-400 text-xs mt-0.5">{payment.remarks.label}</Text>
          )}
        </View>
        <Text className="text-gray-900 font-semibold text-base">{peso(payment.paymentCollection)}</Text>
      </View>

      {(payment.insertedByDisplay || payment.modifiedByDisplay) && (
        <View className="mt-2 pt-2 border-t border-gray-50">
          {payment.insertedByDisplay && (
            <Text className="text-gray-400 text-[11px]">Recorded by {payment.insertedByDisplay}</Text>
          )}
          {payment.modifiedByDisplay && payment.modifiedByDisplay !== payment.insertedByDisplay && (
            <Text className="text-gray-400 text-[11px]">Last modified by {payment.modifiedByDisplay}</Text>
          )}
        </View>
      )}
    </View>
  );
}
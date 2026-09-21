import { api } from "@/services/api";
import type { ApiResponse, CiInvestigation, ClientProfile, ClientProgram, Guarantor, LafApplication, Loan, Payment, Withdrawal } from "@/types/api";
import { useQuery } from "@tanstack/react-query";

// One hook per endpoint. Deliberately not a generic "useApiCall(url)" — a
// typed hook per resource means the screen gets real autocomplete on the
// shape of `data`, and a broken field name fails at compile time instead of
// showing up as `undefined` in the UI.

export function useClientProfile() {
  return useQuery({
    queryKey: ["client-profile"],
    queryFn: async () => {
      const { data } = await api.get<ApiResponse<ClientProfile>>("/clients/me");
      return data.data as ClientProfile;
    },
  });
}

// Separate from the profile fetch — the signed URL expires (1 hour) and is
// deliberately not bundled into /clients/me's response, so refetching the
// photo doesn't require refetching the whole profile.
//
// type matches the backend's fixed allow-list in photo-url.js — "profile"
// (default), "governmentId", or "selfieWithId". Anything else is rejected
// server-side, not just here.
export function useClientPhotoUrl(type: "profile" | "governmentId" | "selfieWithId" = "profile") {
  return useQuery({
    queryKey: ["client-photo-url", type],
    queryFn: async () => {
      const { data } = await api.get<{ success: boolean; url: string | null }>("/clients/photo-url", { params: { type } });
      return data.url;
    },
    staleTime: 45 * 60 * 1000, // refetch well before the 1-hour signed URL expires
  });
}

export function useClientPrograms() {
  return useQuery({
    queryKey: ["client-programs"],
    queryFn: async () => {
      const { data } = await api.get<ApiResponse<ClientProgram[]>>("/clients/programs");
      return data.data ?? [];
    },
  });
}

// Only one of transferredDate/transferDate is ever populated on a given
// loan — transferredDate on the old record that got closed and transferred
// AWAY, transferDate on the new record created at the destination that
// started FROM a transfer. Either way, this is simply "when was this
// transfer event, for display".
export function getTransferDate(loan: Loan): string | null {
  return loan.transferredDate || loan.transferDate || null;
}

export function useLoans() {
  return useQuery({
    queryKey: ["loans"],
    queryFn: async () => {
      const { data } = await api.get<ApiResponse<Loan[]>>("/loans/list");
      return data.data ?? [];
    },
  });
}

export function useLoanPayments(loanId: string | undefined) {
  return useQuery({
    queryKey: ["loan-payments", loanId],
    queryFn: async () => {
      const { data } = await api.get<ApiResponse<Payment[]>>("/loans/payments", { params: { loanId } });
      return data.data ?? [];
    },
    enabled: !!loanId,
  });
}

export function useWithdrawals() {
  return useQuery({
    queryKey: ["withdrawals"],
    queryFn: async () => {
      const { data } = await api.get<ApiResponse<Withdrawal[]>>("/withdrawals/list");
      return data.data ?? [];
    },
  });
}

export function useLafApplications() {
  return useQuery({
    queryKey: ["laf-applications"],
    queryFn: async () => {
      const { data } = await api.get<ApiResponse<LafApplication[]> & { investigations?: CiInvestigation[] }>("/laf/list");
      return { applications: data.data ?? [], investigations: data.investigations ?? [] };
    },
  });
}

// Guarantor on file, resolved server-side from the client's latest
// CI-approved loan application — see backend guarantor.js for why it's not
// just a flat field on the client record.
export function useGuarantor() {
  return useQuery({
    queryKey: ["guarantor"],
    queryFn: async () => {
      const { data } = await api.get<ApiResponse<Guarantor | null>>("/clients/guarantor");
      return data.data ?? null;
    },
  });
}

// A client can have multiple loan records (closed, completed, active).
// "Current" means still open — active or pending — never just "the first
// one returned", which could be a closed loan from years ago.
export function getCurrentLoan(loans: Loan[] | undefined): Loan | undefined {
  if (!loans?.length) return undefined;
  return loans.find((l) => l.status === "active" || l.status === "pending");
}
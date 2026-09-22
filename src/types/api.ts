// Mirrors src/lib/mobile-graph.fields.js in the backend, field for field.
// If a field is added there, add it here — don't widen these to "just in
// case" fields the backend doesn't actually return.

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  message?: string;
  code?: string;
}

export interface ClientProfile {
  _id: string;
  firstName: string;
  middleName?: string;
  lastName: string;
  fullName: string;
  contactNumber: string;
  profile?: string | null;
  address?: string;
  addressStreetNo?: string;
  addressBarangayDistrict?: string;
  addressMunicipalityCity?: string;
  addressProvince?: string;
  addressZipCode?: string;
  branchName?: string;
  groupName?: string;
  status: string;
  delinquent?: boolean;
  dateAdded?: string;
  groupLeader?: boolean;
  qrToken?: string | null;
  governmentIdType?: string;
  governmentIdNumber?: string;
}

export interface ClientProgram {
  _id: string;
  program_type: string;
  scholar_name?: string;
  year_level?: string;
  school_name?: string;
  course?: string;
  grant_date?: string;
  status?: string;
  pictureUrl?: string | null;
}

export interface Loan {
  _id: string;
  loanCycle?: number;
  status: string;
  // Not a flag — this is the daily payment amount for the loan. Use
  // `status === "active"` to check whether it's the current loan.
  activeLoan?: number;
  occurence?: "daily" | "weekly";
  principalLoan?: number;
  amountRelease?: number;
  loanRelease?: number; // shown instead of amountRelease for status === 'closed' (early offset/close)
  loanBalance?: number;
  loanTerms?: number;
  dateGranted?: string;
  dateModified?: string;
  dateOfRelease?: string;
  endDate?: string;
  fullPaymentDate?: string;
  noOfPayments?: number;
  targetCollection?: number;
  pastDue?: number;
  maturedPastDue?: boolean;
  mcbu?: number;
  mcbuTarget?: number;
  csf?: number;
  noBadDebtPayment?: number;
  noPastDue?: number;
  mispayment?: number; // count of mispayments on this loan — distinct from Payment.mispayment, which is a per-transaction flag
  remarks?: { label: string; value: string } | null;
  transferId?: string | null;
  // Only one of these is ever populated on a given loan record — see
  // useClientData.ts's getTransferDate() for which, and why.
  transferredDate?: string | null;
  transferDate?: string | null;
  branchName?: string;
  groupName?: string;
  loanOfficerName?: string;
}

export interface Payment {
  _id: string;
  loanId: string;
  dateAdded: string;
  paymentCollection?: number;
  mcbuCol?: number;
  csfCollection?: number;
  loanBalance?: number;
  fullPayment?: boolean;
  latePayment?: boolean;
  mispayment?: boolean;
  status?: string;
  insertedByDisplay?: string | null;
  modifiedByDisplay?: string | null;
  remarks?: { label: string; value: string } | null;
}

export interface Withdrawal {
  _id: string;
  client_id: string;
  loan_id: string;
  mcbu_withdrawal_amount?: number;
  csf_withdrawal_amount?: number;
  status: string;
  approved_date?: string;
  rejected_date?: string;
  reason?: string;
  inserted_date: string;
}

export interface LafApplication {
  _id: string;
  status: string;
  loanAmount?: number;
  loanPurpose?: string;
  submittedAt?: string;
  branchId?: string;
}

export interface CiInvestigation {
  _id: string;
  tempApplicationId: string;
  ciReferenceCode?: string;
  decision?: string;
  declineReason?: string;
  businessVerified?: boolean;
  addressVerified?: boolean;
  investigatedAt?: string;
}

export interface Guarantor {
  firstName: string;
  lastName: string;
  relationship?: string;
}

export type RequestOtpFlow = "login" | "enrollment";

export interface RequestOtpResponse {
  success: boolean;
  flow?: RequestOtpFlow;
  code?: "NO_CLIENT_FOUND" | "DISAMBIGUATION_REQUIRED" | "STAFF_ACTIVATION_REQUIRED" | "COOLDOWN_ACTIVE";
  retryAfterSeconds?: number;
  message?: string;
  // Only present when the backend's MOBILE_OTP_DEBUG_LOG is on (never in
  // production — see request-otp.js). Lets the app show the code directly
  // instead of someone relaying it from server logs.
  debugCode?: string;
}

export interface VerifyOtpResponse {
  success: boolean;
  token?: string;
  refreshToken?: string;
  clientId?: string;
  code?: "EXPIRED" | "INCORRECT" | "ACCOUNT_UNAVAILABLE" | "ACCOUNT_LOCKED" | "ENROLLMENT_LOCKED";
  message?: string;
}
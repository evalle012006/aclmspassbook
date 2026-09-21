import { api } from "./api";
import type { RequestOtpResponse, VerifyOtpResponse } from "@/types/api";

export async function requestOtp(params: {
  contactNumber: string;
  lastName?: string;
  birthdate?: string; // YYYY-MM-DD
}): Promise<RequestOtpResponse> {
  const { data } = await api.post<RequestOtpResponse>("/auth/request-otp", params);
  return data;
}

export async function verifyOtp(params: {
  contactNumber: string;
  code: string;
}): Promise<VerifyOtpResponse> {
  const { data } = await api.post<VerifyOtpResponse>("/auth/verify-otp", params);
  return data;
}

export async function selfRegister(params: {
  contactNumber: string;
  governmentIdType: string;
  governmentIdNumber: string;
  governmentIdPhotoKey: string;
  selfiePhotoKey: string;
}): Promise<{ success: boolean; message?: string }> {
  const { data } = await api.post("/auth/self-register", params);
  return data;
}

// Not used directly by screens — api.ts calls the backend endpoint itself
// via its own bare axios instance (see performRefresh there). This export
// exists for logout, which needs to revoke the refresh token server-side.
export async function logout(refreshToken: string | null): Promise<void> {
  if (!refreshToken) return;
  try {
    await api.post("/auth/logout", { refreshToken });
  } catch {
    // Best-effort — sign-out proceeds locally regardless (see AuthContext).
  }
}

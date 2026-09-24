import type { AuthConfigResponse, PasswordLoginResponse, RequestOtpResponse, SetPasswordResponse, VerifyOtpResponse } from "@/types/api";
import { api } from "./api";

export async function getAuthConfig(): Promise<AuthConfigResponse> {
  const { data } = await api.get<AuthConfigResponse>("/auth/config");
  return data;
}

export async function loginWithPassword(params: {
  identifier: string; // phone number OR government ID number
  password: string;
}): Promise<PasswordLoginResponse> {
  const { data } = await api.post<PasswordLoginResponse>("/auth/login-password", params);
  return data;
}

export async function setPassword(params: {
  currentPassword?: string; // omit when setting for the first time
  newPassword: string;
}): Promise<SetPasswordResponse> {
  const { data } = await api.post<SetPasswordResponse>("/auth/set-password", params);
  return data;
}

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
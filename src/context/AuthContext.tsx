import { onUnauthorized } from "@/services/api";
import { logout as logoutRequest } from "@/services/auth-service";
import {
  clearToken,
  getRefreshToken,
  getStoredClientId,
  getToken,
  setRefreshToken as persistRefreshToken,
  setToken as persistToken,
} from "@/services/auth-storage";
import { useQueryClient } from "@tanstack/react-query";
import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";

interface AuthState {
  isLoading: boolean;
  isSignedIn: boolean;
  clientId: string | null;
  signIn: (token: string, refreshToken: string, clientId: string) => Promise<void>;
  signOut: () => Promise<void>;
  // True for a brief window right after signIn() — lets the biometric lock
  // gate skip its "cold start with an existing session" check exactly once,
  // since the person just proved identity via OTP moments ago. Consumed via
  // consumeJustSignedIn() so it only ever applies to that one moment, not
  // every render afterward.
  justSignedIn: boolean;
  consumeJustSignedIn: () => void;
}

const AuthContext = createContext<AuthState | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [isLoading, setIsLoading] = useState(true);
  const [clientId, setClientId] = useState<string | null>(null);
  const justSignedInRef = useRef(false);
  const [, forceRender] = useState(0); // re-render consumers when the ref flips

  const queryClient = useQueryClient();

  useEffect(() => {
    (async () => {
      const [token, storedClientId] = await Promise.all([getToken(), getStoredClientId()]);
      if (token && storedClientId) setClientId(storedClientId);
      setIsLoading(false);
    })();
  }, []);

  // api.ts calls this only when a refresh attempt itself fails — expired,
  // revoked, or reused refresh token. That's the real "session is over"
  // signal now; a merely-expired access token is handled silently by refresh.
  // Also clears the query cache — see the note on signIn/signOut below for why.
  useEffect(() => {
    onUnauthorized(() => {
      setClientId(null);
      queryClient.clear();
    });
  }, [queryClient]);

  const signIn = useCallback(async (token: string, refreshToken: string, newClientId: string) => {
    // React Query caches by key ("client-profile", "loans", etc.) with no
    // per-user scoping — without clearing here, switching accounts on the
    // same app session (sign out, then a different client signs in) would
    // show the PREVIOUS client's cached data until each query happens to
    // refetch. Clearing on sign-in (not just sign-out) covers both directions:
    // a stale cache left over from a previous session that never got cleared
    // is just as wrong to show as the sign-out case.
    queryClient.clear();
    await persistToken(token, newClientId);
    await persistRefreshToken(refreshToken);
    justSignedInRef.current = true;
    setClientId(newClientId);
  }, [queryClient]);

  const signOut = useCallback(async () => {
    const refreshToken = await getRefreshToken();
    await logoutRequest(refreshToken); // best-effort server-side revoke
    await clearToken();
    setClientId(null);
    queryClient.clear();
  }, [queryClient]);

  const consumeJustSignedIn = useCallback(() => {
    justSignedInRef.current = false;
    forceRender((n) => n + 1);
  }, []);

  return (
    <AuthContext.Provider
      value={{
        isLoading,
        isSignedIn: !!clientId,
        clientId,
        signIn,
        signOut,
        justSignedIn: justSignedInRef.current,
        consumeJustSignedIn,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
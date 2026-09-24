import * as LocalAuthentication from "expo-local-authentication";

// This is a device-level unlock gate, not a login credential — it never
// talks to the backend and can't be used to authenticate a request. It only
// answers "is the person holding this phone the same one who set up
// biometrics on it", which is exactly what you want for "resume an
// already-signed-in session", and exactly NOT what you'd want as a
// replacement for actual login (a phone's Face ID enrollment proves nothing
// about who the account belongs to — that's still OTP's job at first login).

export async function isBiometricAvailable(): Promise<boolean> {
  const hasHardware = await LocalAuthentication.hasHardwareAsync();
  if (!hasHardware) return false;
  const isEnrolled = await LocalAuthentication.isEnrolledAsync();
  return isEnrolled;
}

export async function promptBiometric(reason = "Unlock AmberCash"): Promise<boolean> {
  const result = await LocalAuthentication.authenticateAsync({
    promptMessage: reason,
    cancelLabel: "Cancel",
    // Deliberately not disableDeviceFallback — if biometric hardware is
    // temporarily unreadable (wet finger, mask, bad lighting), letting the
    // device fall back to its own passcode is still "something only the
    // device owner should know", not a security downgrade to no gate at all.
    disableDeviceFallback: false,
  });
  return result.success;
}
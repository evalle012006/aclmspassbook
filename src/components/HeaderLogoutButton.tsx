import { useAuth } from "@/context/AuthContext";
import { Ionicons } from "@expo/vector-icons";
import { Alert, Pressable } from "react-native";

export function HeaderLogoutButton() {
  const { signOut } = useAuth();

  function handlePress() {
    Alert.alert("Sign out", "Are you sure you want to sign out?", [
      { text: "Cancel", style: "cancel" },
      { text: "Sign out", style: "destructive", onPress: () => signOut() },
    ]);
  }

  return (
    <Pressable onPress={handlePress} hitSlop={12} style={{ marginRight: 16 }}>
      <Ionicons name="log-out-outline" size={22} color="#6b7280" />
    </Pressable>
  );
}
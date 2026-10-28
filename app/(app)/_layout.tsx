import { AppLockGate } from "@/components/AppLockGate";
import { HeaderLogoutButton } from "@/components/HeaderLogoutButton";
import { useAuth } from "@/context/AuthContext";
import { Ionicons } from "@expo/vector-icons";
import { Redirect, Tabs } from "expo-router";

export default function AppLayout() {
  const { isSignedIn, isLoading } = useAuth();

  // Guards direct deep-links into (app)/* when signed out — not just the
  // root index.tsx redirect, since Expo Router allows navigating straight
  // to a nested route.
  if (!isLoading && !isSignedIn) {
    return <Redirect href="/(auth)/login" />;
  }

  return (
    <AppLockGate>
      <Tabs
        screenOptions={{
          headerShown: true,
          tabBarActiveTintColor: "#0f6fde",
          headerRight: () => <HeaderLogoutButton />,
        }}
      >
        <Tabs.Screen
          name="home"
          options={{
            title: "Home",
            tabBarIcon: ({ color, size }) => <Ionicons name="home-outline" size={size} color={String(color ?? "#6b7280")} />,
          }}
        />
        <Tabs.Screen
          name="loans/index"
          options={{
            title: "Loans",
            tabBarIcon: ({ color, size }) => <Ionicons name="home-outline" size={size} color={String(color ?? "#6b7280")} />,
          }}
        />
        <Tabs.Screen
          name="withdrawals"
          options={{
            title: "Withdrawals",
            tabBarIcon: ({ color, size }) => <Ionicons name="home-outline" size={size} color={String(color ?? "#6b7280")} />,
          }}
        />
        <Tabs.Screen
          name="applications"
          options={{
            title: "Applications",
            tabBarIcon: ({ color, size }) => <Ionicons name="home-outline" size={size} color={String(color ?? "#6b7280")} />,
          }}
        />
        <Tabs.Screen
          name="qr"
          options={{
            title: "My QR",
            tabBarIcon: ({ color, size }) => <Ionicons name="home-outline" size={size} color={String(color ?? "#6b7280")} />,
          }}
        />
        <Tabs.Screen
          name="profile"
          options={{
            title: "Profile",
            tabBarIcon: ({ color, size }) => <Ionicons name="home-outline" size={size} color={String(color ?? "#6b7280")} />,
          }}
        />
        <Tabs.Screen name="loans/[loanId]/payments" options={{ href: null }} />
        <Tabs.Screen name="change-password" options={{ href: null }} />
      </Tabs>
    </AppLockGate>
  );
}
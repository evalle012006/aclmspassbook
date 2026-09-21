import React from "react";
import { View, Text, Pressable } from "react-native";

export function ErrorBanner({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <View className="mx-4 mt-4 p-4 rounded-xl bg-red-50 border border-red-200">
      <Text className="text-danger font-medium">{message}</Text>
      {onRetry && (
        <Pressable onPress={onRetry} className="mt-2 self-start">
          <Text className="text-brand-600 font-semibold">Try again</Text>
        </Pressable>
      )}
    </View>
  );
}

export function EmptyState({ message }: { message: string }) {
  return (
    <View className="items-center justify-center py-16 px-6">
      <Text className="text-gray-400 text-center">{message}</Text>
    </View>
  );
}

import React, { useEffect, useRef } from "react";
import { Animated, View, ViewStyle } from "react-native";

function SkeletonBlock({ style }: { style?: ViewStyle }) {
  const opacity = useRef(new Animated.Value(0.4)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 1, duration: 700, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0.4, duration: 700, useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [opacity]);

  return (
    <Animated.View
      style={[{ opacity }, style]}
      className="bg-gray-200 dark:bg-gray-700 rounded-md"
    />
  );
}

// A row of skeleton "cards" — used while any list screen (loans, payments,
// withdrawals, LAF) is loading its first page.
export function ListSkeleton({ rows = 4 }: { rows?: number }) {
  return (
    <View className="p-4 gap-3">
      {Array.from({ length: rows }).map((_, i) => (
        <View key={i} className="bg-white dark:bg-gray-800 rounded-xl p-4 gap-2">
          <SkeletonBlock style={{ height: 14, width: "50%" }} />
          <SkeletonBlock style={{ height: 20, width: "80%" }} />
          <SkeletonBlock style={{ height: 12, width: "35%" }} />
        </View>
      ))}
    </View>
  );
}

import { Text, View } from "react-native";
import Svg, { Circle } from "react-native-svg";

export function CircularGauge({
  percentage,
  size = 84,
  strokeWidth = 8,
  color = "#16a34a",
  trackColor = "#e5e7eb",
  label,
}: {
  percentage: number; // 0-100
  size?: number;
  strokeWidth?: number;
  color?: string;
  trackColor?: string;
  label?: string;
}) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const clamped = Math.max(0, Math.min(100, percentage));
  const dashOffset = circumference * (1 - clamped / 100);

  return (
    <View style={{ width: size, height: size }} className="items-center justify-center">
      <Svg width={size} height={size}>
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={trackColor}
          strokeWidth={strokeWidth}
          fill="none"
        />
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={color}
          strokeWidth={strokeWidth}
          fill="none"
          strokeDasharray={circumference}
          strokeDashoffset={dashOffset}
          strokeLinecap="round"
          // Rotate so the arc starts at 12 o'clock, matching the reference screenshot
          rotation={-90}
          origin={`${size / 2}, ${size / 2}`}
        />
      </Svg>
      <View style={{ position: "absolute", alignItems: "center" }}>
        <Text className="font-bold text-gray-900" style={{ fontSize: size * 0.22 }}>
          {Math.round(clamped)}%
        </Text>
        {label && <Text className="text-gray-400" style={{ fontSize: size * 0.09 }}>{label}</Text>}
      </View>
    </View>
  );
}
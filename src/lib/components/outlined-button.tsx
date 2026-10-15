import {
  ColorValue,
  Pressable,
  PressableProps,
  StyleProp,
  StyleSheet,
  ViewStyle,
} from "react-native";
import { useTheme } from "@/src/lib/contexts/theme-context";
import { Span } from "./text";
import { IconProps } from "./icons";

export default function OutlinedButton({
  color,
  style,
  children,
  onPress,
}: {
  color?: ColorValue;
  style?: StyleProp<ViewStyle>;
  onPress?: PressableProps["onPress"];
} & React.PropsWithChildren) {
  const theme = useTheme();
  color ??= theme.colors.primary.default;

  return (
    <Pressable
      style={[styles.outlinedButton, { borderColor: color }, style]}
      android_ripple={theme.ripples.primaryButton}
      pointerEvents="box-only"
      onPress={onPress}
    >
      {children}
    </Pressable>
  );
}

export function OutlineLabeledIconButton({
  color,
  style,
  icon: Icon,
  label,
  onPress,
}: {
  color?: ColorValue;
  style?: StyleProp<ViewStyle>;
  icon: React.ComponentType<IconProps>;
  label: string;
  onPress?: PressableProps["onPress"];
}) {
  const theme = useTheme();
  color ??= theme.colors.outlinedButton;

  return (
    <Pressable
      style={[styles.outlinedButton, { borderColor: color }, style]}
      android_ripple={theme.ripples.primaryButton}
      pointerEvents="box-only"
      onPress={onPress}
    >
      <Icon size={26} color={color} />

      <Span
        style={{
          color,
          textAlignVertical: "center",
          fontWeight: 500,
          paddingRight: 6,
        }}
      >
        {label}
      </Span>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  outlinedButton: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 2,
    borderRadius: 8,
    overflow: "hidden",
  },
});

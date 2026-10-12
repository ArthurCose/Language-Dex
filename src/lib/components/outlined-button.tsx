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

export default function OutlinedButton({
  style,
  children,
  onPress,
}: {
  style?: StyleProp<ViewStyle>;
  onPress?: PressableProps["onPress"];
} & React.PropsWithChildren) {
  const theme = useTheme();

  return (
    <Pressable
      style={[
        styles.outlinedButton,
        { borderColor: theme.colors.iconButton },
        style,
      ]}
      android_ripple={theme.ripples.primaryButton}
      pointerEvents="box-only"
      onPress={onPress}
    >
      {children}
    </Pressable>
  );
}

export function OutlineLabeledIconButton({
  style,
  icon: Icon,
  label,
  onPress,
}: {
  style?: StyleProp<ViewStyle>;
  icon: React.FunctionComponent<{ size: number; color?: ColorValue }>;
  label: string;
  onPress?: PressableProps["onPress"];
}) {
  const theme = useTheme();

  return (
    <Pressable
      style={[
        styles.outlinedButton,
        { borderColor: theme.colors.iconButton },
        style,
      ]}
      android_ripple={theme.ripples.primaryButton}
      pointerEvents="box-only"
      onPress={onPress}
    >
      <Icon size={26} color={theme.colors.iconButton} />

      <Span
        style={{
          color: theme.colors.iconButton,
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

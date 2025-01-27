import React from "react";
import { Pressable, StyleProp, ViewStyle } from "react-native";
import { useTheme } from "@/lib/contexts/theme";

type Props = {
  onPress?: () => void;
  style: StyleProp<ViewStyle>;
  disabled?: boolean;
} & React.PropsWithChildren;

export default function CircleButton({
  onPress,
  style,
  disabled,
  children,
}: Props) {
  const theme = useTheme();

  return (
    <Pressable
      style={[
        theme.styles.circleButton,
        disabled && theme.styles.circleButtonDisabled,
        style,
      ]}
      onPress={onPress}
      disabled={disabled}
      android_ripple={theme.ripples.primaryButton}
    >
      {children}
    </Pressable>
  );
}

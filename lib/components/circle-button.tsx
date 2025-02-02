import React from "react";
import {
  Pressable,
  PressableAndroidRippleConfig,
  StyleProp,
  StyleSheet,
  View,
  ViewStyle,
} from "react-native";
import { useTheme } from "@/lib/contexts/theme";

type Props = {
  onPress?: () => void;
  containerStyle?: StyleProp<ViewStyle>;
  style?: StyleProp<ViewStyle>;
  android_ripple?: PressableAndroidRippleConfig;
  disabled?: boolean;
} & React.PropsWithChildren;

export default function CircleButton({
  onPress,
  style,
  containerStyle,
  android_ripple,
  disabled,
  children,
}: Props) {
  const theme = useTheme();

  return (
    <View style={[styles.container, containerStyle]}>
      <Pressable
        style={[
          theme.styles.circleButton,
          disabled && theme.styles.circleButtonDisabled,
          style,
        ]}
        onPress={onPress}
        disabled={disabled}
        android_ripple={android_ripple ?? theme.ripples.primaryButton}
      >
        {children}
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: "50%",
    overflow: "hidden",
  },
});

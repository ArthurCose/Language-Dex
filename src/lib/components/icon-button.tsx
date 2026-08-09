import {
  ColorValue,
  GestureResponderEvent,
  Pressable,
  StyleSheet,
  View,
} from "react-native";
import { useTheme } from "../contexts/theme";

type Props = {
  icon: React.FunctionComponent<{ size: number; color?: ColorValue }>;
  onPress?: (event: GestureResponderEvent) => void;
  disabled?: boolean;
};

export default function IconButton({ icon: Icon, onPress, disabled }: Props) {
  const theme = useTheme();

  return (
    <View style={styles.container}>
      <Pressable
        style={styles.pressable}
        android_ripple={theme.ripples.transparentButton}
        pointerEvents="box-only"
        onPress={onPress}
        disabled={disabled}
      >
        <Icon
          size={32}
          color={disabled ? theme.colors.disabledText : theme.colors.iconButton}
        />
      </Pressable>
    </View>
  );
}

export function SubMenuIconButton({ icon: Icon, onPress, disabled }: Props) {
  const theme = useTheme();

  return (
    <View style={styles.container}>
      <Pressable
        style={styles.pressable}
        android_ripple={theme.ripples.transparentButton}
        pointerEvents="box-only"
        onPress={onPress}
        disabled={disabled}
      >
        <Icon
          size={32}
          color={
            disabled
              ? theme.colors.subMenuIconButtonDisabled
              : theme.colors.subMenuIconButton
          }
        />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: "100%",
    overflow: "hidden",
  },
  pressable: {
    padding: 8,
  },
});

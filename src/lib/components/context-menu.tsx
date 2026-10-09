import {
  StyleSheet,
  Pressable,
  View,
  StyleProp,
  ViewStyle,
} from "react-native";
import * as DropDownPrimitive from "@rn-primitives/dropdown-menu";
import { useTheme } from "@/src/lib/contexts/theme-context";
import { NavigationBarSpacer } from "./system-bar-spacers";

export function ContextMenuSeparator() {
  const theme = useTheme();
  return <View style={[styles.separator, theme.styles.borders]} />;
}

export function ContextMenuPressable({
  style,
  disabled,
  children,
  onPress,
}: {
  style?: StyleProp<ViewStyle>;
  disabled?: boolean;
  onPress?: () => void;
} & React.PropsWithChildren) {
  const theme = useTheme();

  return (
    <Pressable
      style={style ? [styles.action, style] : styles.action}
      android_ripple={theme.ripples.popup}
      pointerEvents="box-only"
      disabled={disabled}
      onPress={onPress}
    >
      {children}
    </Pressable>
  );
}

export default function ContextMenu({
  children,
  contrast,
  onClose,
}: {
  contrast?: boolean;
  onClose: () => void;
} & React.PropsWithChildren) {
  const theme = useTheme();

  return (
    <DropDownPrimitive.Portal>
      <DropDownPrimitive.Overlay
        style={StyleSheet.absoluteFill}
        onPress={onClose}
      >
        <DropDownPrimitive.Content align="center">
          <View
            style={[
              styles.popup,
              theme.styles.dialog,
              theme.styles.definitionBubble,
              contrast && theme.styles.popupContrast,
            ]}
          >
            {children}
          </View>

          <NavigationBarSpacer />
        </DropDownPrimitive.Content>
      </DropDownPrimitive.Overlay>
    </DropDownPrimitive.Portal>
  );
}

const styles = StyleSheet.create({
  popup: {
    marginHorizontal: 8,
    marginVertical: 4,
    minWidth: 100,
    maxWidth: 256,
  },
  separator: {
    borderStyle: "solid",
    borderWidth: 0,
    borderBottomWidth: 1,
    width: "100%",
  },
  action: {
    padding: 8,
    paddingHorizontal: 16,
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
  },
});

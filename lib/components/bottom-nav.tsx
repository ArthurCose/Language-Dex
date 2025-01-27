import { Theme } from "@/lib/themes";
import { IconProps } from "@/lib/components/icons";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useTheme } from "@/lib/contexts/theme";
import useKeyboardVisible from "@/lib/hooks/use-keyboard-visible";

type NavItemProps = {
  label: string;
  active: boolean;
  theme: Theme;
  onPress: () => void;
  iconComponent: (props: IconProps) => React.ReactElement;
};

export function BottomNavItem({
  label,
  active,
  theme,
  iconComponent: IconComponent,
  onPress,
}: NavItemProps) {
  const color = active ? theme.colors.primary.default : theme.colors.label;

  return (
    <Pressable onPress={onPress} style={styles.bottomNavItem}>
      <IconComponent color={color} size={32} />
      <Text style={{ color }}>{label}</Text>
    </Pressable>
  );
}

export function BottomNav({ children }: React.PropsWithChildren) {
  const theme = useTheme();
  const keyboardVisible = useKeyboardVisible();

  if (keyboardVisible) {
    return;
  }

  return <View style={theme.styles.bottomNav}>{children}</View>;
}

const styles = StyleSheet.create({
  bottomNavItem: {
    overflow: "visible",
    display: "flex",
    flex: 1,
    flexDirection: "column",
    alignItems: "center",
  },
});

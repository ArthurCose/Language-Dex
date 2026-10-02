import { View, StyleSheet, Pressable, ViewProps } from "react-native";
import { useTheme } from "@/src/lib/contexts/theme-context";

export function RadioItem<T>({
  groupValue,
  value,
  pointerEvents,
  onChange,
  onPress,
  children,
}: {
  groupValue: T;
  value: T;
  pointerEvents?: ViewProps["pointerEvents"];
  onChange: (value: T) => void;
  onPress?: () => void;
} & React.PropsWithChildren) {
  const theme = useTheme();

  return (
    <Pressable
      style={styles.radioItem}
      android_ripple={theme.ripples.transparentButton}
      pointerEvents={pointerEvents ?? "box-only"}
      onPress={() => {
        onChange(value);
        onPress?.();
      }}
    >
      <RadioButton selected={value == groupValue} />
      {children}
    </Pressable>
  );
}

export function RadioButton({ selected }: { selected: boolean }) {
  const theme = useTheme();

  return (
    <View
      style={{
        margin: 10,
        aspectRatio: 1,
        width: 28,
        borderWidth: 2,
        borderColor: selected
          ? theme.colors.primary.default
          : theme.colors.iconButton,
        borderRadius: "50%",
        justifyContent: "center",
        alignItems: "center",
      }}
    >
      {selected && (
        <View
          style={{
            aspectRatio: 1,
            width: 15,
            backgroundColor: theme.colors.primary.default,
            borderRadius: "50%",
          }}
        ></View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  radioItem: {
    flexDirection: "row",
    height: 48,
    alignItems: "center",
  },
});

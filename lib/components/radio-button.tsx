import { View } from "react-native";
import { useTheme } from "../contexts/theme";

export default function ({ selected }: { selected: boolean }) {
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

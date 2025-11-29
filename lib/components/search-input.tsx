import {
  Pressable,
  StyleProp,
  StyleSheet,
  View,
  ViewStyle,
} from "react-native";
import { useTheme } from "../contexts/theme";
import CustomTextInput from "./custom-text-input";
import { useTranslation } from "react-i18next";
import { CloseIcon } from "./icons";

export default function ({
  style,
  value,
  onChangeText,
}: {
  style?: StyleProp<ViewStyle>;
  value: string;
  onChangeText: (value: string) => void;
}) {
  const theme = useTheme();
  const [t] = useTranslation();

  return (
    <View style={[styles.searchBar, theme.styles.searchInputContainer, style]}>
      <CustomTextInput
        style={[styles.searchInput, theme.styles.searchInput]}
        placeholder={t("search_placeholder")}
        value={value}
        onChangeText={onChangeText}
      />

      {value && (
        <Pressable onPress={() => onChangeText("")}>
          <CloseIcon size={24} color={theme.colors.text} />
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  searchInput: {
    flex: 1,
    fontSize: 16,
    height: 40,
    paddingHorizontal: 16,
  },
  searchBar: {
    display: "flex",
    flexDirection: "row",
    alignItems: "center",
    paddingRight: 10,
  },
});

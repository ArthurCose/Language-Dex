import { Pressable, StyleSheet } from "react-native";
import { Span } from "../text";
import { useTheme } from "@/src/lib/contexts/theme";
import { useTranslation } from "react-i18next";

export default function SkipButton({ onPress }: { onPress: () => void }) {
  const theme = useTheme();
  const [t] = useTranslation();

  return (
    <Pressable style={styles.pressable} onPress={onPress}>
      <Span style={theme.styles.poppingText}>{t("skip_question")}</Span>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  pressable: {
    alignSelf: "center",
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
});

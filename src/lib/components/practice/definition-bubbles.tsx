import { useTheme } from "@/src/lib/contexts/theme";
import { View, Text, StyleSheet, ScrollView } from "react-native";
import { Span } from "../text";

export function WordBubble({ children }: React.PropsWithChildren) {
  const theme = useTheme();

  return (
    <View
      style={[
        styles.definitionBubble,
        theme.styles.definitionBorders,
        theme.styles.definitionBackground,
      ]}
    >
      <Text style={[theme.styles.text, styles.word, styles.definition]}>
        {children}
      </Text>
    </View>
  );
}

export function DefinitionBubble({ children }: React.PropsWithChildren) {
  const theme = useTheme();

  return (
    <ScrollView
      style={[
        styles.definitionBubble,
        theme.styles.definitionBorders,
        theme.styles.definitionBackground,
      ]}
      contentContainerStyle={styles.definitionContent}
    >
      <Span style={styles.definition}>{children}</Span>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  word: {
    fontWeight: "bold",
    fontSize: 18,
  },
  definitionBubble: {
    marginVertical: 8,
    marginHorizontal: "auto",
    borderWidth: 1,
    borderRadius: 8,
    flexGrow: 0,
  },
  definitionContent: {
    justifyContent: "center",
    alignItems: "center",
  },
  definition: {
    paddingHorizontal: 24,
    paddingVertical: 8,
  },
});

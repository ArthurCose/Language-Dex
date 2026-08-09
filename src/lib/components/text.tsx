import { StyleProp, StyleSheet, Text, TextStyle } from "react-native";
import { useTheme } from "../contexts/theme";

type Props = {
  numberOfLines?: number;
  style?: StyleProp<TextStyle>;
} & React.PropsWithChildren;

export function Span({ numberOfLines, style, children }: Props) {
  const theme = useTheme();

  return (
    <Text
      numberOfLines={numberOfLines}
      style={[theme.styles.text, styles.span, style]}
    >
      {children}
    </Text>
  );
}

const styles = StyleSheet.create({
  span: {
    fontSize: 16,
  },
});

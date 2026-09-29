import {
  StyleProp,
  StyleSheet,
  Text,
  TextProps,
  TextStyle,
} from "react-native";
import { useTheme } from "@/src/lib/contexts/theme";

type Props = {
  style?: StyleProp<TextStyle>;
} & TextProps;

export function Span(props: Props) {
  const theme = useTheme();

  return (
    <Text {...props} style={[theme.styles.text, styles.span, props.style]}>
      {props.children}
    </Text>
  );
}

const styles = StyleSheet.create({
  span: {
    fontSize: 16,
  },
});

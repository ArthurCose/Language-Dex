import {
  StyleProp,
  StyleSheet,
  Text,
  TextProps,
  TextStyle,
} from "react-native";
import { useTheme } from "@/src/lib/contexts/theme-context";
import { Signal, useSignalValue } from "../hooks/use-signal";

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

export function SignalledSpan<T extends React.ReactNode>(
  props: { signal: Signal<T> } & Props,
) {
  const theme = useTheme();
  const value = useSignalValue(props.signal);

  return (
    <Text {...props} style={[theme.styles.text, styles.span, props.style]}>
      {value}
      {props.children}
    </Text>
  );
}

const styles = StyleSheet.create({
  span: {
    fontSize: 16,
  },
});

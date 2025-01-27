import { StyleProp, StyleSheet, Text, TextStyle } from "react-native";

type Props = {
  numberOfLines?: number;
  style?: StyleProp<TextStyle>;
} & React.PropsWithChildren;

export function Span({ numberOfLines, style, children }: Props) {
  return (
    <Text numberOfLines={numberOfLines} style={[styles.span, style]}>
      {children}
    </Text>
  );
}

const styles = StyleSheet.create({
  span: {
    fontSize: 16,
  },
});

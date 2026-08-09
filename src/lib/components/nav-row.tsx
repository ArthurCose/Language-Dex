import { StyleProp, StyleSheet, View, ViewStyle } from "react-native";

type PropsWithStyleAndChildren = {
  style?: StyleProp<ViewStyle>;
} & React.PropsWithChildren;

export default function NavRow({ style, children }: PropsWithStyleAndChildren) {
  return <View style={[styles.navRow, style]}>{children}</View>;
}

const styles = StyleSheet.create({
  navRow: {
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
});

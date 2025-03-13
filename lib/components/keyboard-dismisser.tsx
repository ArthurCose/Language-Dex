import { Keyboard, StyleProp, View, ViewStyle } from "react-native";

const onStartShouldSetResponder = () => {
  Keyboard.dismiss();
  return false;
};

export default function KeyboardDismisser({
  children,
}: React.PropsWithChildren) {
  return (
    <View style={style} onStartShouldSetResponder={onStartShouldSetResponder}>
      {children}
    </View>
  );
}

const style: StyleProp<ViewStyle> = { flex: 1 };

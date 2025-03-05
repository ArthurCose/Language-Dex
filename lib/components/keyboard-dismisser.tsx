import { Keyboard, Pressable, StyleProp, ViewStyle } from "react-native";

export default function KeyboardDismisser({
  children,
}: React.PropsWithChildren) {
  return (
    <Pressable style={style} onPress={Keyboard.dismiss} accessible={false}>
      {children}
    </Pressable>
  );
}

const style: StyleProp<ViewStyle> = { flex: 1 };

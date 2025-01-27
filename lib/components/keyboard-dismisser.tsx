import React from "react";
import { Keyboard, TouchableWithoutFeedback } from "react-native";

export default function KeyboardDismisser({
  children,
}: React.PropsWithChildren) {
  return (
    <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
      <>{children}</>
    </TouchableWithoutFeedback>
  );
}

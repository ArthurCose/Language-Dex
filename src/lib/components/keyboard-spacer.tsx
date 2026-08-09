import { useEffect, useState } from "react";
import { Keyboard, View } from "react-native";

export default function () {
  const [keyboardHeight, setKeyboardHeight] = useState(
    Keyboard.metrics()?.height ?? 0
  );

  useEffect(() => {
    const showListener = Keyboard.addListener("keyboardDidShow", (e) => {
      setKeyboardHeight(e.endCoordinates.height);
    });

    const hideListener = Keyboard.addListener("keyboardDidHide", () => {
      setKeyboardHeight(0);
    });

    return () => {
      showListener.remove();
      hideListener.remove();
    };
  }, []);

  return <View style={{ height: keyboardHeight }} />;
}

import { useEffect } from "react";
import { BackHandler } from "react-native";

export default function (
  callback: () => boolean | undefined,
  deps: React.DependencyList,
) {
  useEffect(() => {
    const backHandler = BackHandler.addEventListener(
      "hardwareBackPress",
      callback,
    );

    return () => backHandler.remove();
  }, deps);
}

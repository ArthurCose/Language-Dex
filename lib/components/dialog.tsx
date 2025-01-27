import React, { useEffect, useState } from "react";
import { Portal } from "@rn-primitives/portal";
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
import { useTheme } from "../contexts/theme";
import { Pressable, StyleSheet } from "react-native";
import useBackHandler from "../hooks/use-back-handler";

type Props = {
  open: boolean;
  onClose: () => void;
} & React.PropsWithChildren;

let idCounter = 0;

export default function Dialog({ open, onClose, children }: Props) {
  const theme = useTheme();
  const [id] = useState(() => (idCounter++).toString());
  const [closed, setClosed] = useState(true);

  const progress = useSharedValue(0);
  const closing = useSharedValue(false);

  useBackHandler(() => {
    if (open) {
      onClose();
      return true;
    }
  }, [open]);

  useEffect(() => {
    if (!open && closing.value) {
      return;
    }

    const complete = () => {
      if (closing.value) {
        setClosed(true);
      }
    };

    if (open) {
      setClosed(false);
    }

    closing.value = !open;
    progress.value = withTiming(open ? 1 : 0, { duration: 100 }, () => {
      runOnJS(complete)();
    });
  }, [open]);

  const backdropStyle = useAnimatedStyle(
    () => ({
      opacity: progress.value,
      display: closed ? "none" : "flex",
    }),
    [closed]
  );

  const dialogStyle = useAnimatedStyle(() => {
    function lerp(start: number, end: number, progress: number) {
      return start + (end - start) * progress;
    }

    let transform;

    const DISTANCE = 25;

    if (closing.value) {
      transform = [{ translateY: lerp(-DISTANCE, 0, progress.value) }];
    } else {
      transform = [{ translateY: lerp(DISTANCE, 0, progress.value) }];
    }

    return {
      transform,
    };
  });

  return (
    <Portal name={id}>
      <Animated.View style={[styles.backdrop, backdropStyle]}>
        <Pressable style={styles.backdropButton} onPress={onClose}>
          <Animated.View
            style={[styles.dialog, theme.styles.dialog, dialogStyle]}
          >
            <Pressable style={styles.innerPressable}>
              {!closed && children}
            </Pressable>
          </Animated.View>
        </Pressable>
      </Animated.View>
    </Portal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    position: "absolute",
    left: 0,
    top: 0,
    width: "100%",
    height: "100%",
    backgroundColor: "rgba(0,0,0,0.3)",
  },
  backdropButton: {
    width: "100%",
    height: "100%",
    display: "flex",
    flexDirection: "column",
    justifyContent: "center",
    alignItems: "stretch",
  },
  dialog: {
    overflow: "hidden",
    maxHeight: "80%",
  },
  innerPressable: {
    flexGrow: 1,
    flexShrink: 1,
  },
});

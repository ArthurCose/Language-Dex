import React, { useEffect, useState } from "react";
import { Portal } from "@rn-primitives/portal";
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
import { useTheme } from "../contexts/theme";
import { Pressable, StyleSheet, View } from "react-native";
import useBackHandler from "../hooks/use-back-handler";
import { Span } from "./text";
import * as Progress from "react-native-progress";
import KeyboardSpacer from "./keyboard-spacer";
import { useSafeAreaInsets } from "react-native-safe-area-context";

type Props = {
  open: boolean;
  allowOverflow?: boolean;
  onClose?: () => void;
} & React.PropsWithChildren;

let idCounter = 0;

export function DialogTitle({ children }: React.PropsWithChildren) {
  const theme = useTheme();

  return (
    <>
      <View style={styles.header}>
        <Span>{children}</Span>
      </View>

      <View style={theme.styles.separator} />
    </>
  );
}

export function DialogDescription({ children }: React.PropsWithChildren) {
  return (
    <View style={styles.description}>
      <Span>{children}</Span>
    </View>
  );
}

export function DialogProgressBar({ progress }: { progress?: number }) {
  const theme = useTheme();

  return (
    <View style={styles.progressContainer}>
      <Progress.Bar
        borderWidth={0}
        borderRadius={0}
        color={theme.colors.primary.default}
        width={null}
        animated={false}
        indeterminate={progress == undefined || Number.isNaN(progress)}
        progress={progress}
      />
    </View>
  );
}

export default function Dialog({
  allowOverflow,
  open,
  onClose,
  children,
}: Props) {
  const theme = useTheme();
  const [id] = useState(() => (idCounter++).toString());
  const [closed, setClosed] = useState(true);

  const progress = useSharedValue(0);
  const closing = useSharedValue(false);

  useBackHandler(() => {
    if (open && onClose) {
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

  const insets = useSafeAreaInsets();

  return (
    <Portal name={id}>
      <Animated.View style={[styles.backdrop, backdropStyle]}>
        <Pressable style={styles.backdropButton} onPress={onClose}>
          <View style={{ height: insets.top }} />

          <Animated.View style={[styles.dialogContainer, dialogStyle]}>
            <View
              style={[
                styles.dialog,
                theme.styles.dialog,
                dialogStyle,
                allowOverflow && styles.overflowAllowed,
              ]}
              onStartShouldSetResponder={onStartShouldSetResponder}
            >
              {!closed && children}
            </View>
          </Animated.View>

          <KeyboardSpacer />
        </Pressable>
      </Animated.View>
    </Portal>
  );
}

const onStartShouldSetResponder = () => true;

const styles = StyleSheet.create({
  backdrop: {
    position: "absolute",
    left: 0,
    top: 0,
    width: "100%",
    height: "100%",
    backgroundColor: "rgba(0,0,0,0.3)",
    zIndex: 2,
  },
  backdropButton: {
    width: "100%",
    height: "100%",
    display: "flex",
    flexDirection: "column",
    justifyContent: "center",
    alignItems: "stretch",
  },
  dialogContainer: {
    flex: 1,
    justifyContent: "center",
  },
  dialog: {
    position: "relative",
    overflow: "hidden",
    maxHeight: "80%",
  },
  overflowAllowed: {
    overflow: "visible",
  },
  innerPressable: {
    flexGrow: 1,
    flexShrink: 1,
  },
  header: {
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  description: {
    padding: 8,
    paddingTop: 16,
    paddingHorizontal: 24,
  },
  progressContainer: {
    paddingTop: 4,
    paddingVertical: 0,
  },
});

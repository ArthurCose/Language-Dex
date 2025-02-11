import React, { useEffect, useRef, useState } from "react";
import {
  BackHandler,
  Pressable,
  StyleProp,
  TextStyle,
  View,
  ViewStyle,
  StyleSheet,
  Keyboard,
} from "react-native";
import {
  BottomSheetScrollView,
  BottomSheetModal,
  BottomSheetBackdropProps,
  BottomSheetBackgroundProps,
  BottomSheetBackdrop,
} from "@gorhom/bottom-sheet";
import Animated from "react-native-reanimated";
import { DropdownIcon } from "@/lib/components/icons";
import { Span } from "@/lib/components/text";
import { useTheme } from "@/lib/contexts/theme";

type Props<T> = {
  style?: StyleProp<ViewStyle>;
  labelStyle?: StyleProp<TextStyle>;
  label: any;
  items: T[];
  keyExtractor?: (value: T) => string;
  mapItem: (value: T) => React.ReactNode;
  onChange: (value: any) => void;
};

function CustomBackground({ style }: BottomSheetBackgroundProps) {
  const theme = useTheme();

  return (
    <Animated.View
      pointerEvents="none"
      style={[theme.styles.bottomSheet, style]}
    />
  );
}

function CustomBackdrop(props: BottomSheetBackdropProps) {
  return (
    <BottomSheetBackdrop {...props} appearsOnIndex={0} disappearsOnIndex={-1} />
  );
}

const handleStyle = { height: 16 };

function CustomHandle() {
  return <View style={handleStyle} />;
}

export default function BottomListPopup<T>({
  labelStyle,
  style,
  label,
  items,
  keyExtractor,
  mapItem,
  onChange,
}: Props<T>) {
  const [open, setOpen] = useState(false);
  const theme = useTheme();
  const bottomSheetModalRef = useRef<BottomSheetModal>(null);

  useEffect(() => {
    if (!open) {
      return;
    }

    const backHandler = BackHandler.addEventListener(
      "hardwareBackPress",
      () => {
        if (bottomSheetModalRef.current) {
          bottomSheetModalRef.current.close();
          return true;
        }
      }
    );

    return () => backHandler.remove();
  }, [bottomSheetModalRef, open]);

  return (
    <>
      <Pressable
        style={[styles.button, style]}
        onPress={() => {
          Keyboard.dismiss();
          bottomSheetModalRef.current?.present();
          setOpen(true);
        }}
      >
        <Span style={labelStyle}>{label} </Span>
        <View style={styles.icon}>
          <DropdownIcon color={theme.colors.iconButton} size={20} />
        </View>
      </Pressable>

      <BottomSheetModal
        backgroundComponent={CustomBackground}
        handleComponent={CustomHandle}
        backdropComponent={CustomBackdrop}
        onDismiss={() => setOpen(false)}
        ref={bottomSheetModalRef}
      >
        <BottomSheetScrollView>
          {items.map((value) => {
            const label = mapItem(value);

            return (
              <Pressable
                key={keyExtractor ? keyExtractor(value) : (value as string)}
                onPress={() => {
                  bottomSheetModalRef.current?.close();
                  onChange(value);
                }}
                style={styles.row}
                android_ripple={theme.ripples.popup}
              >
                <Span>{label}</Span>
              </Pressable>
            );
          })}
        </BottomSheetScrollView>
      </BottomSheetModal>
    </>
  );
}

const styles = StyleSheet.create({
  button: {
    display: "flex",
    flexDirection: "row",
    alignItems: "flex-end",
  },
  icon: {
    marginLeft: "auto",
  },
  row: {
    paddingHorizontal: 20,
    height: 48,
    justifyContent: "center",
  },
});

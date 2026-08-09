import React, { useState } from "react";
import {
  Pressable,
  PressableAndroidRippleConfig,
  StyleProp,
  StyleSheet,
  ViewStyle,
  VirtualizedList,
} from "react-native";
import Dialog from "./dialog";
import { useTheme } from "../contexts/theme";
import { Span } from "./text";

type Props<T> = {
  style?: StyleProp<ViewStyle>;
  android_ripple?: PressableAndroidRippleConfig;
  list: T[];
  getItemText: (item: T) => string;
  keyExtractor: (item: T) => string;
  centerItems?: boolean;
} & (
  | {
      defaultItemText?: undefined;
      onSelect?: (item: T) => void;
    }
  | {
      defaultItemText: string;
      onSelect?: (item?: T) => void;
    }
) &
  React.PropsWithChildren;

export default function ListPopup<T>({
  style,
  android_ripple,
  list,
  getItemText,
  keyExtractor,
  centerItems,
  defaultItemText,
  onSelect,
  children,
}: Props<T>) {
  const theme = useTheme();
  const [open, setOpen] = useState(false);
  const rowStyles: StyleProp<ViewStyle> = [
    styles.rowStyle,
    centerItems && { justifyContent: "center" },
  ];

  return (
    <>
      <Pressable
        onPress={() => setOpen(true)}
        style={style}
        android_ripple={android_ripple ?? theme.ripples.transparentButton}
        pointerEvents="box-only"
      >
        {children}
      </Pressable>

      <Dialog open={open} onClose={() => setOpen(false)}>
        <VirtualizedList
          ListHeaderComponent={
            defaultItemText != undefined ? (
              <Pressable
                style={rowStyles}
                android_ripple={theme.ripples.transparentButton}
                pointerEvents="box-only"
                onPress={() => {
                  onSelect?.();
                  setOpen(false);
                }}
              >
                <Span>{defaultItemText}</Span>
              </Pressable>
            ) : undefined
          }
          data={list}
          getItem={(_, i) => list[i]}
          renderItem={({ item }) => (
            <Pressable
              style={rowStyles}
              android_ripple={theme.ripples.transparentButton}
              pointerEvents="box-only"
              onPress={() => {
                onSelect?.(item);
                setOpen(false);
              }}
            >
              <Span>{getItemText(item)}</Span>
            </Pressable>
          )}
          getItemCount={() => list.length}
          keyExtractor={keyExtractor}
        />
      </Dialog>
    </>
  );
}

const styles = StyleSheet.create({
  textInput: {
    fontSize: 16,
    padding: 0,
  },
  headerStyle: {
    paddingLeft: 16,
    display: "flex",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  rowStyle: {
    display: "flex",
    flexDirection: "row",
    alignItems: "center",
    height: 48,
    paddingLeft: 16,
  },
});

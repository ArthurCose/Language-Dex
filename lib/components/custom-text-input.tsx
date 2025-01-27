import { useEffect, useMemo, useRef, useState } from "react";
import {
  Keyboard,
  StyleProp,
  TextInput,
  TextInputProps,
  TextStyle,
} from "react-native";
import { useTheme } from "@/lib/contexts/theme";

export default function CustomTextInput(props: TextInputProps) {
  const textInputRef = useBlurWhenKeyboardHides();
  const theme = useTheme();

  return (
    <TextInput
      ref={textInputRef}
      selectionColor={theme.colors.primary.default}
      {...props}
    />
  );
}

type CustomMultilineTextInputProps = {
  verticalPadding: number;
  minHeight?: number;
} & TextInputProps;

export function CustomMultilineTextInput(props: CustomMultilineTextInputProps) {
  const textInputRef = useBlurWhenKeyboardHides();
  const theme = useTheme();
  const [contentHeight, setContentHeight] = useState(0);

  return (
    <TextInput
      ref={textInputRef}
      selectionColor={theme.colors.primary.default}
      {...props}
      style={[
        {
          height:
            Math.max(props.minHeight ?? 0, contentHeight) +
            props.verticalPadding,
        },
        props.style,
      ]}
      multiline
      textAlignVertical="top"
      scrollEnabled={false}
      onContentSizeChange={(e) => {
        setContentHeight(e.nativeEvent.contentSize.height);
      }}
    />
  );
}

function useBlurWhenKeyboardHides() {
  const textInputRef = useRef<TextInput>(null);

  useEffect(() => {
    const keyboardDidHideListener = Keyboard.addListener(
      "keyboardDidHide",
      () => textInputRef.current?.blur()
    );

    return () => {
      keyboardDidHideListener.remove();
    };
  }, []);

  return textInputRef;
}

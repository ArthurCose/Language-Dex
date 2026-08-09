import { useEffect, useRef, useState } from "react";
import {
  Keyboard,
  TextInput,
  TextInputProps,
  Text,
  StyleSheet,
} from "react-native";
import { useTheme } from "@/src/lib/contexts/theme";

export default function CustomTextInput(props: TextInputProps) {
  const textInputRef = useBlurWhenKeyboardHides();
  const theme = useTheme();

  return (
    <TextInput
      ref={textInputRef}
      selectionColor={theme.colors.primary.default}
      placeholderTextColor={theme.colors.disabledText}
      {...props}
      style={[theme.styles.text, props.style]}
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
      placeholderTextColor={theme.colors.disabledText}
      {...props}
      style={[
        theme.styles.text,
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
      () => textInputRef.current?.blur(),
    );

    return () => {
      keyboardDidHideListener.remove();
    };
  }, []);

  return textInputRef;
}

export function TextInputCharacterCount({
  text,
  maxLen,
}: {
  text: string;
  maxLen: number;
}) {
  const theme = useTheme();

  return (
    <Text style={[characterCountStyles.style, theme.styles.disabledText]}>
      {text.length}/{maxLen}
    </Text>
  );
}

const characterCountStyles = StyleSheet.create({
  style: {
    marginLeft: "auto",
  },
});

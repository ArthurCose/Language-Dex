import { useEffect, useRef, useState } from "react";
import {
  Keyboard,
  TextInput,
  TextInputProps,
  Text,
  StyleSheet,
  TextInputInstance,
} from "react-native";
import { useTheme } from "@/src/lib/contexts/theme-context";
import { Signal, useSignalValue } from "@/src/lib/hooks/use-signal";

type CustomTextInputProps = TextInputProps & {
  inputRef?: React.Ref<TextInputInstance | null>;
};

export default function CustomTextInput(props: CustomTextInputProps) {
  const textInputRef = useBlurWhenKeyboardHides();
  const theme = useTheme();
  const inputRef = props.inputRef;

  const ref = inputRef
    ? (ref: TextInputInstance) => {
        textInputRef.current = ref;

        if (typeof inputRef == "function") {
          inputRef(ref);
        } else {
          inputRef.current = ref;
        }
      }
    : textInputRef;

  return (
    <TextInput
      ref={ref}
      selectionHandleColor={theme.colors.primary.default}
      selectionColor={theme.colors.selectedText}
      placeholderTextColor={theme.colors.disabledText}
      {...props}
      style={props.style ? [theme.styles.text, props.style] : theme.styles.text}
    />
  );
}

type SignalledTextInputProps = Omit<
  CustomTextInputProps,
  "value" | "onChangeText"
> & {
  signal: Signal<string>;
};

export function SignalledTextInput(props: SignalledTextInputProps) {
  const value = useSignalValue(props.signal);

  return (
    <CustomTextInput
      {...props}
      value={value}
      onChangeText={(v) => props.signal.set(v)}
    />
  );
}

type CustomMultilineTextInputProps = {
  verticalPadding: number;
  minHeight?: number;
} & Omit<TextInputProps, "scrollEnabled" | "multiline" | "textAlignVertical">;

export function CustomMultilineTextInput(props: CustomMultilineTextInputProps) {
  const textInputRef = useBlurWhenKeyboardHides();
  const theme = useTheme();
  const [contentHeight, setContentHeight] = useState(0);

  return (
    <TextInput
      ref={textInputRef}
      selectionHandleColor={theme.colors.primary.default}
      selectionColor={theme.colors.selectedText}
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
        props.onContentSizeChange?.(e);
      }}
    />
  );
}

function useBlurWhenKeyboardHides() {
  const textInputRef = useRef<TextInputInstance>(null);

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

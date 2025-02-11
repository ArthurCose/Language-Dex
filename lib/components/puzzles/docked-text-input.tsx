import { useTheme } from "@/lib/contexts/theme";
import {
  Pressable,
  StyleProp,
  StyleSheet,
  TextInputProps,
  View,
  ViewStyle,
} from "react-native";
import CustomTextInput from "../custom-text-input";
import { ConfirmReadyIcon } from "../icons";

type DockedTextInputContainerProps = {
  style?: StyleProp<ViewStyle>;
} & React.PropsWithChildren;

export function DockedTextInputContainer({
  style,
  children,
}: DockedTextInputContainerProps) {
  return <View style={[styles.inputContainer, style]}>{children}</View>;
}

export function DockedTextInput(props: TextInputProps) {
  const theme = useTheme();

  return (
    <CustomTextInput
      {...props}
      style={[theme.styles.definitionBackground, styles.textInput, props.style]}
    />
  );
}

export function DockedTextInputSubmitButton({
  disabled,
  onPress,
}: {
  disabled?: boolean;
  onPress?: () => void;
}) {
  const theme = useTheme();

  return (
    <Pressable
      style={[
        disabled
          ? theme.styles.circleButtonDisabled
          : theme.styles.circleButton,
        styles.submitButton,
      ]}
      disabled={disabled}
      onPress={onPress}
      android_ripple={theme.ripples.primaryButton}
    >
      <ConfirmReadyIcon color={theme.colors.primary.contrast} size={30} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  inputContainer: {
    flexDirection: "row",
    marginBottom: 12,
    height: 48,
  },
  textInput: {
    fontSize: 20,
    paddingHorizontal: 16,
    paddingTop: 0,
    paddingBottom: 0,
    flex: 1,
  },
  submitButton: {
    justifyContent: "center",
    paddingHorizontal: 12,
  },
});

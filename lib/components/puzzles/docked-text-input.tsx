import { useTheme } from "@/lib/contexts/theme";
import {
  Pressable,
  StyleProp,
  StyleSheet,
  TextInputProps,
  View,
  ViewStyle,
  Text,
} from "react-native";
import CustomTextInput from "../custom-text-input";
import { ConfirmReadyIcon, HintIcon } from "../icons";

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
        styles.button,
      ]}
      disabled={disabled}
      onPress={onPress}
      android_ripple={theme.ripples.primaryButton}
    >
      <ConfirmReadyIcon color={theme.colors.primary.contrast} size={30} />
    </Pressable>
  );
}

export function DockedTextInputHintButton({
  hintsRemaining,
  disabled,
  onPress,
}: {
  hintsRemaining?: number;
  disabled?: boolean;
  onPress?: () => void;
}) {
  const theme = useTheme();

  return (
    <Pressable
      style={[
        disabled ? theme.styles.circleButtonDisabled : theme.styles.hintButton,
        styles.button,
      ]}
      disabled={disabled}
      onPress={onPress}
      android_ripple={theme.ripples.primaryButton}
    >
      <HintIcon color="white" size={30} />

      {hintsRemaining != undefined && (
        <Text style={styles.hintsRemaining}>{hintsRemaining}</Text>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  inputContainer: {
    flexDirection: "row",
    height: 48,
  },
  textInput: {
    fontSize: 20,
    paddingHorizontal: 16,
    paddingTop: 0,
    paddingBottom: 0,
    flex: 1,
  },
  button: {
    justifyContent: "center",
    alignItems: "center",
    width: 56,
  },
  hintsRemaining: {
    position: "absolute",
    bottom: 0,
    right: 4,
    fontWeight: "bold",
    fontSize: 16,
    color: "white",
  },
});

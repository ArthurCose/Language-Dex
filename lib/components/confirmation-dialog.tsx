import { Pressable, StyleSheet, View } from "react-native";
import Dialog from "./dialog";
import { useTheme } from "../contexts/theme";
import { useTranslation } from "react-i18next";
import { Span } from "./text";
import { useState } from "react";
import { logError } from "../log";

type DiscardDialogProps = {
  open: boolean;
  onConfirm: () => Promise<void>;
  onCancel: () => void;
};

export function DiscardDialog({
  open,
  onConfirm,
  onCancel,
}: DiscardDialogProps) {
  const [t] = useTranslation();

  return (
    <ConfirmationDialog
      title={t("Discard_Changes")}
      description={t("Discard_Changes_Desc")}
      open={open}
      onConfirm={onConfirm}
      onCancel={onCancel}
    />
  );
}

type Props = {
  title: string;
  description: string;
  confirmationText?: string;
  open: boolean;
  onConfirm: () => Promise<void>;
  onCancel: () => void;
};

export default function ConfirmationDialog({
  title,
  description,
  confirmationText,
  open,
  onConfirm,
  onCancel,
}: Props) {
  const theme = useTheme();
  const [t] = useTranslation();

  const [pending, setPending] = useState(false);

  const actionStyles = [styles.action, pending && theme.styles.disabledText];

  return (
    <Dialog
      open={open}
      onClose={() => {
        if (!pending) {
          onCancel();
        }
      }}
    >
      <View style={styles.header}>
        <Span>{title}</Span>
      </View>

      <View style={theme.styles.separator} />

      <View style={styles.description}>
        <Span>{description}</Span>
      </View>

      <View style={styles.actions}>
        <Pressable
          onPress={onCancel}
          android_ripple={theme.ripples.transparentButton}
          disabled={pending}
        >
          <Span style={actionStyles}>{t("Cancel")}</Span>
        </Pressable>

        <Pressable
          onPress={() => {
            setPending(true);

            onConfirm()
              .catch((err) => logError(err))
              .then(() => setPending(false))
              .catch((err) => logError(err));
          }}
          android_ripple={theme.ripples.transparentButton}
          disabled={pending}
        >
          <Span style={actionStyles}>
            {confirmationText != undefined ? confirmationText : t("Confirm")}
          </Span>
        </Pressable>
      </View>
    </Dialog>
  );
}

const styles = StyleSheet.create({
  header: {
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  description: {
    padding: 8,
    paddingTop: 16,
    paddingLeft: 24,
  },
  actions: {
    flexDirection: "row",
    justifyContent: "flex-end",
  },
  action: {
    paddingHorizontal: 12,
    paddingVertical: 16,
  },
});

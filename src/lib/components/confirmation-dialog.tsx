import { Pressable, StyleSheet, View } from "react-native";
import Dialog, { DialogDescription, DialogTitle } from "./dialog";
import { useTheme } from "../contexts/theme";
import { useTranslation } from "react-i18next";
import { Span } from "./text";
import React, { useState } from "react";
import { logError } from "../log";

export function ConfirmationDialogActions({
  children,
}: React.PropsWithChildren) {
  return <View style={styles.actions}>{children}</View>;
}

export type ConfirmationDialogActionProps = {
  onPress?: () => void;
  disabled?: boolean;
} & React.PropsWithChildren;

export function ConfirmationDialogAction({
  onPress,
  disabled,
  children,
}: ConfirmationDialogActionProps) {
  const theme = useTheme();

  return (
    <Pressable
      onPress={onPress}
      android_ripple={theme.ripples.transparentButton}
      pointerEvents="box-only"
      disabled={disabled}
    >
      <Span style={[styles.action, disabled && theme.styles.disabledText]}>
        {children}
      </Span>
    </Pressable>
  );
}

type DiscardDialogProps = {
  open: boolean;
  saveDisabled?: boolean;
  onCancel: () => void;
  onDiscard?: () => Promise<void>;
  onSave?: () => Promise<void>;
};

export function DiscardDialog({
  open,
  saveDisabled,
  onSave,
  onDiscard,
  onCancel,
}: DiscardDialogProps) {
  const [t] = useTranslation();
  const [pending, setPending] = useState(false);

  return (
    <Dialog
      open={open}
      onClose={() => {
        if (!pending) {
          onCancel();
        }
      }}
    >
      <DialogTitle>{t("Discard_Changes")}</DialogTitle>
      <DialogDescription>{t("Discard_Changes_Desc")}</DialogDescription>

      <View style={styles.actions}>
        <ConfirmationDialogAction onPress={onCancel} disabled={pending}>
          {t("Cancel")}
        </ConfirmationDialogAction>

        {onDiscard && (
          <ConfirmationDialogAction
            onPress={() => {
              setPending(true);

              onDiscard()
                .catch((err) => logError(err))
                .then(() => setPending(false))
                .catch((err) => logError(err));
            }}
            disabled={pending || !open}
          >
            {t("Discard")}
          </ConfirmationDialogAction>
        )}

        {onSave && (
          <ConfirmationDialogAction
            onPress={() => {
              setPending(true);

              onSave()
                .catch((err) => logError(err))
                .then(() => setPending(false))
                .catch((err) => logError(err));
            }}
            disabled={saveDisabled || pending || !open}
          >
            {t("Save_Changes")}
          </ConfirmationDialogAction>
        )}
      </View>
    </Dialog>
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
  const [t] = useTranslation();
  const [pending, setPending] = useState(false);

  return (
    <Dialog
      open={open}
      onClose={() => {
        if (!pending) {
          onCancel();
        }
      }}
    >
      <DialogTitle>{title}</DialogTitle>
      <DialogDescription>{description}</DialogDescription>

      <ConfirmationDialogActions>
        <ConfirmationDialogAction
          onPress={onCancel}
          disabled={pending || !open}
        >
          {t("Cancel")}
        </ConfirmationDialogAction>

        <ConfirmationDialogAction
          onPress={() => {
            setPending(true);

            onConfirm()
              .catch((err) => logError(err))
              .then(() => setPending(false))
              .catch((err) => logError(err));
          }}
          disabled={pending || !open}
        >
          {confirmationText != undefined ? confirmationText : t("Confirm")}
        </ConfirmationDialogAction>
      </ConfirmationDialogActions>
    </Dialog>
  );
}

const styles = StyleSheet.create({
  actions: {
    flexDirection: "row",
    justifyContent: "flex-end",
  },
  action: {
    paddingHorizontal: 12,
    paddingVertical: 16,
  },
});

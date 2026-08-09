import React, { useState } from "react";
import { StyleSheet, View } from "react-native";
import { useTranslation } from "react-i18next";
import { useTheme } from "@/src/lib/contexts/theme";
import { CloseIcon, ConfirmReadyIcon, EditIcon } from "../icons";
import CustomTextInput, {
  TextInputCharacterCount,
} from "@/src/lib/components/custom-text-input";
import ScanOutput from "@/src/lib/components/scan-output";
import CircleButton from "@/src/lib/components/circle-button";
import useKeyboardVisible from "@/src/lib/hooks/use-keyboard-visible";

import Cat from "@/assets/svgs/Read.svg";
import CatInteraction from "@/src/lib/components/cat-interaction";

const MAX_LEN = 2000;

export default function Read() {
  const [t] = useTranslation();
  const theme = useTheme();
  const [text, setText] = useState("");
  const [confirmed, setConfirmed] = useState(false);
  const keyboardVisible = useKeyboardVisible();

  return (
    <>
      {confirmed ? (
        <ScanOutput text={text} />
      ) : (
        <View style={[styles.textInputView, theme.styles.scanTextInput]}>
          <CustomTextInput
            style={[styles.textInput, theme.styles.scanText]}
            editable
            multiline
            value={text}
            placeholder={t("scan_placeholder")}
            onChangeText={setText}
            maxLength={MAX_LEN}
          />

          <TextInputCharacterCount text={text} maxLen={MAX_LEN} />
        </View>
      )}

      {!keyboardVisible && (
        <View style={styles.circleButtonBlock}>
          <View style={styles.centeredButtonContainer}>
            <CatInteraction>
              <Cat width={64} height={64} />
            </CatInteraction>
          </View>

          <View style={styles.centeredButtonContainer}>
            {text != "" && (
              <CircleButton
                style={styles.circleButton}
                containerStyle={styles.circleButtonContainer}
                onPress={() => {
                  setText("");
                  setConfirmed(false);
                }}
              >
                <CloseIcon size={40} color="white" />
              </CircleButton>
            )}
          </View>

          <View style={styles.confirmButtonContainer}>
            <CircleButton
              style={styles.circleButton}
              containerStyle={styles.circleButtonContainer}
              onPress={() => setConfirmed(!confirmed)}
              disabled={text.length == 0}
            >
              {confirmed ? (
                <EditIcon size={40} color="white" />
              ) : (
                <ConfirmReadyIcon size={40} color="white" />
              )}
            </CircleButton>
          </View>
        </View>
      )}
    </>
  );
}

const styles = StyleSheet.create({
  textInputView: {
    flex: 1,
    display: "flex",
    flexDirection: "column",
    marginBottom: 8,
  },
  textInput: {
    flex: 1,
    textAlignVertical: "top",
    padding: 0,
  },
  circleButtonBlock: {
    display: "flex",
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 8,
  },
  circleButtonContainer: {
    marginHorizontal: 8,
    marginBottom: 8,
  },
  circleButton: {
    padding: 8,
  },
  circleButtonBlank: {
    marginHorizontal: 16,
    padding: 20,
  },
  centeredButtonContainer: {
    flex: 1,
    alignItems: "center",
  },
  confirmButtonContainer: {
    flex: 1,
    alignItems: "flex-end",
  },
});

import { StyleSheet, View } from "react-native";
import { useTranslation } from "react-i18next";
import { useTheme } from "@/lib/contexts/theme";
import React, { useState } from "react";
import { CloseIcon, ConfirmReadyIcon, EditIcon, HistoryIcon } from "../icons";
import CustomTextInput from "@/lib/components/custom-text-input";
import ScanOutput from "@/lib/components/scan-output";
import CircleButton from "@/lib/components/circle-button";
import useKeyboardVisible from "@/lib/hooks/use-keyboard-visible";

export default function Scan() {
  const [t] = useTranslation();
  const theme = useTheme();
  const [text, setText] = useState("");
  const [confirmed, setConfirmed] = useState(false);
  const [displayingHistory, setDisplayingHistory] = useState(false);
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
          />
        </View>
      )}

      {!keyboardVisible && (
        <View style={styles.circleButtonBlock}>
          {/* <CircleButton
            style={[styles.circleButton, styles.hidden]} 
            containerStyle={styles.circleButtonContainer}
          >
            <HistoryIcon size={40} color="white" />
          </CircleButton> */}
          <View style={styles.circleButtonBlank} />

          {confirmed && (
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
});

import { ScrollView, StyleSheet } from "react-native";
import { View } from "react-native";
import Dialog from "../dialog";
import { Span } from "../text";
import { useTranslation } from "react-i18next";
import { ConcedeIcon } from "../icons";
import IconButton from "../icon-button";
import ConfidenceStrip from "../definitions/confidence-strip";

export default function HintPopup({
  open,
  gameEnded,
  conceded,
  entryId,
  spelling,
  definition,
  confidence,
  onClose,
  onConcede,
  onConfidence,
}: {
  open: boolean;
  gameEnded: boolean;
  conceded?: boolean;
  entryId?: number;
  spelling?: string | boolean;
  definition?: string;
  confidence?: number;
  onClose: () => void;
  onConcede: () => void;
  onConfidence: (confidence: number) => void;
}) {
  const [t] = useTranslation();

  return (
    <Dialog open={open} onClose={onClose}>
      <View style={styles.hintTitleContainer}>
        <Span style={styles.hintTitle}>
          {typeof spelling == "string" ? spelling : t("short_answer_mystery")}
        </Span>

        {onConcede && (
          <View style={styles.concedeButton}>
            <IconButton
              icon={ConcedeIcon}
              disabled={conceded}
              onPress={onConcede}
            />
          </View>
        )}
      </View>

      <ScrollView keyboardDismissMode="none" keyboardShouldPersistTaps="always">
        <Span style={styles.hintText}>
          {definition ?? t("short_answer_mystery")}
        </Span>
      </ScrollView>

      {confidence != null && (conceded || gameEnded) && (
        <ConfidenceStrip
          style={styles.confidenceStrip}
          entryId={entryId}
          confidence={confidence}
          setConfidence={onConfidence}
        />
      )}
    </Dialog>
  );
}

const styles = StyleSheet.create({
  hintTitleContainer: {
    flexDirection: "row",
    justifyContent: "center",
  },
  hintTitle: {
    fontSize: 20,
    textAlign: "center",
    paddingTop: 8,
    flex: 1,
    marginHorizontal: 64,
  },
  hintText: {
    paddingTop: 16,
    paddingBottom: 16,
    paddingHorizontal: 64,
    textAlign: "center",
  },
  concedeButton: {
    position: "absolute",
    top: 0,
    right: 0,
  },
  confidenceStrip: {
    marginTop: -4,
    marginBottom: 12,
  },
});

import {
  StyleSheet,
  Pressable,
  View,
  StyleProp,
  ViewStyle,
} from "react-native";
import { ConfidenceIcon } from "../icons";
import { maxConfidence, updateStatistics, upsertDefinition } from "../../data";
import { useUserDataSignal } from "../../contexts/user-data-context";
import { logError } from "../../log";

function ConfidenceButton({
  confidence,
  representedConfidence,
  setConfidence,
}: {
  confidence: number;
  representedConfidence: number;
  setConfidence: (c: number) => void;
}) {
  return (
    <Pressable
      style={styles.confidencePressable}
      onPress={() => setConfidence(representedConfidence)}
    >
      <ConfidenceIcon
        confidence={representedConfidence}
        style={
          confidence == representedConfidence
            ? undefined
            : styles.transparentIcon
        }
        size={32}
      />
    </Pressable>
  );
}

export default function ConfidenceStrip({
  style,
  confidence,
  definitionId,
  setConfidence,
}: {
  style?: StyleProp<ViewStyle>;
  confidence: number;
  // updates the definition on selection when set
  definitionId?: number;
  setConfidence: (confidence: number) => void;
}) {
  const userDataSignal = useUserDataSignal();

  if (definitionId != null) {
    const prevCallback = setConfidence;

    setConfidence = (value) => {
      prevCallback(value);

      if (value == confidence) {
        return;
      }

      const userData = userDataSignal.get();
      upsertDefinition(userData.activeDictionary, {
        id: definitionId,
        confidence: value,
      })
        .then(() => {
          let maxConfidenceChange = 0;

          const currentlyMax = value == maxConfidence;
          const previouslyMax = confidence == maxConfidence;

          if (currentlyMax != previouslyMax) {
            maxConfidenceChange = previouslyMax ? -1 : 1;
          }

          if (maxConfidenceChange == 0) {
            return;
          }

          const updatedUserData = updateStatistics(userData, (stats) => {
            stats.documentedMaxConfidence =
              (stats.documentedMaxConfidence ?? 0) + maxConfidenceChange;
          });

          userDataSignal.set(updatedUserData);
        })
        .catch(logError);
    };
  }

  return (
    <View style={[styles.confidenceGroup, style]}>
      <ConfidenceButton
        confidence={confidence}
        representedConfidence={-1}
        setConfidence={setConfidence}
      />
      <ConfidenceButton
        confidence={confidence}
        representedConfidence={0}
        setConfidence={setConfidence}
      />
      <ConfidenceButton
        confidence={confidence}
        representedConfidence={1}
        setConfidence={setConfidence}
      />
      <ConfidenceButton
        confidence={confidence}
        representedConfidence={2}
        setConfidence={setConfidence}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  confidenceGroup: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
  },
  confidencePressable: {
    paddingHorizontal: 2,
  },
  transparentIcon: {
    opacity: 0.5,
  },
});

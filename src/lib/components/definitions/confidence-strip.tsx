import {
  StyleSheet,
  Pressable,
  View,
  StyleProp,
  ViewStyle,
} from "react-native";
import { ConfidenceIcon } from "../icons";

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
  setConfidence,
}: {
  style?: StyleProp<ViewStyle>;
  confidence: number;
  setConfidence: (confidence: number) => void;
}) {
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

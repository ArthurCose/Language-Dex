import { useEffect, useState } from "react";
import { useTheme } from "@/lib/contexts/theme";
import { router } from "expo-router";
import { useTranslation } from "react-i18next";
import { Pressable, Text, View, StyleSheet } from "react-native";
import Dialog from "../dialog";
import usePracticeColors from "@/lib/hooks/use-practice-colors";
import { pickIndexWithLenUnbiased } from "@/lib/practice/random";

import Ears from "@/assets/svgs/Results-1.svg";
import PeakUnder from "@/assets/svgs/Results-2.svg";
import DoorYarn from "@/assets/svgs/Results-3.svg";
import Sleeping from "@/assets/svgs/Results-4.svg";
import CatInteraction from "../cat-interaction";

const cats = [
  /* eslint-disable react/jsx-key*/
  <Ears
    style={{
      position: "absolute",
      left: 8,
      top: 0,
      transform: [{ translateY: "-100%" }],
    }}
    width={100}
    height={100}
  />,
  <CatInteraction
    style={{
      position: "absolute",
      right: 8,
      bottom: 1,
      transform: [{ translateY: "100%" }],
    }}
  >
    <PeakUnder width={100} height={100} />
  </CatInteraction>,
  <DoorYarn
    style={{
      position: "absolute",
      left: 8,
      bottom: 1,
      transform: [{ translateY: "100%" }],
    }}
    width={100}
    height={100}
  />,
  <CatInteraction
    style={{
      position: "absolute",
      right: 8,
      top: 52,
      transform: [{ translateY: "-100%" }],
    }}
  >
    <Sleeping width={128} height={128} />
  </CatInteraction>,
];

type ResultsDialogProps = {
  open: boolean;
  onClose?: () => void;
  onReplay?: () => void;
} & React.PropsWithChildren;

export function ResultsDialog({
  open,
  onClose,
  onReplay,
  children,
}: ResultsDialogProps) {
  const theme = useTheme();
  const [t] = useTranslation();
  const [reroll, setReroll] = useState(false);

  const [catIndex, setCatIndex] = useState(() =>
    pickIndexWithLenUnbiased(cats.length)
  );

  // display a different cat when reopening after a new game ends
  useEffect(() => {
    if (!open || !reroll) {
      return;
    }

    setReroll(false);
    setCatIndex(pickIndexWithLenUnbiased(cats.length));
  }, [open]);

  return (
    <Dialog open={open} onClose={onClose} allowOverflow>
      {cats[catIndex]}

      <Text style={[styles.header, theme.styles.text]}>{t("Results")}</Text>

      <View style={styles.rows}>{children}</View>

      <View style={styles.buttons}>
        <Pressable
          style={styles.button}
          android_ripple={theme.ripples.transparentButton}
          pointerEvents="box-only"
          onPress={() => router.back()}
        >
          <Text style={[styles.buttonText, theme.styles.text]}>
            {t("Quit")}
          </Text>
        </Pressable>

        <Pressable
          style={styles.button}
          android_ripple={theme.ripples.transparentButton}
          pointerEvents="box-only"
          onPress={() => {
            setReroll(true);
            onReplay?.();
          }}
        >
          <Text style={[styles.buttonText, styles.replayText]}>
            {t("Replay")}
          </Text>
        </Pressable>
      </View>
    </Dialog>
  );
}

export function ResultsRow({ children }: React.PropsWithChildren) {
  return <View style={styles.row}>{children}</View>;
}

export function ResultsSpacer() {
  return <View style={styles.spacer} />;
}

export function ResultsLabel({ children }: React.PropsWithChildren) {
  const theme = useTheme();

  return <Text style={[styles.label, theme.styles.text]}>{children}</Text>;
}

export function ResultsScore({ score }: { score: number }) {
  const theme = useTheme();

  return <Text style={[styles.result, theme.styles.poppingText]}>{score}</Text>;
}

export function ResultsHintScore({ score }: { score: number }) {
  const theme = useTheme();

  return (
    <Text style={[styles.result, theme.styles.hintScoreText]}>{score}</Text>
  );
}

export function ResultsConcededScore({ score }: { score: number }) {
  const theme = useTheme();

  return (
    <Text
      style={[
        styles.result,
        score == 0 ? theme.styles.disabledText : theme.styles.text,
      ]}
    >
      {score}
    </Text>
  );
}

export function ResultsClock({
  seconds,
  maxSeconds,
}: {
  seconds: number;
  maxSeconds: number;
}) {
  const theme = useTheme();

  seconds = Math.min(Math.max(Math.ceil(seconds), 0), maxSeconds);

  return (
    <Text style={[styles.result, theme.styles.disabledText]}>
      {Math.floor(seconds / 60)}:{seconds % 60 < 10 ? "0" : ""}
      {seconds % 60}
    </Text>
  );
}

const styles = StyleSheet.create({
  header: {
    fontSize: 24,
    fontWeight: "bold",
    alignSelf: "center",
    padding: 8,
  },
  rows: {
    marginBottom: 32,
  },
  row: {
    justifyContent: "space-between",
    paddingVertical: 0,
    paddingHorizontal: 32,
    flexDirection: "row",
  },
  spacer: {
    height: 32,
  },
  label: {
    fontSize: 18,
  },
  result: {
    fontSize: 22,
    fontWeight: "bold",
  },
  buttons: {
    flexDirection: "row",
    overflow: "hidden",
    borderBottomLeftRadius: 8,
    borderBottomRightRadius: 8,
  },
  button: {
    paddingVertical: 16,
    alignSelf: "center",
    flex: 1,
    alignItems: "center",
  },
  buttonText: {
    fontSize: 16,
  },
  replayText: {
    color: "green",
  },
});

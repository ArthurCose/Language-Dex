import { useTheme } from "@/lib/contexts/theme";
import { router } from "expo-router";
import { useTranslation } from "react-i18next";
import {
  Pressable,
  Text,
  View,
  StyleSheet,
  TextStyle,
  StyleProp,
} from "react-native";
import CatDialog from "../cat-dialog";
import { useEffect, useState } from "react";
import {
  ConcedeIcon,
  HintIcon,
  IconProps,
  ScoreIcon,
  TimerIcon,
} from "../icons";

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

  useEffect(() => {
    if (open && reroll) {
      setReroll(false);
    }
  }, [open, reroll]);

  return (
    <CatDialog open={open} onClose={onClose} reroll={reroll}>
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
    </CatDialog>
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

function ResultsIcon({
  icon: Icon,
  style,
}: {
  icon: React.FunctionComponent<IconProps>;
  style: StyleProp<TextStyle>;
}) {
  return (
    <Text style={style}>
      <Icon size={26} />
    </Text>
  );
}

export function ResultsScore({ score }: { score: number }) {
  const theme = useTheme();
  const textStyles = [styles.resultText, theme.styles.poppingText];

  return (
    <View style={styles.result}>
      <Text style={textStyles}>{score}</Text>

      <ResultsIcon icon={ScoreIcon} style={textStyles} />
    </View>
  );
}

export function ResultsHintScore({ score }: { score: number }) {
  const theme = useTheme();
  const textStyles = [styles.resultText, theme.styles.hintScoreText];

  return (
    <View style={styles.result}>
      <Text style={textStyles}>{score}</Text>

      <ResultsIcon icon={HintIcon} style={textStyles} />
    </View>
  );
}

export function ResultsConcededScore({ score }: { score: number }) {
  const theme = useTheme();
  const textStyles = [
    styles.resultText,
    score == 0 ? theme.styles.disabledText : theme.styles.text,
  ];

  return (
    <View style={styles.result}>
      <Text style={textStyles}>{score}</Text>

      <ResultsIcon icon={ConcedeIcon} style={textStyles} />
    </View>
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
  const textStyles = [styles.resultText, theme.styles.disabledText];

  seconds = Math.min(Math.max(Math.ceil(seconds), 0), maxSeconds);

  return (
    <View style={styles.result}>
      <Text style={textStyles}>
        {Math.floor(seconds / 60)}:{seconds % 60 < 10 ? "0" : ""}
        {seconds % 60}
      </Text>

      <ResultsIcon icon={TimerIcon} style={textStyles} />
    </View>
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
    alignItems: "center",
    justifyContent: "center",
    verticalAlign: "middle",
  },
  result: {
    flexDirection: "row",
    gap: 4,
  },
  resultText: {
    fontSize: 22,
    fontWeight: "bold",
    textAlignVertical: "center",
  },
  resultIcon: {
    textAlignVertical: "center",
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

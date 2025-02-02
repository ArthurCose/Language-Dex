import { useTheme } from "@/lib/contexts/theme";
import { router } from "expo-router";
import { useTranslation } from "react-i18next";
import { Pressable, Text, View, StyleSheet } from "react-native";
import Dialog from "../dialog";

type ResultsDialogProps = {
  open: boolean;
  onReplay?: () => void;
} & React.PropsWithChildren;

export function ResultsDialog({
  open,
  onReplay,
  children,
}: ResultsDialogProps) {
  const theme = useTheme();
  const [t] = useTranslation();

  return (
    <Dialog open={open}>
      <Text style={[styles.header, theme.styles.text]}>{t("Results")}</Text>

      <View style={styles.rows}>{children}</View>

      <View style={styles.buttons}>
        <Pressable
          style={styles.button}
          android_ripple={theme.ripples.transparentButton}
          onPress={() => router.back()}
        >
          <Text style={[styles.buttonText, theme.styles.text]}>
            {t("Quit")}
          </Text>
        </Pressable>

        <Pressable
          style={styles.button}
          android_ripple={theme.ripples.transparentButton}
          onPress={onReplay}
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

export function ResultsClock({ seconds }: { seconds: number }) {
  const theme = useTheme();

  seconds = Math.max(Math.floor(seconds), 0);

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

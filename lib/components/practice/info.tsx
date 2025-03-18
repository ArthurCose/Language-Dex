import React from "react";
import { Span } from "../text";
import { StyleSheet, View } from "react-native";
import { useTheme } from "@/lib/contexts/theme";
import {
  ConcedeIcon,
  CorrectIcon,
  HintIcon,
  IncorrectIcon,
  SaveIcon,
  ThumbUpIcon,
  TimerIcon,
} from "../icons";
import usePracticeColors from "@/lib/hooks/use-practice-colors";

export function GameTitle({ children }: React.PropsWithChildren) {
  const theme = useTheme();

  return (
    <Span style={[styles.title, theme.styles.subMenuTitle]}>{children}</Span>
  );
}

export function ScoreRow({ children }: React.PropsWithChildren) {
  return <View style={styles.scoreRow}>{children}</View>;
}

export function GameClock({ seconds }: { seconds: number }) {
  const theme = useTheme();

  seconds = Math.max(Math.ceil(seconds), 0);

  return (
    <View style={styles.clockBlock}>
      <TimerIcon color={theme.colors.disabledText} size={28} />
      <Span style={[styles.clock, theme.styles.disabledText]}>
        {Math.floor(seconds / 60)}:{seconds % 60 < 10 ? "0" : ""}
        {seconds % 60}
      </Span>
    </View>
  );
}

export function Score({ score }: { score: number }) {
  const theme = useTheme();

  return (
    <Span style={[styles.score, styles.scoreFont, theme.styles.poppingText]}>
      {score}
    </Span>
  );
}

export function HintScore({ score }: { score: number }) {
  const theme = useTheme();

  return (
    <View style={styles.hintBlock}>
      <Span style={[styles.scoreFont, theme.styles.hintScoreText]}>
        {score}
      </Span>
      <HintIcon size={28} color={theme.colors.text} />
    </View>
  );
}

export function ConcededScore({ score }: { score: number }) {
  const theme = useTheme();
  const colors = usePracticeColors();

  return (
    <View style={styles.incorrectBlock}>
      <ConcedeIcon size={29} color={theme.colors.text} />
      <Span
        style={[
          styles.scoreFont,
          score == 0 ? theme.styles.disabledText : theme.styles.text,
        ]}
      >
        {score}
      </Span>
    </View>
  );
}

export function IncorrectScore({ score }: { score: number }) {
  const theme = useTheme();
  const colors = usePracticeColors();

  return (
    <View style={styles.incorrectBlock}>
      <IncorrectIcon size={29} color={theme.colors.text} />
      <Span
        style={[
          styles.scoreFont,
          score == 0
            ? theme.styles.disabledText
            : { color: colors.mistake.color },
        ]}
      >
        {score}
      </Span>
    </View>
  );
}

export function CorrectScore({ score }: { score: number }) {
  const theme = useTheme();
  const colors = usePracticeColors();

  return (
    <View style={styles.incorrectBlock}>
      <Span
        style={[
          styles.scoreFont,
          score == 0
            ? theme.styles.disabledText
            : { color: colors.correct.color },
        ]}
      >
        {score}
      </Span>

      <CorrectIcon size={29} color={theme.colors.text} />
    </View>
  );
}

export function Saved({ value }: { value: number }) {
  const theme = useTheme();

  return (
    <View style={styles.savedBlock}>
      <SaveIcon color={theme.colors.disabledText} size={28} />
      <Span style={[styles.score, styles.scoreFont]}>{value}</Span>
    </View>
  );
}

export function ThumbsUps({ value }: { value: number }) {
  const theme = useTheme();

  return (
    <View style={styles.thumbsUpBlock}>
      <Span style={[styles.score, styles.scoreFont]}>{value}</Span>
      <ThumbUpIcon color={theme.colors.disabledText} size={28} />
    </View>
  );
}

const styles = StyleSheet.create({
  title: {
    fontSize: 24,
    fontWeight: "bold",
    textAlign: "center",
  },
  scoreRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 12,
    paddingVertical: 4,
  },
  clockBlock: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  clock: {
    fontWeight: "bold",
    fontSize: 22,
  },
  scoreFont: {
    fontWeight: "bold",
    fontSize: 22,
  },
  score: {
    marginLeft: "auto",
    marginRight: 4,
  },
  hintBlock: {
    marginLeft: "auto",
    flexDirection: "row",
    gap: 6,
  },
  incorrectBlock: {
    flexDirection: "row",
    gap: 2,
  },
  thumbsUpBlock: {
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
  },
  savedBlock: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
});

import React from "react";
import { Span } from "../text";
import { StyleSheet, View } from "react-native";
import { useTheme } from "@/lib/contexts/theme";
import { TimerIcon } from "../icons";

export function GameTitle({ children }: React.PropsWithChildren) {
  const theme = useTheme();

  return (
    <Span style={[styles.title, theme.styles.disabledText]}>{children}</Span>
  );
}

export function ScoreRow({ children }: React.PropsWithChildren) {
  return <View style={styles.scoreRow}>{children}</View>;
}

export function GameClock({ seconds }: { seconds: number }) {
  const theme = useTheme();

  seconds = Math.max(Math.floor(seconds), 0);

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

  return <Span style={[styles.score, theme.styles.poppingText]}>{score}</Span>;
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
  score: {
    fontWeight: "bold",
    marginLeft: "auto",
    fontSize: 22,
    marginRight: 4,
  },
});

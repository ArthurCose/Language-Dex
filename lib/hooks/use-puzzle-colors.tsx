import { useColorScheme } from "@/lib/contexts/color-scheme";

type PuzzleResultColors = {
  color: string;
  borderColor: string;
  backgroundColor: string;
};

export type PuzzleColors = {
  mistake: PuzzleResultColors;
  correct: PuzzleResultColors;
};

const puzzleColors: { [scheme: string]: PuzzleColors } = {
  light: {
    mistake: {
      color: "#b14",
      borderColor: "#b14",
      backgroundColor: "#b144",
    },
    correct: {
      color: "green",
      borderColor: "green",
      backgroundColor: "#8f84",
    },
  },
  dark: {
    mistake: {
      color: "#b14",
      borderColor: "#b14",
      backgroundColor: "#b144",
    },
    correct: {
      color: "#0f0",
      borderColor: "#0f0",
      backgroundColor: "#171",
    },
  },
};

export default function usePuzzleColors() {
  return puzzleColors[useColorScheme()];
}

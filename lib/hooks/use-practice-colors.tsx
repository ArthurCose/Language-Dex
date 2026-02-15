import { useColorScheme } from "@/lib/contexts/color-scheme";

type PracticeResultColors = {
  color: string;
  borderColor: string;
  backgroundColor: string;
};

export type PracticeColors = {
  mistake: PracticeResultColors;
  correct: PracticeResultColors;
};

const practiceColors: { [scheme: string]: PracticeColors } = {
  light: {
    mistake: {
      color: "#b14",
      borderColor: "#b14",
      backgroundColor: "#b144",
    },
    correct: {
      color: "green",
      borderColor: "green",
      backgroundColor: "#8f88",
    },
  },
  dark: {
    mistake: {
      color: "#f14",
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

export default function usePracticeColors() {
  return practiceColors[useColorScheme()];
}

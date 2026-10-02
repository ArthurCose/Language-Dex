import { createContext, useContext } from "react";
import { Theme } from "../themes";

export const ThemeContext = createContext<Theme>(null!);

export function useTheme() {
  return useContext(ThemeContext);
}

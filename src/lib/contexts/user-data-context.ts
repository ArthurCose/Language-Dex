import { createContext, useContext } from "react";
import { UserData } from "../data";
import { Signal } from "../hooks/use-signal";

export const UserDataContext = createContext<Signal<UserData>>(null!);
export function useUserDataSignal() {
  return useContext(UserDataContext);
}

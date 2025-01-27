import { createContext, useContext } from "react";
import { UserData } from "../data";

export const UserDataContext = createContext<
  [UserData, (data: UserData | ((data: UserData) => UserData)) => void]
>(null!);
export function useUserDataContext() {
  return useContext(UserDataContext);
}

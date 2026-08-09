import { createContext } from "react";

export default function createModifiableContext<T>() {
  return createContext<[T, React.Dispatch<React.SetStateAction<T>>]>(null!);
}

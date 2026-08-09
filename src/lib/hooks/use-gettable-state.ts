import { SetStateAction, useMemo, useRef, useState } from "react";

export default function useGettableState<S>(
  initialState: S | (() => S)
): [S, (value: SetStateAction<S>) => void, () => S] {
  const [state, setState] = useState(initialState);
  const ref = useRef(state);

  const [setter, getter] = useMemo(
    () => [
      // setter
      (value: SetStateAction<S>) => {
        if (typeof value == "function") {
          setState((s) => {
            s = (value as (s: S) => S)(s);
            ref.current = s;
            return s;
          });
        } else {
          setState(value);
          ref.current = value;
        }
      },
      // getter
      () => ref.current,
    ],
    []
  );

  return [state, setter, getter];
}

import {
  AnimatableValue,
  Easing,
  runOnJS,
  SharedValue,
  withSequence,
  withTiming,
} from "react-native-reanimated";
import { GameWord } from "./data";
import { DefinitionMap } from "./hooks/use-word-definitions";
import { SetStateAction, useEffect, useRef, useState } from "react";

export function pickIndexBiased<T>(list: T[]) {
  const value = Math.random();
  return Math.floor(value * value * list.length);
}

export function pluckBiased<T>(list: T[]): T | undefined {
  const [item] = list.splice(pickIndexBiased(list), 1);
  return item;
}

export function pluckNBiased<T>(list: T[], n: number): T[] {
  const total = Math.min(list.length, n);
  const output = [];

  for (let i = 0; i < total; i++) {
    output.push(pluckBiased(list)!);
  }

  return output;
}

export function shuffle<T>(list: T[]) {
  for (let i = 0; i < list.length - 1; i++) {
    const remaining = list.length - i;
    const offset = Math.floor(Math.random() * remaining);
    const j = i + offset;

    // swap
    const temp = list[j];
    list[j] = list[i];
    list[i] = temp;
  }
}

export function cloneAndShuffle<T>(list: T[]) {
  const cloned = [...list];
  shuffle(cloned);
  return cloned;
}

export function getDefinition(
  definitionMap: DefinitionMap,
  gameWord: GameWord
) {
  return definitionMap[gameWord.spelling.toLowerCase()]?.definitionsResult
    ?.definitions[gameWord.orderKey];
}

export const fadeTimingConfig = {
  duration: 500,
  easing: Easing.inOut(Easing.quad),
};

export function flash<T extends AnimatableValue>(
  sharedValue: SharedValue<T>,
  to: T,
  final: T
) {
  sharedValue.value = withSequence(
    withTiming(to, fadeTimingConfig),
    withTiming(final, fadeTimingConfig)
  );
}

export function fadeTo<T extends AnimatableValue>(
  sharedValue: SharedValue<T>,
  final: T,
  callback?: (finished: boolean | undefined) => void
) {
  sharedValue.value = withTiming(final, fadeTimingConfig, (finished) => {
    if (callback) {
      runOnJS(callback)(finished);
    }
  });
}

export class Timer {
  #stored: number = 0;
  #startTime?: number;

  onPause?: () => void;
  onResume?: () => void;

  start() {
    this.#stored = 0;
    this.#startTime = performance.now();
    this.onResume?.();
  }

  pause() {
    if (this.#startTime != undefined) {
      this.#stored += performance.now() - this.#startTime;
      this.#startTime = undefined;
      this.onPause?.();
    }
  }

  resume() {
    if (this.#startTime == undefined) {
      this.#startTime = performance.now();
      this.onResume?.();
    }
  }

  reset() {
    this.#stored = 0;
    this.#startTime = undefined;
    this.onPause?.();
  }

  milliseconds() {
    if (this.#startTime == undefined) {
      return this.#stored;
    } else {
      return performance.now() - this.#startTime + this.#stored;
    }
  }

  seconds() {
    return this.milliseconds() / 1000;
  }
}

export function useTimerSeconds(timer: Timer) {
  const [seconds, setSeconds] = useState(0);

  useEffect(() => {
    let timeout: NodeJS.Timeout | undefined;

    const resumeCallback = () => {
      const ms = timer.milliseconds();
      setSeconds(ms / 1000);

      clearTimeout(timeout);
      timeout = setTimeout(resumeCallback, 1001 - (ms % 1000));
    };

    timer.onResume = () => {
      resumeCallback();
    };

    timer.onPause = () => {
      setSeconds(timer.seconds());
      clearTimeout(timeout);
      timeout = undefined;
    };

    const ms = timer.milliseconds();
    setSeconds(ms / 1000);

    return () => {
      clearTimeout(timeout);
      timer.onPause = undefined;
      timer.onResume = undefined;
    };
  }, [timer]);

  return seconds;
}

export function useGettableState<S>(
  initialState: S | (() => S)
): [S, (value: SetStateAction<S>) => void, () => S] {
  const [state, setState] = useState(initialState);
  const ref = useRef(state);

  return [
    state,
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
    () => ref.current,
  ];
}

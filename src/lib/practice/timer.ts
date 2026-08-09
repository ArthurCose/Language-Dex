import { useEffect, useState } from "react";

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

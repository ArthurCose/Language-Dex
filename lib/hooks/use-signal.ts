import { useEffect, useState } from "react";

type Listener<T> = (value: T) => void;

export class Signal<T> {
  private _value: T;
  private _subscriptions: Set<Listener<T>>;

  constructor(value: T) {
    this._value = value;
    this._subscriptions = new Set();
  }

  subscribe(listener: Listener<T>) {
    this._subscriptions.add(listener);
  }

  unsubscribe(listener: Listener<T>) {
    this._subscriptions.delete(listener);
  }

  subscriptionCount() {
    return this._subscriptions.size;
  }

  get() {
    return this._value;
  }

  set(value: T) {
    if (this._value == value) {
      return;
    }

    this._value = value;

    for (const callback of this._subscriptions.values()) {
      callback(value);
    }
  }

  add(this: Signal<number>, value: number) {
    this.set(this._value + value);
  }

  subtract(this: Signal<number>, value: number) {
    this.set(this._value - value);
  }
}

export function useSignal<T>(initialValue: T) {
  const [signal] = useState(() => new Signal(initialValue));

  return signal;
}

export function useSignalValue<T>(signal: Signal<T>) {
  const value = signal.get();
  const [_, setValue] = useState(value);

  useEffect(() => {
    setValue(signal.get());

    signal.subscribe(setValue);

    return () => {
      signal.unsubscribe(setValue);
    };
  }, [signal]);

  return value;
}

export function useSignalLens<T, R>(
  signal: Signal<T>,
  transformation: (value: T) => R,
): R {
  const value = transformation(signal.get());
  const [_, setValue] = useState(value);

  useEffect(() => {
    const listener = (value: T) => setValue(transformation(value));
    signal.subscribe(listener);

    return () => {
      signal.unsubscribe(listener);
    };
  }, [signal]);

  return value;
}

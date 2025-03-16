import { useEffect, useState } from "react";

type Listener<T> = (value: T) => void;

export class Signal<T> {
  private _value: T;
  private _subscriptions: Set<Listener<T>>;

  constructor(value: T) {
    this._value = value;
    this._subscriptions = new Set();
  }

  value() {
    return this._value;
  }

  subscribe(listener: Listener<T>) {
    this._subscriptions.add(listener);
  }

  unsubscribe(listener: Listener<T>) {
    this._subscriptions.delete(listener);
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
}

export function useSignal<T>(initialValue?: T) {
  const [signal] = useState(() => new Signal(initialValue));

  return signal;
}

export function useSignalValue<T>(signal: Signal<T>) {
  const [_, setValue] = useState(signal.value());

  useEffect(() => {
    signal.subscribe(setValue);

    return () => {
      signal.unsubscribe(setValue);
    };
  }, [signal]);

  return signal.value();
}

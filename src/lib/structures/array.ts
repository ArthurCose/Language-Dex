export function swapRemove<T>(list: T[], index: number): T | undefined {
  if (list.length == 0) {
    return undefined;
  }

  const value = list[index];
  list[index] = list[list.length - 1];
  list.pop();

  return value;
}

export function findAndSwapRemove<T>(
  list: T[],
  predicate: (value: T) => boolean,
): T | undefined {
  const index = list.findIndex(predicate);

  if (index == -1) {
    return undefined;
  }

  return swapRemove(list, index);
}

export function shallowEqual(a: any[], b: any[]) {
  return a.length == b.length && a.every((v, i) => Object.is(v, b[i]));
}

/** Removes duplicate values, may reorder elements */
export function deduplicateUnstable(list: any[]) {
  for (let i = list.length - 1; i >= 0; i--) {
    const a = list[i] as unknown;

    for (let j = i - 1; j >= 0; j--) {
      const b: any = list[j] as unknown;

      if (Object.is(a, b)) {
        swapRemove(list, i);
        break;
      }
    }
  }
}

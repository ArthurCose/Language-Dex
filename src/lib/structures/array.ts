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
  predicate: (value: T) => boolean
): T | undefined {
  const index = list.findIndex(predicate);

  if (index == -1) {
    return undefined;
  }

  return swapRemove(list, index);
}

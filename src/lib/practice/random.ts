export function pickIndexWithLenUnbiased(len: number) {
  const value = Math.random();
  return Math.floor(value * len);
}

const top = 10;
const topBias = 0.3;

export function pickIndexWithLenBiased(len: number) {
  let offset = 0;

  if (len > top) {
    if (Math.random() < topBias) {
      return Math.floor(Math.random() * top);
    }

    offset += top;
    len -= top;
  }

  const value = Math.random();
  return Math.floor(value ** (8 / 5) * len) + offset;
}

export function pickIndexBiased<T>(list: T[]) {
  return pickIndexWithLenBiased(list.length);
}

export function swapNToEndWith<T>(
  list: T[],
  len: number,
  n: number,
  randomFn: (len: number) => number
): T[] {
  const total = Math.min(len, n);
  const end = len;

  for (let i = 0; i < total; i++) {
    swapToEnd(list, len, randomFn(len));
    len -= 1;
  }

  return list.slice(len, end);
}

export function swapToEnd<T>(
  list: T[],
  len: number,
  index: number
): T | undefined {
  if (len == 0) {
    return;
  }

  const end = len - 1;
  const value = list[index];
  list[index] = list[end];
  list[end] = value;
  return value;
}

export function shiftNToEndWith<T>(
  list: T[],
  len: number,
  n: number,
  randomFn: (len: number) => number
): T[] {
  const total = Math.min(len, n);
  const end = len;

  for (let i = 0; i < total; i++) {
    shiftToEnd(list, len, randomFn(len));
    len -= 1;
  }

  return list.slice(len, end);
}

export function shiftToEnd<T>(
  list: T[],
  len: number,
  index: number
): T | undefined {
  if (len == 0) {
    return;
  }

  const value = list[index];
  const end = len - 1;

  for (let i = index; i < end; i++) {
    list[i] = list[i + 1];
  }

  list[end] = value;

  return value;
}

export function swap<T>(list: T[], indexA: number, indexB: number) {
  const temp = list[indexA];
  list[indexA] = list[indexB];
  list[indexB] = temp;
}

/// Avoids matching the original order
export function shuffle<T>(list: T[]) {
  if (list.length <= 1) {
    return;
  }

  if (list.length == 2) {
    const temp = list[0];
    list[0] = list[1];
    list[1] = temp;
    return;
  }

  let shuffled = false;

  for (let i = 0; i < list.length - 1; i++) {
    const remaining = list.length - i;
    const offset = Math.floor(Math.random() * remaining);
    const j = i + offset;

    if (i != j) {
      shuffled = true;
    }

    // swap
    const temp = list[j];
    list[j] = list[i];
    list[i] = temp;
  }

  if (!shuffled) {
    // try again
    shuffle(list);
  }
}

export function cloneAndShuffle<T>(list: T[]) {
  const cloned = [...list];
  shuffle(cloned);
  return cloned;
}

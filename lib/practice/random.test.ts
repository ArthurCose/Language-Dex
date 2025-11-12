import {
  swapToEnd,
  shiftToEnd,
  swapNToEndWith,
  shiftNToEndWith,
  cloneAndShuffle,
} from "./random";
import { describe, expect, test } from "@jest/globals";

function isAscending<T>(list: T[]) {
  let lastValue = list[0];

  for (let i = 1; i < list.length; i++) {
    const value = list[i];

    if (value < lastValue) {
      return false;
    }

    lastValue = value;
  }

  return true;
}

describe("swapToEnd", () => {
  test("basic", () => {
    const list = [1, 2, 3, 4, 5];
    const index = 2;
    const expected = list[index];
    const swappedExpected = list[list.length - 1];

    const output = swapToEnd(list, list.length, index);

    expect(output).toBe(expected);
    expect(list[list.length - 1]).toBe(expected);
    expect(list[index]).toBe(swappedExpected);
  });

  test("empty", () => {
    expect(swapToEnd([], 0, 0)).toBe(undefined);
  });
});

describe("shiftToEnd", () => {
  test("basic", () => {
    const list = [1, 2, 3, 4, 5];
    const index = 2;
    const expected = list[index];

    const output = shiftToEnd(list, list.length, index);

    expect(output).toBe(expected);
    expect(list[list.length - 1]).toBe(expected);
    expect(isAscending(list.slice(0, list.length - 1))).toBe(true);
  });

  test("empty", () => {
    expect(shiftToEnd([], 0, 0)).toBe(undefined);
  });
});

describe("swapNToEndWith", () => {
  test("basic", () => {
    const list = [1, 2, 3, 4];
    const len = list.length;
    const n = 2;

    const output = swapNToEndWith(list, len, n, () => 0);
    expect(output.length).toBe(n);
    expect(list.length).toBe(len);

    expect(list.slice(0, n).every((v) => !output.includes(v))).toBe(true);
    expect(list.slice(n).every((v) => output.includes(v))).toBe(true);
  });

  test("empty", () => {
    const len = 0;
    const n = 3;
    expect(swapNToEndWith([], len, n, () => 0).length).toBe(0);
    expect(swapNToEndWith([1, 2, 3, 4], len, n, () => 0).length).toBe(0);
  });

  test("length shorter than n", () => {
    const len = 2;
    const n = 3;
    expect(swapNToEndWith([1, 2, 3], len, n, () => 0).length).toBe(2);
  });
});

describe("shiftNToEndWith", () => {
  test("basic", () => {
    const list = [1, 2, 3, 4];
    const len = list.length;
    const n = 2;

    const output = shiftNToEndWith(list, len, n, () => 0);
    expect(output.length).toBe(n);
    expect(list.length).toBe(len);

    expect(list.slice(0, n).every((v) => !output.includes(v))).toBe(true);
    expect(list.slice(n).every((v) => output.includes(v))).toBe(true);

    expect(isAscending(list.slice(0, n))).toBe(true);
  });

  test("empty", () => {
    const len = 0;
    const n = 3;
    expect(shiftNToEndWith([], len, n, () => 0).length).toBe(0);
    expect(shiftNToEndWith([1, 2, 3, 4], len, n, () => 0).length).toBe(0);
  });

  test("length shorter than n", () => {
    const len = 2;
    const n = 3;
    expect(shiftNToEndWith([1, 2, 3], len, n, () => 0).length).toBe(2);
  });

  test("shuffle", () => {
    expect(cloneAndShuffle([])).toEqual([]);
    expect(cloneAndShuffle([1])).toEqual([1]);

    const originalLen2 = [1, 2];
    const expectedLen2 = [2, 1];
    const originalLen3 = [1, 2, 3];

    for (let i = 0; i < 20; i++) {
      expect(cloneAndShuffle(originalLen2)).toEqual(expectedLen2);
      expect(cloneAndShuffle(originalLen3)).not.toEqual(originalLen3);
    }
  });
});

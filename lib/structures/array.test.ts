import { swapRemove } from "./array";
import { describe, expect, test } from "@jest/globals";

describe("swapRemove", () => {
  test("basic", () => {
    const paramList = [
      { list: [1, 2, 3, 4], index: 1, expected: [1, 4, 3] },
      { list: [1, 2, 3], index: 0, expected: [3, 2] },
      { list: [1, 2, 3], index: 2, expected: [1, 2] },
    ];

    for (const params of paramList) {
      const value = params.list[params.index];
      const out = swapRemove(params.list, params.index);

      expect(params.list).toEqual(params.expected);
      expect(out).toBe(value);
    }
  });

  test("empty", () => {
    const list: number[] = [];
    const value = swapRemove(list, 0);

    expect(list.length).toBe(0);
    expect(value).toBe(undefined);
  });
});

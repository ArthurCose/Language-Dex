import { describe, expect, test } from "@jest/globals";
import { joinValues, splitValue } from "./human-readable-csv";

describe("human-readable-csv", () => {
  test("reversable", () => {
    const input = ["a", "b,c", "d"];
    const cell = joinValues(input);
    expect(cell).toEqual("a,b\\,c,d");
    expect(splitValue(cell)).toEqual(input);
  });

  test("preserves escaped backslashes", () => {
    let input = ["a\\,b"];
    let cell = joinValues(input);
    expect(cell).toEqual("a\\\\\\,b");
    expect(splitValue(cell)).toEqual(input);

    input = ["a\\\\,b"];
    cell = joinValues(input);
    expect(cell).toEqual("a\\\\\\\\\\,b");
    expect(splitValue(cell)).toEqual(input);
  });

  test("supports custom separator", () => {
    const separator = " | ";
    const input = ["a", "c", "d"];
    const cell = joinValues(input, separator);
    expect(splitValue(cell, separator)).toEqual(input);
  });
});

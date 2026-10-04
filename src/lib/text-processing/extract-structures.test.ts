import {
  extractSentence,
  extractParagraph,
  extractTrailing,
} from "./extract-structures";
import { describe, expect, test } from "@jest/globals";

describe("extract-structures", () => {
  const sample = "a b c. d e f";

  test("extractParagraph", () => {
    expect(extractParagraph(`\n${sample}\n`, 4, Infinity)).toBe(sample);
    expect(extractParagraph(`\n${sample}\n`, 4, 4)).toBe(null);
  });

  test("extractSentence", () => {
    expect(extractSentence(sample, 0, Infinity)).toBe("a b c.");
    expect(extractSentence(sample, 8, Infinity)).toBe("d e f");
    expect(extractSentence(sample, 0, 1)).toBe(null);
    expect(extractSentence(sample, 8, 1)).toBe(null);
  });

  test("extractTrailing", () => {
    expect(extractTrailing("ABCDEFGHI", 1, "B", 6)).toBe("ABC...");
    expect(extractTrailing("ABCDEFGHI", 4, "E", 7)).toBe("...E...");
    expect(extractTrailing("ABCDEFGHI", 7, "H", 7)).toBe("...H...");
    expect(extractTrailing("ABCDEFGHI", 7, "H", 9)).toBe("...DEFGHI");
    expect(extractTrailing("ABCDEFGHI\nABC", 7, "H", 9)).toBe("...DEFGHI");
  });

  test("UTF-16", () => {
    const s = "😭😭😭😭😭😭";
    const char = "😭";

    for (let i = 0; i < s.length; i += char.length) {
      expect(extractTrailing(s, i, char, 10).isWellFormed()).toBe(true);
    }
  });
});

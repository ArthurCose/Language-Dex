import extractWords from "./extract-words";
import { describe, expect, test } from "@jest/globals";

describe("extractWords", () => {
  const extractWordStrings = (input: string) =>
    extractWords(input).map((s) => {
      const substr = input
        .slice(s.rawIndex, s.rawIndex + s.length)
        .toLowerCase();
      expect(substr).toEqual(s.text);
      expect(s.length).toEqual(s.text.length);

      return s.text;
    });

  const assertStrings = (input: string, output: string[]) => {
    expect(extractWordStrings(input)).toEqual(output);
  };

  const assertStable = (input: string) => {
    expect(extractWordStrings(input)).toEqual(extractWordStrings(input));
  };

  test("japanese", () => {
    // https://www.smogon.com/smog/issue12/japanese
    assertStrings("ようこそ！ポケモン世界へ", [
      "ようこそ",
      "ポケモン",
      "世界",
      "へ",
    ]);
    // Welcome to Language Dex
    assertStrings("Language Dexへようこそ", [
      "language",
      "dex",
      "へ",
      "ようこそ",
    ]);

    // make sure we get the same results between multiple runs
    assertStable("AへへAへへ");
  });

  test("hyphens", () => {
    assertStrings("-", []);
    assertStrings("-a-", ["a"]);
    assertStrings("a-b-c a-b-c- -a-b-c", ["a-b-c", "a-b-c", "a-b-c"]);
  });
});

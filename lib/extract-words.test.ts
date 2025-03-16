import extractWords from "./extract-words";
import { describe, expect, test } from "@jest/globals";

describe("extractWords", () => {
  const assertStrings = (input: string, output: string[]) => {
    const words = extractWords(input).map((s) => s.text);
    expect(words).toEqual(output);
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
  });
});

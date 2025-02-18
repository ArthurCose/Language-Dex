import Unistring, { Grapheme } from "@akahuku/unistring";

export function toGraphemeStrings(word: string) {
  const graphemes: string[] = [];

  Unistring(word).forEach((grapheme) => {
    graphemes.push(grapheme.rawString);
  });

  if (graphemes.length > 0 && isRTL(graphemes[0])) {
    graphemes.reverse();
  }

  return graphemes;
}

export function toGraphemes(word: string) {
  const graphemes: Grapheme[] = [];

  Unistring(word).forEach((grapheme) => {
    graphemes.push(grapheme);
  });

  if (graphemes.length > 0 && isRTL(graphemes[0].rawString)) {
    graphemes.reverse();
  }

  return graphemes;
}

export function joinGraphemes(graphemes: Grapheme[]) {
  if (graphemes.length > 0 && isRTL(graphemes[0].rawString)) {
    graphemes = graphemes.toReversed();
  }

  return graphemes.map((g) => g.rawString).join("");
}

export function joinGraphemeStrings(graphemes: string[]) {
  if (graphemes.length > 0 && isRTL(graphemes[0])) {
    graphemes = graphemes.toReversed();
  }

  return graphemes.join("");
}

export function isRTL(text: string): boolean {
  return false;
}

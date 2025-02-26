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

// https://www.unicode.org/Public/UNIDATA/extracted/DerivedBidiClass.txt
const rtlRanges = [
  // # @missing: 0590..05FF; Right_To_Left
  // # @missing: 0600..07BF; Arabic_Letter
  // # @missing: 07C0..085F; Right_To_Left
  // # @missing: 0860..08FF; Arabic_Letter
  [0x0590, 0x08ff],
  // # @missing: FB1D..FB4F; Right_To_Left
  // # @missing: FB50..FDCF; Arabic_Letter
  [0xfb1d, 0xfdcf],
  // # @missing: FDF0..FDFF; Arabic_Letter
  [0xfdf0, 0xfdff],
  // # @missing: FE70..FEFF; Arabic_Letter
  [0xfe70, 0xfeff],
  // # @missing: 10800..10CFF; Right_To_Left
  // # @missing: 10D00..10D3F; Arabic_Letter
  // # @missing: 10D40..10EBF; Right_To_Left
  // # @missing: 10EC0..10EFF; Arabic_Letter
  // # @missing: 10F00..10F2F; Right_To_Left
  // # @missing: 10F30..10F6F; Arabic_Letter
  // # @missing: 10F70..10FFF; Right_To_Left
  [0x10800, 0x10fff],
  // # @missing: 1E800..1EC6F; Right_To_Left
  // # @missing: 1EC70..1ECBF; Arabic_Letter
  // # @missing: 1ECC0..1ECFF; Right_To_Left
  // # @missing: 1ED00..1ED4F; Arabic_Letter
  // # @missing: 1ED50..1EDFF; Right_To_Left
  // # @missing: 1EE00..1EEFF; Arabic_Letter
  // # @missing: 1EF00..1EFFF; Right_To_Left
  [0x1e800, 0x1efff],
];
export function isRTL(text: string): boolean {
  const codePoint = Unistring.getCodePointArray(text)[0];
  return rtlRanges.some(
    (range) => codePoint >= range[0] && codePoint <= range[1]
  );
}

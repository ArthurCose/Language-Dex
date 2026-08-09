import Unistring, { SegmentationResult } from "@akahuku/unistring";

const UNKNOWN_OR_KANJI = 0;
const HIRAGANA = Unistring.WBP["Hiragana"];

const SCRIPT_WHITELIST = [
  "Other",
  "Hebrew_Letter",
  "Katakana",
  "Hiragana",
  "KanaExtension",
  "ALetter",
];
const SCRIPT_WHITELIST_MAP: { [script: number]: boolean } = {};

for (const name of SCRIPT_WHITELIST) {
  SCRIPT_WHITELIST_MAP[Unistring.WBP[name]] = true;
}

const COMMON_SCRIPT_PROP = Unistring.SCRIPT["Common"];

export default function extractWords(text: string) {
  text = text.toLowerCase();

  const unistringSegments = Unistring.getWords(text, true);

  const scriptPropCache: { [codePoint: number]: number } = {};

  function getScriptProp(codePoint: number) {
    let prop = scriptPropCache[codePoint];

    if (prop != undefined) {
      return prop;
    }

    prop = Unistring.getScriptProp(codePoint);
    scriptPropCache[codePoint] = prop;

    return prop;
  }

  let lastSegment: SegmentationResult | undefined;

  const words = [];
  let nextChainedIndex: number | null = null;

  for (let i = 0; i < unistringSegments.length; i++) {
    const segment = unistringSegments[i];

    if (!SCRIPT_WHITELIST_MAP[segment.type]) {
      continue;
    }

    const lastSegmentTailIndex = lastSegment
      ? lastSegment.index + lastSegment.length
      : undefined;

    if (segment.type == UNKNOWN_OR_KANJI) {
      if (segment.text == "-" && lastSegmentTailIndex == segment.index) {
        // join by hyphen https://github.com/ArthurCose/Language-Dex/issues/10
        nextChainedIndex = segment.index + segment.length;
        continue;
      }

      // ignore characters that aren't used by words
      const codePoint = Unistring.getCodePointArray(segment.text)[0];

      if (getScriptProp(codePoint) == COMMON_SCRIPT_PROP) {
        continue;
      }
    } else if (
      segment.type == HIRAGANA &&
      lastSegmentTailIndex == segment.index &&
      segment.text.length > 1
    ) {
      // hirigana right after another segment, assume participle
      const particleSegment = {
        text: segment.text[0],
        index: segment.index,
        rawIndex: segment.rawIndex,
        length: 1,
        type: segment.type,
      };

      // remaining hiragana
      const newSegment = {
        text: segment.text.slice(1),
        index: segment.index + 1,
        rawIndex: segment.rawIndex + 1,
        length: segment.length - 1,
        type: segment.type,
      };

      lastSegment = segment;
      words.push(particleSegment, newSegment);
      continue;
    }

    if (segment.index == nextChainedIndex && lastSegment) {
      const startI = lastSegment.rawIndex;
      const length = segment.rawIndex - lastSegment.rawIndex + segment.length;

      lastSegment.length = length;
      lastSegment.text = text.slice(startI, startI + length);
      continue;
    }

    lastSegment = segment;
    words.push(segment);
  }

  return words;
}

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
  const unistringSegments = Unistring.getWords(text.toLowerCase(), true);

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

  return unistringSegments.flatMap((segment, i) => {
    if (!SCRIPT_WHITELIST_MAP[segment.type]) {
      return [];
    }

    const lastSegmentTailIndex = lastSegment
      ? lastSegment.index + lastSegment.length
      : undefined;

    if (segment.type == UNKNOWN_OR_KANJI) {
      const codePoint = Unistring.getCodePointArray(segment.text)[0];

      if (getScriptProp(codePoint) == COMMON_SCRIPT_PROP) {
        return [];
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
      segment.text = segment.text.slice(1);
      segment.index += 1;
      segment.rawIndex += 1;
      segment.length -= 1;

      lastSegment = segment;
      return [particleSegment, segment];
    }

    lastSegment = segment;
    return [segment];
  });
}

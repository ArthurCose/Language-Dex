import { useEffect, useMemo, useRef, useState } from "react";
import * as DropDownPrimitive from "@rn-primitives/dropdown-menu";
import { useTheme } from "@/src/lib/contexts/theme-context";
import useWordEntries from "@/src/lib/hooks/use-word-entries";
import { DefinitionsPopover } from "./definitions/definition-popover";
import { Span } from "./text";
import {
  extractParagraph,
  extractSentence,
  extractTrailing,
} from "@/src/lib/text-processing/extract-structures";
import { isValidWord } from "../data";

type Props = {
  dictionaryId: number;
  text: string;
  normalized: string;
  excerptText: string;
  excerptIndex: number;
};

// a tweet
const EXAMPLE_LEN_LIMIT = 140;

export function generateExample(
  text: string,
  index: number,
  word: string,
): string {
  return (
    extractParagraph(text, index, EXAMPLE_LEN_LIMIT) ??
    extractSentence(text, index, EXAMPLE_LEN_LIMIT) ??
    extractTrailing(text, index, word, EXAMPLE_LEN_LIMIT)
  );
}

export default function ScannedWord({
  dictionaryId,
  text,
  normalized,
  excerptText,
  excerptIndex,
}: Props) {
  const theme = useTheme();
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<DropDownPrimitive.TriggerRef | null>(null);

  const [checkedVariants, setCheckedVariants] = useState(false);
  const [wordExists, setWordExists] = useState(false);

  const wordDeps = useMemo(() => [normalized], [normalized]);
  const entryMap = useWordEntries(dictionaryId, wordDeps);
  const entry = entryMap[normalized];
  const entryResult = entry?.result;

  const diacriticsMatch = useMemo(() => {
    const lowercased = text.toLowerCase();
    const diacriticsMatch = entryResult?.entries.some(
      (e) => e.spelling.toLowerCase() == lowercased,
    );

    return diacriticsMatch ?? false;
  }, [normalized]);

  const underlineStyles = [theme.styles.scannedWord];

  if (entryResult && entryResult.entries.length > 0) {
    underlineStyles.push(theme.styles.scannedOldWord);

    if (!diacriticsMatch && !wordExists) {
      underlineStyles.push(theme.styles.scannedUncertainWord);
    }
  } else if (entry?.loaded) {
    underlineStyles.push(theme.styles.scannedNewWord);
  }

  // use isValidWord to check variants if diacritics failed to match
  useEffect(() => {
    if (!entryResult || diacriticsMatch) {
      return;
    }

    setCheckedVariants(true);

    let cancelled = false;

    isValidWord(dictionaryId, text).then((isValid) => {
      if (!cancelled) {
        setWordExists(isValid);
      }
    });

    return () => {
      cancelled = true;
    };
  }, [entryResult, checkedVariants]);

  // cache invalidation
  useEffect(() => {
    setCheckedVariants(false);
  }, [entryResult]);

  const close = () => {
    setOpen(false);
    triggerRef.current?.close();
  };

  return (
    <DropDownPrimitive.Root>
      <DropDownPrimitive.Trigger
        ref={triggerRef}
        onPress={() => setOpen(true)}
        style={theme.styles.scannedTextPresable}
      >
        <Span
          numberOfLines={1}
          style={[
            theme.styles.scanText,
            theme.styles.scanWordText,
            open && theme.styles.scanTextActive,
            underlineStyles,
          ]}
        >
          {text}
        </Span>
      </DropDownPrimitive.Trigger>

      {open && (
        <DefinitionsPopover
          text={text}
          entryResult={entryResult}
          generateExample={() =>
            generateExample(excerptText, excerptIndex, text)
          }
          close={close}
        />
      )}
    </DropDownPrimitive.Root>
  );
}

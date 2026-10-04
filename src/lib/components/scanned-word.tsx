import { useMemo, useRef, useState } from "react";
import * as DropDownPrimitive from "@rn-primitives/dropdown-menu";
import { useTheme } from "@/src/lib/contexts/theme-context";
import useWordDefinitions from "@/src/lib/hooks/use-word-definitions";
import { DefinitionsBubble } from "./definitions/definition-bubbles";
import { Span } from "./text";
import {
  extractParagraph,
  extractSentence,
  extractTrailing,
} from "@/src/lib/text-processing/extract-structures";

type Props = {
  dictionaryId: number;
  text: string;
  lowercase: string;
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
  lowercase,
  excerptText,
  excerptIndex,
}: Props) {
  const theme = useTheme();
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<DropDownPrimitive.TriggerRef | null>(null);

  const wordDeps = useMemo(() => [lowercase], [lowercase]);
  const definitionMap = useWordDefinitions(dictionaryId, wordDeps);
  const definitionData = definitionMap[lowercase];
  const definitionResult = definitionData && definitionData.definitionsResult;

  const underlineStyles = [theme.styles.scanWord];

  if (definitionResult && definitionResult.definitions.length > 0) {
    underlineStyles.push(theme.styles.scanOldWord);
  } else if (definitionData?.loaded) {
    underlineStyles.push(theme.styles.scanNewWord);
  }

  const close = () => {
    setOpen(false);
    triggerRef.current?.close();
  };

  return (
    <DropDownPrimitive.Root>
      <DropDownPrimitive.Trigger
        ref={triggerRef}
        onPress={() => setOpen(true)}
        style={underlineStyles}
      >
        <Span
          style={[theme.styles.scanText, open && theme.styles.scanTextActive]}
        >
          {text}
        </Span>
      </DropDownPrimitive.Trigger>

      {open && (
        <DefinitionsBubble
          text={text}
          lowercase={lowercase}
          definitionResult={definitionResult}
          generateExample={() =>
            generateExample(excerptText, excerptIndex, text)
          }
          close={close}
        />
      )}
    </DropDownPrimitive.Root>
  );
}

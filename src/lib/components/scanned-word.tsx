import React, { useMemo, useRef, useState } from "react";
import * as DropDownPrimitive from "@rn-primitives/dropdown-menu";
import { useTheme } from "@/src/lib/contexts/theme";
import useWordDefinitions from "@/src/lib/hooks/use-word-definitions";
import { DefinitionsBubble } from "./definitions/definition-bubbles";
import { Span } from "./text";

type Props = { dictionaryId: number; text: string; lowercase: string };

export default function ScannedWord({ dictionaryId, text, lowercase }: Props) {
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
          close={close}
        />
      )}
    </DropDownPrimitive.Root>
  );
}

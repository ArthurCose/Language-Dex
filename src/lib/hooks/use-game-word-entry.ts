import { useMemo } from "react";
import { GameWord } from "../data";
import { normalize } from "../text-processing/normalization";
import useWordEntries from "./use-word-entries";

export function useGameWordEntry(dictionaryId: number, gameWord?: GameWord) {
  const normalizedWord =
    gameWord != undefined ? normalize(gameWord.spelling) : undefined;

  const normalizedWords = useMemo(() => {
    if (normalizedWord == null) {
      return [];
    }

    return [normalizedWord];
  }, [normalizedWord]);

  const entryMap = useWordEntries(dictionaryId, normalizedWords);

  if (!gameWord || normalizedWord == null) {
    return;
  }

  return entryMap[normalizedWord]?.result?.entries.find(
    (entry) =>
      entry.spelling == gameWord.spelling &&
      entry.orderKey == gameWord.orderKey,
  );
}

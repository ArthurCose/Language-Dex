import { GameWord } from "../data";
import { DictionaryEntryMap } from "../hooks/use-word-entries";
import { normalize } from "../text-processing/normalization";

export function getEntryFromMap(
  entryMap: DictionaryEntryMap,
  gameWord: GameWord,
) {
  return entryMap[normalize(gameWord.spelling)]?.result?.entries.find(
    (entry) =>
      entry.spelling == gameWord.spelling &&
      entry.orderKey == gameWord.orderKey,
  );
}

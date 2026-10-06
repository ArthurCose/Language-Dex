import { GameWord } from "../data";
import { DictionaryEntryMap } from "../hooks/use-word-entries";

export function getEntryFromMap(
  entryMap: DictionaryEntryMap,
  gameWord: GameWord,
) {
  return entryMap[gameWord.spelling.toLowerCase()]?.result?.entries[
    gameWord.orderKey
  ];
}

import { GameWord } from "../data";
import { DefinitionMap } from "../hooks/use-word-definitions";

export function getDefinition(
  definitionMap: DefinitionMap,
  gameWord: GameWord
) {
  return definitionMap[gameWord.spelling.toLowerCase()]?.definitionsResult
    ?.definitions[gameWord.orderKey];
}

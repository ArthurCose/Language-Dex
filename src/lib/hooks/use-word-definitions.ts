import { useEffect, useMemo, useState } from "react";
import { getWordDefinitions, WordDefinitionData } from "../data";
import { logError } from "../log";
import { Signal, useSignalValue } from "./use-signal";

type WordDefinitionState = {
  loaded: boolean;
  definitionsResult?: {
    spelling: string;
    definitions: WordDefinitionData[];
  };
  versionSignal: Signal<number>;
};

export type DefinitionMap = {
  [lowerCaseWord: string]: WordDefinitionState | undefined;
};

const cache: { [dictionary: number]: DefinitionMap | undefined } = {};

let definitionVersionCounter = 0;

function fetchDefinition(
  dictionaryId: number,
  lowerCaseWord: string,
  cachedWord: WordDefinitionState
) {
  // fetch definitions
  return getWordDefinitions(dictionaryId, lowerCaseWord).then((result) => {
    cachedWord.loaded = true;
    cachedWord.definitionsResult = result;

    definitionVersionCounter += 1;
    cachedWord.versionSignal.set(definitionVersionCounter);
  });
}

export default function useWordDefinitions(
  dictionaryId: number,
  lowerCaseWords: string[]
): DefinitionMap {
  // only using this state to drive updates
  const [_, setVersion] = useState(definitionVersionCounter);

  if (!cache[dictionaryId]) {
    cache[dictionaryId] = {};
  }

  useEffect(() => {
    const definitionMap = cache[dictionaryId]!;

    for (const word of lowerCaseWords) {
      let cachedWord = definitionMap[word];

      if (!cachedWord) {
        // add to cache
        cachedWord = {
          loaded: false,
          versionSignal: new Signal(definitionVersionCounter),
        };

        // fetch definitions
        fetchDefinition(dictionaryId, word, cachedWord).catch(logError);

        definitionMap[word] = cachedWord;
      }

      // subscribe
      cachedWord.versionSignal.subscribe(setVersion);
    }

    return () => {
      // unsubscribe
      for (const word of lowerCaseWords) {
        const cachedWord = definitionMap[word];

        if (cachedWord) {
          cachedWord.versionSignal.unsubscribe(setVersion);
        }
      }

      // use a microtask to prevent delete + refetch
      // from slightly updating the word list as the only subscriber
      queueMicrotask(() => {
        for (const word of lowerCaseWords) {
          const cachedWord = definitionMap[word];

          if (!cachedWord) {
            continue;
          }

          if (cachedWord.versionSignal.subscriptionCount() == 0) {
            delete definitionMap[word];
          }
        }
      });
    };
  }, [dictionaryId, lowerCaseWords]);

  return cache[dictionaryId];
}

export function useWordDefinition(
  dicitonaryId: number,
  lowerCaseWord?: string,
  definitionId?: number
): [boolean, WordDefinitionData?] {
  const words = useMemo(
    () => (lowerCaseWord != undefined ? [lowerCaseWord] : []),
    [lowerCaseWord]
  );
  const definitionMap = useWordDefinitions(dicitonaryId, words);

  if (lowerCaseWord == undefined || definitionId == undefined) {
    return [true];
  }

  const wordState = definitionMap[lowerCaseWord];

  if (!wordState) {
    return [false];
  }

  return [
    wordState.loaded,
    wordState.definitionsResult?.definitions.find((d) => d.id == definitionId),
  ];
}

const dictionaryVersionSignal = new Signal(0);

export function bumpDictionaryVersion() {
  dictionaryVersionSignal.set(dictionaryVersionSignal.get() + 1);
}

export function invalidateWordDefinitions(
  dictionaryId: number,
  lowercaseWord: string
) {
  const definitionMap = cache[dictionaryId];

  if (!definitionMap) {
    return;
  }

  let cachedWord = definitionMap[lowercaseWord];

  if (cachedWord) {
    cachedWord.loaded = false;
    cachedWord.definitionsResult = undefined;
  } else {
    cachedWord = {
      loaded: false,
      versionSignal: new Signal(definitionVersionCounter),
    };
    definitionMap[lowercaseWord] = cachedWord;
  }

  fetchDefinition(dictionaryId, lowercaseWord, cachedWord)
    .then(bumpDictionaryVersion)
    .catch(logError);
}

export function useDictionaryVersioning() {
  return useSignalValue(dictionaryVersionSignal);
}

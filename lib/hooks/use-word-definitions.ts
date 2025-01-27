import { useEffect, useMemo, useState } from "react";
import { getWordDefinitions, WordDefinitionData } from "../data";
import { logError } from "../log";

type Subscription = (version: number) => void;

type WordDefinitionState = {
  loaded: boolean;
  definitionsResult?: {
    spelling: string;
    definitions: WordDefinitionData[];
  };
  subscriptions: Set<Subscription>;
};

export type DefinitionMap = {
  [lowerCaseWord: string]: WordDefinitionState | undefined;
};

const cache: { [dictionary: number]: DefinitionMap | undefined } = {};

let counter = 0;

function fetchDefinition(
  dictionaryId: number,
  lowerCaseWord: string,
  cachedWord: WordDefinitionState
) {
  // fetch definitions
  return getWordDefinitions(dictionaryId, lowerCaseWord).then((result) => {
    cachedWord.loaded = true;
    cachedWord.definitionsResult = result;

    counter += 1;

    for (const callback of cachedWord.subscriptions.values()) {
      callback(counter);
    }
  });
}

export default function useWordDefinitions(
  dictionaryId: number,
  lowerCaseWords: string[]
): DefinitionMap {
  // only using this state to drive updates
  const [_, setVersion] = useState(counter);
  const subscription: Subscription = useMemo(
    () => (count) => setVersion(count),
    []
  );

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
          subscriptions: new Set(),
        };

        // fetch definitions
        fetchDefinition(dictionaryId, word, cachedWord).catch(logError);

        definitionMap[word] = cachedWord;
      }

      // subscribe
      cachedWord.subscriptions.add(subscription);
    }

    return () => {
      // unsubscribe
      for (const word of lowerCaseWords) {
        const cachedWord = definitionMap[word];

        if (cachedWord) {
          cachedWord.subscriptions.delete(subscription);
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

          if (cachedWord.subscriptions.size == 0) {
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

const invalidationListeners = new Set<(v: number) => void>();
let versionCount = 0;

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
    cachedWord = { loaded: false, subscriptions: new Set() };
    definitionMap[lowercaseWord] = cachedWord;
  }

  fetchDefinition(dictionaryId, lowercaseWord, cachedWord)
    .then(() => {
      versionCount++;

      for (const setState of invalidationListeners.values()) {
        setState(versionCount);
      }
    })
    .catch(logError);
}

export function useDictionaryVersioning() {
  const [version, setState] = useState(versionCount);

  useEffect(() => {
    invalidationListeners.add(setState);

    return () => {
      invalidationListeners.delete(setState);
    };
  }, []);

  return version;
}

import { useEffect, useMemo, useState } from "react";
import { getWordEntries, DictionaryEntry } from "../data";
import { logError } from "../log";
import { Signal, useSignalValue } from "./use-signal";
import { normalize } from "../text-processing/normalization";

type WordEntryState = {
  loaded: boolean;
  result?: {
    spellings: string[];
    entries: DictionaryEntry[];
  };
  revisionSignal: Signal<number>;
};

export type DictionaryEntryMap = {
  [normalizedWord: string]: WordEntryState | undefined;
};

const cache: { [dictionary: number]: DictionaryEntryMap | undefined } = {};

let entryRevisionCounter = 0;

function fetchEntries(
  dictionaryId: number,
  normalizedWord: string,
  cachedWord: WordEntryState,
) {
  // fetch entries
  return getWordEntries(dictionaryId, normalizedWord).then((result) => {
    cachedWord.loaded = true;
    cachedWord.result = result;

    entryRevisionCounter += 1;
    cachedWord.revisionSignal.set(entryRevisionCounter);
  });
}

export default function useWordEntries(
  dictionaryId: number,
  normalizedWords: string[],
): DictionaryEntryMap {
  // only using this state to drive updates
  const [_, setRevision] = useState(entryRevisionCounter);

  if (!cache[dictionaryId]) {
    cache[dictionaryId] = {};
  }

  useEffect(() => {
    const entryMap = cache[dictionaryId]!;

    for (const word of normalizedWords) {
      let cachedWord = entryMap[word];

      if (!cachedWord) {
        // add to cache
        cachedWord = {
          loaded: false,
          revisionSignal: new Signal(entryRevisionCounter),
        };

        // fetch entries
        fetchEntries(dictionaryId, word, cachedWord).catch(logError);

        entryMap[word] = cachedWord;
      }

      // subscribe
      cachedWord.revisionSignal.subscribe(setRevision);
    }

    return () => {
      // unsubscribe
      for (const word of normalizedWords) {
        const cachedWord = entryMap[word];

        if (cachedWord) {
          cachedWord.revisionSignal.unsubscribe(setRevision);
        }
      }

      // use a microtask to prevent delete + refetch
      // from slightly updating the word list as the only subscriber
      queueMicrotask(() => {
        for (const word of normalizedWords) {
          const cachedWord = entryMap[word];

          if (!cachedWord) {
            continue;
          }

          if (cachedWord.revisionSignal.subscriptionCount() == 0) {
            delete entryMap[word];
          }
        }
      });
    };
  }, [dictionaryId, normalizedWords]);

  return cache[dictionaryId];
}

export function useWordEntry(
  dicitonaryId: number,
  normalizedWord?: string,
  entryId?: number,
): [boolean, DictionaryEntry?] {
  const words = useMemo(
    () => (normalizedWord != undefined ? [normalizedWord] : []),
    [normalizedWord],
  );
  const entryMap = useWordEntries(dicitonaryId, words);

  if (normalizedWord == undefined || entryId == undefined) {
    return [true];
  }

  const wordState = entryMap[normalizedWord];

  if (!wordState) {
    return [false];
  }

  return [
    wordState.loaded,
    wordState.result?.entries.find((d) => d.id == entryId),
  ];
}

const dictionaryRevisionSignal = new Signal(0);

export function bumpDictionaryRevision() {
  dictionaryRevisionSignal.set(dictionaryRevisionSignal.get() + 1);
}

export function invalidateWordEntries(dictionaryId: number, word: string) {
  const entryMap = cache[dictionaryId];

  if (!entryMap) {
    return;
  }

  const normalizedWord = normalize(word);
  let cachedWord = entryMap[normalizedWord];

  if (cachedWord) {
    cachedWord.loaded = false;
    cachedWord.result = undefined;
  } else {
    cachedWord = {
      loaded: false,
      revisionSignal: new Signal(entryRevisionCounter),
    };
    entryMap[normalizedWord] = cachedWord;
  }

  fetchEntries(dictionaryId, normalizedWord, cachedWord)
    .then(bumpDictionaryRevision)
    .catch(logError);
}

export function useDictionaryRevision() {
  return useSignalValue(dictionaryRevisionSignal);
}

export function useDictionaryRevisionSignal() {
  return dictionaryRevisionSignal;
}

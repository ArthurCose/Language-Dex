import { useEffect, useMemo, useState } from "react";
import { getWordEntries, DictionaryEntry } from "../data";
import { logError } from "../log";
import { Signal, useSignalValue } from "./use-signal";

type WordEntryState = {
  loaded: boolean;
  result?: {
    spelling: string;
    entries: DictionaryEntry[];
  };
  versionSignal: Signal<number>;
};

export type DictionaryEntryMap = {
  [lowerCaseWord: string]: WordEntryState | undefined;
};

const cache: { [dictionary: number]: DictionaryEntryMap | undefined } = {};

let entryVersionCounter = 0;

function fetchEntries(
  dictionaryId: number,
  lowerCaseWord: string,
  cachedWord: WordEntryState,
) {
  // fetch entries
  return getWordEntries(dictionaryId, lowerCaseWord).then((result) => {
    cachedWord.loaded = true;
    cachedWord.result = result;

    entryVersionCounter += 1;
    cachedWord.versionSignal.set(entryVersionCounter);
  });
}

export default function useWordEntries(
  dictionaryId: number,
  lowerCaseWords: string[],
): DictionaryEntryMap {
  // only using this state to drive updates
  const [_, setVersion] = useState(entryVersionCounter);

  if (!cache[dictionaryId]) {
    cache[dictionaryId] = {};
  }

  useEffect(() => {
    const entryMap = cache[dictionaryId]!;

    for (const word of lowerCaseWords) {
      let cachedWord = entryMap[word];

      if (!cachedWord) {
        // add to cache
        cachedWord = {
          loaded: false,
          versionSignal: new Signal(entryVersionCounter),
        };

        // fetch entries
        fetchEntries(dictionaryId, word, cachedWord).catch(logError);

        entryMap[word] = cachedWord;
      }

      // subscribe
      cachedWord.versionSignal.subscribe(setVersion);
    }

    return () => {
      // unsubscribe
      for (const word of lowerCaseWords) {
        const cachedWord = entryMap[word];

        if (cachedWord) {
          cachedWord.versionSignal.unsubscribe(setVersion);
        }
      }

      // use a microtask to prevent delete + refetch
      // from slightly updating the word list as the only subscriber
      queueMicrotask(() => {
        for (const word of lowerCaseWords) {
          const cachedWord = entryMap[word];

          if (!cachedWord) {
            continue;
          }

          if (cachedWord.versionSignal.subscriptionCount() == 0) {
            delete entryMap[word];
          }
        }
      });
    };
  }, [dictionaryId, lowerCaseWords]);

  return cache[dictionaryId];
}

export function useWordEntry(
  dicitonaryId: number,
  lowerCaseWord?: string,
  entryId?: number,
): [boolean, DictionaryEntry?] {
  const words = useMemo(
    () => (lowerCaseWord != undefined ? [lowerCaseWord] : []),
    [lowerCaseWord],
  );
  const entryMap = useWordEntries(dicitonaryId, words);

  if (lowerCaseWord == undefined || entryId == undefined) {
    return [true];
  }

  const wordState = entryMap[lowerCaseWord];

  if (!wordState) {
    return [false];
  }

  return [
    wordState.loaded,
    wordState.result?.entries.find((d) => d.id == entryId),
  ];
}

const dictionaryVersionSignal = new Signal(0);

export function bumpDictionaryVersion() {
  dictionaryVersionSignal.set(dictionaryVersionSignal.get() + 1);
}

export function invalidateWordEntries(
  dictionaryId: number,
  lowerCaseWord: string,
) {
  const entryMap = cache[dictionaryId];

  if (!entryMap) {
    return;
  }

  let cachedWord = entryMap[lowerCaseWord];

  if (cachedWord) {
    cachedWord.loaded = false;
    cachedWord.result = undefined;
  } else {
    cachedWord = {
      loaded: false,
      versionSignal: new Signal(entryVersionCounter),
    };
    entryMap[lowerCaseWord] = cachedWord;
  }

  fetchEntries(dictionaryId, lowerCaseWord, cachedWord)
    .then(bumpDictionaryVersion)
    .catch(logError);
}

export function useDictionaryVersioning() {
  return useSignalValue(dictionaryVersionSignal);
}

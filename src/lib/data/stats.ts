import db from "./db";
import { log } from "../log";
import { UserData } from "./user";
import { DictionaryData } from "./dictionary-meta";
import { maxConfidence } from "./dictionary-words";

export type DictionaryWordStatKey =
  | "definitions"
  | "documentedMaxConfidence"
  | "totalExamples"
  | "totalPronounced";

export type DictionaryStats = {
  // scans
  wordsScanned?: number;
  totalScans?: number;
  // practice
  definitionsMatched?: number;
  definitionMatchBest?: { [mode: string]: number };
  unscrambled?: number;
  unscrambleBest?: { [mode: string]: number };
  wordsGuessed?: number;
  crosswordsCompleted?: number;
  wordSearchPuzzlesCompleted?: number;
  correctShortAnswers?: number;
  sentencesConstructed?: number;
  // words
  definitions?: number;
  documentedMaxConfidence?: number;
  totalExamples?: number;
  totalPronounced?: number;
};

export type OverallStats = {
  // misc
  totalPats?: number;
} & DictionaryStats;

export const negatableStats: (keyof DictionaryStats)[] = [
  "definitions",
  "documentedMaxConfidence",
  "totalExamples",
  "totalPronounced",
];

// shallow clone userData, userData.dictionaries, and the active dictionary in the dictionary list
export function prepareDictionaryUpdate(
  userData: UserData,
  dictionaryId?: number,
): [UserData, DictionaryData] {
  dictionaryId = dictionaryId ?? userData.activeDictionary;

  userData = { ...userData };
  userData.dictionaries = [...userData.dictionaries];
  const dictionaryIndex = userData.dictionaries.findIndex(
    (d) => d.id == dictionaryId,
  );

  const updatedDictionary = { ...userData.dictionaries[dictionaryIndex] };
  userData.dictionaries[dictionaryIndex] = updatedDictionary;

  return [userData, updatedDictionary];
}

export function updateStatistics(
  data: UserData,
  callback: (stats: DictionaryStats) => void,
): UserData {
  let dictionary;
  [data, dictionary] = prepareDictionaryUpdate(data);

  // update overall stats
  data.stats = { ...data.stats };
  callback(data.stats);

  // update stats on the active dictionary
  dictionary.stats = { ...dictionary.stats };
  callback(dictionary.stats);

  return data;
}

export function resolveStatIncrease(
  hasNow: boolean,
  hadBefore: boolean,
): number {
  if (hasNow == hadBefore) {
    // didn't change
    return 0;
  }

  // either hasNow or hadBefore is true, and the other is false
  return hasNow ? 1 : -1;
}

export async function recalculateWordStatistics(data: UserData) {
  log("Recalculating Word Statistics...");

  const startTime = performance.now();

  data.stats = {
    ...data.stats,
    definitions: 0,
    documentedMaxConfidence: 0,
    totalExamples: 0,
    totalPronounced: 0,
  };

  for (let i = 0; i < data.dictionaries.length; i++) {
    const dictionary = { ...data.dictionaries[i] };
    data.dictionaries[i] = dictionary;

    dictionary.stats = {
      ...dictionary.stats,
      definitions: 0,
      documentedMaxConfidence: 0,
      totalExamples: 0,
      totalPronounced: 0,
    };

    const confidenceResult = await db.getFirstAsync<{ [key: string]: number }>(
      "SELECT COUNT(*) FROM word_definition_data WHERE dictionaryId = $id AND confidence = $maxConfidence",
      {
        $maxConfidence: maxConfidence,
        $id: dictionary.id,
      },
    );
    const exampleResult = await db.getFirstAsync<{ [key: string]: number }>(
      "SELECT COUNT(*) FROM word_definition_data WHERE dictionaryId = $id AND example != ''",
      { $id: dictionary.id },
    );
    const result = await db.getFirstAsync<{ [key: string]: number }>(
      "SELECT COUNT(*), COUNT(pronunciationAudio) FROM word_definition_data WHERE dictionaryId = $id",
      { $id: dictionary.id },
    );

    if (!result) {
      continue;
    }

    const changeList: [DictionaryWordStatKey, number][] = [
      ["definitions", result["COUNT(*)"]],
      ["documentedMaxConfidence", confidenceResult?.["COUNT(*)"] ?? 0],
      ["totalExamples", exampleResult?.["COUNT(*)"] ?? 0],
      ["totalPronounced", result["COUNT(pronunciationAudio)"]],
    ];

    for (const [key, n] of changeList) {
      data.stats[key]! += n;
      dictionary.stats[key]! += n;
    }
  }

  data.updatingStats = false;
  log(`Recalculation completed in ${performance.now() - startTime}ms`);
}

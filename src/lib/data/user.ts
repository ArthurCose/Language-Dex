import * as FileSystem from "expo-file-system/legacy";
import { FILE_OBJECT_DIR, loadFileObject, saveFileObject } from "./files";
import { dataRevisions, migrateUp } from "./migrations";
import { DictionaryData } from "./dictionary-meta";
import { WordOrder } from "./dictionary-words";
import { OverallStats, recalculateWordStatistics } from "./stats";

export type UserData = {
  version: number;
  completedTutorial?: boolean;
  removeAds?: boolean;
  home?: string;
  dictionaryOrder?: WordOrder;
  theme?: string;
  colorScheme?: "dark" | "light";
  disabledFeatures: {
    confidence?: boolean;
    pronunciationAudio?: boolean;
    relation?: boolean;
  };
  points: number;
  stats: OverallStats;
  updatingStats?: boolean;
  activeDictionary: number;
  dictionaries: DictionaryData[];
  nextDictionaryId: number;
};

export async function loadUserData(
  translate: (s: string) => string,
): Promise<UserData> {
  let data: UserData;

  try {
    data = (await loadFileObject("user")) as UserData;
  } catch {
    data = {
      version: dataRevisions,
      disabledFeatures: {},
      points: 0,
      stats: {},
      activeDictionary: 0,
      dictionaries: [
        {
          id: 0,
          name: translate("default_dictionary_name"),
          partsOfSpeech: [],
          nextPartOfSpeechId: 0,
          stats: {},
        },
      ],
      nextDictionaryId: 1,
    };

    await FileSystem.makeDirectoryAsync(FILE_OBJECT_DIR);
    await saveUserData(data);
  }

  if (await migrateUp(data)) {
    await saveUserData(data);
  }

  if (data.updatingStats) {
    // must come after migrations, as migrations can request a stat update
    await recalculateWordStatistics(data);
    await saveUserData(data);
  }

  return data;
}

export function saveUserData(data: UserData) {
  return saveFileObject("user", data);
}

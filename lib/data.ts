import uuid from "uuid";
import * as FileSystem from "expo-file-system";
import * as SQLite from "expo-sqlite";
import { logError } from "./log";
import Unistring from "@akahuku/unistring";

type FileName = string;

export type DictionaryStats = {
  earnedPoints?: number;
  wordsScanned?: number;
  totalScans?: number;
  definitionsMatched?: number;
  definitionMatchBest?: { [mode: string]: number };
  definitions?: number;
  documentedMaxConfidence?: number;
  totalImages?: number;
  totalPronounced?: number;
  totalWords?: number;
};

export const negatableStats: (keyof DictionaryStats)[] = [
  "definitions",
  "documentedMaxConfidence",
  "totalImages",
  "totalPronounced",
  "totalWords",
];

export type PartOfSpeechData = { id: number; name: string };

export type DictionaryData = {
  name: string;
  id: number;
  partsOfSpeech: PartOfSpeechData[];
  nextPartOfSpeechId: number;
  stats: DictionaryStats;
};

export function namePartOfSpeech(
  dictionary: DictionaryData | undefined,
  id?: number
) {
  if (id == undefined) {
    return;
  }

  return dictionary?.partsOfSpeech.find((p) => p.id == id)?.name;
}

export type UserData = {
  version: number;
  theme?: string;
  colorScheme?: "dark" | "light";
  disabledFeatures: {
    confidence?: boolean;
    pronunciationAudio?: boolean;
    images?: boolean;
    relation?: boolean;
  };
  points: number;
  stats: DictionaryStats;
  activeDictionary: number;
  dictionaries: DictionaryData[];
  nextDictionaryId: number;
};

// shallow clone userData, userData.dictionaries, and the active dictionary in the dictionary list
export function prepareDictionaryUpdate(
  userData: UserData,
  dictionaryId?: number
): [UserData, DictionaryData] {
  dictionaryId = dictionaryId ?? userData.activeDictionary;

  userData = { ...userData };
  userData.dictionaries = [...userData.dictionaries];
  const dictionaryIndex = userData.dictionaries.findIndex(
    (d) => d.id == dictionaryId
  );

  const updatedDictionary = { ...userData.dictionaries[dictionaryIndex] };
  userData.dictionaries[dictionaryIndex] = updatedDictionary;

  return [userData, updatedDictionary];
}

export function updateStatistics(
  data: UserData,
  callback: (stats: DictionaryStats) => void
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

export type WordDefinitionData = {
  id: number;
  orderKey: number;
  confidence: number;
  partOfSpeech?: number;
  pronunciationAudio?: FileName;
  definition: string;
  example: string;
  notes: string;
  images: FileName[];
  createdAt: number;
  updatedAt: number;
};

type WordDefinitionUpsertData = Omit<
  WordDefinitionData,
  "id" | "createdAt" | "updatedAt" | "orderKey"
> & { id?: number };

const IS_SYNONYM = 0;

// local database operations

let db: SQLite.SQLiteDatabase | undefined;

async function initDb() {
  if (!db) {
    db = await SQLite.openDatabaseAsync("db");
  }

  await db.execAsync(`
PRAGMA journal_mode = WAL;

CREATE TABLE IF NOT EXISTS word_shared_data (
  id                  INTEGER PRIMARY KEY NOT NULL,
  dictionaryId        INTEGER NOT NULL,
  spelling            TEXT NOT NULL,
  insensitiveSpelling TEXT NOT NULL,
  graphemeCount       TEXT NOT NULL,
  scanCount           INTEGER NOT NULL,
  minConfidence       REAL NOT NULL,
  createdAt           INTEGER NOT NULL,
  updatedAt           INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS word_shared_data_index ON word_shared_data(
  dictionaryId,
  spelling,
  graphemeCount,
  minConfidence,
  updatedAt
);

CREATE TABLE IF NOT EXISTS word_definition_data (
  id                    INTEGER PRIMARY KEY NOT NULL,
  dictionaryId          INTEGER NOT NULL,
  sharedId              INTEGER NOT NULL REFERENCES word_shared_data(id),
  orderKey              INTEGER NOT NULL,
  confidence            INTEGER NOT NULL,
  partOfSpeech          INTEGER,
  pronunciationAudio    TEXT,
  definition            TEXT NOT NULL,
  example               TEXT NOT NULL,
  notes                 TEXT NOT NULL,
  images                TEXT NOT NULL,
  synonymsAndAntonymsId INTEGER,
  createdAt             INTEGER NOT NULL,
  updatedAt             INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS word_definition_data_index ON word_definition_data(dictionaryId, sharedId);

CREATE TABLE IF NOT EXISTS word_synonyms_and_antonyms (
  groupId          INTEGER NOT NULL,
  wordDefinitionId INTEGER NOT NULL REFERENCES word_definition_data(id) ON DELETE CASCADE,
  type             INTEGER
);
CREATE INDEX IF NOT EXISTS word_synonyms_and_antonyms_index ON word_synonyms_and_antonyms(groupId);

CREATE TABLE IF NOT EXISTS scan_history (
  id            INTEGER PRIMARY KEY NOT NULL,
  dictionaryId  INTEGER NOT NULL,
  text          TEXT NOT NULL,
  createdAt     INTEGER NOT NULL
);
`);
}

function packFileList(list: FileName[]): string {
  return list.join(",");
}

function unpackFileList(s: string): FileName[] {
  if (!s) {
    return [];
  }

  return s.split(",");
}

export async function deleteDictionary(id: number) {
  if (!db) {
    throw new Error("DB closed");
  }

  // delete associated files
  const results = db.getEachAsync<{
    pronunciationAudio?: string | null;
    images: string;
  }>(
    "SELECT pronunciationAudio,images FROM word_definition_data WHERE dictionaryId = $dictionaryId",
    {
      $dictionaryId: id,
    }
  );

  for await (const row of results) {
    const promises = [];

    if (row.pronunciationAudio != undefined) {
      promises.push(deleteFileObject(row.pronunciationAudio));
    }

    for (const path of unpackFileList(row.images)) {
      promises.push(deleteFileObject(path));
    }

    await Promise.all(promises);
  }

  // delete words
  await db.runAsync(
    "DELETE FROM word_definition_data WHERE dictionaryId = $dictionaryId",
    { $dictionaryId: id }
  );
  await db.runAsync(
    "DELETE FROM word_shared_data WHERE dictionaryId = $dictionaryId",
    { $dictionaryId: id }
  );
  await db.runAsync(
    "DELETE FROM scan_history WHERE dictionaryId = $dictionaryId",
    { $dictionaryId: id }
  );
}

export async function deletePartOfSpeech(
  dictionaryId: number,
  partOfSpeech: number
) {
  if (!db) {
    throw new Error("DB closed");
  }

  await db.runAsync(
    "UPDATE word_definition_data SET partOfSpeech = NULL WHERE dictionaryId = $dictionaryId AND partOfSpeech = $partOfSpeech",
    { $dictionaryId: dictionaryId, $partOfSpeech: partOfSpeech }
  );
}

export type WordOrder = "alphabetical" | "latest" | "confidence" | "longest";

export type GameWord = {
  spelling: string;
  orderKey: number;
};

export async function listGameWords(dictionaryId: number) {
  if (!db) {
    throw new Error("DB closed");
  }

  // build query
  const query = [
    "SELECT spelling, orderKey FROM word_definition_data word_def",
    "INNER JOIN word_shared_data word ON word_def.sharedId = word.id",
    "WHERE word_def.dictionaryId = $dictionaryId",
    "ORDER BY word_def.confidence ASC, word_def.createdAt DESC",
  ];

  return await db.getAllAsync<{ spelling: string; orderKey: number }>(
    query.join(" "),
    { $dictionaryId: dictionaryId }
  );
}

export async function listWords(
  dictionaryId: number,
  ascending: boolean,
  orderBy: WordOrder,
  partOfSpeech?: number
) {
  if (!db) {
    throw new Error("DB closed");
  }

  // build query
  const query = ["SELECT spelling FROM word_shared_data word"];

  if (partOfSpeech != undefined) {
    query.push(
      "INNER JOIN word_definition_data ON word_definition_data.sharedId = word.id"
    );
  }

  query.push("WHERE word.dictionaryId = $dictionaryId");

  if (partOfSpeech != undefined) {
    query.push("AND word_definition_data.partOfSpeech = $partOfSpeech");
  }

  let ordering = "DESC";
  let invOrdering = "ASC";

  if (ascending) {
    ordering = "ASC";
    invOrdering = "DESC";
  }

  switch (orderBy) {
    case "confidence":
      query.push(
        `ORDER BY word.minConfidence ${ordering}, word.createdAt ${invOrdering}`
      );
      break;
    case "latest":
      query.push(`ORDER BY word.createdAt ${ordering}`);
      break;
    case "longest":
      query.push(
        `ORDER BY word.graphemeCount ${ordering}, word.spelling ${ordering}`
      );
      break;
    default:
      query.push(`ORDER BY word.spelling ${ordering}`);
  }

  // build bind params
  const bindParams: SQLite.SQLiteBindParams = { $dictionaryId: dictionaryId };

  if (partOfSpeech != undefined) {
    bindParams.$partOfSpeech = partOfSpeech;
  }

  const results = db.getEachAsync<{ spelling: string }>(
    query.join(" "),
    bindParams
  );

  const output: string[] = [];

  for await (const row of results) {
    output.push(row.spelling);
  }

  return output;
}

export async function getWordDefinitions(
  dictionaryId: number,
  lowerCaseSpelling: string
) {
  const definitions: WordDefinitionData[] = [];

  if (!db) {
    throw new Error("DB closed");
  }

  const wordResult = await db.getFirstAsync<{ id: number; spelling: string }>(
    "SELECT id, spelling FROM word_shared_data WHERE dictionaryId = $dictionaryId AND insensitiveSpelling = $spelling",
    { $dictionaryId: dictionaryId, $spelling: lowerCaseSpelling }
  );

  if (!wordResult) {
    return;
  }

  type Row = {
    id: number;
    orderKey: number;
    confidence: number;
    partOfSpeech?: number;
    pronunciationAudio?: string;
    definition: string;
    example: string;
    notes: string;
    images: string;
    createdAt: number;
    updatedAt: number;
  };

  const results = db.getEachAsync<Row>(
    "SELECT * FROM word_definition_data WHERE sharedId = $id",
    {
      $id: wordResult.id,
    }
  );

  for await (const row of results) {
    definitions.push({
      id: row.id,
      orderKey: row.orderKey,
      confidence: row.confidence,
      partOfSpeech: row.partOfSpeech,
      pronunciationAudio: row.pronunciationAudio,
      definition: row.definition,
      example: row.example,
      notes: row.notes,
      images: unpackFileList(row.images),
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    });
  }

  definitions.sort((a, b) => a.orderKey - b.orderKey);

  return { spelling: wordResult.spelling, definitions };
}

async function getOrCreateWordId(
  dictionaryId: number,
  word: string,
  options?: { confidence: number; time: number }
) {
  if (!db) {
    throw new Error("DB closed");
  }

  const lowerCaseWord = word.toLowerCase();

  const wordRow = await db.getFirstAsync<{ id: number }>(
    "SELECT id FROM word_shared_data WHERE insensitiveSpelling = $lowerCase AND dictionaryId = $dictionaryId",
    {
      $lowerCase: lowerCaseWord,
      $dictionaryId: dictionaryId,
    }
  );

  if (wordRow) {
    return wordRow.id;
  }

  const keys = [
    "dictionaryId",
    "spelling",
    "insensitiveSpelling",
    "graphemeCount",
    "scanCount",
    "minConfidence",
    "createdAt",
    "updatedAt",
  ];

  const time = options?.time ?? Date.now();

  const result = await db.runAsync(
    [
      "INSERT INTO word_shared_data (",
      keys.join(", "),
      ") VALUES (",
      keys.map((k) => "$" + k).join(", "),
      ")",
    ].join(""),
    {
      $dictionaryId: dictionaryId,
      $spelling: word,
      $insensitiveSpelling: lowerCaseWord,
      $graphemeCount: Unistring(lowerCaseWord).length,
      $scanCount: 0,
      $minConfidence: options?.confidence ?? 0,
      $createdAt: time,
      $updatedAt: time,
    }
  );

  return result.lastInsertRowId;
}

async function updateSharedData(sharedId: number) {
  if (!db) {
    throw new Error("DB closed");
  }

  const result = await db.getFirstAsync<{ "MIN(confidence)": number }>(
    "SELECT MIN(confidence) FROM word_definition_data WHERE sharedId = $sharedId",
    { $sharedId: sharedId }
  );

  await db.runAsync(
    "UPDATE word_shared_data SET minConfidence = $minConfidence WHERE id = $id",
    {
      $id: sharedId,
      $minConfidence: result?.["MIN(confidence)"] ?? 0,
    }
  );
}

async function resolveNewOrderKey(sharedId: number) {
  if (!db) {
    throw new Error("DB closed");
  }

  const countResult = await db.getFirstAsync<{ "COUNT(*)": number }>(
    "SELECT COUNT(*) FROM word_definition_data WHERE sharedId = $sharedId",
    { $sharedId: sharedId }
  );

  return countResult?.["COUNT(*)"] ?? 0;
}

export async function upsertDefinition(
  dictionaryId: number,
  word: string,
  definition: WordDefinitionUpsertData
) {
  if (!db) {
    throw new Error("DB closed");
  }

  const time = Date.now();

  const copyList: (keyof WordDefinitionUpsertData)[] = [
    "confidence",
    "partOfSpeech",
    "pronunciationAudio",
    "definition",
    "example",
    "notes",
    "images",
  ];

  const setList = ["sharedId", "updatedAt"];
  const params: SQLite.SQLiteBindParams = {
    $updatedAt: time,
  };

  // copy values from definition data into params and append to the set list
  for (const key of copyList) {
    let value = definition[key];

    if (value == undefined) {
      continue;
    }

    if (Array.isArray(value)) {
      value = packFileList(value);
    }

    params["$" + key] = value;
    setList.push(key);
  }

  const sharedId = await getOrCreateWordId(dictionaryId, word, {
    confidence: definition.confidence,
    time,
  });
  params.$sharedId = sharedId;

  if (definition.id != undefined) {
    // fetch old sharedId to see if we switched words
    const oldDataResult = await db.getFirstAsync<{
      sharedId: number;
      orderKey: number;
    }>("SELECT sharedId,orderKey FROM word_definition_data WHERE id = $id", {
      $id: definition.id,
    });

    // update
    params.$id = definition.id;

    if (oldDataResult) {
      setList.push("orderKey");
      params.$orderKey = await resolveNewOrderKey(oldDataResult.sharedId);
    }

    await db.runAsync(
      [
        "UPDATE word_definition_data SET",
        setList.map((k) => k + " = $" + k).join(", "),
        "WHERE id = $id",
      ].join(" "),
      params
    );

    // update old shared data to complete switching words
    if (oldDataResult) {
      await shiftOrderKeys(oldDataResult.sharedId, oldDataResult.orderKey);
      await updateSharedData(oldDataResult.sharedId);
    }

    // update current shared data
    await updateSharedData(sharedId);

    return definition.id;
  } else {
    // copy properties only required by inserting
    setList.push("dictionaryId", "sharedId", "createdAt", "orderKey");
    params.$dictionaryId = dictionaryId;
    params.$createdAt = time;
    params.$orderKey = await resolveNewOrderKey(sharedId);

    const result = await db.runAsync(
      [
        "INSERT INTO word_definition_data (",
        setList.join(", "),
        ") VALUES (",
        setList.map((k) => "$" + k).join(", "),
        ")",
      ].join(" "),
      params
    );

    return result.lastInsertRowId;
  }
}

export async function updateDefinitionOrderKey(id: number, orderKey: number) {
  if (!db) {
    throw new Error("DB closed");
  }

  await db.runAsync(
    "UPDATE word_definition_data SET orderKey = $orderKey WHERE id = $id",
    {
      $id: id,
      $orderKey: orderKey,
    }
  );
}

async function shiftOrderKeys(sharedId: number, greaterThanOrderKey: number) {
  if (!db) {
    throw new Error("DB closed");
  }

  await db.runAsync(
    "UPDATE word_definition_data SET orderKey = orderKey - 1 WHERE sharedId = $sharedId AND orderKey > $orderKey",
    {
      $sharedId: sharedId,
      $orderKey: greaterThanOrderKey,
    }
  );
}

export async function deleteDefinition(id: number) {
  if (!db) {
    throw new Error("DB closed");
  }

  const result = await db.getFirstAsync<{
    sharedId: number;
    orderKey: number;
    pronunciationAudio?: string | null;
    images: string;
  }>(
    "SELECT sharedId,orderKey,pronunciationAudio,images FROM word_definition_data WHERE id = $id",
    {
      $id: id,
    }
  );

  if (!result) {
    return;
  }

  // delete associated files
  if (result.pronunciationAudio != undefined) {
    deleteFileObject(result.pronunciationAudio).catch(logError);
  }

  for (const path of unpackFileList(result.images)) {
    deleteFileObject(path).catch(logError);
  }

  // delete words
  await db.runAsync("DELETE FROM word_definition_data WHERE id = $id", {
    $id: id,
  });

  // update ordering
  await shiftOrderKeys(result.sharedId, result.orderKey);

  await updateSharedData(result.sharedId);
}

function deleteAssociatedFiles(result: {
  pronunciationAudio?: string;
  images: string;
}) {
  // delete associated files
  if (result.pronunciationAudio != undefined) {
    deleteFileObject(result.pronunciationAudio).catch(logError);
  }

  for (const path of unpackFileList(result.images)) {
    deleteFileObject(path).catch(logError);
  }
}

export async function deleteWord(dictionaryId: number, word: string) {
  if (!db) {
    throw new Error("DB closed");
  }

  word = word.toLowerCase();

  const result = await db.getFirstAsync<{ id: number }>(
    "SELECT id FROM word_shared_data WHERE dictionaryId = $dictionaryId AND insensitiveSpelling = $lowerCase",
    { $dictionaryId: dictionaryId, $lowerCase: word }
  );

  if (!result) {
    return;
  }

  const sharedId = result.id;

  const rows = db.getEachAsync<{ pronunciationAudio?: string; images: string }>(
    "SELECT pronunciationAudio,images FROM word_definition_data WHERE sharedId = $sharedId",
    { $sharedId: sharedId }
  );

  for await (const row of rows) {
    deleteAssociatedFiles(row);
  }

  await db.runAsync(
    "DELETE FROM word_definition_data WHERE sharedId = $sharedId",
    { $sharedId: sharedId }
  );

  await db.runAsync("DELETE FROM word_shared_data WHERE id = $id", {
    $id: sharedId,
  });
}

// data in files

export async function loadUserData(
  translate: (s: string) => string
): Promise<UserData> {
  await initDb();

  let data: UserData;

  try {
    data = (await loadFileObject("user")) as UserData;
  } catch {
    data = {
      version: 0,
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

  return data;
}

export function saveUserData(data: UserData) {
  return saveFileObject("user", data);
}

const FILE_OBJECT_DIR = FileSystem.documentDirectory + "file-objects/";

function saveFileObject(id: string, data: any) {
  return FileSystem.writeAsStringAsync(
    FILE_OBJECT_DIR + id,
    JSON.stringify(data)
  );
}

async function saveNewFileObject(data: any) {
  const id = uuid.v4();

  await saveFileObject(id, data);

  return id;
}

async function loadFileObject(id: string): Promise<any> {
  const data = await FileSystem.readAsStringAsync(FILE_OBJECT_DIR + id);

  if (typeof data == "string") {
    return JSON.parse(data);
  }
}

function deleteFileObject(id: string) {
  return FileSystem.deleteAsync(FILE_OBJECT_DIR + id);
}

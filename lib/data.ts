import uuid from "react-native-uuid";
import * as FileSystem from "expo-file-system";
import * as SQLite from "expo-sqlite";
import { logError } from "./log";
import Unistring from "@akahuku/unistring";
import db from "./db";
import * as Sharing from "expo-sharing";
import packageMeta from "../package.json";

type FileName = string;

export type DictionaryStats = {
  // scans
  wordsScanned?: number;
  totalScans?: number;
  // puzzles
  definitionsMatched?: number;
  definitionMatchBest?: { [mode: string]: number };
  unscrambled?: number;
  unscrambleBest?: { [mode: string]: number };
  wordsGuessed?: number;
  crosswordsCompleted?: number;
  // words
  definitions?: number;
  documentedMaxConfidence?: number;
  totalPronounced?: number;
};

export const negatableStats: (keyof DictionaryStats)[] = [
  "definitions",
  "documentedMaxConfidence",
  "totalPronounced",
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
  partOfSpeech?: number | null;
  pronunciationAudio?: FileName;
  definition: string;
  example: string;
  notes: string;
  createdAt: number;
  updatedAt: number;
};

type WordDefinitionUpsertData = Omit<
  WordDefinitionData,
  "id" | "createdAt" | "updatedAt" | "orderKey"
> & { id?: number };

// local database operations

async function initDb() {
  await deleteImportDb();
  await deleteExportDb();

  await db.execAsync(`
PRAGMA journal_mode = WAL;
PRAGMA auto_vacuum = FULL;

CREATE TABLE IF NOT EXISTS word_shared_data (
  id                  INTEGER PRIMARY KEY NOT NULL,
  dictionaryId        INTEGER NOT NULL,
  spelling            TEXT NOT NULL,
  insensitiveSpelling TEXT NOT NULL,
  graphemeCount       INTEGER NOT NULL,
  minConfidence       REAL NOT NULL,
  latestAt            INTEGER NOT NULL,
  createdAt           INTEGER NOT NULL,
  updatedAt           INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS word_shared_data_spelling_index ON word_shared_data(
  dictionaryId,
  spelling
);

CREATE INDEX IF NOT EXISTS word_shared_data_latest_index ON word_shared_data(
  dictionaryId,
  latestAt
);

CREATE INDEX IF NOT EXISTS word_shared_data_length_index ON word_shared_data(
  dictionaryId,
  graphemeCount,
  spelling
);

CREATE INDEX IF NOT EXISTS word_shared_data_confidence_index ON word_shared_data(
  dictionaryId,
  minConfidence ASC,
  latestAt DESC
);

CREATE TABLE IF NOT EXISTS word_definition_data (
  id                 INTEGER PRIMARY KEY NOT NULL,
  dictionaryId       INTEGER NOT NULL,
  sharedId           INTEGER NOT NULL REFERENCES word_shared_data(id),
  orderKey           INTEGER NOT NULL,
  confidence         INTEGER NOT NULL,
  partOfSpeech       INTEGER,
  pronunciationAudio TEXT,
  definition         TEXT NOT NULL,
  example            TEXT NOT NULL,
  notes              TEXT NOT NULL,
  synonymsId         INTEGER,
  createdAt          INTEGER NOT NULL,
  updatedAt          INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS word_definition_data_index ON word_definition_data(dictionaryId, sharedId);

CREATE INDEX IF NOT EXISTS word_definition_data_confidence_index ON word_definition_data(
  dictionaryId,
  confidence ASC,
  createdAt DESC
);
`);

  // CREATE TABLE IF NOT EXISTS word_relations (
  //   groupId          INTEGER PRIMARY KEY NOT NULL,
  //   wordDefinitionId INTEGER NOT NULL REFERENCES word_definition_data(id) ON DELETE CASCADE,
  //   type             INTEGER
  // );

  // CREATE TABLE IF NOT EXISTS scan_history (
  //   id            INTEGER PRIMARY KEY NOT NULL,
  //   dictionaryId  INTEGER NOT NULL,
  //   text          TEXT NOT NULL,
  //   createdAt     INTEGER NOT NULL
  // );
}

export async function deleteDictionary(id: number) {
  // delete associated files
  const results = db.getEachAsync<{
    pronunciationAudio?: string | null;
  }>(
    "SELECT pronunciationAudio FROM word_definition_data WHERE dictionaryId = $dictionaryId",
    {
      $dictionaryId: id,
    }
  );

  for await (const row of results) {
    const promises = [];

    if (row.pronunciationAudio != undefined) {
      promises.push(deleteFileObject(row.pronunciationAudio));
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
  // await db.runAsync(
  //   "DELETE FROM scan_history WHERE dictionaryId = $dictionaryId",
  //   { $dictionaryId: id }
  // );
}

export async function deletePartOfSpeech(
  dictionaryId: number,
  partOfSpeech: number
) {
  await db.runAsync(
    "UPDATE word_definition_data SET partOfSpeech = NULL WHERE dictionaryId = $dictionaryId AND partOfSpeech = $partOfSpeech",
    { $dictionaryId: dictionaryId, $partOfSpeech: partOfSpeech }
  );
}

export type WordOrder = "alphabetical" | "latest" | "confidence" | "longest";

export const wordOrderOptions: WordOrder[] = [
  "alphabetical",
  "confidence",
  "latest",
  "longest",
];

export type GameWord = {
  spelling: string;
  orderKey: number;
};

export async function isValidWord(dictionaryId: number, word: string) {
  const query = [
    "SELECT COUNT(*) FROM word_shared_data",
    "WHERE dictionaryId = $dictionaryId AND insensitiveSpelling = $spelling",
  ];

  const result = await db.getFirstAsync<{ ["COUNT(*)"]: number }>(
    query.join(" "),
    {
      $dictionaryId: dictionaryId,
      $spelling: word.toLowerCase(),
    }
  );

  return result != null && result["COUNT(*)"] != 0;
}

const maxConfidence = 2;

export async function listGameWords(
  dictionaryId: number,
  options?: { minLength?: number; limit?: number }
) {
  const params: SQLite.SQLiteBindParams = {
    $dictionaryId: dictionaryId,
    $maxConfidence: maxConfidence,
  };

  // build query
  const query = [
    "SELECT spelling, orderKey FROM word_definition_data word_def",
    "INNER JOIN word_shared_data word ON word_def.sharedId = word.id",
    "WHERE word_def.dictionaryId = $dictionaryId",
    "AND word_def.confidence < $maxConfidence",
  ];

  if (options?.minLength != undefined) {
    query.push("AND word.graphemeCount >= $minLength");
    params.$minLength = options.minLength;
  }

  query.push("ORDER BY word_def.confidence ASC, word_def.createdAt DESC");

  if (options?.limit != undefined) {
    query.push("LIMIT $limit");
    params.$limit = options.limit;
  }

  return await db.getAllAsync<{ spelling: string; orderKey: number }>(
    query.join(" "),
    params
  );
}

export async function listWords(
  dictionaryId: number | null,
  options: {
    ascending?: boolean;
    orderBy: WordOrder;
    partOfSpeech?: number | null;
    minLength?: number;
    belowMaxConfidence?: boolean;
    limit?: number;
  }
) {
  // build query
  const query = ["SELECT spelling FROM word_shared_data word"];
  const bindParams: SQLite.SQLiteBindParams = {};

  if (options.partOfSpeech !== undefined) {
    query.push(
      "INNER JOIN word_definition_data ON word_definition_data.sharedId = word.id"
    );
  }

  const whereClause = [];

  if (dictionaryId != undefined) {
    whereClause.push("word.dictionaryId = $dictionaryId");
    bindParams.$dictionaryId = dictionaryId;
  }

  if (options.partOfSpeech != undefined) {
    whereClause.push("word_definition_data.partOfSpeech = $partOfSpeech");
    bindParams.$partOfSpeech = options.partOfSpeech;
  } else if (options.partOfSpeech === null) {
    whereClause.push("word_definition_data.partOfSpeech IS NULL");
  }

  if (options.minLength != undefined) {
    whereClause.push("word.graphemeCount >= $minLength");
    bindParams.$minLength = options.minLength;
  }

  if (options.belowMaxConfidence != undefined) {
    whereClause.push("word.minConfidence < $maxConfidence");
    bindParams.$maxConfidence = maxConfidence;
  }

  if (whereClause.length > 0) {
    query.push("WHERE");
    query.push(whereClause.join(" AND "));
  }

  let ordering = "DESC";
  let invOrdering = "ASC";

  if (options.ascending == undefined || options.ascending) {
    ordering = "ASC";
    invOrdering = "DESC";
  }

  switch (options.orderBy) {
    case "confidence":
      query.push(
        `ORDER BY word.minConfidence ${ordering}, word.latestAt ${invOrdering}`
      );
      break;
    case "latest":
      query.push(`ORDER BY word.latestAt ${ordering}`);
      break;
    case "longest":
      query.push(
        `ORDER BY word.graphemeCount ${ordering}, word.spelling ${ordering}`
      );
      break;
    default:
      query.push(`ORDER BY word.spelling ${ordering}`);
  }

  if (options.limit != undefined) {
    query.push("LIMIT $limit");
    bindParams.$limit = options.limit;
  }

  const results = await db.getAllAsync<{ spelling: string }>(
    query.join(" "),
    bindParams
  );

  const output: string[] = [];

  for (const row of results) {
    output.push(row.spelling);
  }

  return output;
}

export async function getWordDefinitions(
  dictionaryId: number,
  lowerCaseSpelling: string
) {
  const definitions: WordDefinitionData[] = [];

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
    "minConfidence",
    "latestAt",
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
      $minConfidence: options?.confidence ?? 0,
      $latestAt: time,
      $createdAt: time,
      $updatedAt: time,
    }
  );

  return result.lastInsertRowId;
}

async function updateSharedData(sharedId: number) {
  const result = await db.getFirstAsync<{
    "MIN(confidence)": number;
    "MAX(createdAt)": number;
  }>(
    "SELECT MIN(confidence), MAX(createdAt) FROM word_definition_data WHERE sharedId = $sharedId",
    { $sharedId: sharedId }
  );

  const sharedDataResult = await db.getFirstAsync<{
    createdAt: number;
  }>("SELECT createdAt FROM word_shared_data WHERE id = $id", {
    $id: sharedId,
  });

  if (!sharedDataResult) {
    return;
  }

  await db.runAsync(
    "UPDATE word_shared_data SET minConfidence = $minConfidence, latestAt = $latestAt WHERE id = $id",
    {
      $id: sharedId,
      $minConfidence: result?.["MIN(confidence)"] ?? 0,
      $latestAt: result?.["MAX(createdAt)"] ?? sharedDataResult.createdAt,
    }
  );
}

async function resolveNewOrderKey(sharedId: number) {
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
  const time = Date.now();

  const copyList: (keyof WordDefinitionUpsertData)[] = [
    "confidence",
    "partOfSpeech",
    "pronunciationAudio",
    "definition",
    "example",
    "notes",
  ];

  const setList = ["sharedId", "updatedAt"];
  const params: SQLite.SQLiteBindParams = {
    $updatedAt: time,
  };

  // copy values from definition data into params and append to the set list
  for (const key of copyList) {
    const value = definition[key];

    if (value === undefined) {
      continue;
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
      params.$orderKey = await resolveNewOrderKey(sharedId);
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
  await db.runAsync(
    "UPDATE word_definition_data SET orderKey = $orderKey WHERE id = $id",
    {
      $id: id,
      $orderKey: orderKey,
    }
  );
}

async function shiftOrderKeys(sharedId: number, greaterThanOrderKey: number) {
  await db.runAsync(
    "UPDATE word_definition_data SET orderKey = orderKey - 1 WHERE sharedId = $sharedId AND orderKey > $orderKey",
    {
      $sharedId: sharedId,
      $orderKey: greaterThanOrderKey,
    }
  );
}

export async function deleteDefinition(id: number) {
  const result = await db.getFirstAsync<{
    sharedId: number;
    orderKey: number;
    pronunciationAudio?: string | null;
  }>(
    "SELECT sharedId,orderKey,pronunciationAudio FROM word_definition_data WHERE id = $id",
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

  // delete words
  await db.runAsync("DELETE FROM word_definition_data WHERE id = $id", {
    $id: id,
  });

  // update ordering
  await shiftOrderKeys(result.sharedId, result.orderKey);

  await updateSharedData(result.sharedId);
}

function deleteAssociatedFiles(result: { pronunciationAudio?: string }) {
  // delete associated files
  if (result.pronunciationAudio != undefined) {
    deleteFileObject(result.pronunciationAudio).catch(logError);
  }
}

export async function deleteWord(dictionaryId: number, word: string) {
  word = word.toLowerCase();

  const result = await db.getFirstAsync<{ id: number }>(
    "SELECT id FROM word_shared_data WHERE dictionaryId = $dictionaryId AND insensitiveSpelling = $lowerCase",
    { $dictionaryId: dictionaryId, $lowerCase: word }
  );

  if (!result) {
    return;
  }

  const sharedId = result.id;

  const rows = db.getEachAsync<{ pronunciationAudio?: string }>(
    "SELECT pronunciationAudio FROM word_definition_data WHERE sharedId = $sharedId",
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

// import / export

async function fileExists(path: string) {
  try {
    return (await FileSystem.getInfoAsync(path)).exists;
  } catch {
    return false;
  }
}

const EXPORT_DB_NAME = "export.sqlite";
const IMPORT_DB_NAME = "import";

async function deleteExportDb() {
  try {
    await SQLite.deleteDatabaseAsync(EXPORT_DB_NAME);
  } catch {
    //
  }
}

async function deleteImportDb() {
  try {
    await SQLite.deleteDatabaseAsync(IMPORT_DB_NAME);
  } catch {
    //
  }
}

export type ExportImportStage = "metadata" | "words" | "definitions";

async function extractCount(
  db: SQLite.SQLiteDatabase,
  query: string,
  params?: SQLite.SQLiteBindParams
) {
  const result = params
    ? await db.getFirstAsync<{ "COUNT(*)": number }>(query, params)
    : await db.getFirstAsync<{ "COUNT(*)": number }>(query);

  return result?.["COUNT(*)"] ?? 0;
}

export async function exportData(
  userData: UserData,
  dictionaryId: number | undefined,
  progressCallback: (stage: ExportImportStage, i: number, total: number) => void
) {
  const dictionary = userData.dictionaries.find((d) => d.id == dictionaryId);

  // make sure we don't have existing export data
  await deleteExportDb();

  // init export db
  const exportDb = await SQLite.openDatabaseAsync(EXPORT_DB_NAME);

  try {
    await exportDb.execAsync(`
PRAGMA journal_mode = WAL;

CREATE TABLE meta (
  key  TEXT PRIMARY KEY NOT NULL,
  data TEXT NOT NULL
);

CREATE TABLE dictionaries (
  id   INTEGER PRIMARY KEY NOT NULL,
  data TEXT NOT NULL
);

CREATE TABLE word_shared_data (
  id            INTEGER PRIMARY KEY NOT NULL,
  dictionaryId  INTEGER NOT NULL,
  spelling      TEXT NOT NULL,
  graphemeCount INTEGER NOT NULL,
  minConfidence INTEGER NOT NULL,
  latestAt      INTEGER NOT NULL,
  createdAt     INTEGER NOT NULL,
  updatedAt     INTEGER NOT NULL
);

CREATE TABLE word_definition_data (
  dictionaryId       INTEGER NOT NULL,
  sharedId           INTEGER NOT NULL REFERENCES word_shared_data(id),
  orderKey           INTEGER NOT NULL,
  confidence         INTEGER NOT NULL,
  partOfSpeech       INTEGER,
  pronunciationAudio TEXT,
  definition         TEXT NOT NULL,
  example            TEXT NOT NULL,
  notes              TEXT NOT NULL,
  createdAt          INTEGER NOT NULL,
  updatedAt          INTEGER NOT NULL
);

CREATE TABLE files (
  id   TEXT PRIMARY KEY NOT NULL,
  data BLOB NOT NULL
);
`);

    await exportDb.runAsync(
      "INSERT INTO meta (key, data) VALUES ($key, $data)",
      {
        $key: "",
        $data: packageMeta.version,
      }
    );

    // load dictionary meta data
    const dictionaries =
      dictionary != undefined ? [dictionary] : userData.dictionaries;

    for (const dictionary of dictionaries) {
      await exportDb.runAsync(
        "INSERT INTO dictionaries (id, data) VALUES ($id, $data)",
        {
          $id: dictionary.id,
          $data: JSON.stringify({
            name: dictionary.name,
            partsOfSpeech: dictionary.partsOfSpeech,
          }),
        }
      );
    }

    // start copying tables
    async function copyTable(
      stage: ExportImportStage,
      table: string,
      keys: string[]
    ) {
      const sourceCountQuery = ["SELECT COUNT(*) FROM ", table];
      const sourceQuery = ["SELECT", keys.join(", "), "FROM", table];
      const sourceParams: SQLite.SQLiteBindParams = {};

      if (dictionaryId != undefined) {
        sourceCountQuery.push("WHERE dictionaryId = $dictionaryId");
        sourceQuery.push("WHERE dictionaryId = $dictionaryId");
        sourceParams.$dictionaryId = dictionaryId;
      }

      const sourceTotal = await extractCount(
        db,
        sourceCountQuery.join(" "),
        sourceParams
      );
      const sourceResults = db.getEachAsync<{ [key: string]: unknown }>(
        sourceQuery.join(" "),
        sourceParams
      );

      const insertQuery = `INSERT INTO ${table} (${keys.join(
        ", "
      )}) VALUES (${keys.map((k) => "$" + k).join(", ")})`;

      const bindParams: { [key: string]: any } = {};

      const prepared = await exportDb.prepareAsync(insertQuery);

      try {
        let i = 0;

        for await (const result of sourceResults) {
          for (const key of keys) {
            bindParams["$" + key] = result[key];
          }

          await prepared.executeAsync(bindParams);

          progressCallback(stage, ++i, sourceTotal);
        }
      } finally {
        await prepared.finalizeAsync();
      }
    }

    await copyTable("words", "word_shared_data", [
      "id",
      "dictionaryId",
      "spelling",
      "graphemeCount",
      "minConfidence",
      "latestAt",
      "createdAt",
      "updatedAt",
    ]);

    await copyTable("definitions", "word_definition_data", [
      "dictionaryId",
      "sharedId",
      "orderKey",
      "confidence",
      "partOfSpeech",
      "pronunciationAudio",
      "definition",
      "example",
      "notes",
      "createdAt",
      "updatedAt",
    ]);

    // // copy audio files
    // const audioResults = db.getEachAsync<{ pronunciationAudio: string }>(
    //   "SELECT pronunciationAudio FROM word_definition_data WHERE pronunciationAudio IS NOT NULL AND dictionaryId = ",
    //   { $dictionaryId: dictionaryId }
    // );

    // const insertFileStatement = await exportDb.prepareAsync(
    //   "INSERT INTO files (id, data) VALUES ($id, $data)"
    // );

    // try {
    //   for await (const { pronunciationAudio } of audioResults) {
    //     const data = await loadFileBytes(pronunciationAudio);

    //     await insertFileStatement.executeAsync({
    //       $id: pronunciationAudio,
    //       $data: data,
    //     });
    //   }
    // } finally {
    //   await insertFileStatement.finalizeAsync();
    // }
  } finally {
    await exportDb.closeAsync();
  }

  await Sharing.shareAsync("file://" + exportDb.databasePath);
}

export async function importData(
  userData: UserData,
  saveUserData: (userData: UserData) => void,
  uri: string,
  progressCallback: (stage: ExportImportStage, i: number, total: number) => void
) {
  await deleteExportDb();
  await deleteImportDb();

  await FileSystem.copyAsync({
    from: uri,
    to: "file://" + SQLite.defaultDatabaseDirectory + "/" + IMPORT_DB_NAME,
  });

  const importDb = await SQLite.openDatabaseAsync(IMPORT_DB_NAME);

  userData = { ...userData };
  userData.dictionaries = [...userData.dictionaries];
  userData.stats = { ...userData.stats };
  userData.stats.definitions = userData.stats.definitions ?? 0;

  try {
    // load dictionaries with a map from import id to new id
    const importIdMap: { [importId: number]: DictionaryData | undefined } = {};

    const dictionaryResults = importDb.getEachAsync<{
      id: number;
      data: string;
    }>("SELECT * FROM dictionaries");

    for await (const result of dictionaryResults) {
      const data = JSON.parse(result.data) as Pick<
        DictionaryData,
        "name" | "partsOfSpeech"
      >;

      const dictionary = {
        name: data.name,
        id: userData.nextDictionaryId,
        partsOfSpeech: data.partsOfSpeech,
        nextPartOfSpeechId: data.partsOfSpeech.reduce(
          (acc, p) => Math.max(acc, p.id + 1),
          0
        ),
        stats: {
          definitions: 0,
          totalPronounced: 0,
        },
      };

      userData.dictionaries.push(dictionary);
      importIdMap[result.id] = dictionary;
      userData.nextDictionaryId++;
    }

    async function bulkInsert(
      table: string,
      keys: string[],
      callback: (statement: SQLite.SQLiteStatement) => Promise<void>
    ) {
      const statement = await db.prepareAsync(
        `INSERT INTO ${table} (${keys.join(", ")}) VALUES (${keys
          .map((k) => "$" + k)
          .join(", ")})`
      );

      try {
        await callback(statement);
      } finally {
        await statement.finalizeAsync();
      }
    }

    // load words
    const totalWords = await extractCount(
      importDb,
      "SELECT COUNT(*) FROM word_shared_data"
    );

    const wordResults = importDb.getEachAsync<{
      id: number;
      dictionaryId: number;
      spelling: string;
    }>("SELECT * FROM word_shared_data");

    const wordCopyKeys = [
      "spelling",
      "graphemeCount",
      "minConfidence",
      "latestAt",
      "createdAt",
      "updatedAt",
    ];

    // oldId -> newId
    const sharedIdMap: { [oldId: number]: number } = {};

    await bulkInsert(
      "word_shared_data",
      ["dictionaryId", "insensitiveSpelling", ...wordCopyKeys],
      async (statement) => {
        let i = 0;

        for await (const result of wordResults) {
          const dictionary = importIdMap[result.dictionaryId];

          i++;

          if (!dictionary) {
            continue;
          }

          const bindParams: { [key: string]: any } = {
            $dictionaryId: dictionary.id,
            $insensitiveSpelling: result.spelling.toLowerCase(),
          };

          for (const key of wordCopyKeys) {
            bindParams["$" + key] = (result as { [key: string]: unknown })[key];
          }

          const execResult = await statement.executeAsync(bindParams);
          sharedIdMap[result.id] = execResult.lastInsertRowId;

          progressCallback("words", i, totalWords);
        }
      }
    );

    // load definitions
    const totalDefinitions = await extractCount(
      importDb,
      "SELECT COUNT(*) FROM word_definition_data"
    );

    const definitionResults = importDb.getEachAsync<{
      dictionaryId: number;
      sharedId: number;
      // pronunciationAudio?: string | null;
    }>("SELECT * FROM word_definition_data");

    const definitionCopyKeys = [
      "orderKey",
      "confidence",
      "partOfSpeech",
      // "pronunciationAudio", // todo, make sure to generate a new id
      "definition",
      "example",
      "notes",
      "createdAt",
      "updatedAt",
    ];

    await bulkInsert(
      "word_definition_data",
      ["dictionaryId", "sharedId", ...definitionCopyKeys],
      async (statement) => {
        let i = 0;

        for await (const result of definitionResults) {
          const dictionary = importIdMap[result.dictionaryId];

          i++;

          if (!dictionary) {
            continue;
          }

          const bindParams: { [key: string]: any } = {
            $dictionaryId: dictionary.id,
            $sharedId: sharedIdMap[result.sharedId],
          };

          for (const key of definitionCopyKeys) {
            bindParams["$" + key] = (result as { [key: string]: unknown })[key];
          }

          await statement.executeAsync(bindParams);

          userData.stats.definitions! += 1;
          dictionary.stats.definitions! += +1;

          progressCallback("definitions", i, totalDefinitions);
        }
      }
    );
  } finally {
    await importDb.closeAsync();
    await deleteImportDb();
    saveUserData(userData);
  }
}

// debug

function explainQueryPlan(queryString: string) {
  db.getAllAsync("EXPLAIN QUERY PLAN " + queryString)
    .then((results) => {
      console.log(
        queryString,
        "\n  ",
        results.map((value) => JSON.stringify(value)).join("\n   ")
      );
    })
    .catch(logError);
}

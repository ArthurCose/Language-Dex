import * as FileSystem from "expo-file-system/legacy";
import * as SQLite from "expo-sqlite";
import Unistring from "@akahuku/unistring";
import db from "./db";
import { log, logError } from "../log";
import {
  createNewFileObjectId,
  deleteFileObject,
  getFileObjectPath,
} from "./files";
import { deleteEmptySynonymCluster } from "./dictionary-clusters";
import { copyExtension } from "../path";

type FileName = string;

export const maxConfidence = 2;

export type WordDefinitionData = {
  id: number;
  sharedId: number;
  orderKey: number;
  spelling: string;
  confidence: number;
  partOfSpeech?: number | null;
  pronunciationAudio?: FileName | null;
  definition: string;
  example: string;
  notes: string;
  synonymsId?: number | null;
  createdAt: number;
  updatedAt: number;
};

export type WordDefinitionUpsertData =
  | (Partial<
      Omit<
        WordDefinitionData,
        "id" | "sharedId" | "spelling" | "createdAt" | "updatedAt" | "orderKey"
      >
    > & { id: number; spelling: string })
  | (Omit<
      WordDefinitionData,
      "id" | "sharedId" | "createdAt" | "updatedAt" | "orderKey"
    > & {
      id?: undefined;
    });

export type WordOrder = "alphabetical" | "latest" | "confidence" | "longest";

export const wordOrderOptions: WordOrder[] = [
  "alphabetical",
  "confidence",
  "latest",
  "longest",
];

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
    },
  );

  return result != null && result["COUNT(*)"] != 0;
}

export async function listWords(
  dictionaryId: number | null,
  options: {
    ascending?: boolean;
    orderBy: WordOrder;
    partOfSpeech?: number | null;
    minLength?: number;
    belowMaxConfidence?: boolean;
    startsWith?: string;
    limit?: number;
  },
) {
  // build query
  const query = ["SELECT word.spelling FROM word_shared_data word"];
  const bindParams: SQLite.SQLiteBindParams = {};

  if (options.partOfSpeech !== undefined) {
    query.push(
      "INNER JOIN word_definition_data ON word_definition_data.sharedId = word.id",
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

  if (options.startsWith != undefined) {
    whereClause.push("word.insensitiveSpelling LIKE $startsWith");
    bindParams.$startsWith =
      options.startsWith.toLowerCase().replace(/\\%_/g, "\\") + "%";
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
        `ORDER BY word.minConfidence ${ordering}, word.latestAt ${invOrdering}`,
      );
      break;
    case "latest":
      query.push(`ORDER BY word.latestAt ${ordering}`);
      break;
    case "longest":
      query.push(
        `ORDER BY word.graphemeCount ${ordering}, word.spelling ${ordering}`,
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
    bindParams,
  );

  const output: string[] = [];

  for (const row of results) {
    output.push(row.spelling);
  }

  return output;
}

export async function getWordDefinitions(
  dictionaryId: number,
  lowerCaseSpelling: string,
) {
  const definitions: WordDefinitionData[] = [];

  const wordResult = await db.getFirstAsync<{ id: number; spelling: string }>(
    "SELECT id, spelling FROM word_shared_data WHERE dictionaryId = $dictionaryId AND insensitiveSpelling = $spelling",
    { $dictionaryId: dictionaryId, $spelling: lowerCaseSpelling },
  );

  if (!wordResult) {
    return;
  }

  const results = db.getEachAsync<WordDefinitionData>(
    "SELECT * FROM word_definition_data WHERE sharedId = $id",
    {
      $id: wordResult.id,
    },
  );

  for await (const row of results) {
    definitions.push(row);
  }

  definitions.sort((a, b) => a.orderKey - b.orderKey);

  return { spelling: wordResult.spelling, definitions };
}

async function getOrCreateWordId(
  dictionaryId: number,
  word: string,
  options?: { confidence: number; time: number },
) {
  const lowerCaseWord = word.toLowerCase();

  const wordRow = await db.getFirstAsync<{ id: number }>(
    "SELECT id FROM word_shared_data WHERE insensitiveSpelling = $lowerCase AND dictionaryId = $dictionaryId",
    {
      $lowerCase: lowerCaseWord,
      $dictionaryId: dictionaryId,
    },
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
    },
  );

  return result.lastInsertRowId;
}

async function updateSharedData(sharedId: number) {
  const sharedDataResult = await db.getFirstAsync<{
    spelling: string;
    createdAt: number;
  }>("SELECT spelling, createdAt FROM word_shared_data WHERE id = $id", {
    $id: sharedId,
  });

  if (!sharedDataResult) {
    return;
  }

  const statsResult = await db.getFirstAsync<{
    "MIN(confidence)": number;
    "MAX(createdAt)": number;
  }>(
    "SELECT MIN(confidence), MAX(createdAt) FROM word_definition_data WHERE sharedId = $sharedId",
    { $sharedId: sharedId },
  );

  // use the first definition's capitalization
  const spellingResult = await db.getFirstAsync<{
    spelling: string;
  }>(
    "SELECT spelling FROM word_definition_data WHERE sharedId = $sharedId AND orderKey = 0",
    { $sharedId: sharedId },
  );

  await db.runAsync(
    "UPDATE word_shared_data SET spelling = $spelling, minConfidence = $minConfidence, latestAt = $latestAt WHERE id = $id",
    {
      $id: sharedId,
      $spelling: spellingResult?.spelling ?? sharedDataResult.spelling,
      $minConfidence: statsResult?.["MIN(confidence)"] ?? 0,
      $latestAt: statsResult?.["MAX(createdAt)"] ?? sharedDataResult.createdAt,
    },
  );
}

export async function prepareNewPronunciation(
  definitionData?: WordDefinitionData,
  uri?: string | null,
) {
  let pronunciationAudio = definitionData?.pronunciationAudio ?? null;
  const prevPronunciationUri = getFileObjectPath(pronunciationAudio);
  let finalize = () => {};

  if (prevPronunciationUri != uri) {
    if (uri == undefined) {
      pronunciationAudio = null;
    } else {
      const newExtension = copyExtension(uri);
      pronunciationAudio ??= createNewFileObjectId() + newExtension;

      if (copyExtension(pronunciationAudio) != newExtension) {
        pronunciationAudio = createNewFileObjectId() + newExtension;
      }

      finalize = () =>
        FileSystem.copyAsync({
          from: uri,
          to: getFileObjectPath(pronunciationAudio)!,
        }).catch(logError);
    }
  }

  if (
    prevPronunciationUri != undefined &&
    prevPronunciationUri != getFileObjectPath(pronunciationAudio)
  ) {
    // delete the pronunciation file before saving to avoid dangling files
    try {
      await FileSystem.deleteAsync(prevPronunciationUri);
    } catch (err) {
      logError(err);
    }
  }

  return { pronunciationAudio, finalize };
}

async function resolveNewOrderKey(sharedId: number) {
  const countResult = await db.getFirstAsync<{ "COUNT(*)": number }>(
    "SELECT COUNT(*) FROM word_definition_data WHERE sharedId = $sharedId",
    { $sharedId: sharedId },
  );

  return countResult?.["COUNT(*)"] ?? 0;
}

export async function upsertDefinition(
  dictionaryId: number,
  definition: WordDefinitionUpsertData,
) {
  log("Upserting Definition...");

  const time = Date.now();

  const copyList: (keyof WordDefinitionUpsertData)[] = [
    "spelling",
    "confidence",
    "partOfSpeech",
    "pronunciationAudio",
    "definition",
    "example",
    "notes",
  ];

  const setList = ["dictionaryId", "sharedId", "updatedAt"];
  const setParams: SQLite.SQLiteBindParams = {
    $dictionaryId: dictionaryId,
    $updatedAt: time,
  };

  // copy values from definition data into params and append to the set list
  for (const key of copyList) {
    const value = definition[key];

    if (value === undefined) {
      continue;
    }

    setParams["$" + key] = value;
    setList.push(key);
  }

  // grab old data for updating
  // needs to happen before resolving the shared word to avoid creating garbage
  let oldDataResult: {
    sharedId: number;
    orderKey: number;
  } | null = null;

  if (definition.id != undefined) {
    // fetch old sharedId to see if we switched words
    const query =
      "SELECT sharedId, orderKey FROM word_definition_data WHERE id = $id";
    oldDataResult = await db.getFirstAsync(query, {
      $id: definition.id,
    });

    if (!oldDataResult) {
      // exit early to avoid creating a shared word
      log("Failed to match definition by ID...");
      return;
    }
  }

  // grab the shared word
  const sharedId = await getOrCreateWordId(dictionaryId, definition.spelling, {
    confidence: definition.confidence ?? 0,
    time,
  });
  setParams.$sharedId = sharedId;

  if (definition.id != undefined) {
    // update
    log("Upsert is Updating.");

    if (!oldDataResult) {
      // unnecessary due to the check above, but makes TS happy
      return;
    }

    setParams.$id = definition.id;

    setList.push("orderKey");
    setParams.$orderKey = await resolveNewOrderKey(sharedId);

    await db.runAsync(
      [
        "UPDATE word_definition_data SET",
        setList.map((k) => k + " = $" + k).join(", "),
        "WHERE id = $id",
      ].join(" "),
      setParams,
    );

    // update old shared data to complete switching words
    await removedDefinitionCleanup(
      oldDataResult.sharedId,
      oldDataResult.orderKey,
    );

    // update current shared data
    await updateSharedData(sharedId);

    log("Upsert Complete!");
    return definition.id;
  } else {
    log("Upsert is Inserting.");

    // copy properties only required by inserting
    setList.push("sharedId", "createdAt", "orderKey");
    setParams.$createdAt = time;
    setParams.$orderKey = await resolveNewOrderKey(sharedId);

    const result = await db.runAsync(
      [
        "INSERT INTO word_definition_data (",
        setList.join(", "),
        ") VALUES (",
        setList.map((k) => "$" + k).join(", "),
        ")",
      ].join(" "),
      setParams,
    );

    log("Upsert Complete!");
    return result.lastInsertRowId;
  }
}

export async function updateDefinitionOrderKey(
  definitionData: WordDefinitionData,
  orderKey: number,
) {
  await db.runAsync(
    "UPDATE word_definition_data SET orderKey = $orderKey WHERE id = $id",
    {
      $id: definitionData.id,
      $orderKey: orderKey,
    },
  );

  if (orderKey == 0) {
    await db.runAsync(
      "UPDATE word_shared_data SET spelling = $spelling WHERE id = $id",
      {
        $id: definitionData.sharedId,
        $spelling: definitionData.spelling,
      },
    );
  }
}

async function shiftOrderKeys(sharedId: number, greaterThanOrderKey: number) {
  await db.runAsync(
    "UPDATE word_definition_data SET orderKey = orderKey - 1 WHERE sharedId = $sharedId AND orderKey > $orderKey",
    {
      $sharedId: sharedId,
      $orderKey: greaterThanOrderKey,
    },
  );
}

// Used to update or remove shared data after deleting a definition or migrating it to a new shared word
async function removedDefinitionCleanup(
  oldSharedId: number,
  oldOrderKey: number,
) {
  // delete if empty
  const deleteResult = await db.runAsync(
    [
      "DELETE FROM word_shared_data WHERE id = $sharedId",
      "AND NOT EXISTS (SELECT 1 FROM word_definition_data WHERE sharedId = $sharedId)",
    ].join(" "),
    {
      $sharedId: oldSharedId,
    },
  );

  console.log(deleteResult.changes);
  if (deleteResult.changes == 0) {
    // update if it still exists
    await shiftOrderKeys(oldSharedId, oldOrderKey);
    await updateSharedData(oldSharedId);
  }
}

export async function deleteDefinition(id: number) {
  log("Deleting Definition...");

  const result = await db.getFirstAsync<{
    sharedId: number;
    orderKey: number;
    pronunciationAudio?: string | null;
    synonymsId?: number | null;
  }>(
    "SELECT sharedId,orderKey,pronunciationAudio,synonymsId FROM word_definition_data WHERE id = $id",
    {
      $id: id,
    },
  );

  if (!result) {
    log("Definition does not exist...");
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

  // delete clusters after deleting the word
  if (result.synonymsId != null) {
    await deleteEmptySynonymCluster(result.synonymsId);
  }

  await removedDefinitionCleanup(result.sharedId, result.orderKey);

  log("Delete Complete!");
}

export async function deleteWord(dictionaryId: number, word: string) {
  log("Deleting Word...");

  word = word.toLowerCase();

  const result = await db.getFirstAsync<{ id: number }>(
    "SELECT id FROM word_shared_data WHERE dictionaryId = $dictionaryId AND insensitiveSpelling = $lowerCase",
    { $dictionaryId: dictionaryId, $lowerCase: word },
  );

  if (!result) {
    return;
  }

  const sharedId = result.id;

  // delete associated data
  const rows = db.getEachAsync<{
    pronunciationAudio?: string;
    synonymsId?: number;
  }>(
    "SELECT pronunciationAudio, synonymsId FROM word_definition_data WHERE sharedId = $sharedId",
    { $sharedId: sharedId },
  );

  const clusterIds: number[] = [];

  // delete files and resolve clusters to delete
  for await (const row of rows) {
    deleteAssociatedFiles(row);

    if (row.synonymsId != null && !clusterIds.includes(row.synonymsId)) {
      clusterIds.push(row.synonymsId);
    }
  }

  // delete definitions
  await db.runAsync(
    "DELETE FROM word_definition_data WHERE sharedId = $sharedId",
    { $sharedId: sharedId },
  );

  // delete empty synonym clusters after deleting definitions
  for (const clusterId of clusterIds) {
    await deleteEmptySynonymCluster(clusterId);
  }

  // delete word
  await db.runAsync("DELETE FROM word_shared_data WHERE id = $id", {
    $id: sharedId,
  });

  log("Delete Complete!");
}

function deleteAssociatedFiles(result: { pronunciationAudio?: string }) {
  // delete associated files
  if (result.pronunciationAudio != undefined) {
    deleteFileObject(result.pronunciationAudio).catch(logError);
  }
}

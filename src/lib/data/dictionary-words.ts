import * as FileSystem from "expo-file-system/legacy";
import * as SQLite from "expo-sqlite";
import Unistring from "@akahuku/unistring";
import { db, extractCountFromPreparedStatement } from "./db";
import { log, logError } from "../log";
import {
  createNewFileObjectId,
  deleteFileObject,
  getFileObjectPath,
} from "./files";
import { deleteEmptySynonymCluster } from "./dictionary-clusters";
import { copyExtension } from "../path";
import { normalize } from "../text-processing/normalization";
import { sortWords, compareWords } from "../text-processing/word-sorting";
import { deduplicateUnstable } from "../structures/array";

type FileName = string;

export const maxConfidence = 2;

export type DictionaryEntry = {
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

export type DictionaryEntryUpsertData = Partial<
  Omit<
    DictionaryEntry,
    "id" | "sharedId" | "createdAt" | "updatedAt" | "orderKey"
  >
> &
  ({ id: number } | { id?: undefined }) & { variants?: string[] };

export type WordOrder = "alphabetical" | "latest" | "confidence" | "longest";

export const wordOrderOptions: WordOrder[] = [
  "alphabetical",
  "confidence",
  "latest",
  "longest",
];

const validWordQueries = [
  [
    "SELECT spelling FROM word_shared_data",
    "WHERE dictionaryId = $dictionaryId AND insensitiveSpelling = $normalized",
  ],
  [
    "SELECT variant.spelling AS spelling FROM word_variants variant",
    "JOIN word_definition_data entry",
    "ON variant.entryId = entry.id",
    "WHERE entry.dictionaryId = $dictionaryId AND variant.insensitiveSpelling = $normalized",
  ],
];

export async function isValidWord(dictionaryId: number, word: string) {
  const lowercased = word.toLowerCase();

  for (const query of validWordQueries) {
    const results = await db.getAllAsync<{ spelling: string }>(
      query.join(" "),
      {
        $dictionaryId: dictionaryId,
        $normalized: normalize(word),
      },
    );

    for (const { spelling } of results) {
      if (lowercased == spelling.toLowerCase()) {
        return true;
      }
    }
  }

  return false;
}

export async function listWords(
  dictionaryId: number | null,
  options: {
    ascending?: boolean;
    orderBy: WordOrder;
    partOfSpeech?: number | null;
    minLength?: number;
    maxLength?: number;
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

  if (options.maxLength != undefined) {
    whereClause.push("word.graphemeCount <= $maxLength");
    bindParams.$maxLength = options.maxLength;
  }

  if (options.belowMaxConfidence != undefined) {
    whereClause.push("word.minConfidence < $maxConfidence");
    bindParams.$maxConfidence = maxConfidence;
  }

  if (options.startsWith != undefined) {
    whereClause.push("word.insensitiveSpelling LIKE $startsWith");
    bindParams.$startsWith =
      normalize(options.startsWith).replace(/\\%_/g, "\\") + "%";
  }

  if (whereClause.length > 0) {
    query.push("WHERE");
    query.push(whereClause.join(" AND "));
  }

  let ordering: "ASC" | "DESC" = "DESC";
  let invOrdering: "ASC" | "DESC" = "ASC";

  if (options.ascending == undefined || options.ascending) {
    ordering = "ASC";
    invOrdering = "DESC";
  }

  let sortAlphabetically = false;

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
      sortAlphabetically = true;
  }

  if (options.limit != undefined) {
    query.push("LIMIT $limit");
    bindParams.$limit = options.limit;
  }

  const results = await db.getAllAsync<{ spelling: string }>(
    query.join(" "),
    bindParams,
  );

  const output = results.map((row) => row.spelling);

  if (sortAlphabetically) {
    const multiplier = ordering == "ASC" ? 1 : -1;
    output.sort((a, b) => compareWords(a, b) * multiplier);
  }

  return output;
}

/** Result includes entries with mismatching diacritics */
export async function getWordEntries(
  dictionaryId: number,
  normalizedSpelling: string,
) {
  const spellings = [];
  const entries: DictionaryEntry[] = [];

  // find entries using headword
  const wordResults = await db.getAllAsync<{ id: number; spelling: string }>(
    "SELECT id, spelling FROM word_shared_data WHERE dictionaryId = $dictionaryId AND insensitiveSpelling = $spelling",
    { $dictionaryId: dictionaryId, $spelling: normalizedSpelling },
  );

  for (const { id: sharedId, spelling } of wordResults) {
    const entryResults = await db.getAllAsync<DictionaryEntry>(
      "SELECT * FROM word_definition_data WHERE sharedId = $id",
      { $id: sharedId },
    );

    for (const row of entryResults) {
      entries.push(row);
    }

    spellings.push(spelling);
  }

  // find entries using variants
  const variantResults = await db.getAllAsync<{
    entryId: number;
    spelling: string;
  }>(
    "SELECT entryId, spelling FROM word_variants WHERE insensitiveSpelling = $spelling",
    { $spelling: normalizedSpelling },
  );

  for (const { entryId, spelling } of variantResults) {
    const row = await db.getFirstAsync<DictionaryEntry>(
      "SELECT * FROM word_definition_data WHERE id = $id AND dictionaryId = $dictionaryId",
      { $id: entryId, $dictionaryId: dictionaryId },
    );

    if (row && !entries.some((entry) => entry.id == row.id)) {
      entries.push(row);
      spellings.push(spelling);
    }
  }

  // sort results
  entries.sort((a, b) => {
    if (a.sharedId == b.sharedId) {
      // if everything is equal, sort by order key
      return a.orderKey - b.orderKey;
    }

    return a.sharedId - b.sharedId;
  });

  if (entries.length == 0) {
    return;
  }

  return { spellings, entries };
}

async function prepareGetSharedId() {
  const statement = await db.prepareAsync(
    "SELECT id, spelling FROM word_shared_data WHERE dictionaryId = $dictionaryId AND insensitiveSpelling = $normalized",
  );

  return {
    async getSharedId(dictionaryId: number, word: string) {
      const normalizedWord = normalize(word);

      const executeResult = await statement.executeAsync<{
        id: number;
        spelling: string;
      }>({ $dictionaryId: dictionaryId, $normalized: normalizedWord });
      const possibleResults = await executeResult.getAllAsync();

      // match by lowercase to make sure diacritics match
      const lowercase = word.toLowerCase();
      const result = possibleResults.find(
        (result) => result.spelling.toLowerCase() == lowercase,
      );

      return result?.id;
    },
    finalizeAsync() {
      return statement.finalizeAsync();
    },
  };
}

async function getSharedId(dictionaryId: number, word: string) {
  const finder = await prepareGetSharedId();

  try {
    const id = await finder.getSharedId(dictionaryId, word);

    return id;
  } finally {
    await finder.finalizeAsync();
  }
}

async function prepareGetOrCreateWordId(txn: SQLite.SQLiteDatabase) {
  const sharedWordFinder = await prepareGetSharedId();

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

  const statementString = [
    "INSERT INTO word_shared_data (",
    keys.join(", "),
    ") VALUES (",
    keys.map((k) => "$" + k).join(", "),
    ")",
  ].join("");

  const statement = await txn.prepareAsync(statementString);

  return {
    async getOrCreateWordId(
      dictionaryId: number,
      word: string,
      options?: { confidence: number; time: number },
    ) {
      const sharedId = await sharedWordFinder.getSharedId(dictionaryId, word);

      if (sharedId != null) {
        return sharedId;
      }

      const time = options?.time ?? Date.now();

      const result = await statement.executeAsync({
        $dictionaryId: dictionaryId,
        $spelling: word,
        $insensitiveSpelling: normalize(word),
        $graphemeCount: Unistring(word).length,
        $minConfidence: options?.confidence ?? 0,
        $latestAt: time,
        $createdAt: time,
        $updatedAt: time,
      });

      return result.lastInsertRowId;
    },
    finalizeAsync() {
      return Promise.all([
        sharedWordFinder.finalizeAsync(),
        statement.finalizeAsync(),
      ]);
    },
  };
}

const sharedDataUpdateString = [
  "UPDATE word_shared_data",
  "SET spelling = firstSpelling, minConfidence = newMinConfidence, latestAt = newLatestAt",
  "FROM",
  "(SELECT MIN(confidence) AS newMinConfidence, MAX(createdAt) as newLatestAt FROM word_definition_data WHERE sharedId = $id),",
  "(SELECT spelling AS firstSpelling FROM word_definition_data WHERE sharedId = $id AND orderKey = 0)",
  "WHERE id = $id",
].join(" ");

async function updateSharedData(txn: SQLite.SQLiteDatabase, sharedId: number) {
  await txn.runAsync(sharedDataUpdateString, { $id: sharedId });
}

export async function prepareNewPronunciation(
  entry?: DictionaryEntry,
  uri?: string | null,
) {
  let pronunciationAudio = entry?.pronunciationAudio ?? null;
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

export async function listVariants(entryId: number) {
  const variants = await db.getAllAsync<{ spelling: string }>(
    "SELECT spelling FROM word_variants WHERE entryId = $id",
    { $id: entryId },
  );

  const spellings = variants.map(({ spelling }) => spelling);
  sortWords(spellings);

  return spellings;
}

export type UpsertCopyKey = Exclude<
  keyof DictionaryEntryUpsertData,
  | "id"
  | "sharedId"
  | "dictionaryId"
  | "orderKey"
  | "createdAt"
  | "updatedAt"
  | "variants"
  | "synonymsId"
>;

export const upsertCopyCheckList: UpsertCopyKey[] = [
  "spelling",
  "confidence",
  "partOfSpeech",
  "pronunciationAudio",
  "definition",
  "example",
  "notes",
];

export async function upsertEntry(
  dictionaryId: number,
  entry: DictionaryEntryUpsertData,
): Promise<number | undefined> {
  const copyList: UpsertCopyKey[] = [];

  for (const key of upsertCopyCheckList) {
    const value = entry[key];

    if (value !== undefined) {
      copyList.push(key);
    }
  }

  let id;
  await bulkEntryUpsert(dictionaryId, copyList, async (upsert) => {
    id = await upsert(entry);
  });

  return id;
}

export async function bulkEntryUpsert(
  dictionaryId: number,
  copyList: UpsertCopyKey[],
  upsertScope: (
    upsert: (entry: DictionaryEntryUpsertData) => Promise<number | undefined>,
    txn: SQLite.SQLiteDatabase,
  ) => Promise<void>,
) {
  log("Upserting Entries...");

  const time = Date.now();
  const updateList = [
    ...copyList,
    "orderKey",
    "dictionaryId",
    "sharedId",
    "updatedAt",
  ] as string[];

  const insertList = [...updateList, "confidence", "createdAt"];

  // avoid duplicate confidence
  deduplicateUnstable(insertList);

  await db.withExclusiveTransactionAsync(async (txn) => {
    const updateStatement = await txn.prepareAsync(
      [
        "UPDATE word_definition_data SET",
        updateList.map((k) => k + " = $" + k).join(", "),
        "WHERE id = $id",
      ].join(" "),
    );

    const sharedDataUpdateStatement = await txn.prepareAsync(
      sharedDataUpdateString,
    );

    const insertStatement = await txn.prepareAsync(
      [
        "INSERT INTO word_definition_data (",
        insertList.join(", "),
        ") VALUES (",
        insertList.map((k) => "$" + k).join(", "),
        ")",
      ].join(" "),
    );

    const countEntriesStatement = await txn.prepareAsync(
      "SELECT COUNT(*) FROM word_definition_data WHERE sharedId = $sharedId",
    );

    const queryOldDataStatement = await txn.prepareAsync(
      "SELECT sharedId, orderKey, spelling FROM word_definition_data WHERE id = $id",
    );

    const sharedWordResolver = await prepareGetOrCreateWordId(txn);

    const deleteVariantsStatement = await txn.prepareAsync(
      "DELETE FROM word_variants WHERE entryId = $id",
    );

    const insertVariantsStatement = await txn.prepareAsync(
      "INSERT INTO word_variants (entryId, spelling, insensitiveSpelling) VALUES ($id, $spelling, $normalized)",
    );

    let updates = 0;
    let inserts = 0;
    let failed = 0;

    const upsert = async (entry: DictionaryEntryUpsertData) => {
      const setParams: SQLite.SQLiteBindParams = {
        $dictionaryId: dictionaryId,
        $updatedAt: time,
      };

      // copy values from definition data into params and append to the set list
      for (const key of copyList) {
        const value = entry[key];

        if (value === undefined) {
          throw new Error("Entry upsert failed: missing " + key);
        }

        setParams["$" + key] = value;
      }

      // grab old data for updating
      // needs to happen before resolving the shared word to avoid creating garbage
      type OldDataResult = {
        sharedId: number;
        orderKey: number;
        spelling: string;
      };
      let oldDataResult: OldDataResult | null = null;

      let spelling = entry.spelling;

      if (entry.id != undefined) {
        // fetch old sharedId to see if we switched words
        const oldDataResults =
          await queryOldDataStatement.executeAsync<OldDataResult>({
            $id: entry.id,
          });
        oldDataResult = await oldDataResults.getFirstAsync();

        if (!oldDataResult) {
          // exit early to avoid creating a shared word
          log("Failed to match entry by ID...");
          failed++;
          return;
        }

        spelling ??= oldDataResult.spelling;
      }

      if (spelling == null) {
        // exit early to avoid creating a shared word
        logError("Invalid state: Missing spelling for entry upsert!");
        failed++;
        return;
      }

      let id: number | null = null;

      // grab the shared word
      const sharedId = await sharedWordResolver.getOrCreateWordId(
        dictionaryId,
        spelling,
        {
          confidence: entry.confidence ?? 0,
          time,
        },
      );

      setParams.$sharedId = sharedId;
      setParams.$orderKey = await extractCountFromPreparedStatement(
        countEntriesStatement,
      );

      if (entry.id != undefined) {
        // update

        if (!oldDataResult) {
          // unnecessary due to the check above, but makes TS happy
          return;
        }

        id = entry.id;
        setParams.$id = id;

        await updateStatement.executeAsync(setParams);

        // update old shared data to complete switching words
        if (oldDataResult.sharedId != sharedId) {
          await removedEntryCleanup(
            txn,
            oldDataResult.sharedId,
            oldDataResult.orderKey,
          );
        }

        // update current shared data
        await sharedDataUpdateStatement.executeAsync({ $id: sharedId });

        // delete old variants
        if (entry.variants) {
          await deleteVariantsStatement.executeAsync({
            $id: id,
          });
        }

        updates++;
      } else {
        // copy properties only required by inserting
        setParams.$createdAt = time;
        // ensure confidence for inserts
        setParams.$confidence ??= 0;

        const result = await insertStatement.executeAsync(setParams);

        id = result.lastInsertRowId;
        inserts++;
      }

      if (id == null) {
        throw new Error("Entry upsert failed");
      }

      if (entry.variants && entry.variants.length > 0) {
        const promises = [];

        for (const spelling of entry.variants) {
          promises.push(
            insertVariantsStatement.executeAsync({
              $id: id,
              $spelling: spelling,
              $normalized: normalize(spelling),
            }),
          );
        }

        await Promise.all(promises);
      }

      return id;
    };

    try {
      await upsertScope(upsert, txn);
    } catch (err) {
      failed++;
      throw err;
    } finally {
      log(`Upsert: ${inserts} inserted, ${updates} updated, ${failed} failed`);

      await Promise.all([
        updateStatement.finalizeAsync(),
        sharedDataUpdateStatement.finalizeAsync(),
        insertStatement.finalizeAsync(),
        queryOldDataStatement.finalizeAsync(),
        countEntriesStatement.finalizeAsync(),
        sharedWordResolver.finalizeAsync(),
        deleteVariantsStatement.finalizeAsync(),
        insertVariantsStatement.finalizeAsync(),
      ]);
    }
  });
}

export async function updateEntryOrderKey(
  entry: DictionaryEntry,
  orderKey: number,
) {
  await db.runAsync(
    "UPDATE word_definition_data SET orderKey = $orderKey WHERE id = $id",
    {
      $id: entry.id,
      $orderKey: orderKey,
    },
  );

  if (orderKey == 0) {
    await db.runAsync(
      "UPDATE word_shared_data SET spelling = $spelling WHERE id = $id",
      {
        $id: entry.sharedId,
        $spelling: entry.spelling,
      },
    );
  }
}

async function shiftOrderKeys(
  txn: SQLite.SQLiteDatabase,
  sharedId: number,
  greaterThanOrderKey: number,
) {
  await txn.runAsync(
    "UPDATE word_definition_data SET orderKey = orderKey - 1 WHERE sharedId = $sharedId AND orderKey > $orderKey",
    {
      $sharedId: sharedId,
      $orderKey: greaterThanOrderKey,
    },
  );
}

// Used to update or remove shared data after deleting an entry or migrating it to a new shared word
async function removedEntryCleanup(
  txn: SQLite.SQLiteDatabase,
  oldSharedId: number,
  oldOrderKey: number,
) {
  // delete if empty
  const deleteResult = await txn.runAsync(
    [
      "DELETE FROM word_shared_data WHERE id = $sharedId",
      "AND NOT EXISTS (SELECT 1 FROM word_definition_data WHERE sharedId = $sharedId)",
    ].join(" "),
    {
      $sharedId: oldSharedId,
    },
  );

  if (deleteResult.changes == 0) {
    // update if it still exists
    await shiftOrderKeys(txn, oldSharedId, oldOrderKey);
    await updateSharedData(txn, oldSharedId);
  }
}

export async function deleteEntry(id: number) {
  log("Deleting Entry...");

  const result = await db.getFirstAsync<{
    sharedId: number;
    orderKey: number;
    pronunciationAudio?: string | null;
    synonymsId?: number | null;
  }>(
    "SELECT sharedId, orderKey, pronunciationAudio, synonymsId FROM word_definition_data WHERE id = $id",
    {
      $id: id,
    },
  );

  if (!result) {
    log("Entry does not exist...");
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

  await removedEntryCleanup(db, result.sharedId, result.orderKey);

  log("Delete Complete!");
}

export async function deleteWord(dictionaryId: number, word: string) {
  log("Deleting Word...");

  const sharedId = await getSharedId(dictionaryId, word);

  if (sharedId == null) {
    return;
  }

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

  // delete entries
  await db.runAsync(
    "DELETE FROM word_definition_data WHERE sharedId = $sharedId",
    { $sharedId: sharedId },
  );

  // delete empty synonym clusters after deleting entries
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

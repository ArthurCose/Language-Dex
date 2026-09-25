import * as SQLite from "expo-sqlite";
import * as FileSystem from "expo-file-system/legacy";
import db, { extractCount } from "./db";
import { log } from "../log";
import { UserData } from "./user";
import { DictionaryData } from "./dictionary-meta";
import { maxConfidence } from "./dictionary-words";

const EXPORT_DB_NAME = "export.sqlite";
const IMPORT_DB_NAME = "import";

export async function deleteExportDb() {
  try {
    await SQLite.deleteDatabaseAsync(EXPORT_DB_NAME);
  } catch {
    //
  }
}

export async function deleteImportDb() {
  try {
    await SQLite.deleteDatabaseAsync(IMPORT_DB_NAME);
  } catch {
    //
  }
}

export type ExportImportStage =
  | "metadata"
  | "words"
  | "definitions"
  | "relations";

/// Creates a new sqlite file, overwriting any previously exported file
///
/// Returns the path to the sqlite file
export async function exportData(
  userData: UserData,
  dictionaryId: number | undefined,
  progressCallback: (
    stage: ExportImportStage,
    i: number,
    total: number,
  ) => void,
): Promise<string> {
  log("Exporting Data...");

  const startTime = performance.now();

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
  spelling           TEXT NOT NULL,
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

CREATE TABLE synonym_clusters (
  id         INTEGER PRIMARY KEY NOT NULL,
  antonymsId INTEGER
);

CREATE TABLE files (
  id   TEXT PRIMARY KEY NOT NULL,
  data BLOB NOT NULL
);
`);

    await exportDb.runAsync(
      "INSERT INTO meta (key, data) VALUES ($key, $data)",
      {
        $key: "version",
        $data: userData.version,
      },
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
        },
      );
    }

    // start copying tables
    async function copyTable(
      stage: ExportImportStage,
      table: string,
      keys: string[],
      sourceTotal: number,
      sourceResults: AsyncIterableIterator<{ [key: string]: unknown }>,
    ) {
      const insertQuery = `INSERT INTO ${table} (${keys.join(
        ", ",
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

    async function copyDictionaryTable(
      stage: ExportImportStage,
      table: string,
      keys: string[],
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
        sourceParams,
      );
      const sourceResults = db.getEachAsync(
        sourceQuery.join(" "),
        sourceParams,
      );

      await copyTable(
        stage,
        table,
        keys,
        sourceTotal,
        sourceResults as AsyncIterableIterator<{ [key: string]: unknown }>,
      );
    }

    await copyDictionaryTable("words", "word_shared_data", [
      "id",
      "dictionaryId",
      "spelling",
      "graphemeCount",
      "minConfidence",
      "latestAt",
      "createdAt",
      "updatedAt",
    ]);

    await copyDictionaryTable("definitions", "word_definition_data", [
      "dictionaryId",
      "sharedId",
      "orderKey",
      "spelling",
      "confidence",
      "partOfSpeech",
      // "pronunciationAudio",
      "definition",
      "example",
      "notes",
      "synonymsId",
      "createdAt",
      "updatedAt",
    ]);

    // estimating the synonym cluster count
    let clustersWhereClause = "WHERE synonymsId IS NOT NULL";
    const clustersBindParams: { [key: string]: any } = {};

    if (dictionaryId != undefined) {
      clustersWhereClause += " AND dictionaryId = $dictionaryId";
      clustersBindParams.$dictionaryId = dictionaryId;
    }

    const clusterCountResult = await db.getFirstAsync<{
      [key: string]: number;
    }>(
      `SELECT COUNT(DISTINCT synonymsId) FROM word_definition_data ${clustersWhereClause}`,
      clustersBindParams,
    );

    const clusterCount = clusterCountResult!["COUNT(DISTINCT synonymsId)"] * 2;

    await copyTable(
      "relations",
      "synonym_clusters",
      ["id", "antonymsId"],
      clusterCount,
      (async function* () {
        const synonymIdResults = db.getEachAsync<{ synonymsId: number }>(
          `SELECT DISTINCT synonymsId FROM word_definition_data ${clustersWhereClause}`,
          clustersBindParams,
        );

        const clusterBindParams: { $id: number } = { $id: 0 };
        const statement = await db.prepareAsync(
          `SELECT id, antonymsId FROM synonym_clusters WHERE id = $id`,
        );

        try {
          for await (const synonymIdResult of synonymIdResults) {
            clusterBindParams.$id = synonymIdResult.synonymsId;
            const executeResult =
              await statement.executeAsync(clusterBindParams);
            const result = await executeResult.getFirstAsync();

            yield result as any;
          }
        } finally {
          await statement.finalizeAsync();
        }
      })(),
    );

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

    log(`Export completed in ${performance.now() - startTime}ms`);
  } finally {
    await exportDb.closeAsync();
  }

  return exportDb.databasePath;
}

export async function importData(
  userData: UserData,
  saveUserData: (userData: UserData) => void,
  uri: string,
  progressCallback: (
    stage: ExportImportStage,
    i: number,
    total: number,
  ) => void,
) {
  log("Importing Data...");
  const startTime = performance.now();

  await deleteExportDb();
  await deleteImportDb();

  await FileSystem.copyAsync({
    from: uri,
    to: "file://" + SQLite.defaultDatabaseDirectory + "/" + IMPORT_DB_NAME,
  });

  const importDb = await SQLite.openDatabaseAsync(IMPORT_DB_NAME);

  try {
    // prep userData for saving new dictionaries
    userData = { ...userData };
    userData.dictionaries = [...userData.dictionaries];

    const dictionaryResults = importDb.getEachAsync<{
      id: number;
      data: string;
    }>("SELECT * FROM dictionaries");

    // [id, index]
    const importMappingList: [number, number][] = [];

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
          0,
        ),
        stats: {},
      };

      importMappingList.push([result.id, userData.dictionaries.length]);
      userData.dictionaries.push(dictionary);
      userData.nextDictionaryId++;
    }

    // save dictionaries before importing new data to avoid orphaned data
    saveUserData(userData);

    // prep userData for saving stats
    userData = { ...userData };
    userData.stats = { ...userData.stats };
    userData.stats.definitions ??= 0;
    userData.stats.documentedMaxConfidence ??= 0;
    userData.stats.totalExamples ??= 0;
    userData.dictionaries = [...userData.dictionaries];

    const importDictionaryMap: {
      [importId: number]: DictionaryData | undefined;
    } = {};

    for (const [originalId, i] of importMappingList) {
      const dictionary = {
        ...userData.dictionaries[i],
        stats: {
          definitions: 0,
          documentedMaxConfidence: 0,
          totalExamples: 0,
          totalPronounced: 0,
        },
      };

      userData.dictionaries[i] = dictionary;
      importDictionaryMap[originalId] = dictionary;
    }

    async function bulkInsert(
      table: string,
      keys: string[],
      callback: (statement: SQLite.SQLiteStatement) => Promise<void>,
    ) {
      const statement = await db.prepareAsync(
        `INSERT INTO ${table} (${keys.join(", ")}) VALUES (${keys
          .map((k) => "$" + k)
          .join(", ")})`,
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
      "SELECT COUNT(*) FROM word_shared_data",
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
          const dictionary = importDictionaryMap[result.dictionaryId];

          i++;

          if (dictionary == undefined) {
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
      },
    );

    // load synonym clusters
    const synonymClusterIdMap: { [key: number]: number } = {};

    try {
      const insertStatement = await db.prepareAsync(
        "INSERT INTO synonym_clusters DEFAULT VALUES",
      );
      const updateStatement = await db.prepareAsync(
        `UPDATE synonym_clusters SET antonymsId = $antonymsId WHERE id = $id`,
      );

      try {
        let i = 0;

        const totalClusters = await extractCount(
          importDb,
          "SELECT COUNT(*) FROM synonym_clusters",
        );

        // import synonym clusters
        const clusterResults = importDb.getEachAsync<{ id: number }>(
          "SELECT id FROM synonym_clusters",
        );

        for await (const result of clusterResults) {
          i++;

          const insertResult = await insertStatement.executeAsync();
          synonymClusterIdMap[result.id] = insertResult.lastInsertRowId;

          progressCallback("relations", i, totalClusters);
        }

        // import antonym relationships
        const antonymClusterResults = importDb.getEachAsync<{
          id: number;
          antonymsId: number;
        }>(
          "SELECT id, antonymsId FROM synonym_clusters WHERE antonymsId IS NOT NULL",
        );

        for await (const result of antonymClusterResults) {
          await updateStatement.executeAsync({
            $id: synonymClusterIdMap[result.id],
            $antonymsId: synonymClusterIdMap[result.antonymsId],
          });
        }
      } finally {
        await insertStatement.finalizeAsync();
        await updateStatement.finalizeAsync();
      }
    } catch (err) {
      log("Failed to import relations:");
      log(err);
    }

    // load definitions
    const totalDefinitions = await extractCount(
      importDb,
      "SELECT COUNT(*) FROM word_definition_data",
    );

    const definitionResults = importDb.getEachAsync<{
      dictionaryId: number;
      sharedId: number;
      example?: string | null;
      synonymsId?: number | null;
      confidence: number;
      // pronunciationAudio?: string | null;
    }>("SELECT * FROM word_definition_data");

    const definitionCopyKeys = [
      "orderKey",
      "spelling",
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
      ["dictionaryId", "sharedId", "synonymsId", ...definitionCopyKeys],
      async (statement) => {
        let i = 0;

        for await (const result of definitionResults) {
          const dictionary = importDictionaryMap[result.dictionaryId];

          i++;

          if (!dictionary) {
            continue;
          }

          const bindParams: { [key: string]: any } = {
            $dictionaryId: dictionary.id,
            $sharedId: sharedIdMap[result.sharedId],
            $synonymsId:
              result.synonymsId != null
                ? synonymClusterIdMap[result.synonymsId]
                : null,
          };

          for (const key of definitionCopyKeys) {
            bindParams["$" + key] = (result as { [key: string]: unknown })[key];
          }

          await statement.executeAsync(bindParams);

          userData.stats.definitions! += 1;
          dictionary.stats.definitions! += 1;

          if (result.example != "") {
            userData.stats.totalExamples! += 1;
            dictionary.stats.totalExamples! += 1;
          }

          if (result.confidence == maxConfidence) {
            userData.stats.documentedMaxConfidence! += 1;
            dictionary.stats.documentedMaxConfidence! += 1;
          }

          progressCallback("definitions", i, totalDefinitions);
        }
      },
    );

    log(`Import completed in ${performance.now() - startTime}ms`);
  } finally {
    await importDb.closeAsync();
    await deleteImportDb();
    userData.updatingStats = false;
    saveUserData(userData);
  }
}

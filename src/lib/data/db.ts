import * as SQLite from "expo-sqlite";
import { File } from "expo-file-system";

let db = SQLite.openDatabaseSync("db");
const dbPath = "file://" + db.databasePath;
const backupPath = dbPath.slice(0, dbPath.lastIndexOf("/") + 1) + "backup";

export default db;

export function backupDb() {
  db.closeSync();

  const file = new File(dbPath);
  file.copySync(new File(backupPath));

  db = SQLite.openDatabaseSync("db");
}

export function restoreDbFromBackup() {
  const backup = new File(backupPath);

  if (!backup.exists) {
    return;
  }

  db.closeSync();

  const originalFile = new File(dbPath);
  backup.moveSync(originalFile, { overwrite: true });

  db = SQLite.openDatabaseSync("db");
}

export function deleteBackup() {
  const backup = new File(backupPath);

  if (backup.exists) {
    backup.delete();
  }
}

export async function initDb() {
  restoreDbFromBackup();

  await db.execAsync(`
PRAGMA journal_mode = WAL;
PRAGMA auto_vacuum = FULL;
PRAGMA foreign_keys = ON;

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
CREATE INDEX IF NOT EXISTS word_definition_data_index ON word_definition_data(dictionaryId, sharedId);

CREATE INDEX IF NOT EXISTS word_pronunciation_confidence_index ON word_definition_data(
  dictionaryId,
  confidence ASC,
  createdAt DESC
) WHERE pronunciationAudio IS NOT NULL;

CREATE INDEX IF NOT EXISTS word_definition_data_confidence_index ON word_definition_data(
  dictionaryId,
  confidence ASC,
  createdAt DESC
);

CREATE INDEX IF NOT EXISTS word_definition_data_synonyms_index ON word_definition_data(
  synonymsId
);

CREATE TABLE IF NOT EXISTS synonym_clusters (
  id         INTEGER PRIMARY KEY NOT NULL,
  antonymsId INTEGER REFERENCES synonym_clusters(id) ON DELETE SET NULL
);
`);

  // CREATE TABLE IF NOT EXISTS scan_history (
  //   id            INTEGER PRIMARY KEY NOT NULL,
  //   dictionaryId  INTEGER NOT NULL,
  //   text          TEXT NOT NULL,
  //   createdAt     INTEGER NOT NULL
  // );
}

export async function extractCount(
  db: SQLite.SQLiteDatabase,
  query: string,
  params?: SQLite.SQLiteBindParams,
) {
  const result = params
    ? await db.getFirstAsync<{ "COUNT(*)": number }>(query, params)
    : await db.getFirstAsync<{ "COUNT(*)": number }>(query);

  return result?.["COUNT(*)"] ?? 0;
}

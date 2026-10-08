import * as SQLite from "expo-sqlite";
import { db } from "./db";
import { maxConfidence } from "./dictionary-words";

export type GameWord = {
  spelling: string;
  orderKey: number;
};

export async function listGameWords(
  dictionaryId: number,
  options?: {
    minLength?: number;
    maxLength?: number;
    limit?: number;
    requirePronunciation?: boolean;
  },
) {
  const params: SQLite.SQLiteBindParams = {
    $dictionaryId: dictionaryId,
    $maxConfidence: maxConfidence,
  };

  // build query
  const query = [
    "SELECT word_def.spelling, orderKey FROM word_definition_data word_def",
    "INNER JOIN word_shared_data word ON word_def.sharedId = word.id",
    "WHERE word_def.dictionaryId = $dictionaryId",
    "AND word_def.confidence < $maxConfidence",
  ];

  if (options?.minLength != undefined) {
    query.push("AND word.graphemeCount >= $minLength");
    params.$minLength = options.minLength;
  }

  if (options?.maxLength != undefined) {
    query.push("AND word.graphemeCount <= $maxLength");
    params.$maxLength = options.maxLength;
  }

  if (options?.requirePronunciation) {
    query.push("AND word_def.pronunciationAudio IS NOT NULL");
  }

  query.push("ORDER BY word_def.confidence ASC, word_def.createdAt DESC");

  if (options?.limit != undefined) {
    query.push("LIMIT $limit");
    params.$limit = options.limit;
  }

  return await db.getAllAsync<{ spelling: string; orderKey: number }>(
    query.join(" "),
    params,
  );
}

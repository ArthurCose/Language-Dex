import { db } from "./db";
import { log, logError } from "../log";
import { DictionaryStats } from "./stats";
import { deleteFileObject } from "./files";

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
  id?: number | null,
) {
  if (id == undefined) {
    return;
  }

  return dictionary?.partsOfSpeech.find((p) => p.id == id)?.name;
}

export async function deletePartOfSpeech(
  dictionaryId: number,
  partOfSpeech: number,
) {
  log("Deleting Part of Speech...");

  await db.runAsync(
    "UPDATE word_definition_data SET partOfSpeech = NULL WHERE dictionaryId = $dictionaryId AND partOfSpeech = $partOfSpeech",
    { $dictionaryId: dictionaryId, $partOfSpeech: partOfSpeech },
  );

  log("Delete Complete!");
}

export async function deleteDictionary(id: number) {
  log("Deleting Dictionary...");

  // delete associated files
  const results = db.getEachAsync<{
    pronunciationAudio?: string | null;
  }>(
    "SELECT pronunciationAudio FROM word_definition_data WHERE dictionaryId = $dictionaryId",
    {
      $dictionaryId: id,
    },
  );

  for await (const row of results) {
    const promises = [];

    if (row.pronunciationAudio != undefined) {
      promises.push(deleteFileObject(row.pronunciationAudio));
    }

    try {
      await Promise.all(promises);
    } catch (err) {
      logError(err);
    }
  }

  // delete relations
  const synonymsIdResults = db.getEachAsync<{ synonymsId: number }>(
    "SELECT DISTINCT synonymsId FROM word_definition_data WHERE dictionaryId = $dictionaryId AND synonymsId IS NOT NULL",
    { $dictionaryId: id },
  );

  const deleteClusterStatement = await db.prepareAsync(
    "DELETE FROM synonym_clusters WHERE id = $clusterId",
  );

  try {
    for await (const row of synonymsIdResults) {
      await deleteClusterStatement.executeAsync({
        $clusterId: row.synonymsId,
      });
    }
  } finally {
    await deleteClusterStatement.finalizeAsync();
  }

  // delete words
  await db.runAsync(
    "DELETE FROM word_definition_data WHERE dictionaryId = $dictionaryId",
    { $dictionaryId: id },
  );
  await db.runAsync(
    "DELETE FROM word_shared_data WHERE dictionaryId = $dictionaryId",
    { $dictionaryId: id },
  );
  // await db.runAsync(
  //   "DELETE FROM scan_history WHERE dictionaryId = $dictionaryId",
  //   { $dictionaryId: id }
  // );

  log("Delete Complete!");
}

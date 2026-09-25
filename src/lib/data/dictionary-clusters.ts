import db from "./db";

export type RelationWord = {
  id: number;
  spelling: string;
};

export async function listWordsInSynonymCluster(clusterId: number) {
  const words = await db.getAllAsync<RelationWord>(
    "SELECT id, spelling FROM word_definition_data WHERE synonymsId = $synonymsId",
    { $synonymsId: clusterId },
  );

  return words;
}

export async function setSynonymCluster(
  word: RelationWord,
  synonymsId: number | null | undefined,
) {
  await db.runAsync(
    "UPDATE word_definition_data SET synonymsId = $synonymsId WHERE id = $id",
    {
      $id: word.id,
      $synonymsId: synonymsId ?? null,
    },
  );
}

export async function getClusterAntonymsId(
  clusterId: number,
): Promise<number | null> {
  const result = await db.getFirstAsync<{ antonymsId: number | null }>(
    "SELECT antonymsId FROM synonym_clusters WHERE id = $id",
    {
      $id: clusterId,
    },
  );

  return result?.antonymsId ?? null;
}

export async function setClusterAntonyms(
  synonymSetId: number,
  antonymsId?: number | null,
) {
  await db.runAsync(
    "UPDATE synonym_clusters SET antonymsId = $antonymsId WHERE id = $id",
    {
      $id: synonymSetId,
      $antonymsId: antonymsId ?? null,
    },
  );
}

export async function createSynonymCluster(antonymsId?: number | null) {
  const result = await db.runAsync(
    "INSERT INTO synonym_clusters (antonymsId) VALUES ($antonymsId)",
    {
      $antonymsId: antonymsId ?? null,
    },
  );

  return result.lastInsertRowId;
}

export async function clearSynonymCluster(clusterId: number) {
  await db.runAsync(
    "UPDATE word_definition_data SET synonymsId = NULL WHERE synonymsId = $clusterId",
    {
      $clusterId: clusterId,
    },
  );
}

export async function deleteEmptySynonymCluster(id: number) {
  const countResult = await db.getFirstAsync<{ ["COUNT(*)"]: number }>(
    "SELECT COUNT(*) FROM word_definition_data WHERE synonymsId = $id",
    { $id: id },
  );

  const count = countResult?.["COUNT(*)"] ?? 0;

  if (count > 0) {
    return;
  }

  await db.runAsync("DELETE FROM synonym_clusters WHERE id = $id", { $id: id });
}

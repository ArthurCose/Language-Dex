import { UserData } from "./user";
import { db, backupDb, restoreDbFromBackup, deleteBackup } from "./db";
import { log } from "../log";
import { normalize } from "../text-processing/normalization";

const migrateUpList = [
  async (_: UserData) => {
    await db.execAsync(
      "ALTER TABLE word_definition_data ADD COLUMN spelling TEXT NOT NULL DEFAULT ''",
    );

    const definitionIterator = db.getEachAsync<{ [key: string]: number }>(
      "SELECT id, sharedId FROM word_definition_data",
    );
    const selectSpelling = await db.prepareAsync(
      "SELECT spelling FROM word_shared_data WHERE id = $id",
    );
    const updateSpelling = await db.prepareAsync(
      "UPDATE word_definition_data SET spelling = $spelling WHERE id = $id",
    );

    for await (const { id, sharedId } of definitionIterator) {
      const execResult = await selectSpelling.executeAsync<{
        spelling: string;
      }>({
        $id: sharedId,
      });
      const result = await execResult.getFirstAsync();

      if (result) {
        await updateSpelling.executeAsync({
          $id: id,
          $spelling: result.spelling,
        });
      }
    }
  },
  async (userData: UserData) => {
    // request a stats update by marking an incomplete stat update
    userData.updatingStats = true;
  },
  async () => {
    await db.execAsync("DROP INDEX IF EXISTS word_shared_data_spelling_index");

    const spellingIterator = db.getEachAsync<{
      id: number;
      spelling: string;
    }>("SELECT id, spelling FROM word_shared_data");
    const updateStatement = await db.prepareAsync(
      "UPDATE word_shared_data SET insensitiveSpelling = $normalized WHERE id = $id",
    );

    for await (const { id, spelling } of spellingIterator) {
      await updateStatement.executeAsync({
        $id: id,
        $normalized: normalize(spelling),
      });
    }
  },
];

export const dataRevisions = migrateUpList.length;

export async function migrateUp(data: UserData) {
  log("userData.version = " + data.version);

  if (data.version >= dataRevisions) {
    return false;
  }

  backupDb();

  try {
    for (let i = data.version; i < dataRevisions; i++) {
      log("Migrating userData to version " + (i + 1));
      await migrateUpList[i](data);
      log("Migration complete");
    }
  } catch (err) {
    restoreDbFromBackup();
    throw err;
  }

  deleteBackup();

  data.version = dataRevisions;
  return true;
}

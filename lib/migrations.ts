import { UserData } from "./data";
import db from "./db";
import { log } from "./log";

const migrateUpList = [
  async (_: UserData) => {
    await db.execAsync(
      "ALTER TABLE word_definition_data ADD COLUMN spelling TEXT NOT NULL DEFAULT ''"
    );

    const definitionIterator = db.getEachAsync<{ [key: string]: number }>(
      "SELECT id, sharedId FROM word_definition_data"
    );
    const selectSpelling = await db.prepareAsync(
      "SELECT spelling FROM word_shared_data WHERE id = $id"
    );
    const updateSpelling = await db.prepareAsync(
      "UPDATE word_definition_data SET spelling = $spelling WHERE id = $id"
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
];

export const dataRevisions = migrateUpList.length;

export async function migrateUp(data: UserData) {
  log("userData.version = " + data.version);

  if (data.version >= dataRevisions) {
    return false;
  }

  for (let i = data.version; i < dataRevisions; i++) {
    log("Migrating userData to version  " + (i + 1));
    await migrateUpList[i](data);
    log("Migration complete");
  }

  data.version = dataRevisions;
  return true;
}

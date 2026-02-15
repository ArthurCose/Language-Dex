import { assert, assertDeepEq, createWords, LabeledTest } from "./util";
import {
  RelationEditorSynonym,
  RelationsEditorData,
} from "@/lib/components/definitions/relations-editor";
import { deleteDictionary, getWordDefinitions } from "@/lib/data";
import db from "@/lib/db";

export const SYNONYM_TESTS: LabeledTest[] = [
  [
    "Synonyms",
    async (params) => {
      async function countClusters() {
        const result = await db.getFirstAsync<{ "COUNT(*)": number }>(
          "SELECT COUNT(*) FROM synonym_clusters",
        );
        return result!["COUNT(*)"];
      }

      const originalClusterCount = await countClusters();

      const dictionaryId = params.nextDictionaryId;

      await createWords(dictionaryId, ["a", "b", "c", "d"]);

      async function getDefinition(lowercaseSpelling: string) {
        return (await getWordDefinitions(dictionaryId, lowercaseSpelling))!
          .definitions[0];
      }

      function assertRelationWords(
        words: RelationEditorSynonym[],
        expected: string[],
        message: string,
      ) {
        assertDeepEq(
          words.map((w) => w.spelling),
          expected,
          message,
        );
      }

      function settle(data: RelationsEditorData): Promise<void> {
        if (data.totalLoading.get() == 0) {
          return Promise.resolve();
        }

        return new Promise((resolve) => {
          const listener = () => {
            if (data.totalLoading.get() == 0) {
              data.totalLoading.unsubscribe(listener);
              resolve();
            }
          };

          data.totalLoading.subscribe(listener);
        });
      }

      let wordA = await getDefinition("a");
      let wordB = await getDefinition("b");
      let wordC = await getDefinition("c");

      // set relation between 'a' and 'b'
      let relationsA = new RelationsEditorData(wordA);
      await settle(relationsA);

      relationsA.updateWords("Synonyms", [wordB, wordC]);
      await settle(relationsA);
      assertRelationWords(
        relationsA.synonyms.get(),
        ["b", "c"],
        "Added synonyms",
      );

      relationsA.updateWords("Antonyms", [wordC]);
      await settle(relationsA);
      assertRelationWords(
        relationsA.synonyms.get(),
        ["b"],
        "Removed 'c' from synonyms",
      );
      assertRelationWords(
        relationsA.antonyms.get(),
        ["c"],
        "Moved 'c' to antonyms",
      );

      await relationsA.save(wordA);

      // verify everything saved
      wordA = await getDefinition("a");
      relationsA = new RelationsEditorData(wordA);
      await settle(relationsA);
      assertRelationWords(relationsA.synonyms.get(), ["b"], "Synonyms saved");
      assertRelationWords(relationsA.antonyms.get(), ["c"], "Antonyms saved");
      assertDeepEq(
        originalClusterCount + 2,
        await countClusters(),
        "We should have a cluster created for synonyms and antoynms",
      );

      // reload words
      wordA = await getDefinition("a");
      wordB = await getDefinition("b");
      wordC = await getDefinition("c");

      assert(wordA.synonymsId != null, "Synonyms set");
      assertDeepEq(
        wordA.synonymsId,
        wordB.synonymsId,
        "'a' and 'b' should be in the same synonym cluster",
      );
      assert(
        wordC.synonymsId != null && wordC.synonymsId != wordA.synonymsId,
        "Separate synonym cluster for 'c'",
      );

      // loading existing synonyms into synonyms
      let wordD = await getDefinition("d");
      let relationsD = new RelationsEditorData(wordD);
      await settle(relationsD);

      relationsD.updateWords("Synonyms", [wordB]);
      await settle(relationsD);
      assertRelationWords(
        relationsD.synonyms.get(),
        ["a", "b"],
        "Loaded 'a' from 'b's synonyms into synonyms",
      );
      assertRelationWords(
        relationsD.antonyms.get(),
        ["c"],
        "Loaded 'c' from 'b's antonyms into antonyms",
      );

      relationsD.updateWords("Antonyms", [...relationsD.antonyms.get(), wordB]);
      await settle(relationsD);
      assertRelationWords(
        relationsD.synonyms.get(),
        ["a"],
        "Removed 'b' from synonyms",
      );
      assertRelationWords(
        relationsD.antonyms.get(),
        ["b", "c"],
        "Moved 'b' to antonyms",
      );

      // loading existing synonyms into antonyms
      relationsD = new RelationsEditorData(wordD);
      await settle(relationsD);

      relationsD.updateWords("Antonyms", [wordB]);
      await settle(relationsD);

      assertRelationWords(
        relationsD.synonyms.get(),
        ["c"],
        "Loaded 'c' from 'b's antonyms into synonyms",
      );
      assertRelationWords(
        relationsD.antonyms.get(),
        ["a", "b"],
        "Loaded 'a' from 'b's synonyms into antonyms",
      );
      await relationsD.save(wordD);

      // verify save
      wordA = await getDefinition("a");
      relationsA = new RelationsEditorData(wordA);
      await settle(relationsA);
      assertRelationWords(
        relationsA.antonyms.get(),
        ["c", "d"],
        "'d' exists in 'a's antonyms",
      );
      assertDeepEq(
        originalClusterCount + 2,
        await countClusters(),
        "No extra clusters after merging synonym cluster",
      );

      // unlink
      wordD = await getDefinition("d");
      relationsD.unlink();
      await relationsD.save(wordD);

      wordA = await getDefinition("a");
      relationsA = new RelationsEditorData(wordA);
      await settle(relationsA);
      assertRelationWords(
        relationsA.antonyms.get(),
        ["c"],
        "'d' removed from 'a's antonyms after unlinking",
      );

      // deleting synonym group by emptying antonyms
      relationsA.updateWords("Antonyms", []);
      await settle(relationsA);
      await relationsA.save(wordA);

      wordA = await getDefinition("a");
      relationsA = new RelationsEditorData(wordA);
      await settle(relationsA);
      assertRelationWords(relationsA.antonyms.get(), [], "No antonyms for 'a'");
      assertDeepEq(
        originalClusterCount + 1,
        await countClusters(),
        "Cluster deleted from empty antonyms",
      );

      // Add 'd' back to antonyms to prep for testing unlinking
      wordD = await getDefinition("d");
      relationsA.updateWords("Antonyms", [wordD]);
      await settle(relationsA);
      await relationsA.save(wordA);

      assertDeepEq(
        originalClusterCount + 2,
        await countClusters(),
        "New cluster for antonyms",
      );

      // unlink
      wordD = await getDefinition("d");
      relationsD = new RelationsEditorData(wordD);
      await settle(relationsD);
      relationsD.unlink();
      await relationsD.save(wordD);

      wordD = await getDefinition("d");
      assertDeepEq(
        wordD.synonymsId,
        null,
        "No cluster associated after unlinking",
      );
      assertDeepEq(
        originalClusterCount + 1,
        await countClusters(),
        "Cluster deleted from unlinking",
      );

      // clean up
      await deleteDictionary(dictionaryId);
      assertDeepEq(
        originalClusterCount,
        await countClusters(),
        "Synonym clusters should be deleted with the dictionary",
      );
    },
  ],
];

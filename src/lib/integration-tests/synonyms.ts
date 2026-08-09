import {
  assert,
  assertDeepEq,
  createWords,
  LabeledTest,
  TestParams,
} from "./util";
import { RelationsEditorData } from "@/src/lib/components/definitions/relations-editor";
import {
  deleteDefinition,
  deleteDictionary,
  deleteWord,
  getWordDefinitions,
  WordDefinitionData,
} from "@/src/lib/data";
import db from "@/src/lib/db";

async function getDefinition(dictionaryId: number, lowercaseSpelling: string) {
  return (await getWordDefinitions(dictionaryId, lowercaseSpelling))!
    .definitions[0];
}

async function countClusters() {
  const result = await db.getFirstAsync<{ "COUNT(*)": number }>(
    "SELECT COUNT(*) FROM synonym_clusters",
  );
  return result!["COUNT(*)"];
}

class SynonymTestEnvironment {
  dictionaryId: number;
  wordDefinitions: { [key: string]: WordDefinitionData | undefined };

  constructor(params: TestParams) {
    this.wordDefinitions = {};
    this.dictionaryId = params.nextDictionaryId;
  }

  async getOrLoadDefinition(lowercaseSpelling: string) {
    let definition = this.wordDefinitions[lowercaseSpelling];

    if (!definition) {
      definition = (await getDefinition(this.dictionaryId, lowercaseSpelling))!;
      this.wordDefinitions[lowercaseSpelling] = definition;
    }

    return definition;
  }

  async loadEditor(lowercaseSpelling: string) {
    const definition = await this.getOrLoadDefinition(lowercaseSpelling);
    const wrapper = new SynonymEditorWrapper(this, definition);

    await wrapper.reload();

    return wrapper;
  }
}

// adapts the relations editor to reduce footguns when writing tests
class SynonymEditorWrapper {
  #env: SynonymTestEnvironment;
  #editor: RelationsEditorData;
  #spelling: string;
  #prevConnections: string[];

  constructor(env: SynonymTestEnvironment, definition: WordDefinitionData) {
    this.#env = env;
    this.#editor = undefined!; // we'll set this later
    this.#spelling = definition.spelling;
    this.#prevConnections = [];
  }

  async #settle(): Promise<void> {
    if (this.#editor.totalLoading.get() == 0) {
      return Promise.resolve();
    }

    return new Promise((resolve) => {
      const listener = () => {
        if (this.#editor.totalLoading.get() == 0) {
          this.#editor.totalLoading.unsubscribe(listener);
          resolve();
        }
      };

      this.#editor.totalLoading.subscribe(listener);
    });
  }

  async reload() {
    this.#editor = new RelationsEditorData(
      this.#env.wordDefinitions[this.#spelling],
    );

    await this.#settle();

    this.#updateConnections();
  }

  #updateConnections() {
    this.#prevConnections = this.#editor.synonyms.get().map((w) => w.spelling);
    this.#prevConnections.push(
      ...this.#editor.antonyms.get().map((w) => w.spelling),
    );
  }

  unlink() {
    this.#editor.unlink();
    this.#prevConnections.length = 0;
  }

  async addSynonyms(lowercaseWords: string[]) {
    const definitions = await Promise.all(
      lowercaseWords.map((spelling) => this.#env.getOrLoadDefinition(spelling)),
    );

    this.#editor.updateWords("Synonyms", [
      ...this.#editor.synonyms.get(),
      ...definitions,
    ]);

    await this.#settle();
  }

  async setAntonyms(lowercaseWords: string[]) {
    const definitions = await Promise.all(
      lowercaseWords.map((spelling) => this.#env.getOrLoadDefinition(spelling)),
    );

    this.#editor.updateWords("Antonyms", definitions);

    await this.#settle();
  }

  async setSynonyms(lowercaseWords: string[]) {
    const definitions = await Promise.all(
      lowercaseWords.map((spelling) => this.#env.getOrLoadDefinition(spelling)),
    );

    this.#editor.updateWords("Synonyms", definitions);

    await this.#settle();
  }

  async addAntonyms(lowercaseWords: string[]) {
    const definitions = await Promise.all(
      lowercaseWords.map((spelling) => this.#env.getOrLoadDefinition(spelling)),
    );

    this.#editor.updateWords("Antonyms", [
      ...this.#editor.antonyms.get(),
      ...definitions,
    ]);

    await this.#settle();
  }

  async save() {
    const definition = this.#env.wordDefinitions[this.#spelling]!;
    await this.#editor.save(definition);

    const synonymsId = this.#editor.synonymsId.get();
    const antonymsId = this.#editor.antonymsId;

    definition.synonymsId = synonymsId;

    // unset synonymIds for old connections
    for (const spelling of this.#prevConnections) {
      const definition = this.#env.wordDefinitions[spelling];

      if (definition) {
        definition.synonymsId = null;
      }
    }

    // set synonymIds for the latest synonyms
    for (const { spelling } of this.#editor.synonyms.get()) {
      const definition = this.#env.wordDefinitions[spelling];

      if (definition) {
        definition.synonymsId = synonymsId;
      }
    }

    // set synonymIds for the latest antonyms
    for (const { spelling } of this.#editor.antonyms.get()) {
      const definition = this.#env.wordDefinitions[spelling];

      if (definition) {
        definition.synonymsId = antonymsId;
      }
    }

    // update connections for future changes
    this.#updateConnections();
  }

  assertSynonyms(expected: string[], message: string) {
    assertDeepEq(
      this.#editor.synonyms.get().map((w) => w.spelling),
      expected,
      message,
    );
  }

  assertAntonyms(expected: string[], message: string) {
    assertDeepEq(
      this.#editor.antonyms.get().map((w) => w.spelling),
      expected,
      message,
    );
  }
}

export const SYNONYM_TESTS: LabeledTest[] = [
  [
    "Synonym Basics",
    async (params) => {
      const dictionaryId = params.nextDictionaryId;
      const originalClusterCount = await countClusters();
      const env = new SynonymTestEnvironment(params);

      await createWords(dictionaryId, ["a", "b", "c", "d"]);

      // set relation between 'a' and 'b'
      const relationsA = await env.loadEditor("a");
      await relationsA.addSynonyms(["b", "c"]);
      relationsA.assertSynonyms(["b", "c"], "Added synonyms");

      await relationsA.addAntonyms(["c"]);
      relationsA.assertSynonyms(["b"], "Removed 'c' from synonyms");
      relationsA.assertAntonyms(["c"], "Moved 'c' to antonyms");

      await relationsA.save();

      // verify everything saved
      await relationsA.reload();
      relationsA.assertSynonyms(["b"], "Synonyms saved");
      relationsA.assertAntonyms(["c"], "Antonyms saved");
      assertDeepEq(
        originalClusterCount + 2,
        await countClusters(),
        "We should have a cluster created for synonyms and antoynms",
      );

      // check definitions
      const wordA = await getDefinition(dictionaryId, "a");
      const wordB = await getDefinition(dictionaryId, "b");
      const wordC = await getDefinition(dictionaryId, "c");

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
    },
  ],
  [
    "Synonym Switching",
    async (params) => {
      const dictionaryId = params.nextDictionaryId;
      const env = new SynonymTestEnvironment(params);

      await createWords(dictionaryId, ["a", "b", "c"]);

      // set relation between 'a' and 'b'
      const relationsA = await env.loadEditor("a");
      await relationsA.addSynonyms(["b", "c"]);

      await relationsA.addAntonyms(["c"]);
      relationsA.assertAntonyms(["c"], "Moved 'c' to antonyms");
      relationsA.assertSynonyms(["b"], "Removed 'c' from synonyms");

      await relationsA.addSynonyms(["c"]);
      relationsA.assertSynonyms(["b", "c"], "Moved 'c' back to synonyms");
      relationsA.assertAntonyms([], "Removed 'c' from antonyms");
    },
  ],
  [
    "Synonym Merging",
    async (params) => {
      const dictionaryId = params.nextDictionaryId;
      const originalClusterCount = await countClusters();
      const env = new SynonymTestEnvironment(params);

      await createWords(dictionaryId, ["a", "b", "c", "d"]);

      const relationsA = await env.loadEditor("a");
      await relationsA.addSynonyms(["b"]);
      await relationsA.addAntonyms(["c"]);
      await relationsA.save();

      // loading existing synonyms into synonyms
      const relationsD = await env.loadEditor("d");
      await relationsD.addSynonyms(["b"]);
      relationsD.assertSynonyms(
        ["a", "b"],
        "Loaded 'a' from 'b's synonyms into synonyms",
      );
      relationsD.assertAntonyms(
        ["c"],
        "Loaded 'c' from 'b's antonyms into antonyms",
      );

      // removing synonyms
      await relationsD.setSynonyms(["a"]);
      relationsD.assertSynonyms(["a"], "Removed 'b' from synonyms");
      relationsD.assertAntonyms(["c"], "Only 'c' in antonyms");

      // moving antonyms to synonyms
      await relationsD.addSynonyms(["c"]);
      relationsD.assertSynonyms(["a", "c"], "Moved 'c' to synonyms");
      relationsD.assertAntonyms([], "Removed 'c' from antonyms");

      // adding old synonyms into antonyms
      await relationsD.addAntonyms(["b"]);
      relationsD.assertSynonyms(["a", "c"], "Retained synonyms");
      relationsD.assertAntonyms(["b"], "Added 'b' to antonyms");

      // conflicting simultaneous synonyms
      await relationsD.reload();
      await relationsD.setSynonyms(["a", "c"]);
      relationsD.assertSynonyms(
        ["a", "b", "c"],
        "Prioritizes the working list",
      );
      relationsD.assertAntonyms([], "No duplicates from conflicting additions");

      // loading existing synonyms into antonyms
      await relationsD.reload();
      await relationsD.addAntonyms(["b"]);
      relationsD.assertSynonyms(
        ["c"],
        "Loaded 'c' from 'b's antonyms into synonyms",
      );
      relationsD.assertAntonyms(
        ["a", "b"],
        "Loaded 'a' from 'b's synonyms into antonyms",
      );
      await relationsD.save();

      // verify save
      await relationsA.reload();
      relationsA.assertAntonyms(["c", "d"], "'d' exists in 'a's antonyms");
      assertDeepEq(
        originalClusterCount + 2,
        await countClusters(),
        "No extra clusters after merging synonym cluster",
      );
    },
  ],
  [
    "Synonym Unlink",
    async (params) => {
      const dictionaryId = params.nextDictionaryId;
      const originalClusterCount = await countClusters();
      const env = new SynonymTestEnvironment(params);

      await createWords(dictionaryId, ["a", "b", "c", "d"]);

      // set relations
      const relationsA = await env.loadEditor("a");
      await relationsA.addSynonyms(["b", "c"]);
      await relationsA.addAntonyms(["d"]);
      await relationsA.save();

      assertDeepEq(
        originalClusterCount + 2,
        await countClusters(),
        "Clusters should increase after saving synonyms",
      );

      // unlink 'a'
      relationsA.unlink();
      await relationsA.save();

      assertDeepEq(
        originalClusterCount + 2,
        await countClusters(),
        "Clusters shouldn't delete when 2 or more words remain",
      );

      // verify 'a' was unlinked, then unlink 'd'
      const relationsD = await env.loadEditor("d");
      relationsD.assertAntonyms(
        ["b", "c"],
        "'a' should no longer be synonymous with 'b' and 'c'",
      );
      relationsD.unlink();
      await relationsD.save();

      assertDeepEq(
        originalClusterCount + 1,
        await countClusters(),
        "Clusters should delete when only antonyms exist",
      );

      // verify 'd' unlinked, then unlink 'b'
      const relationsB = await env.loadEditor("b");
      relationsB.assertSynonyms(
        ["c"],
        "'b' should still be synonymous with 'c'",
      );
      relationsB.assertAntonyms(
        [],
        "No antonyms should exist after 'd' unlinked",
      );
      relationsB.unlink();
      await relationsB.save();

      // todo: clusters should delete when there's only 1 synonym and no antonyms
      const relationsC = await env.loadEditor("c");
      relationsC.unlink();
      await relationsC.save();

      assertDeepEq(
        originalClusterCount,
        await countClusters(),
        "Clusters should delete after completely unlinking",
      );
    },
  ],
  [
    "Synonyms Emptied",
    async (params) => {
      const dictionaryId = params.nextDictionaryId;
      const originalClusterCount = await countClusters();
      const env = new SynonymTestEnvironment(params);

      const words = ["a", "b", "c"];
      await createWords(dictionaryId, words);

      const relationsA = await env.loadEditor("a");

      async function setRelations() {
        await relationsA.addSynonyms(["b"]);
        await relationsA.addAntonyms(["c"]);
        await relationsA.save();

        assertDeepEq(
          originalClusterCount + 2,
          await countClusters(),
          "Clusters should increase after saving synonyms + antonyms",
        );
      }

      async function assertNoRelation() {
        for (const lowercaseSpelling of words) {
          const definition = await getDefinition(
            dictionaryId,
            lowercaseSpelling,
          );

          assertDeepEq(
            definition.synonymsId,
            null,
            "Synonym cluster should be null after clearing sets",
          );
        }

        assertDeepEq(
          originalClusterCount,
          await countClusters(),
          "Clusters should delete when clearing synonyms and antonyms",
        );
      }

      // set relations
      await setRelations();

      // test separately clearing antonyms and synonyms
      await relationsA.setAntonyms([]);
      await relationsA.save();

      await relationsA.setSynonyms([]);
      await relationsA.save();

      await assertNoRelation();

      // reset relations
      await setRelations();

      // clear synonyms and antonyms at the same time and test
      await relationsA.setAntonyms([]);
      await relationsA.setSynonyms([]);
      await relationsA.save();
      await assertNoRelation();
    },
  ],
  [
    "Synonym Indirect Deletion",
    async (params) => {
      const dictionaryId = params.nextDictionaryId;
      const originalClusterCount = await countClusters();
      const env = new SynonymTestEnvironment(params);

      const wordIds = await createWords(dictionaryId, [
        "a",
        "b",
        "c",
        "d",
        "e",
        "f",
      ]);

      // set relations
      const relationsA = await env.loadEditor("a");
      await relationsA.addSynonyms(["b"]);
      await relationsA.save();

      const relationsC = await env.loadEditor("c");
      await relationsC.addSynonyms(["d"]);
      await relationsC.save();

      const relationsE = await env.loadEditor("e");
      await relationsE.addSynonyms(["f"]);
      await relationsE.save();

      assertDeepEq(
        originalClusterCount + 3,
        await countClusters(),
        "Clusters should increase after saving synonyms",
      );

      // deleting individual definitons
      await deleteDefinition(wordIds[0]);
      await deleteDefinition(wordIds[1]);

      assertDeepEq(
        originalClusterCount + 2,
        await countClusters(),
        "Clusters should delete with definitions",
      );

      // deleting shared word data
      await deleteWord(dictionaryId, "c");
      await deleteWord(dictionaryId, "d");

      assertDeepEq(
        originalClusterCount + 1,
        await countClusters(),
        "Clusters should delete with shared word data",
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

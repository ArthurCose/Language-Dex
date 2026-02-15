import {
  assert,
  assertDeepEq,
  createWords,
  LabeledTest,
  TestParams,
} from "./util";
import { RelationsEditorData } from "@/lib/components/definitions/relations-editor";
import {
  deleteDictionary,
  getWordDefinitions,
  WordDefinitionData,
} from "@/lib/data";
import db from "@/lib/db";

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
    "Synonyms",
    async (params) => {
      const originalClusterCount = await countClusters();

      const dictionaryId = params.nextDictionaryId;

      await createWords(dictionaryId, ["a", "b", "c", "d"]);

      const env = new SynonymTestEnvironment(params);

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

      // reload words
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

      await relationsD.addAntonyms(["b"]);
      relationsD.assertSynonyms(["a"], "Removed 'b' from synonyms");
      relationsD.assertAntonyms(["b", "c"], "Moved 'b' to antonyms");

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

      // unlink
      relationsD.unlink();
      await relationsD.save();

      await relationsA.reload();
      relationsA.assertAntonyms(
        ["c"],
        "'d' removed from 'a's antonyms after unlinking",
      );

      // deleting synonym group by emptying antonyms
      await relationsA.setAntonyms([]);
      await relationsA.save();

      await relationsA.reload();
      relationsA.assertAntonyms([], "No antonyms for 'a'");
      assertDeepEq(
        originalClusterCount + 1,
        await countClusters(),
        "Cluster deleted from empty antonyms",
      );

      // Add 'd' back to antonyms to prep for testing unlinking
      await relationsA.setAntonyms(["d"]);
      await relationsA.save();

      assertDeepEq(
        originalClusterCount + 2,
        await countClusters(),
        "New cluster for antonyms",
      );

      // unlink
      await relationsD.reload();
      relationsD.unlink();
      await relationsD.save();

      const wordD = await getDefinition(dictionaryId, "d");
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

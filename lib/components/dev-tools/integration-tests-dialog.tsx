import React, { useState } from "react";
import {
  Pressable,
  PressableAndroidRippleConfig,
  StyleProp,
  StyleSheet,
  View,
  ViewStyle,
  VirtualizedList,
} from "react-native";
import { useTranslation } from "react-i18next";
import Dialog, { DialogTitle } from "@/lib/components/dialog";
import {
  ConfirmationDialogAction,
  ConfirmationDialogActions,
} from "@/lib/components/confirmation-dialog";
import { Span } from "../text";
import { useUserDataSignal } from "@/lib/contexts/user-data";
import { useSignalLens } from "@/lib/hooks/use-signal";
import { deepEqual } from "expo-sqlite";
import {
  RelationEditorSynonym,
  RelationsEditorData,
} from "../definitions/relations-editor";

import {
  deleteDefinition,
  deleteDictionary,
  deleteWord,
  getWordDefinitions,
  listGameWords,
  listWords,
  upsertDefinition,
} from "@/lib/data";
import db from "@/lib/db";

function createWord(dictionaryId: number, spelling: string) {
  return upsertDefinition(dictionaryId, {
    spelling,
    confidence: 0,
    definition: "",
    example: "",
    notes: "",
  });
}

function assertDeepEq(a: any, b: any, message: string) {
  if (!deepEqual(a, b)) {
    throw `Assertion failed: "${message}"\n\na: ${JSON.stringify(a, null, 2)}\nb: ${JSON.stringify(b, null, 2)}`;
  }
}

function assert(condition: boolean, message: string) {
  if (!condition) {
    throw `Assertion failed: "${message}"`;
  }
}

const TESTS: LabeledTest[] = [
  [
    "Definitions",
    async (params) => {
      const dictionaryId = params.nextDictionaryId;

      // Promise.all creates race conditions for shared word data
      // Users can't enter multiple words in parallel normally so we don't handle this issue
      const definitionIds = [
        await createWord(dictionaryId, "A"),
        await createWord(dictionaryId, "a"),
        await createWord(dictionaryId, "a"),
        await createWord(dictionaryId, "b"),
      ];

      function listSharedWords() {
        return listWords(dictionaryId, { orderBy: "alphabetical" });
      }

      async function listDefinitionSpellings() {
        const gameWords = await listGameWords(dictionaryId);
        const words = gameWords.map((w) => w.spelling);
        words.sort();
        return words;
      }

      assertDeepEq(
        await listDefinitionSpellings(),
        ["A", "a", "a", "b"],
        "Every definition should be inserted",
      );
      assertDeepEq(
        await listSharedWords(),
        ["A", "b"],
        "Definitions should be grouped by case insensitive spelling",
      );

      // Remove a definition
      await deleteDefinition(definitionIds[1]);
      assertDeepEq(
        await listDefinitionSpellings(),
        ["A", "a", "b"],
        "Only 'a' should be removed",
      );

      // Remove a word
      await deleteWord(dictionaryId, "A");
      assertDeepEq(
        await listDefinitionSpellings(),
        ["b"],
        "All definitions matching 'A' should be removed",
      );
      assertDeepEq(
        await listSharedWords(),
        ["b"],
        "Shared words matching 'A' should be removed",
      );

      // clean up
      await deleteDictionary(dictionaryId);
      assertDeepEq(
        await listDefinitionSpellings(),
        [],
        "Definitions cleaned up",
      );
      assertDeepEq(await listSharedWords(), [], "Shared words cleaned up");
    },
  ],
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

      // Promise.all creates race conditions for shared word data
      // Users can't enter multiple words in parallel normally so we don't handle this issue
      await createWord(dictionaryId, "a");
      await createWord(dictionaryId, "b");
      await createWord(dictionaryId, "c");
      await createWord(dictionaryId, "d");

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

type LabeledTest = [string, (params: TestParams) => Promise<void>];
type TestParams = { nextDictionaryId: number };
type TestResult = "passed" | "failed";
type TestResults = { [key: string]: TestResult };

type Props = {
  style?: StyleProp<ViewStyle>;
  android_ripple: PressableAndroidRippleConfig;
} & React.PropsWithChildren;

export default function ({ style, android_ripple, children }: Props) {
  const [t] = useTranslation();
  const [open, setOpen] = useState(false);
  const [completed, setCompleted] = useState(false);
  const [results, setResults] = useState<TestResults>({});

  const userDataSignal = useUserDataSignal();
  const testParams: TestParams = useSignalLens(userDataSignal, (userData) => ({
    nextDictionaryId: userData.nextDictionaryId,
  }));

  return (
    <>
      <Pressable
        style={style}
        android_ripple={android_ripple}
        pointerEvents="box-only"
        onPress={async () => {
          setOpen(true);

          const results: TestResults = {};

          for (const [label, test] of TESTS) {
            console.log("Testing " + label + "...");

            try {
              await test(testParams);
              results[label] = "passed";
            } catch (err) {
              console.error(err);
              results[label] = "failed";
            }

            setResults({ ...results });
          }

          // make sure we've cleaned up in case a test fails
          await deleteDictionary(testParams.nextDictionaryId);

          setCompleted(true);
        }}
      >
        {children}
      </Pressable>

      <Dialog
        open={open}
        onClose={() => {
          if (completed) {
            setOpen(false);
          }
        }}
      >
        <DialogTitle>Integration Tests</DialogTitle>

        <VirtualizedList<LabeledTest>
          data={TESTS}
          getItemCount={() => TESTS.length}
          getItem={(data, index) => data[index]}
          keyExtractor={(item) => item[0]}
          style={styles.list}
          renderItem={({ item }) => {
            const result = results[item[0]];
            let resultText = "...";

            if (result == "passed") {
              resultText = "✅";
            } else if (result == "failed") {
              resultText = "❌";
            }

            return (
              <View style={styles.row}>
                <Span>{item[0]}</Span>
                <Span>{resultText}</Span>
              </View>
            );
          }}
        />

        <ConfirmationDialogActions>
          <ConfirmationDialogAction
            disabled={!completed}
            onPress={() => setOpen(false)}
          >
            {t("Close")}
          </ConfirmationDialogAction>
        </ConfirmationDialogActions>
      </Dialog>
    </>
  );
}

const styles = StyleSheet.create({
  list: {
    paddingTop: 10,
  },
  row: {
    paddingHorizontal: 16,
    paddingVertical: 6,
    justifyContent: "space-between",
    flexDirection: "row",
  },
});

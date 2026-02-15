import { assertDeepEq, createWord, LabeledTest } from "./util";
import {
  deleteDefinition,
  deleteDictionary,
  deleteWord,
  listGameWords,
  listWords,
} from "@/lib/data";

export const DEFINITION_TESTS: LabeledTest[] = [
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
];

import { assertDeepEq, createWords, LabeledTest } from "./util";
import {
  deleteEntry,
  deleteDictionary,
  deleteWord,
  listGameWords,
  listWords,
} from "@/src/lib/data";

export const DICTIONARY_ENTRY_TESTS: LabeledTest[] = [
  [
    "Definitions",
    async (params) => {
      const dictionaryId = params.nextDictionaryId;

      const entryIds = await createWords(dictionaryId, ["A", "a", "a", "b"]);

      function listSharedWords() {
        return listWords(dictionaryId, { orderBy: "alphabetical" });
      }

      async function listSpellings() {
        const gameWords = await listGameWords(dictionaryId);
        const words = gameWords.map((w) => w.spelling);
        words.sort();
        return words;
      }

      assertDeepEq(
        await listSpellings(),
        ["A", "a", "a", "b"],
        "Every entry should be inserted",
      );
      assertDeepEq(
        await listSharedWords(),
        ["A", "b"],
        "Entries should be grouped by case insensitive spelling",
      );

      // Remove an entry
      await deleteEntry(entryIds[1]);
      assertDeepEq(
        await listSpellings(),
        ["A", "a", "b"],
        "Only 'a' should be removed",
      );

      // Remove a word
      await deleteWord(dictionaryId, "A");
      assertDeepEq(
        await listSpellings(),
        ["b"],
        "All entries matching 'A' should be removed",
      );
      assertDeepEq(
        await listSharedWords(),
        ["b"],
        "Shared words matching 'A' should be removed",
      );

      // clean up
      await deleteDictionary(dictionaryId);
      assertDeepEq(await listSpellings(), [], "Entries cleaned up");
      assertDeepEq(await listSharedWords(), [], "Shared words cleaned up");
    },
  ],
];

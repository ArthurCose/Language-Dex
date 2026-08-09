import { deepEqual } from "expo-sqlite";
import { upsertDefinition } from "@/src/lib/data";

export type TestParams = { nextDictionaryId: number };
export type LabeledTest = [string, (params: TestParams) => Promise<void>];

export function createWord(dictionaryId: number, spelling: string) {
  return upsertDefinition(dictionaryId, {
    spelling,
    confidence: 0,
    definition: "",
    example: "",
    notes: "",
  });
}

export async function createWords(dictionaryId: number, spellings: string[]) {
  const ids = [];

  // Promise.all creates race conditions for shared word data
  // Users can't enter multiple words in parallel normally so we don't handle this issue
  for (const spelling of spellings) {
    ids.push(
      await upsertDefinition(dictionaryId, {
        spelling,
        confidence: 0,
        definition: "",
        example: "",
        notes: "",
      }),
    );
  }

  return ids;
}

export function assertDeepEq(a: any, b: any, message: string) {
  // expo-sqlite's type definitions are wrong, casting to undefined to avoid type errors
  if (!deepEqual(a as undefined, b as undefined)) {
    throw new Error(
      `Assertion failed: "${message}"\n\na: ${JSON.stringify(a, null, 2)}\nb: ${JSON.stringify(b, null, 2)}`,
    );
  }
}

export function assert(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(`Assertion failed: "${message}"`);
  }
}

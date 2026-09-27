import * as SQLite from "expo-sqlite";
import { File, Paths } from "expo-file-system";
import db, { extractCount } from "./db";
import { CsvTransformStream, encodeCsvField } from "../csv";
import { upsertDefinition, WordDefinitionUpsertData } from "./dictionary-words";
import { DictionaryData } from "./dictionary-meta";

export const csvColumns = [
  "id",
  "spelling",
  "partOfSpeech",
  "definition",
  "example",
  "notes",
];

const exportMap: { [key: string]: string } = {
  id: "I",
  spelling: "S",
  partOfSpeech: "P",
  definition: "D",
  example: "E",
  notes: "N",
};

const importMap = Object.fromEntries(
  Object.entries(exportMap).map(([k, v]) => [v, k]),
);

const translationMap: { [key: string]: string } = {
  id: "ID",
  spelling: "Spelling",
  partOfSpeech: "Part_of_Speech",
  definition: "Definition",
  example: "Example",
  notes: "Notes",
};

type FieldUpsertPass = (
  dictionary: DictionaryData,
  data: Partial<WordDefinitionUpsertData>,
  value?: string,
) => void;

const fieldUpsertMap: { [key: string]: FieldUpsertPass } = {
  id(_, data, value) {
    data.id = value != undefined ? parseInt(value) : undefined;
  },
  spelling(_, data, value) {
    data.spelling = value?.trim() ?? "";
  },
  partOfSpeech(dictionary, data, value) {
    if (value == null) {
      data.partOfSpeech = undefined;
      return;
    }

    const lowerCased = value.toLowerCase();
    data.partOfSpeech = dictionary.partsOfSpeech.find(
      (partOfSpeech) => partOfSpeech.name.toLowerCase() == lowerCased,
    )?.id;
  },
  definition(_, data, value) {
    data.definition = value ?? "";
  },
  example(_, data, value) {
    data.example = value ?? "";
  },
  notes(_, data, value) {
    data.notes = value ?? "";
  },
};

/**
 * Creates a new csv file, overwriting any previously exported csv file.
 *
 * Returns the path to the csv file.
 */
export async function exportCsv(
  translate: (s: string) => string,
  columns: string[],
  dictionary: DictionaryData,
  progressCallback: (i: number, total: number) => void,
): Promise<string> {
  // prepare
  const partOfSpeechMap: { [id: number]: string } = {};

  for (const data of dictionary.partsOfSpeech) {
    partOfSpeechMap[data.id] = data.name;
  }

  // create file
  const file = Paths.cache.createFile("export.csv", "text/csv");

  // resolve query
  const sourceQuery = [
    "SELECT",
    columns.join(", "),
    "FROM word_definition_data",
    "WHERE dictionaryId = $dictionaryId",
  ];
  const sourceParams: SQLite.SQLiteBindParams = {
    $dictionaryId: dictionary.id,
  };

  sourceQuery.push(`ORDER BY spelling ASC`);

  const queryString = sourceQuery.join(" ");
  const sourceTotal = await extractCount(db, queryString, sourceParams);
  const sourceResults = db.getEachAsync<{ [key: string]: unknown }>(
    queryString,
    sourceParams,
  );

  // write header
  const translatedColumns = columns.map(
    (c) => `${translate(translationMap[c])} (${exportMap[c]})`,
  );
  file.write(translatedColumns.join(",") + "\r\n");

  // append results
  const line = [];
  const writeOptions = { append: true };
  let i = 0;

  for await (const result of sourceResults) {
    for (const key of columns) {
      const value = result[key];
      let valueString;

      if (key == "partOfSpeech") {
        const s = typeof value == "number" ? partOfSpeechMap[value] : undefined;
        valueString = s ?? "";
      } else {
        valueString = value?.toString() ?? "";
      }

      const encoded = encodeCsvField(valueString);
      line.push(encoded);
    }

    file.write(line.join(",") + "\r\n", writeOptions);
    line.length = 0;

    i++;
    progressCallback(i, sourceTotal);
  }

  return file.uri;
}

export async function importCsv(
  uri: string,
  dictionary: DictionaryData,
  progressCallback: (i: number, total: number) => void,
) {
  const file = new File(uri);
  const totalBytes = Math.max(file.size, 1);
  let bytesRead = 0;

  const stream = file
    .readableStream()
    .pipeThrough(
      new TransformStream({
        transform(chunk, controller) {
          bytesRead += chunk.length;
          controller.enqueue(chunk);
          progressCallback(bytesRead, totalBytes);
        },
      }),
    )
    .pipeThrough(new TextDecoderStream())
    .pipeThrough(new CsvTransformStream());

  const iterator = stream.values();

  // resolving field order based on header
  const header = (await iterator.next()).value;

  if (!header) {
    return;
  }

  const cols: string[] = [];

  for (const value of header) {
    const start = value.lastIndexOf("(");

    if (start == -1) {
      continue;
    }

    const end = value.indexOf(")", start + 1);

    if (end == -1) {
      continue;
    }

    const importKey = value.slice(start + 1, end);
    cols.push(importMap[importKey] ?? "");
  }

  // create a field upsert pass for each relevant field
  const passes: [number, FieldUpsertPass][] = [];

  for (let i = 0; i < cols.length; i++) {
    const key = cols[i];
    const upsertPass = fieldUpsertMap[key];

    if (upsertPass != null) {
      passes.push([i, upsertPass]);
    }
  }

  // trying to fit our logic into typescript
  // possibly room for performance improvements if we can avoid the Object.assign
  const partialData: Partial<WordDefinitionUpsertData> = {};
  const updateData: WordDefinitionUpsertData = {
    id: 0,
    spelling: "",
  };
  const insertData: WordDefinitionUpsertData = {
    spelling: "",
    definition: "",
    example: "",
    notes: "",
    confidence: 0,
  };

  for await (const row of iterator) {
    for (const [i, pass] of passes) {
      pass(dictionary, partialData, row[i]);
    }

    if (partialData.spelling == null || partialData.spelling == "") {
      continue;
    }

    if (partialData.id != null) {
      // updating an existing word
      Object.assign(updateData, partialData);
      await upsertDefinition(dictionary.id, updateData);
    } else {
      // creating a new word
      Object.assign(insertData, partialData);
      await upsertDefinition(dictionary.id, insertData);
    }
  }
}

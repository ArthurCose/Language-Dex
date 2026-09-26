import {
  countCsvRows,
  CsvParser,
  CsvTransformStream,
  encodeCsvField,
} from "./csv";
import { describe, expect, test } from "@jest/globals";

describe("encodeCsvField", () => {
  test("quotes fields with special chars", () => {
    expect(encodeCsvField("a,b")).toEqual('"a,b"');
    expect(encodeCsvField("a\nb")).toEqual('"a\nb"');
  });

  test("escapes quotes with more quotes", () => {
    expect(encodeCsvField('"')).toEqual('""""'); // 4 quotes
    expect(encodeCsvField('""')).toEqual('""""""'); // 6 quotes
  });

  test("avoids modifying anything else", () => {
    expect(encodeCsvField("ab")).toEqual("ab");
  });
});

describe("countCsvRows", () => {
  test("supports empty files", () => {
    expect(countCsvRows("")).toEqual(0);
  });

  test("supports multiple newline formats", () => {
    expect(countCsvRows("a\rb\r\nc\nd")).toEqual(4);
  });

  test("handles trailing newline", () => {
    expect(countCsvRows("a,b,c")).toEqual(1);
    expect(countCsvRows("a,b,c\n")).toEqual(1);
  });

  test("handles quoted newline", () => {
    expect(countCsvRows('a,"\n\n",c')).toEqual(1);
  });
});

function readAllCsvRows(csv: string) {
  return new CsvParser(csv).readRemainingRows();
}

describe("readRemainingRows", () => {
  test("supports empty files", () => {
    expect(readAllCsvRows("")).toEqual([]);
  });

  test("supports multiple newline formats", () => {
    expect(readAllCsvRows("a\rb\r\nc\nd")).toEqual([
      ["a"],
      ["b"],
      ["c"],
      ["d"],
    ]);
  });

  test("handles trailing newline", () => {
    expect(readAllCsvRows("a,b,c")).toEqual([["a", "b", "c"]]);
    expect(readAllCsvRows("a,b,c\n")).toEqual([["a", "b", "c"]]);
  });

  test("handles quoted newline", () => {
    expect(readAllCsvRows('a,"\n\n",c')).toEqual([["a", "\n\n", "c"]]);
  });

  test("handles quotes", () => {
    expect(readAllCsvRows('a,"""",c')).toEqual([["a", '"', "c"]]);
    expect(readAllCsvRows('a,b,""""')).toEqual([["a", "b", '"']]);
  });

  test("handles empty fields", () => {
    expect(readAllCsvRows(",,,")).toEqual([["", "", "", ""]]);
  });

  test("handles malformed file", () => {
    // this should end in a quote, but we'll just take whatever is available
    expect(readAllCsvRows('"asd')).toEqual([["asd"]]);
    // bad data shouldn't escape into other documents
    expect(readAllCsvRows("a")).toEqual([["a"]]);
  });
});

function streamingParse(chunks: string[]) {
  // we can simplify this with ReadableStream.from() when it's widely supported:
  // https://developer.mozilla.org/en-US/docs/Web/API/ReadableStream/from_static
  //
  // or use it sooner if we want to tinker with typescript, as these test files run through node

  chunks.reverse();

  const underlyingSource: UnderlyingSource<string> = {
    pull(controller) {
      const v = chunks.pop();

      if (v != null) {
        // this type definition is either wrong or MDN's example is incorrect:
        // https://developer.mozilla.org/en-US/docs/Web/API/ReadableStream/ReadableStream
        controller.enqueue(v as ArrayBufferView<ArrayBuffer> & string);
      } else {
        controller.close();
      }
    },
  };

  return Array.fromAsync(
    new ReadableStream(underlyingSource).pipeThrough(new CsvTransformStream()),
  );
}

describe("CsvTransformStream", () => {
  test("empty stream", async () => {
    expect(await streamingParse([])).toEqual([]);
  });

  test("single row", async () => {
    expect(await streamingParse(["a,b,c"])).toEqual([["a", "b", "c"]]);
  });

  test("split row", async () => {
    expect(await streamingParse(["a,b,c", ",d,e,f"])).toEqual([
      ["a", "b", "c", "d", "e", "f"],
    ]);

    expect(await streamingParse(["a,b,c", ",d\ne,f"])).toEqual([
      ["a", "b", "c", "d"],
      ["e", "f"],
    ]);
  });
});

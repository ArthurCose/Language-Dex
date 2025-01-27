declare module "@akahuku/unistring" {
  export class Grapheme {
    codePoints: number[];
    rawString: string;
    rawIndex: number;

    toString(): string;
    clone(): Grapheme;
    updateRawString();
    dump(detail): string;
  }

  export type SegmentationResult = {
    text: string;
    index: number;
    rawIndex: number;
    length: number;
    type: number;
  };

  class Unistring {
    length: number;

    clone(): Unistring;
    dump(): string;
    toString(): string;
    delete(start: number, length?: number): Unistring;
    insert(str: string, start: number): Unistring;
    append(str: string): Unistring;
    codePointsAt(index: number): number[];
    clusterAt(index: number): string;
    rawStringAt(index: number): string;
    rawIndexAt(index: number): number;
    forEach(
      callback: (value: Grapheme, index: number, array: Grapheme[]) => void,
      thisObj?: any
    );
    getClusterIndexFromUTF16Index(index: number): number;
    charAt(index: number): string;
    charCodeAt(index: number): number;
    substring(start: number, end?: number): Unistring;
    substr(start: number, length?: number): Unistring;
    slice(start: number, end?: number): Unistring;
    concat(str: string): Unistring;
    indexOf(str: string): number;
    lastIndexOf(str: string): number;
    toLowerCase(useLocale?: boolean): Unistring;
    toUpperCase(useLocale?: boolean): Unistring;
  }

  export type ColumnsOptions = {
    /// number of column (default: 80).
    columns?: number;
    /// column of ambiguous character in East Asian Width (1 or 2, default: 2)
    awidth?: number;
    /// ignore ANSI escape sequences and treat their width as 0 (default: false)
    ansi?: boolean;
    // treat SGML character reference (&#999999;, &#x999999; ...) as the character they represent (default: false)}
    characterReference?: boolean;
  };

  export type FoldingOptions = {
    /// number of column (default: 80). In the case of an array, each element of the array is used as columns. If the array is not long enough, the last element is used as the remaining columns
    columns?: number | number[];
    /// column of ambiguous character in East Asian Width (1 or 2, default: 2)
    awidth?: number;
    /// ignore ANSI escape sequences and treat their width as 0 (default: false)
    ansi?: boolean;
    // treat SGML character reference (&#999999;, &#x999999; ...) as the character they represent (default: false)}
    characterReference?: boolean;
  };

  namespace UnistringFactory {
    /// an associative array from name of GraphemeBreakProperty to corresponding integer value
    let GBP: { [name: string]: number };
    /// an associative array from name of WordBreakProperty to corresponding integer value
    let WBP: { [name: string]: number };
    /// an associative array from name of SentenceBreakProperty to corresponding integer value
    let SBP: { [name: string]: number };
    /// an associative array from name of ScriptProperty to corresponding integer value
    let SCRIPT: { [name: string]: number };
    /// an associative array from name of LineBreakProperty to corresponding integer value
    let LBP: { [name: string]: number };
    let GBP_NAMES: string[];
    let WBP_NAMES: string[];
    let SBP_NAMES: string[];
    let SCRIPT_NAMES: string[];
    let LBP_NAMES: string[];

    // methods for text segmentation algorithm (UAX#29):

    function getCodePointArray(str: string): number[];
    function getGraphemeBreakProp(codePoint: number): number;
    function getWordBreakProp(codePoint: number): number;
    function getSentenceBreakProp(codePoint: number): number;
    function getScriptProp(codePoint: number): number;
    function getUTF16FromCodePoint(codePoint: number): string;
    function getCodePointString(
      codePoint: number,
      type: "entity" | "unicode"
    ): string;
    function getWords(str: string, useScripts?: boolean): SegmentationResult[];
    function getSentences(str: string): SegmentationResult[];

    // methods for line breaking algorithm (UAX#14):

    function getLineBreakableClusters(str: string): SegmentationResult[];
    function getColumnsFor(str: string, options?: ColumnsOptions): number;
    function divideByColumns(
      str: string,
      columns: number,
      options?: ColumnsOptions
    ): [string, string];
    function getFoldedLines(str, options?: FoldingOptions): string[];
  }

  function UnistringFactory(str: string): Unistring;

  export default UnistringFactory;
}

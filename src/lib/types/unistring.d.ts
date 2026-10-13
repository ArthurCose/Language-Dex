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
      thisObj?: any,
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
    let GBP: {
      Other: number;
      SOT: number;
      EOT: number;
      Prepend: number;
      CR: number;
      LF: number;
      Control: number;
      Extend: number;
      Regional_Indicator: number;
      SpacingMark: number;
      L: number;
      V: number;
      T: number;
      LV: number;
      LVT: number;
      ZWJ: number;
    };
    /// an associative array from name of WordBreakProperty to corresponding integer value
    let WBP: {
      Other: number;
      SOT: number;
      EOT: number;
      Double_Quote: number;
      Single_Quote: number;
      Hebrew_Letter: number;
      CR: number;
      LF: number;
      Newline: number;
      Extend: number;
      Regional_Indicator: number;
      Format: number;
      ALetter: number;
      MidLetter: number;
      MidNum: number;
      MidNumLet: number;
      Numeric: number;
      ExtendNumLet: number;
      ZWJ: number;
      WSegSpace: number;
      Katakana: number;
      Hiragana: number;
      KanaExtension: number;
    };
    /// an associative array from name of SentenceBreakProperty to corresponding integer value
    let SBP: {
      Other: number;
      SOT: number;
      EOT: number;
      CR: number;
      LF: number;
      Extend: number;
      Sep: number;
      Format: number;
      Sp: number;
      Lower: number;
      Upper: number;
      OLetter: number;
      Numeric: number;
      ATerm: number;
      STerm: number;
      Close: number;
      SContinue: number;
    };
    /// an associative array from name of ScriptProperty to corresponding integer value
    let SCRIPT: {
      [name: string]: number;
      Unknown: number;
      Common: number;
      Latin: number;
      Greek: number;
      Cyrillic: number;
      Armenian: number;
      Hebrew: number;
      Arabic: number;
      Syriac: number;
      Thaana: number;
      Devanagari: number;
      Bengali: number;
      Gurmukhi: number;
      Gujarati: number;
      Oriya: number;
      Tamil: number;
      Telugu: number;
      Kannada: number;
      Malayalam: number;
      Sinhala: number;
      Thai: number;
      Lao: number;
      Tibetan: number;
      Myanmar: number;
      Georgian: number;
      Hangul: number;
      Ethiopic: number;
      Cherokee: number;
      Canadian_Aboriginal: number;
      Ogham: number;
      Runic: number;
      Khmer: number;
      Mongolian: number;
      Hiragana: number;
      Katakana: number;
      Bopomofo: number;
      Han: number;
      Yi: number;
      Old_Italic: number;
      Gothic: number;
      Deseret: number;
      Inherited: number;
      Tagalog: number;
      Hanunoo: number;
      Buhid: number;
      Tagbanwa: number;
      Limbu: number;
      Tai_Le: number;
      Linear_B: number;
      Ugaritic: number;
      Shavian: number;
      Osmanya: number;
      Cypriot: number;
      Braille: number;
      Buginese: number;
      Coptic: number;
      New_Tai_Lue: number;
      Glagolitic: number;
      Tifinagh: number;
      Syloti_Nagri: number;
      Old_Persian: number;
      Kharoshthi: number;
      Balinese: number;
      Cuneiform: number;
      Phoenician: number;
      Phags_Pa: number;
      Nko: number;
      Sundanese: number;
      Lepcha: number;
      Ol_Chiki: number;
      Vai: number;
      Saurashtra: number;
      Kayah_Li: number;
      Rejang: number;
      Lycian: number;
      Carian: number;
      Lydian: number;
      Cham: number;
      Tai_Tham: number;
      Tai_Viet: number;
      Avestan: number;
      Egyptian_Hieroglyphs: number;
      Samaritan: number;
      Lisu: number;
      Bamum: number;
      Javanese: number;
      Meetei_Mayek: number;
      Imperial_Aramaic: number;
      Old_South_Arabian: number;
      Inscriptional_Parthian: number;
      Inscriptional_Pahlavi: number;
      Old_Turkic: number;
      Kaithi: number;
      Batak: number;
      Brahmi: number;
      Mandaic: number;
      Chakma: number;
      Meroitic_Cursive: number;
      Meroitic_Hieroglyphs: number;
      Miao: number;
      Sharada: number;
      Sora_Sompeng: number;
      Takri: number;
      Caucasian_Albanian: number;
      Bassa_Vah: number;
      Duployan: number;
      Elbasan: number;
      Grantha: number;
      Pahawh_Hmong: number;
      Khojki: number;
      Linear_A: number;
      Mahajani: number;
      Manichaean: number;
      Mende_Kikakui: number;
      Modi: number;
      Mro: number;
      Old_North_Arabian: number;
      Nabataean: number;
      Palmyrene: number;
      Pau_Cin_Hau: number;
      Old_Permic: number;
      Psalter_Pahlavi: number;
      Siddham: number;
      Khudawadi: number;
      Tirhuta: number;
      Warang_Citi: number;
      Ahom: number;
      Anatolian_Hieroglyphs: number;
      Hatran: number;
      Multani: number;
      Old_Hungarian: number;
      SignWriting: number;
      Adlam: number;
      Bhaiksuki: number;
      Marchen: number;
      Newa: number;
      Osage: number;
      Tangut: number;
      Masaram_Gondi: number;
      Nushu: number;
      Soyombo: number;
      Zanabazar_Square: number;
      Dogra: number;
      Gunjala_Gondi: number;
      Makasar: number;
      Medefaidrin: number;
      Hanifi_Rohingya: number;
      Sogdian: number;
      Old_Sogdian: number;
      Elymaic: number;
      Nandinagari: number;
      Nyiakeng_Puachue_Hmong: number;
      Wancho: number;
      Chorasmian: number;
      Dives_Akuru: number;
      Khitan_Small_Script: number;
      Yezidi: number;
      Cypro_Minoan: number;
      Old_Uyghur: number;
      Tangsa: number;
      Toto: number;
      Vithkuqi: number;
    };
    /// an associative array from name of LineBreakProperty to corresponding integer value
    let LBP: {
      [name: string]: number;
      XX: number;
      SOT: number;
      EOT: number;
      CM: number;
      BA: number;
      LF: number;
      BK: number;
      CR: number;
      SP: number;
      EX: number;
      QU: number;
      AL: number;
      PR: number;
      PO: number;
      OP: number;
      CP: number;
      IS: number;
      HY: number;
      SY: number;
      NU: number;
      CL: number;
      NL: number;
      GL: number;
      AI: number;
      BB: number;
      HL: number;
      SA: number;
      JL: number;
      JV: number;
      JT: number;
      NS: number;
      ZW: number;
      ZWJ: number;
      B2: number;
      IN: number;
      WJ: number;
      ID: number;
      EB: number;
      CJ: number;
      H2: number;
      H3: number;
      SG: number;
      CB: number;
      RI: number;
      EM: number;
    };
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
      type: "entity" | "unicode",
    ): string;
    function getWords(str: string, useScripts?: boolean): SegmentationResult[];
    function getSentences(str: string): SegmentationResult[];

    // methods for line breaking algorithm (UAX#14):

    function getLineBreakableClusters(str: string): SegmentationResult[];
    function getColumnsFor(str: string, options?: ColumnsOptions): number;
    function divideByColumns(
      str: string,
      columns: number,
      options?: ColumnsOptions,
    ): [string, string];
    function getFoldedLines(str, options?: FoldingOptions): string[];
  }

  function UnistringFactory(str: string): Unistring;

  export default UnistringFactory;
}

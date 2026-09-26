const quoteCharCode = '"'.charCodeAt(0);
const carriageReturnCharCode = "\r".charCodeAt(0);
const lineFeedCharCode = "\n".charCodeAt(0);
const commaCharCode = ",".charCodeAt(0);

export function countCsvRows(csv: string) {
  let inQuote = false;
  let lineCount = 0;
  let nextStart = 0;

  while (true) {
    // find the newline
    let end = -1;

    for (let i = nextStart; i < csv.length; i++) {
      const code = csv.charCodeAt(i);

      if (code == carriageReturnCharCode || code == lineFeedCharCode) {
        end = i;
        break;
      }

      // count quotes while checking for the newline
      if (code == quoteCharCode) {
        inQuote = !inQuote;
      }
    }

    if (end == -1) {
      break;
    }

    // update next starting point
    nextStart = end + 1;

    if (
      csv.charCodeAt(end) == carriageReturnCharCode &&
      csv.charCodeAt(end + 1) == lineFeedCharCode
    ) {
      nextStart++;
    }

    // not within a quote, count the line
    if (!inQuote) {
      lineCount += 1;
    }
  }

  if (nextStart < csv.length) {
    lineCount += 1;
  }

  return lineCount;
}

export function encodeCsvField(s: string): string {
  const newString = s.replaceAll('"', '""');

  if (
    newString.length != s.length ||
    s.includes(",") ||
    s.includes("\r") ||
    s.includes("\n")
  ) {
    return '"' + newString + '"';
  }

  return s;
}

// recycling to avoid allocations.
// as long as we never leave a partial work buffer,
// it should be safe to share with all parsers
const readWorkBuffer: string[] = [];

export class CsvParser {
  csv: string;
  lastIndex = 0;
  fieldQuoted = false;
  public lastRow: string[] = [];

  constructor(csv: string) {
    this.csv = csv;
  }

  readRow() {
    // clear previous data
    this.lastRow.length = 0;

    const csv = this.csv;
    const start = this.lastIndex;

    if (start >= csv.length) {
      return false;
    }

    let nextReadStart = start;
    let inQuote = false;

    for (let i = start; i < csv.length; i++) {
      const code = csv.charCodeAt(i);
      const foundNewLine =
        code == carriageReturnCharCode || code == lineFeedCharCode;

      if (foundNewLine && !inQuote) {
        // found the end of the row

        this.appendRemainingField(nextReadStart, i);

        // start the next run just after the newline
        this.lastIndex = i + 1;

        if (
          code == carriageReturnCharCode &&
          csv.charCodeAt(i + 1) == lineFeedCharCode
        ) {
          // need to skip two chars for \r\n
          this.lastIndex += 1;
        }

        return true;
      }

      // count quotes while checking for the newline
      if (code == quoteCharCode) {
        inQuote = !inQuote;
        this.fieldQuoted = true;

        if (inQuote) {
          // append data up until the quote
          readWorkBuffer.push(csv.slice(nextReadStart, i));
          // start the next read right after the quote to capture an escaped quote
          nextReadStart = i + 1;
        }
      }

      if (inQuote) {
        continue;
      }

      // check for the end of the field
      if (code != commaCharCode) {
        continue;
      }

      this.appendRemainingField(nextReadStart, i);

      nextReadStart = i + 1;
    }

    this.appendRemainingField(nextReadStart, csv.length);
    this.lastIndex = csv.length;

    return true;
  }

  private appendRemainingField(start: number, end: number) {
    if (this.fieldQuoted && this.csv[end - 1] == '"') {
      this.fieldQuoted = false;
      end--;
    }

    readWorkBuffer.push(this.csv.slice(start, end));
    this.lastRow.push(readWorkBuffer.join(""));
    readWorkBuffer.length = 0;
  }

  readRemainingRows(): string[][] {
    const rows = [];

    while (this.readRow()) {
      rows.push(this.lastRow);
      this.lastRow = [];
    }

    return rows;
  }
}

export class CsvTransformStream extends TransformStream<string, string[]> {
  constructor() {
    const csvReader = new CsvParser("");
    let lastCompleteIndex = 0;
    let hasPartialRow = false;

    const transformer: Transformer<string, string[]> = {
      transform(chunk, controller) {
        // this seems like it could be slow
        csvReader.csv = csvReader.csv.slice(lastCompleteIndex) + chunk;
        csvReader.lastIndex = 0;
        lastCompleteIndex = 0;

        while (csvReader.readRow()) {
          hasPartialRow = csvReader.lastIndex == csvReader.csv.length;

          if (hasPartialRow) {
            break;
          }

          controller.enqueue([...csvReader.lastRow]);
          lastCompleteIndex = csvReader.lastIndex;
        }
      },
      flush(controller) {
        if (hasPartialRow) {
          controller.enqueue(csvReader.lastRow);
        }
      },
    };

    super(transformer);
  }
}

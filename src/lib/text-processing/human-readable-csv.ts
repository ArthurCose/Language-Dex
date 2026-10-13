const escapeRegex = /([\\,])/g;
const unescapeRegex = /\\(.)/g;

export function joinValues(values: string[], separator?: string) {
  separator ??= ",";

  return values.map((v) => v.replace(escapeRegex, "\\$1")).join(separator);
}

export function splitValue(cell: string, separator?: string): string[] {
  if (cell.length == 0) {
    return [];
  }

  separator ??= ",";

  let startIndex = 0;
  let prevIndex = 0;

  const values = [];

  while (true) {
    const i = cell.indexOf(separator, prevIndex);
    prevIndex = i + separator.length;

    if (i == -1) {
      values.push(cell.slice(startIndex).replace(unescapeRegex, "$1"));
      break;
    }

    // count backslashes behind the separator
    let totalBackslashes = 0;

    for (let j = i - 1; j >= 0; j--) {
      if (cell[j] != "\\") {
        break;
      }

      totalBackslashes++;
    }

    if (totalBackslashes % 2 != 0) {
      continue;
    }

    values.push(cell.slice(startIndex, i).replace(unescapeRegex, "$1"));

    startIndex = prevIndex;
  }

  return values;
}

const collator = new Intl.Collator();

export function compareWords(a: string, b: string) {
  return collator.compare(a, b);
}

export function sortWords<T>(list: T[], map?: (value: T) => string) {
  if (map) {
    list.sort((a, b) => compareWords(map(a), map(b)));
  } else {
    (list as string[]).sort(compareWords);
  }
}

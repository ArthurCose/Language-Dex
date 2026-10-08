export function stripDiacritics(str: string) {
  return str
    .normalize("NFD")
    .replaceAll(/\p{Diacritic}/gu, "")
    .normalize("NFC");
}

export function normalize(str: string) {
  return stripDiacritics(str).toLowerCase();
}

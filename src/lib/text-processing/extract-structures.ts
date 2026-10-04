const terminalPunctuation = [".", "¿", "?", "¡", "!", "\r", "\n"];
const spaces = [" ", "　"];

function findSentenceStart(
  text: string,
  index: number,
  characterLimit: number,
) {
  for (
    let start = index;
    start > 0 && index - start < characterLimit;
    start--
  ) {
    if (terminalPunctuation.includes(text[start])) {
      start += 1;

      while (index > start && spaces.includes(text[start])) {
        start += 1;
      }

      return start;
    }
  }

  return null;
}

export function extractSentence(
  text: string,
  index: number,
  characterLimit: number,
) {
  const start = findSentenceStart(text, index, characterLimit);

  if (start == null) {
    return;
  }

  const endReadLimit = characterLimit - (index - start) + 1;
  let end = index;

  for (; end < text.length && end - index < endReadLimit; end++) {
    if (terminalPunctuation.includes(text[end])) {
      end += 1;
      break;
    }
  }

  if (end - start > characterLimit) {
    return null;
  }

  return text.slice(start, end);
}

export function extractParagraph(
  text: string,
  index: number,
  characterLimit: number,
) {
  let start = index;
  let end = index;

  let readLimit = characterLimit + 1;

  for (; start > 0 && index - start < characterLimit; start--) {
    if (text[start] == "\r" || text[start] == "\n") {
      start += 1;
      break;
    }
  }

  readLimit -= end - start;

  for (; end < text.length && end - index < readLimit; end++) {
    if (text[end] == "\r" || text[end] == "\n") {
      break;
    }
  }

  const paragraph = text.slice(start, end).trim();

  if (paragraph.length > characterLimit) {
    return null;
  }

  return paragraph;
}

export function extractTrailing(
  text: string,
  index: number,
  word: string,
  characterLimit: number,
) {
  let workString = "...";
  let substr_limit = characterLimit - 6;

  // attempt to anchor to the nearest sentence start
  let sentenceStart = findSentenceStart(text, index, characterLimit);

  if (
    sentenceStart != null &&
    sentenceStart + characterLimit < index + word.length
  ) {
    // fails to include the word, so we won't use it
    sentenceStart = null;
  }

  // fallback to resolve start by jumping away from the middle of the word
  const half_limit = Math.floor(substr_limit / 2);
  let start =
    sentenceStart ??
    Math.max(index + Math.floor(word.length / 2) - half_limit, 0);

  if (start == 0 || start == sentenceStart) {
    substr_limit += 3;
    workString = "";
  } else if (
    !text[start].isWellFormed() &&
    !text.slice(start, start + 1).isWellFormed()
  ) {
    // avoid starting in the middle of a utf-16 codepoint
    start += 1;
  }

  // resolve end by jumping from the start
  let end = Math.min(start + substr_limit, text.length);

  if (
    !text[end - 1].isWellFormed() &&
    !text.slice(end - 2, end).isWellFormed()
  ) {
    // avoid ending in the middle of a utf-16 codepoint
    end -= 1;
  }

  workString += text.slice(start, end);

  if (end < text.length) {
    workString += "...";
  }

  return workString;
}

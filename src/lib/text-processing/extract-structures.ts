const terminalPunctuation = [".", "¿", "?", "¡", "!", "\r", "\n"];
const spaces = [" ", "　"];

function findSentenceStart(
  text: string,
  index: number,
  characterLimit: number,
) {
  let start = index;

  for (; start > 0 && index - start < characterLimit; start--) {
    if (terminalPunctuation.includes(text[start])) {
      start += 1;

      while (index > start && spaces.includes(text[start])) {
        start += 1;
      }

      return start;
    }
  }

  if (start == 0 && index - start <= characterLimit) {
    return 0;
  }

  return null;
}

function findSentenceEnd(text: string, index: number, characterLimit: number) {
  let end = index;

  for (; end < text.length && end - index < characterLimit; end++) {
    if (terminalPunctuation.includes(text[end])) {
      end += 1;
      return end;
    }
  }

  if (end == text.length && end - index <= characterLimit) {
    return end;
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
    return null;
  }

  const endReadLimit = characterLimit - (index - start) + 1;
  const end = findSentenceEnd(text, index, endReadLimit);

  if (end == null || end - start > characterLimit) {
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

  if (end - start > characterLimit) {
    return null;
  }

  return text.slice(start, end).trim();
}

function withinSurrogatePair(text: string, index: number) {
  return (
    index < text.length &&
    !text[index].isWellFormed() &&
    !text.slice(index, index + 2).isWellFormed()
  );
}

export function extractTrailing(
  text: string,
  index: number,
  word: string,
  characterLimit: number,
) {
  // attempt to anchor to the nearest sentence start
  const sentenceStart = findSentenceStart(
    text,
    index,
    characterLimit - word.length - 3,
  );

  if (sentenceStart != null) {
    let end = sentenceStart + characterLimit - 3;

    if (withinSurrogatePair(text, end)) {
      end -= 1;
    }

    return text.slice(sentenceStart, end) + "...";
  }

  // attempt to anchor to the nearest sentence end
  const sentenceEnd = findSentenceEnd(
    text,
    index + word.length,
    characterLimit - word.length - 3,
  );

  if (sentenceEnd != null) {
    let start = Math.max(sentenceEnd - characterLimit + 3, 0);

    if (withinSurrogatePair(text, start)) {
      start += 1;
    }

    return "..." + text.slice(start, sentenceEnd);
  }

  let workString = "...";
  const substr_limit = Math.max(characterLimit - 6, 0);

  // resolve start by jumping away from the middle of the word
  const half_limit = Math.floor(substr_limit / 2);
  let start = Math.max(index + Math.floor(word.length / 2) - half_limit, 0);

  if (withinSurrogatePair(text, start)) {
    // avoid starting in the middle of a utf-16 codepoint
    start += 1;
  }

  // resolve end by jumping from the start up to the substring limit
  let end = Math.min(start + substr_limit, text.length);

  if (withinSurrogatePair(text, end - 1)) {
    // avoid ending in the middle of a utf-16 codepoint
    end -= 1;
  }

  workString += text.slice(start, end);

  if (end < text.length) {
    workString += "...";
  }

  return workString;
}

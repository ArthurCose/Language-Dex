import { pickIndexWithLenUnbiased, swap } from "./random";
import { isRTL, toGraphemeStrings } from "./words";

const excludedGlyphs = ["-", " ", "　"];

const maxTrialBoards = 5;
const targetWordCount = 5;
const maxWords = 7;
const maxPlacementAttempts = 50;

export type BoardWordData = {
  word: string;
  graphemes: string[];
  x: number;
  y: number;
  vector: [number, number];
  conceded?: boolean;
};

export type WordSearch = {
  overlaps: number;
  cells: string[][];
  words: BoardWordData[];
};

function toAllowedGraphemes(word: string) {
  return toGraphemeStrings(word.toLowerCase()).filter(
    (g) => !excludedGlyphs.includes(g),
  );
}

const placementVectors: [number, number][] = [
  [1, 0],
  [0, 1],
  [1, 1],
  [1, -1],
];

function generateTrialPuzzle(words: string[], size: number) {
  const board: WordSearch = {
    cells: new Array(size)
      .fill(null)
      .map(() => new Array(size).fill("") as string[]),
    words: [],
    overlaps: 0,
  };

  // place random words
  let wordsFrontIndex = 0;

  while (board.words.length < maxWords) {
    // selecting from the pseudo front
    const wordIndex =
      pickIndexWithLenUnbiased(words.length - wordsFrontIndex) +
      wordsFrontIndex;

    const word = words[wordIndex];

    // swapping with the front and shifting the psuedo front.
    // this avoids moving high confidence words from the back to the front,
    // by only moving front biased selections to the front
    swap(words, wordsFrontIndex, wordIndex);
    wordsFrontIndex += 1;

    if (word == undefined) {
      break;
    }

    const graphemes = toAllowedGraphemes(word.toLowerCase());
    const wordLen = graphemes.length;

    if (wordLen > size) {
      continue;
    }

    if (isRTL(word)) {
      graphemes.reverse();
    }

    for (let attempt = 0; attempt < maxPlacementAttempts; attempt++) {
      const vector =
        placementVectors[pickIndexWithLenUnbiased(placementVectors.length)];
      const [xStep, yStep] = vector;

      const xStart = Math.floor(Math.random() * (size - xStep * wordLen));
      let yStart = Math.floor(
        Math.random() * (size - Math.abs(yStep) * wordLen),
      );

      if (yStep < 0) {
        yStart = wordLen + yStart - 1;
      }

      let canPlace = true;
      let totalOverlap = 0;

      for (let i = 0; i < wordLen; i++) {
        const grapheme = graphemes[i];
        const x = xStart + xStep * i;
        const y = yStart + yStep * i;

        const existingGrapheme = board.cells[y][x];

        if (existingGrapheme != "" && existingGrapheme != grapheme) {
          canPlace = false;
          break;
        }

        if (existingGrapheme == grapheme) {
          totalOverlap += 1;
        }
      }

      if (totalOverlap == wordLen) {
        // avoid placing words that completely overlap with another word
        canPlace = false;
      }

      if (!canPlace) {
        continue;
      }

      for (let i = 0; i < wordLen; i++) {
        const x = xStart + xStep * i;
        const y = yStart + yStep * i;

        const existingGrapheme = board.cells[y][x];
        const grapheme = graphemes[i];

        board.cells[y][x] = graphemes[i];

        if (existingGrapheme == grapheme) {
          board.overlaps += 1;
        }
      }

      const wordData: BoardWordData = {
        word,
        graphemes,
        x: xStart,
        y: yStart,
        vector,
      };

      board.words.push(wordData);
      break;
    }
  }

  // fill in empty cells
  const randomGraphemePool = board.words.map((w) => w.graphemes);

  for (let i = 0; i < maxWords; i++) {
    const word = words[pickIndexWithLenUnbiased(words.length)];
    randomGraphemePool.push(toAllowedGraphemes(word));
  }

  for (let y = 0; y < size; y++) {
    const row = board.cells[y];

    for (let x = 0; x < row.length; x++) {
      if (board.cells[y][x] != "") {
        continue;
      }

      const wordIndex = pickIndexWithLenUnbiased(randomGraphemePool.length);
      const word = randomGraphemePool[wordIndex];
      const graphemeIndex = pickIndexWithLenUnbiased(word.length);
      board.cells[y][x] = word[graphemeIndex];
    }
  }

  return board;
}

export function generateWordSearch(words: string[], size: number) {
  // generate a few boards
  let fallbackPuzzle: WordSearch | undefined;
  const puzzles = [];

  for (let i = 0; i < maxTrialBoards; i++) {
    const puzzle = generateTrialPuzzle(words, size);

    fallbackPuzzle ??= puzzle;

    if (puzzle.words.length >= targetWordCount) {
      puzzles.push(puzzle);
    }
  }

  if (puzzles.length == 0) {
    // none fit the critera, return the first puzzle we've generated
    return fallbackPuzzle!;
  }

  // return our best puzzle
  let bestPuzzle = puzzles[0];

  for (let i = 1; i < puzzles.length; i++) {
    const puzzle = puzzles[i];

    if (puzzle.overlaps > bestPuzzle.overlaps) {
      bestPuzzle = puzzle;
    }
  }

  return bestPuzzle;
}

function puzzleToString(board: WordSearch) {
  const rows: string[] = [];

  for (let y = 0; y < board.cells.length; y++) {
    const row = board.cells[y];
    rows.push(row.join(" "));
  }

  return rows.join("\n");
}

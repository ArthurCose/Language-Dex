import { pickIndexWithLenUnbiased, swapToEnd } from "./random";
import { toGraphemeStrings } from "./words";

const maxTrialBoards = 5;
const finalContestants = 3;
const maxWords = 5;
const maxPlacementAttempts = 25;

type CellData = {
  x: number;
  y: number;
  words: { wordIndex: number; graphemeIndex: number }[];
  submitted?: string;
  expected: string;
  locked: boolean;
};

type BoardWordData = {
  word: string;
  graphemes: string[];
  cells: number[];
  hint?: string;
  hintUsed?: boolean;
  conceded?: boolean;
};

type Board = Crossword;

export type Crossword = {
  top: number;
  bottom: number;
  left: number;
  right: number;
  width: number;
  height: number;
  density: number;
  cells: CellData[];
  cellMap: {
    [key: number]: CellData;
  };
  words: BoardWordData[];
};

function hashPosition(x: number, y: number) {
  let hash = Math.abs(x) | (Math.abs(y) << 16);

  if (x < 0) {
    hash |= 1 << 15;
  }

  if (y < 0) {
    hash |= 1 << 31;
  }

  return hash;
}

// return true in the callback to fail traversal and exit early
// returns true if completed
function traversePositions(
  x: number,
  y: number,
  horizontal: boolean,
  len: number,
  callback: (x: number, y: number, i: number) => boolean | void
) {
  if (horizontal) {
    for (let i = 0; i < len; i++) {
      if (callback(x + i, y, i)) {
        return false;
      }
    }
  } else {
    for (let i = 0; i < len; i++) {
      if (callback(x, y + i, i)) {
        return false;
      }
    }
  }

  return true;
}

type WordPlacement = { x: number; y: number; horizontal: boolean };

function findValidPlacement(
  board: Board,
  x: number,
  y: number,
  horizontal: boolean,
  graphemes: string[]
): WordPlacement | void {
  const len = graphemes.length;

  const validPlacements: WordPlacement[] = [];

  if (horizontal) {
    x -= len - 1;
  } else {
    y -= len - 1;
  }

  const cellMap = board.cellMap as { [hash: number]: CellData | undefined };

  traversePositions(x, y, horizontal, len, (x, y) => {
    // make sure there's nothing just before or just after this word
    if (horizontal) {
      const left = cellMap[hashPosition(x - 1, y)];
      const right = cellMap[hashPosition(x + len, y)];

      if (left || right) {
        return;
      }
    } else {
      const above = cellMap[hashPosition(x, y - 1)];
      const below = cellMap[hashPosition(x, y + len)];
      if (above || below) {
        return;
      }
    }

    const passed = traversePositions(x, y, horizontal, len, (x, y, i) => {
      const cell = cellMap[hashPosition(x, y)];

      if (cell) {
        // fail on grapheme mismatch
        const { wordIndex, graphemeIndex } = cell.words[0];
        return board.words[wordIndex].graphemes[graphemeIndex] != graphemes[i];
      }

      // check for adjecent cells
      if (horizontal) {
        const above = !!cellMap[hashPosition(x, y - 1)];
        const below = !!cellMap[hashPosition(x, y + 1)];
        return above || below;
      } else {
        const left = !!cellMap[hashPosition(x - 1, y)];
        const right = !!cellMap[hashPosition(x + 1, y)];
        return left || right;
      }
    });

    if (passed) {
      validPlacements.push({ x, y, horizontal });
    }
  });

  // pick a random valid placement
  return validPlacements[pickIndexWithLenUnbiased(validPlacements.length)];
}

function generateTrialBoard(words: string[]) {
  const board: Board = {
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
    width: 0,
    height: 0,
    density: 0,
    cells: [],
    cellMap: {},
    words: [],
  };

  let len = words.length;

  const workList = [{ x: 0, y: 0, horizontal: true }];

  while (board.words.length < maxWords) {
    const workPosition = swapToEnd(
      workList,
      workList.length,
      pickIndexWithLenUnbiased(workList.length)
    );

    if (workPosition == undefined) {
      break;
    }

    // swap remove <3
    workList.pop();

    // use a temp length to keep track of remaining words for this work position
    let tempLen = len;

    while (len - tempLen < maxPlacementAttempts) {
      const word = swapToEnd(words, tempLen, pickIndexWithLenUnbiased(tempLen));

      if (word == undefined) {
        // out of words to try
        break;
      }

      const graphemes = toGraphemeStrings(word.toLowerCase());
      tempLen -= 1;

      // find a valid placement
      const placement = findValidPlacement(
        board,
        workPosition.x,
        workPosition.y,
        workPosition.horizontal,
        graphemes
      );

      if (!placement) {
        // no valid placement, try another word
        continue;
      }

      const wordData: BoardWordData = {
        word,
        graphemes,
        cells: [],
      };

      // update bounds
      board.top = Math.min(board.top, placement.y);
      board.left = Math.min(board.left, placement.x);

      // generate cells
      traversePositions(
        placement.x,
        placement.y,
        placement.horizontal,
        graphemes.length,
        (x, y, i) => {
          const hash = hashPosition(x, y);
          wordData.cells.push(hash);

          let cell = board.cellMap[hash] as CellData | undefined;

          if (!cell) {
            cell = {
              x,
              y,
              words: [],
              expected: graphemes[i],
              locked: false,
            };

            board.cellMap[hash] = cell;
            board.cells.push(cell);

            // update bounds
            board.right = Math.max(board.right, x + 1);
            board.bottom = Math.max(board.bottom, y + 1);
            workList.push({
              x,
              y,
              horizontal: !placement.horizontal,
            });
          }

          cell.words.push({ wordIndex: board.words.length, graphemeIndex: i });
        }
      );

      board.words.push(wordData);

      // move the final word to the real end of the list
      swapToEnd(words, len, tempLen);
      // update the remaining word count
      len -= 1;

      // break since we've found a word
      break;
    }
  }

  board.width = board.right - board.left;
  board.height = board.bottom - board.top;

  board.density = board.cells.length / (board.width * board.height);

  return board;
}

function rotateBoard(board: Board) {
  let temp = board.width;
  board.width = board.height;
  board.height = temp;

  temp = board.top;
  board.top = board.left;
  board.left = temp;

  temp = board.bottom;
  board.bottom = board.right;
  board.right = temp;

  board.cellMap = {};

  for (const cell of board.cells) {
    temp = cell.x;
    cell.x = cell.y;
    cell.y = temp;
    const hash = hashPosition(cell.x, cell.y);
    board.cellMap[hash] = cell;
    for (const { wordIndex, graphemeIndex } of cell.words) {
      board.words[wordIndex].cells[graphemeIndex] = hash;
    }
  }
}

function seedHints(board: Board) {
  for (const word of board.words) {
    if (word.graphemes.length <= 2) {
      continue;
    }

    const cells = word.cells;
    const i = pickIndexWithLenUnbiased(cells.length);
    const cell = board.cellMap[cells[i]];
    cell.submitted = word.graphemes[i];
    cell.locked = true;
  }
}

export function generateCrossword(words: string[]) {
  let boards = [];

  for (let i = 0; i < maxTrialBoards; i++) {
    boards.push(generateTrialBoard(words));
  }

  // move longest to the front
  boards.sort((a, b) => b.words.length - a.words.length);

  // exclude the worst results
  boards = boards.slice(0, finalContestants);

  // move the densest board to the front
  boards.sort((a, b) => b.density - a.density);

  // select the top board
  const board = boards[0];

  // force portrait
  if (board.width > board.height) {
    rotateBoard(board);
  }

  seedHints(board);

  return board;
}

function boardToString(board: Board) {
  const cellMap = board.cellMap as { [hash: number]: CellData | undefined };
  const chars: string[] = [];

  for (let y = board.top; y < board.bottom; y++) {
    for (let x = board.left; x < board.right; x++) {
      const cell = cellMap[hashPosition(x, y)];

      if (cell) {
        chars.push(cell.expected);
      } else {
        chars.push(" ");
      }
    }
    chars.push("\n");
  }

  return chars.join("");
}

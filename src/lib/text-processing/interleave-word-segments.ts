import { SegmentationResult } from "@akahuku/unistring";
import { isRTL } from "../practice/words";

const newlineRegex = /[^\r\n]/;

function reverseFrom<T>(list: T[], start: number) {
  const end = list.length;
  const middle = Math.floor((end - start) / 2) + start;

  for (let i = start; i < middle; i++) {
    const rightIndex = end - i + start - 1;
    const temp = list[i];
    list[i] = list[rightIndex];
    list[rightIndex] = temp;
  }
}

type InterleavedSegment = SegmentationResult | string;

/** Builds paragraphs of word segments, interleaved with uncaptured text */
export default function interleaveWordSegments(
  text: string,
  segments: SegmentationResult[],
): InterleavedSegment[][] {
  // render segments into blocks
  // (blocks are faster to render than a single large list of words)
  const textBlocks: InterleavedSegment[][] = [[]];
  let latestBlock: InterleavedSegment[] = textBlocks[0];
  let containsPlainText = false;
  let textI = 0;
  let rtlStart: number | undefined;

  for (const segment of segments) {
    if (textI < segment.rawIndex) {
      // render text between words

      const betweenText = text.slice(textI, segment.rawIndex);
      const newLineIndex = betweenText.indexOf("\n");

      if (newLineIndex != -1) {
        // split into another block

        if (newLineIndex > 0) {
          const endSlice = betweenText.slice(0, newLineIndex);

          if (endSlice.length > 0) {
            latestBlock.push(endSlice);
            containsPlainText ||= newlineRegex.test(endSlice);
          }
        }

        // reverse if we're working with RTL
        if (rtlStart != undefined) {
          reverseFrom(latestBlock, rtlStart);
          rtlStart = undefined;
        }

        // create new block
        latestBlock = [];
        textBlocks.push(latestBlock);

        // push everything after the newline into the new block
        const startSlice = betweenText.slice(newLineIndex + 1);

        if (startSlice.length > 0) {
          latestBlock.push(startSlice);
          containsPlainText ||= newlineRegex.test(startSlice);
        }
      } else {
        // append to current block
        latestBlock.push(betweenText);
        containsPlainText = true;
      }
    }

    if (isRTL(segment.text)) {
      if (rtlStart == undefined) {
        rtlStart = latestBlock.length;
      }
    } else if (rtlStart != undefined) {
      reverseFrom(latestBlock, rtlStart);
      rtlStart = undefined;
    }

    latestBlock.push(segment);

    textI = segment.rawIndex + segment.text.length;
  }

  // reverse if we're working with RTL
  if (rtlStart != undefined) {
    reverseFrom(latestBlock, rtlStart);
    rtlStart = undefined;
  }

  // push remaining text
  if (textI < text.length) {
    latestBlock.push(text.slice(textI));
  }

  return textBlocks;
}

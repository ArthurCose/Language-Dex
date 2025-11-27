import React, { useEffect, useMemo, useState } from "react";
import { StyleSheet, Text, View, FlatList } from "react-native";
import { useTheme } from "@/lib/contexts/theme";
import extractWords from "@/lib/extract-words";
import { useUserDataSignal } from "../contexts/user-data";
import ScannedWord from "./scanned-word";
import { listWords, updateStatistics } from "../data";
import { isRTL } from "../practice/words";
import { SegmentationResult } from "@akahuku/unistring";
import { logError } from "../log";
import { useSignalLens } from "../hooks/use-signal";

type Props = {
  text: string;
};

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

export default function ScanOutput({ text }: Props) {
  const theme = useTheme();
  const userDataSignal = useUserDataSignal();
  const activeDictionary = useSignalLens(
    userDataSignal,
    (data) => data.activeDictionary
  );
  const [segments, setSegments] = useState<SegmentationResult[]>([]);

  useEffect(() => {
    const lowerCaseText = text.toLowerCase();
    const segments = extractWords(lowerCaseText);
    setSegments(segments);

    // update statistics
    userDataSignal.set(
      updateStatistics(userDataSignal.get(), (stats) => {
        stats.totalScans = (stats.totalScans ?? 0) + 1;
        stats.wordsScanned = (stats.wordsScanned ?? 0) + segments.length;
      })
    );

    // second pass to detect compound words such as "ice cream"
    let cancelled = false;

    const promise = (async () => {
      const newSegments = [];
      let different = false;

      outer: for (let i = 0; i < segments.length; i++) {
        const segment = segments[i];

        if (i == segments.length - 1) {
          newSegments.push(segment);
          break;
        }

        if (cancelled) {
          break;
        }

        const nextSegment = segments[i + 1];

        // find all words starting with the smallest compound word
        // sort by longest as we'll prefer matching the longest compound word
        const initialSubString = text.slice(
          segment.rawIndex,
          nextSegment.rawIndex + nextSegment.text.length
        );
        const wordList = await listWords(activeDictionary, {
          orderBy: "longest",
          startsWith: initialSubString,
        });

        for (const word of wordList) {
          // see if the input text matches the word
          const matchEndIndex = segment.rawIndex + word.length;
          const matchSubstring = lowerCaseText.slice(
            segment.rawIndex,
            segment.rawIndex + word.length
          );

          if (matchSubstring != word.toLowerCase()) {
            continue;
          }

          // resolve how many segments should be replaced by a single segment
          // along with the new length of this segment
          let consumedSegments = 2;
          let length = segment.length + nextSegment.length;

          for (let j = i + consumedSegments; j < segments.length; j++) {
            const nextSegment = segments[j];

            if (nextSegment.rawIndex >= matchEndIndex) {
              break;
            }

            length += nextSegment.length;
            consumedSegments++;
          }

          // mark newSegments as different for later
          different = true;
          // skip consumed segments, excluding the initial one already considered by the loop
          i += consumedSegments - 1;
          // push the new segment
          newSegments.push({ ...segment, text: matchSubstring, length });
          continue outer;
        }

        // fell through
        newSegments.push(segment);
      }

      if (!cancelled && different) {
        setSegments(newSegments);
      }
    })();

    promise.catch(logError);

    return () => {
      cancelled = true;
    };
  }, [text]);

  const textElement = useMemo(() => {
    // render segments into blocks
    // (blocks are faster to render than a single large list of words)
    const textBlocks: React.ReactNode[][] = [[]];
    let latestBlock: React.ReactNode[] = textBlocks[0];
    let textI = 0;
    let rtlStart;

    const scanTextStyles = [theme.styles.scanText, theme.styles.text];

    for (const segment of segments) {
      if (textI < segment.rawIndex) {
        // render text between words

        const betweenText = text.slice(textI, segment.rawIndex);
        const newLineIndex = betweenText.indexOf("\n");

        if (newLineIndex != -1) {
          // split into another block

          if (newLineIndex > 0) {
            latestBlock.push(
              <Text key={textI} style={scanTextStyles}>
                {betweenText.slice(0, newLineIndex)}
              </Text>
            );
          }

          // handle rtl
          if (rtlStart != undefined) {
            reverseFrom(latestBlock, rtlStart);
            rtlStart = undefined;
          }

          // create new block
          latestBlock = [];
          textBlocks.push(latestBlock);

          // push everything after the newline into the new block
          latestBlock.push(
            <Text key={textI + newLineIndex} style={scanTextStyles}>
              {betweenText.slice(newLineIndex + 1)}
            </Text>
          );
        } else {
          // append to current block
          latestBlock.push(
            <Text key={textI} style={scanTextStyles}>
              {betweenText}
            </Text>
          );
        }
      } else if (textI > 0) {
        latestBlock.push(
          <View key={"spacer-" + textI} style={styles.spacer} />
        );
      }

      const word = text.slice(
        segment.rawIndex,
        segment.rawIndex + segment.text.length
      );

      if (isRTL(word)) {
        if (rtlStart == undefined) {
          rtlStart = latestBlock.length;
        }
      } else if (rtlStart != undefined) {
        reverseFrom(latestBlock, rtlStart);
        rtlStart = undefined;
      }

      latestBlock.push(
        <ScannedWord
          key={segment.rawIndex}
          dictionaryId={activeDictionary}
          text={word}
          lowercase={segment.text}
        />
      );

      textI = segment.rawIndex + segment.text.length;
    }

    // render remaining text
    if (textI < text.length) {
      latestBlock.push(
        <Text key={textI} style={scanTextStyles}>
          {text.slice(textI)}
        </Text>
      );
    }

    if (rtlStart != undefined) {
      reverseFrom(latestBlock, rtlStart);
    }

    // resolve rtl for styling
    const rtl = (segments[0] as SegmentationResult | undefined)
      ? isRTL(segments[0].text)
      : false;

    return (
      <FlatList
        initialNumToRender={3}
        windowSize={5}
        style={styles.scrollView}
        data={textBlocks}
        renderItem={({ item }) => (
          <View onStartShouldSetResponder={() => true}>
            <Text
              style={{
                textAlign: rtl ? "right" : "left",
                flexWrap: "wrap",
              }}
            >
              {item}
            </Text>
          </View>
        )}
        ListFooterComponent={() => <View style={styles.footer} />}
      />
    );
  }, [segments, activeDictionary]);

  return textElement;
}

const styles = StyleSheet.create({
  scrollView: {
    marginBottom: 8,
    paddingHorizontal: 16.7,
    paddingVertical: 5,
  },
  footer: {
    height: 32,
  },
  spacer: {
    width: 3,
  },
});

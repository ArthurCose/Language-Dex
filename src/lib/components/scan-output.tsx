import React, { useEffect, useMemo, useState } from "react";
import { StyleSheet, Text, View, FlatList } from "react-native";
import { useTheme } from "@/src/lib/contexts/theme-context";
import extractWords from "@/src/lib/text-processing/extract-words";
import { useUserDataSignal } from "../contexts/user-data-context";
import ScannedWord from "./scanned-word";
import { listWords, updateStatistics } from "../data";
import { isRTL } from "../practice/words";
import { SegmentationResult } from "@akahuku/unistring";
import { logError } from "../log";
import { useSignalLens } from "../hooks/use-signal";
import { normalize } from "../text-processing/normalization";
import { memoizeUnary } from "../memoize";
import interleaveWordSegments from "../text-processing/interleave-word-segments";

type Props = {
  text: string;
  updateStats: boolean;
};

export default function ScanOutput({ text, updateStats }: Props) {
  const theme = useTheme();
  const userDataSignal = useUserDataSignal();
  const activeDictionary = useSignalLens(
    userDataSignal,
    (data) => data.activeDictionary,
  );
  const [segments, setSegments] = useState<SegmentationResult[]>([]);
  const [baseSegments, setBaseSegments] = useState<SegmentationResult[]>([]);
  const memoizedNormalize = useMemo(() => memoizeUnary(normalize), [text]);

  useEffect(() => {
    const segments = extractWords(text);
    setBaseSegments(segments);
    setSegments(segments);

    // update statistics
    if (updateStats) {
      userDataSignal.set(
        updateStatistics(userDataSignal.get(), (stats) => {
          stats.totalScans = (stats.totalScans ?? 0) + 1;
          stats.wordsScanned = (stats.wordsScanned ?? 0) + segments.length;
        }),
      );
    }
  }, [text]);

  // second pass to detect compound words such as "ice cream"
  useEffect(() => {
    let cancelled = false;

    const promise = (async () => {
      const newSegments = [];
      let different = false;

      outer: for (let i = 0; i < baseSegments.length; i++) {
        const segment = baseSegments[i];

        if (i == baseSegments.length - 1) {
          newSegments.push(segment);
          break;
        }

        if (cancelled) {
          break;
        }

        const nextSegment = baseSegments[i + 1];

        // find all words starting with the smallest compound word
        // sort by longest as we'll prefer matching the longest compound word
        const initialSubString = text.slice(
          segment.rawIndex,
          nextSegment.rawIndex + nextSegment.text.length,
        );
        const wordList = await listWords(activeDictionary, {
          orderBy: "longest",
          startsWith: initialSubString,
        });

        for (const word of wordList) {
          // see if the input text matches the word
          const matchEndIndex = segment.rawIndex + word.length;
          const matchSubstring = text.slice(
            segment.rawIndex,
            segment.rawIndex + word.length,
          );

          if (memoizedNormalize(matchSubstring) != memoizedNormalize(word)) {
            continue;
          }

          // resolve how many segments should be replaced by a single segment
          // along with the new length of this segment
          let consumedSegments = 2;
          let length = segment.length + nextSegment.length;

          for (let j = i + consumedSegments; j < baseSegments.length; j++) {
            const nextSegment = baseSegments[j];

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
  }, [segments, activeDictionary]);

  const textElement = useMemo(() => {
    // render segments into blocks
    // (blocks are faster to render than a single large list of words)
    const renderBlocks: React.ReactNode[][] = [];
    const paragraphBlocks = interleaveWordSegments(text, segments);
    let uniqueIndex = 0;

    for (const paragraphBlock of paragraphBlocks) {
      const renderBlock: React.ReactNode[] = [];

      renderBlocks.push(renderBlock);

      let needsSpace = false;

      for (const segment of paragraphBlock) {
        if (typeof segment == "string") {
          renderBlock.push(segment);
          needsSpace = false;
        } else {
          if (needsSpace) {
            renderBlock.push(
              <View key={"space-" + uniqueIndex++} style={styles.spacer} />,
            );
          } else {
            // prevent lines from collapsing by inserting invisible spaces
            renderBlock.push("​");
          }

          // prevent two adjacent words from appearing as one solid word
          needsSpace = true;

          renderBlock.push(
            <ScannedWord
              key={segment.rawIndex}
              dictionaryId={activeDictionary}
              text={segment.text}
              normalized={normalize(segment.text)}
              excerptText={text}
              excerptIndex={segment.rawIndex}
            />,
          );
        }
      }
    }

    // resolve RTL for styling
    const rtl = (segments[0] as SegmentationResult | undefined)
      ? isRTL(segments[0].text)
      : false;

    return (
      <FlatList
        initialNumToRender={3}
        windowSize={5}
        style={styles.scrollView}
        data={renderBlocks}
        renderItem={({ item }) => (
          <View onStartShouldSetResponder={() => true}>
            <Text
              style={[
                theme.styles.scanText,
                theme.styles.text,
                {
                  textAlign: rtl ? "right" : "left",
                },
              ]}
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
    width: 2,
  },
});

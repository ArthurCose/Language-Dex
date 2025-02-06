import React, { useEffect, useMemo } from "react";
import { StyleSheet, Text, View, FlatList } from "react-native";
import { useTheme } from "@/lib/contexts/theme";
import extractWords from "@/lib/extract-words";
import { useUserDataContext } from "../contexts/user-data";
import ScannedWord from "./scanned-word";
import { updateStatistics } from "../data";

type Props = {
  text: string;
};

export default function ScanOutput({ text }: Props) {
  const theme = useTheme();
  const [userData, setUserData] = useUserDataContext();
  const segments = useMemo(() => {
    return extractWords(text.toLowerCase());
  }, [text]);

  // update statistics
  useEffect(() => {
    setUserData((userData) => {
      userData = updateStatistics(userData, (stats) => {
        stats.totalScans = (stats.totalScans ?? 0) + 1;
        stats.wordsScanned = (stats.wordsScanned ?? 0) + segments.length;
      });

      return userData;
    });
  }, [segments]);

  const textElement = useMemo(() => {
    // render segments into blocks
    // (blocks are faster to render than a single large list of words)
    const textBlocks: React.ReactNode[][] = [[]];
    let latestBlock: React.ReactNode[] = textBlocks[0];
    let textI = 0;

    for (const segment of segments) {
      if (textI < segment.rawIndex) {
        // render text between words

        const betweenText = text.slice(textI, segment.rawIndex);
        const newLineIndex = betweenText.indexOf("\n");

        if (newLineIndex != -1) {
          // split into another block

          if (newLineIndex > 0) {
            latestBlock.push(
              <Text key={textI} style={theme.styles.scanText}>
                {betweenText.slice(0, newLineIndex)}
              </Text>
            );
          }

          latestBlock = [];
          textBlocks.push(latestBlock);

          latestBlock.push(
            <Text key={textI + newLineIndex} style={theme.styles.scanText}>
              {betweenText.slice(newLineIndex + 1)}
            </Text>
          );
        } else {
          // append to current block
          latestBlock.push(
            <Text key={textI} style={theme.styles.scanText}>
              {betweenText}
            </Text>
          );
        }
      }

      latestBlock.push(
        <ScannedWord
          key={segment.rawIndex}
          dictionaryId={userData.activeDictionary}
          text={text.slice(
            segment.rawIndex,
            segment.rawIndex + segment.text.length
          )}
          lowercase={segment.text}
        />
      );

      textI = segment.rawIndex + segment.text.length;
    }

    // render remaining text
    if (textI < text.length) {
      latestBlock.push(
        <Text key={textI} style={theme.styles.scanText}>
          {text.slice(textI)}
        </Text>
      );
    }

    return (
      <FlatList
        initialNumToRender={3}
        windowSize={5}
        style={styles.scrollView}
        data={textBlocks}
        renderItem={({ item }) => <Text>{item}</Text>}
        ListFooterComponent={() => <View style={styles.footer} />}
      />
    );
  }, [segments, userData.activeDictionary]);

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
});

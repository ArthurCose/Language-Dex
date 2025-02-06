import React, { useEffect, useMemo } from "react";
import { StyleSheet, Text, ScrollView, View } from "react-native";
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
    // render segments into list
    const renderedText: React.ReactNode[] = [];
    let textI = 0;

    for (const segment of segments) {
      if (textI < segment.rawIndex) {
        // render text between words
        renderedText.push(
          <Text key={textI} style={theme.styles.scanText}>
            {text.slice(textI, segment.rawIndex)}
          </Text>
        );
      }

      renderedText.push(
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
      renderedText.push(
        <Text key={textI} style={theme.styles.scanText}>
          {text.slice(textI)}
        </Text>
      );
    }

    return <Text style={theme.styles.scanOutput}>{renderedText}</Text>;
  }, [segments]);

  return <ScrollView>{textElement}</ScrollView>;
}

const styles = StyleSheet.create({});

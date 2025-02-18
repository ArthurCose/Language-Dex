import React, { useEffect, useState } from "react";
import {
  StyleSheet,
  View,
  ScrollView,
  StyleProp,
  ViewStyle,
  Share,
} from "react-native";
import { useTranslation } from "react-i18next";
import { useTheme } from "@/lib/contexts/theme";
import { Span } from "../text";
import { useUserDataContext } from "@/lib/contexts/user-data";
import { DictionaryStats, listWords } from "@/lib/data";
import { Theme } from "@/lib/themes";
import { logError } from "@/lib/log";
import { useDictionaryVersioning } from "@/lib/hooks/use-word-definitions";
import { GameTitle } from "../puzzles/info";
import IconButton from "../icon-button";
import { ShareIcon } from "../icons";

const statsLists: [string, keyof DictionaryStats][][] = [
  [
    ["Total_Definitions", "definitions"],
    ["Total_Pronounced", "totalPronounced"],
    ["Excerpts_Read", "totalScans"],
    ["Words_Read", "wordsScanned"],
  ],
  [
    ["Words_Matched", "definitionsMatched"],
    ["Words_Unscrambled", "unscrambled"],
    ["Words_Guessed", "wordsGuessed"],
    ["Crosswords_Completed", "crosswordsCompleted"],
  ],
];

function StatsBlock({
  style,
  theme,
  label,
  version,
  dictionaryId,
  stats,
}: {
  style: StyleProp<ViewStyle>;
  theme: Theme;
  label: string;
  version: number;
  dictionaryId: number | null;
  stats: DictionaryStats;
}) {
  const [t] = useTranslation();
  const [longestWord, setLongestWord] = useState<string | undefined>();

  useEffect(() => {
    listWords(dictionaryId, {
      ascending: false,
      orderBy: "longest",
      limit: 1,
    })
      .then((words) => setLongestWord(words[0]))
      .catch(logError);
  }, [dictionaryId, version]);

  const sections = statsLists.map((list, i) => {
    const rows = [];

    if (i == 0) {
      rows.push([
        t("label", { label: t("Longest Word") }),
        longestWord != undefined ? longestWord : t("NA"),
      ]);
    }

    list.forEach(([label, key]) => {
      rows.push([
        t("label", { label: t(label) }),
        typeof stats[key] == "number" ? stats[key] : 0,
      ]);
    });

    return rows;
  });

  return (
    <View style={style}>
      <View style={styles.blockBody}>
        <Span style={[styles.blockHeader, theme.styles.poppingText]}>
          {t("label", { label })}
        </Span>

        <View style={styles.lists}>
          {sections.map((section, i) => (
            <View key={i}>
              {section.map(([label, value], i) => (
                <Span key={i}>
                  {label} <Span style={theme.styles.poppingText}>{value}</Span>
                </Span>
              ))}
            </View>
          ))}
        </View>
      </View>

      <IconButton
        icon={ShareIcon}
        onPress={() => {
          const headerText = t("label", { label });
          const bodyText = sections
            .map((list) => list.map((pair) => pair.join(" ")).join("\n"))
            .join("\n\n");
          const message = headerText + "\n" + bodyText;

          Share.share({ message }).catch(logError);
        }}
      />
    </View>
  );
}

export default function Statistics() {
  const [t] = useTranslation();
  const theme = useTheme();
  const [userData] = useUserDataContext();
  const dictionary = userData.dictionaries.find(
    (d) => d.id == userData.activeDictionary
  )!;

  const version = useDictionaryVersioning();

  const blockStyles = [
    theme.styles.definitionBackground,
    theme.styles.definitionBorders,
    styles.block,
  ];

  return (
    <View style={styles.content}>
      <GameTitle>{t("Statistics")}</GameTitle>

      <ScrollView>
        <StatsBlock
          style={blockStyles}
          theme={theme}
          label={dictionary.name}
          version={version}
          dictionaryId={userData.activeDictionary}
          stats={dictionary.stats}
        />

        <StatsBlock
          style={blockStyles}
          theme={theme}
          label={t("Overall")}
          version={version}
          dictionaryId={null}
          stats={userData.stats}
        />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  content: {
    flex: 1,
    padding: 8,
    paddingBottom: 0,
    gap: 16,
  },
  block: {
    borderRadius: 8,
    borderWidth: 1,
    marginBottom: 16,
    flexDirection: "row",
    alignItems: "flex-start",
  },
  blockBody: {
    paddingTop: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    flex: 1,
  },
  blockHeader: {
    marginBottom: 2,
  },
  lists: {
    gap: 12,
  },
});

import React, { useEffect, useState } from "react";
import { StyleSheet, View, ScrollView } from "react-native";
import { useTranslation } from "react-i18next";
import { useTheme } from "@/lib/contexts/theme";
import { Span } from "../text";
import { useUserDataContext } from "@/lib/contexts/user-data";
import { DictionaryStats, listWords } from "@/lib/data";
import { Theme } from "@/lib/themes";
import { logError } from "@/lib/log";
import { useDictionaryVersioning } from "@/lib/hooks/use-word-definitions";
import { GameTitle } from "../puzzles/info";

const statsLists: [string, keyof DictionaryStats][][] = [
  [
    ["Total_Definitions", "definitions"],
    ["Words_Read", "wordsScanned"],
    ["Excerpts_Read", "totalScans"],
  ],
  [
    ["Words_Matched", "definitionsMatched"],
    ["Words_Unscrambled", "unscrambled"],
    ["Words_Guessed", "wordsGuessed"],
  ],
];

function StatsBlock({
  theme,
  version,
  dictionaryId,
  stats,
}: {
  theme: Theme;
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

  return (
    <View style={styles.lists}>
      {statsLists.map((list, i) => (
        <View key={i}>
          {i == 0 && (
            <Span>
              {t("label", { label: t("Longest Word") })}{" "}
              <Span style={theme.styles.poppingText}>
                {longestWord != undefined ? longestWord : t("NA")}
              </Span>
            </Span>
          )}

          {list.map(([label, key]) => (
            <Span key={key}>
              {t("label", { label: t(label) })}{" "}
              <Span style={theme.styles.poppingText}>
                {typeof stats[key] == "number" ? stats[key] : 0}
              </Span>
            </Span>
          ))}
        </View>
      ))}
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
        <View style={blockStyles}>
          <Span style={theme.styles.poppingText}>
            {t("label", { label: dictionary.name })}
          </Span>

          <StatsBlock
            theme={theme}
            version={version}
            dictionaryId={userData.activeDictionary}
            stats={dictionary.stats}
          />
        </View>

        <View style={blockStyles}>
          <Span style={theme.styles.poppingText}>
            {t("label", { label: t("Overall") })}
          </Span>

          <StatsBlock
            theme={theme}
            version={version}
            dictionaryId={null}
            stats={userData.stats}
          />
        </View>
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
  lists: {
    gap: 12,
  },
  block: {
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
    gap: 2,
    marginBottom: 16,
  },
});

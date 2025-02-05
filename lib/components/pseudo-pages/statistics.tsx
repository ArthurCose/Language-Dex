import React, { useEffect, useState } from "react";
import { StyleSheet, View } from "react-native";
import { useTranslation } from "react-i18next";
import { useTheme } from "@/lib/contexts/theme";
import { Span } from "../text";
import { useUserDataContext } from "@/lib/contexts/user-data";
import { DictionaryStats, listWords } from "@/lib/data";
import { Theme } from "@/lib/themes";
import { logError } from "@/lib/log";
import { useDictionaryVersioning } from "@/lib/hooks/use-word-definitions";

const statsLists: [string, keyof DictionaryStats][][] = [
  [
    ["Total_Definitions", "definitions"],
    ["Words_Scanned", "wordsScanned"],
    ["Total_Scans", "totalScans"],
  ],
  [
    ["Words_Matched", "definitionsMatched"],
    ["Words_Unscrambled", "unscrambled"],
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
    <>
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
    </>
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

  return (
    <>
      <View style={styles.content}>
        <View>
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

        <View>
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
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  content: {
    flex: 1,
    padding: 8,
    paddingHorizontal: 16,
    gap: 24,
  },
  lists: {
    gap: 8,
  },
});

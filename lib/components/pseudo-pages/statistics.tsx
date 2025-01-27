import React from "react";
import { StyleSheet, View } from "react-native";
import { useTranslation } from "react-i18next";
import { useTheme } from "@/lib/contexts/theme";
import { Span } from "../text";
import { useUserDataContext } from "@/lib/contexts/user-data";
import { DictionaryStats } from "@/lib/data";
import { Theme } from "@/lib/themes";

const statsList: [string, keyof DictionaryStats][] = [
  ["Total_Definitions", "definitions"],
  ["Words_Scanned", "wordsScanned"],
  ["Total_Scans", "totalScans"],
];

function StatsBlock({
  theme,
  stats,
}: {
  theme: Theme;
  stats: DictionaryStats;
}) {
  const [t] = useTranslation();

  return (
    <>
      {statsList.map(([label, key]) => (
        <Span key={key}>
          {t("label", { label: t(label) })}{" "}
          <Span style={theme.styles.poppingText}>{stats[key] ?? 0}</Span>
        </Span>
      ))}
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

  return (
    <>
      <View style={styles.content}>
        <View>
          <Span style={theme.styles.poppingText}>
            {t("label", { label: dictionary.name })}
          </Span>
          <StatsBlock theme={theme} stats={dictionary.stats} />
        </View>

        <View>
          <Span style={theme.styles.poppingText}>
            {t("label", { label: t("Overall") })}
          </Span>
          <StatsBlock theme={theme} stats={userData.stats} />
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
});

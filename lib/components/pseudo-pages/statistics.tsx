import React, { useEffect, useState } from "react";
import { StyleSheet, View, Share, ScrollView } from "react-native";
import { useTranslation } from "react-i18next";
import { useTheme } from "@/lib/contexts/theme";
import { Span } from "../text";
import { useUserDataSignal } from "@/lib/contexts/user-data";
import { useSignalValue } from "@/lib/hooks/use-signal";
import { DictionaryStats, listWords, UserData } from "@/lib/data";
import { Theme } from "@/lib/themes";
import { logError } from "@/lib/log";
import { useDictionaryVersioning } from "@/lib/hooks/use-word-definitions";
import { GameTitle } from "../practice/info";
import IconButton from "../icon-button";
import { AllDictionariesIcon, DictionaryIcon, ShareIcon } from "../icons";
import { TFunction } from "i18next";

import ReadSvg from "@/assets/svgs/Statistics-Read.svg";
import PracticeSvg from "@/assets/svgs/Statistics-Practice.svg";
import Cat1 from "@/assets/svgs/Statistics-1.svg";
import Cat2 from "@/assets/svgs/Statistics-2.svg";
import CatInteraction from "@/lib/components/cat-interaction";

type StatsList = [string, keyof DictionaryStats][];
const wordStats: StatsList = [
  ["Total_Definitions", "definitions"],
  ["Total_Examples", "totalExamples"],
  ["Total_Pronounced", "totalPronounced"],
  ["Total_Max_Confidence", "documentedMaxConfidence"],
];
const readStats: StatsList = [
  ["Excerpts_Read", "totalScans"],
  ["Words_Read", "wordsScanned"],
];
const practiceStats: StatsList = [
  ["Words_Matched", "definitionsMatched"],
  ["Words_Unscrambled", "unscrambled"],
  ["Words_Guessed", "wordsGuessed"],
  ["Crosswords_Completed", "crosswordsCompleted"],
  ["Correct_Short_Answers", "correctShortAnswers"],
  ["Sentences_Constructed", "sentencesConstructed"],
];

function renderStatsList(
  theme: Theme,
  t: TFunction<"translation", undefined>,
  stats: DictionaryStats,
  statsList: StatsList
) {
  return statsList.map(([label, key]) => (
    <Span key={label}>
      {t("label", { label: t(label) })}{" "}
      <Span style={theme.styles.poppingText}>
        {typeof stats[key] == "number" ? stats[key] : 0}
      </Span>
    </Span>
  ));
}

function StatsBlock({ theme, userData }: { theme: Theme; userData: UserData }) {
  const [t] = useTranslation();
  const version = useDictionaryVersioning();

  const [overallLongestWord, setOverallLongestWord] = useState<
    string | undefined
  >();
  const [activeLongestWord, setActiveLongestWord] = useState<
    string | undefined
  >();
  const [viewingOverall, setViewingOverall] = useState(false);

  useEffect(() => {
    listWords(userData.activeDictionary, {
      ascending: false,
      orderBy: "longest",
      limit: 1,
    })
      .then((words) => setActiveLongestWord(words[0]))
      .catch(logError);

    listWords(null, {
      ascending: false,
      orderBy: "longest",
      limit: 1,
    })
      .then((words) => setOverallLongestWord(words[0]))
      .catch(logError);
  }, [userData.activeDictionary, version]);

  let label, dictionaryId, stats, longestWord;

  if (viewingOverall) {
    dictionaryId = userData.activeDictionary;
    stats = userData.stats;
    label = t("Overall");
    longestWord = overallLongestWord;
  } else {
    const dictionary = userData.dictionaries.find(
      (d) => d.id == userData.activeDictionary
    )!;

    dictionaryId = null;
    stats = dictionary.stats;
    label = dictionary.name;
    longestWord = activeLongestWord;
  }

  const listBlockStyles = [
    theme.styles.definitionBackground,
    theme.styles.definitionBorders,
    styles.listBlock,
  ];

  return (
    <>
      <View style={styles.statsHeader}>
        <Span style={[styles.headerText]}> {label}</Span>

        <View style={styles.buttons}>
          <IconButton
            icon={viewingOverall ? DictionaryIcon : AllDictionariesIcon}
            onPress={() => setViewingOverall(!viewingOverall)}
          />

          <IconButton
            icon={ShareIcon}
            onPress={() => {
              const headerText = t("label", { label });
              const bodyText = [wordStats, readStats, practiceStats]
                .map((list) =>
                  list
                    .map(([labelKey, statKey]) => {
                      const label = t("label", { label: t(labelKey) });
                      const value =
                        typeof stats[statKey] == "number" ? stats[statKey] : 0;

                      return label + " " + value;
                    })
                    .join("\n")
                )
                .join("\n\n");
              const message = headerText + "\n" + bodyText;

              Share.share({ message }).catch(logError);
            }}
          />
        </View>
      </View>

      <View style={listBlockStyles}>
        <View style={styles.list}>
          <Span>
            {t("label", { label: t("Longest_Word") })}{" "}
            <Span style={theme.styles.poppingText}>
              {longestWord != undefined ? longestWord : t("NA")}
            </Span>
          </Span>

          {renderStatsList(theme, t, stats, wordStats)}
        </View>
      </View>

      <View style={listBlockStyles}>
        <View style={styles.list}>
          {renderStatsList(theme, t, stats, readStats)}
        </View>

        <ReadSvg style={styles.readSvg} width={100} height={50} />
      </View>

      <View style={listBlockStyles}>
        <View style={styles.list}>
          {renderStatsList(theme, t, stats, practiceStats)}
        </View>

        <PracticeSvg style={styles.practiceSvg} width={100} height={100} />
      </View>
    </>
  );
}

function PatsBlock({ theme, userData }: { theme: Theme; userData: UserData }) {
  const [t] = useTranslation();

  return (
    <View style={styles.patsBlock}>
      <View style={styles.cats}>
        <Cat1 width={80} height={80} />
        <CatInteraction>
          <Cat2 width={80} height={80} />
        </CatInteraction>
      </View>

      <View
        style={[
          theme.styles.definitionBackground,
          theme.styles.definitionBorders,
          styles.patCounter,
        ]}
      >
        <Span>
          <Span>{t("label", { label: t("Total_Pats") })} </Span>
          <Span style={theme.styles.poppingText}>
            {userData.stats.totalPats ?? 0}
          </Span>
        </Span>
      </View>
    </View>
  );
}

export default function Statistics() {
  const [t] = useTranslation();
  const theme = useTheme();
  const userDataSignal = useUserDataSignal();
  const userData = useSignalValue(userDataSignal);

  return (
    <View style={styles.content}>
      <GameTitle>{t("Statistics")}</GameTitle>

      <ScrollView contentContainerStyle={styles.scrollViewContent}>
        <StatsBlock theme={theme} userData={userData} />

        <PatsBlock theme={theme} userData={userData} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  content: {
    flex: 1,
    paddingTop: 8,
    paddingBottom: 0,
    gap: 8,
  },
  scrollViewContent: {
    flexGrow: 1,
    padding: 8,
  },
  headerText: {
    fontWeight: "bold",
    fontSize: 24,
  },
  buttons: {
    flexDirection: "row",
  },
  statsHeader: {
    flexDirection: "row",
    marginBottom: 2,
    justifyContent: "space-between",
    alignItems: "center",
  },
  listBlock: {
    borderRadius: 8,
    borderWidth: 1,
    marginBottom: 16,
    flexDirection: "row",
  },
  list: {
    paddingVertical: 12,
    paddingHorizontal: 12,
  },
  readSvg: {
    alignSelf: "center",
    marginLeft: "auto",
    marginRight: 8,
  },
  practiceSvg: {
    alignSelf: "flex-end",
    marginRight: 8,
    marginLeft: "auto",
  },
  patsBlock: {
    marginTop: "auto",
  },
  cats: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "flex-end",
  },
  patCounter: {
    borderRadius: 8,
    borderWidth: 1,
    alignSelf: "center",
    paddingHorizontal: 12,
    paddingVertical: 4,
  },
});

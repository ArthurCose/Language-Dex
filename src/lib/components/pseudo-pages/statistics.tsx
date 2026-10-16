import React, { useEffect, useState } from "react";
import {
  StyleSheet,
  View,
  Share,
  ScrollView,
  StyleProp,
  ViewStyle,
} from "react-native";
import { useTranslation } from "react-i18next";
import { useTheme } from "@/src/lib/contexts/theme-context";
import { SignalledSpan, Span } from "../text";
import { useUserDataSignal } from "@/src/lib/contexts/user-data-context";
import { useSignalValue } from "@/src/lib/hooks/use-signal";
import { DictionaryStats, listWords, UserData } from "@/src/lib/data";
import { Theme } from "@/src/lib/themes";
import { logError } from "@/src/lib/log";
import { useDictionaryRevision } from "@/src/lib/hooks/use-word-entries";
import { GameTitle } from "../practice/info";
import IconButton from "../icon-button";
import {
  AllDictionariesIcon,
  DefinitionIcon,
  DictionaryIcon,
  EducationIcon,
  ExampleIcon,
  MicrophoneIcon,
  ShareIcon,
} from "../icons";
import { TFunction } from "i18next";

import ReadSvg from "@/assets/svgs/Statistics-Read.svg";
import PracticeSvg from "@/assets/svgs/Statistics-Practice.svg";
import Cat1 from "@/assets/svgs/Statistics-1.svg";
import Cat2 from "@/assets/svgs/Statistics-2.svg";
import CatInteraction, {
  patCountSignal,
} from "@/src/lib/components/cat-interaction";

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
  ["Words_Search_Puzzles_Completed", "wordSearchPuzzlesCompleted"],
  ["Correct_Short_Answers", "correctShortAnswers"],
  ["Sentences_Constructed", "sentencesConstructed"],
];

function renderStatsList(
  theme: Theme,
  t: TFunction<"translation", undefined>,
  stats: DictionaryStats,
  statsList: StatsList,
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

function IconWithStat({
  style,
  theme,
  icon,
  label,
  value,
}: {
  style?: StyleProp<ViewStyle>;
  theme: Theme;
  icon: React.ReactNode;
  label: string;
  value: number | string;
}) {
  return (
    <View style={[styles.iconWithStat, style]}>
      {icon}

      <View>
        <Span style={theme.styles.poppingText}>{value}</Span>
        <Span>{label}</Span>
      </View>
    </View>
  );
}

function StatsBlock({ theme, userData }: { theme: Theme; userData: UserData }) {
  const [t] = useTranslation();
  const revision = useDictionaryRevision();

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
  }, [userData.activeDictionary, revision]);

  let label, stats, longestWord;

  if (viewingOverall) {
    stats = userData.stats;
    label = t("Overall");
    longestWord = overallLongestWord;
  } else {
    const dictionary = userData.dictionaries.find(
      (d) => d.id == userData.activeDictionary,
    )!;

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
                    .join("\n"),
                )
                .join("\n\n");
              const message = headerText + "\n" + bodyText;

              Share.share({ message }).catch(logError);
            }}
          />
        </View>
      </View>

      <View style={listBlockStyles}>
        <Span style={styles.longestWord}>
          {t("label", { label: t("Longest_Word") })}{" "}
          <Span style={theme.styles.poppingText}>
            {longestWord != undefined ? longestWord : t("NA")}
          </Span>
        </Span>
      </View>

      <View style={listBlockStyles}>
        <View style={styles.list}>
          {renderStatsList(theme, t, stats, readStats)}
        </View>

        <ReadSvg style={styles.readSvg} width={100} height={50} />
      </View>

      <View style={styles.iconWithStatRow}>
        <IconWithStat
          style={listBlockStyles}
          theme={theme}
          icon={<DefinitionIcon size={32} color={theme.colors.disabledText} />}
          label={t("Total_Definitions")}
          value={stats.definitions ?? 0}
        />

        <IconWithStat
          style={listBlockStyles}
          theme={theme}
          icon={<ExampleIcon size={32} color={theme.colors.disabledText} />}
          label={t("Total_Examples")}
          value={stats.totalExamples ?? 0}
        />
      </View>

      <View style={styles.iconWithStatRow}>
        <IconWithStat
          style={listBlockStyles}
          theme={theme}
          icon={<MicrophoneIcon size={32} color={theme.colors.disabledText} />}
          label={t("Total_Pronounced")}
          value={stats.totalPronounced ?? 0}
        />

        <IconWithStat
          style={listBlockStyles}
          theme={theme}
          icon={<EducationIcon size={32} color={theme.colors.disabledText} />}
          label={t("Total_Max_Confidence")}
          value={stats.documentedMaxConfidence ?? 0}
        />
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

function PatsBlock({ theme }: { theme: Theme; userData: UserData }) {
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
          <SignalledSpan
            style={theme.styles.poppingText}
            signal={patCountSignal}
          />
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
    marginBottom: 8,
    flexDirection: "row",
  },
  list: {
    paddingVertical: 12,
    paddingHorizontal: 12,
  },
  iconWithStatRow: {
    flexDirection: "row",
    gap: 8,
  },
  iconWithStat: {
    flex: 1,
    minWidth: 0,
    alignItems: "center",
    flexDirection: "row",
    paddingHorizontal: 12,
    paddingVertical: 4,
    gap: 12,
  },
  longestWord: {
    alignContent: "center",
    marginHorizontal: "auto",
    padding: 12,
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

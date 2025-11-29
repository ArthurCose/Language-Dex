import React, { useEffect, useMemo, useState } from "react";
import { FlatList, Pressable, StyleSheet, View } from "react-native";
import BottomListPopup from "@/lib/components/bottom-list-popup";
import { useTranslation } from "react-i18next";
import { useTheme } from "@/lib/contexts/theme";
import { useUserDataSignal } from "@/lib/contexts/user-data";
import { useSignalLens } from "@/lib/hooks/use-signal";
import { ArrowUpIcon, ArrowDownIcon } from "../icons";
import { listWords, wordOrderOptions } from "@/lib/data";
import { Span } from "../text";
import { router } from "expo-router";
import { logError } from "@/lib/log";
import { useDictionaryVersioning } from "@/lib/hooks/use-word-definitions";
import SearchInput from "../search-input";

const PART_OF_SPEECH_ALL = -1;
const PART_OF_SPEECH_UNKNOWN = -2;

const COLUMNS = 2;

function Word({ item: word }: { item: string }) {
  const theme = useTheme();

  return (
    <Pressable
      key={word}
      style={[styles.wordButton, theme.styles.dictionaryWordButton]}
      android_ripple={theme.ripples.transparentButton}
      pointerEvents="box-only"
      onPress={() =>
        router.navigate(
          `/words/existing/${encodeURIComponent(word.toLowerCase())}`
        )
      }
    >
      <Span numberOfLines={1} style={theme.styles.dictionaryWordButtonText}>
        {word}
      </Span>
    </Pressable>
  );
}

export default function Dictionary() {
  const [t] = useTranslation();
  const theme = useTheme();
  const userDataSignal = useUserDataSignal();
  const userActiveDictionary = useSignalLens(
    userDataSignal,
    (data) => data.activeDictionary
  );
  const partsOfSpeech = useSignalLens(
    userDataSignal,
    (data) =>
      data.dictionaries.find((d) => d.id == data.activeDictionary)!
        .partsOfSpeech
  );

  const [activeDictionaryId, setActiveDictionaryId] =
    useState(userActiveDictionary);

  const [allWords, setAllWords] = useState<string[]>([]);
  const [searchValue, setSearchValue] = useState("");
  const [partOfSpeechFilter, setPartOfSpeechFilter] =
    useState(PART_OF_SPEECH_ALL);
  const [orderBy, setOrderBy] = useState(() => {
    const userData = userDataSignal.get();

    return userData.dictionaryOrder != undefined &&
      wordOrderOptions.includes(userData.dictionaryOrder)
      ? userData.dictionaryOrder
      : wordOrderOptions[0];
  });
  const [ascending, setAscending] = useState(true);

  // resolve final word list
  const filteredWords = useMemo(() => {
    if (searchValue) {
      const lowerCaseSearchValue = searchValue.toLowerCase();
      return allWords.filter((w) =>
        w.toLowerCase().startsWith(lowerCaseSearchValue)
      );
    }

    return allWords;
  }, [searchValue, allWords]);

  const finalWords = useMemo(
    () => (ascending ? filteredWords : filteredWords.toReversed()),
    [filteredWords, ascending]
  );

  const dictionaryVersion = useDictionaryVersioning();

  useEffect(() => {
    setAllWords([]);

    let partOfSpeechId: number | undefined | null = partOfSpeechFilter;

    if (partOfSpeechId == PART_OF_SPEECH_ALL) {
      partOfSpeechId = undefined;
    } else if (partOfSpeechId == PART_OF_SPEECH_UNKNOWN) {
      partOfSpeechId = null;
    }

    if (activeDictionaryId != userActiveDictionary) {
      setActiveDictionaryId(userActiveDictionary);
      setPartOfSpeechFilter(PART_OF_SPEECH_ALL);
      partOfSpeechId = undefined;
    }

    let cancelled = false;

    listWords(userActiveDictionary, {
      ascending: false,
      orderBy,
      partOfSpeech: partOfSpeechId,
    })
      .then((words) => {
        if (cancelled) {
          return;
        }

        if (orderBy == "alphabetical" || orderBy == "confidence") {
          // flip alphabetical to match what a user would expect:
          // a-z is going down the list and not up
          // lowest confidence at the top
          words.reverse();
        }

        setAllWords(words);
      })
      .catch(logError);

    return () => {
      cancelled = true;
    };
  }, [userActiveDictionary, partOfSpeechFilter, orderBy, dictionaryVersion]);

  // resolve parts of speech list
  const [partOfSpeechOptions, resolveWordFilterLabel] = useMemo(() => {
    const partOfSpeechOptions = [
      PART_OF_SPEECH_ALL,
      ...partsOfSpeech.map((p) => p.id),
      PART_OF_SPEECH_UNKNOWN,
    ];

    const partOfSpeechLabelMap: { [id: number]: string } = {};

    for (const partOfSpeech of partsOfSpeech) {
      partOfSpeechLabelMap[partOfSpeech.id] = partOfSpeech.name;
    }

    const resolveWordFilterLabel = (value: number) => {
      if (value == PART_OF_SPEECH_ALL) {
        return t("all");
      } else if (value == PART_OF_SPEECH_UNKNOWN) {
        return t("unknown");
      }

      return partOfSpeechLabelMap[value] || "undefined";
    };

    return [partOfSpeechOptions, resolveWordFilterLabel];
  }, [partsOfSpeech]);

  return (
    <>
      <Pressable
        style={[styles.addWordButton, theme.styles.dictionaryAddWordButton]}
        android_ripple={theme.ripples.primaryButton}
        pointerEvents="box-only"
        onPress={() => router.navigate("/words/new")}
      >
        <Span style={theme.styles.dictionaryAddWordButtonText}>
          {t("Add_Word")}
        </Span>
      </Pressable>

      <FlatList
        ListHeaderComponent={() =>
          finalWords.length > 0 && (
            <View
              style={[theme.styles.separator, theme.styles.definitionBorders]}
            />
          )
        }
        style={[styles.wordList, theme.styles.backgroundDefinitionBorder]}
        data={finalWords}
        numColumns={COLUMNS}
        initialNumToRender={12}
        keyExtractor={(_, i) => String(i)}
        renderItem={({ item }) => <Word item={item} />}
      />

      <View
        style={[styles.optionsRows, theme.styles.backgroundDefinitionBorder]}
      >
        <View style={styles.optionsRow}>
          <SearchInput value={searchValue} onChangeText={setSearchValue} />
        </View>

        <View style={[styles.optionsRow, styles.dropdownsRow]}>
          <BottomListPopup
            style={[
              theme.styles.searchOption,
              styles.searchOption,
              styles.dropdown,
            ]}
            label={resolveWordFilterLabel(partOfSpeechFilter)}
            items={partOfSpeechOptions}
            mapItem={resolveWordFilterLabel}
            onChange={setPartOfSpeechFilter}
          />

          <BottomListPopup
            style={[
              theme.styles.searchOption,
              styles.searchOption,
              styles.dropdown,
            ]}
            label={t(orderBy)}
            items={wordOrderOptions}
            mapItem={(value) => t(value)}
            onChange={setOrderBy}
          />

          <Pressable
            style={[theme.styles.searchOption, styles.searchOption]}
            onPress={() => setAscending(!ascending)}
          >
            {!ascending ? (
              <ArrowUpIcon color={theme.colors.iconButton} size={24} />
            ) : (
              <ArrowDownIcon color={theme.colors.iconButton} size={24} />
            )}
          </Pressable>
        </View>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  wordList: {
    flex: 1,
  },
  wordRow: {
    display: "flex",
    flexDirection: "row",
  },
  wordButton: {
    display: "flex",
    alignItems: "center",
    height: 48,
    justifyContent: "center",
    width: `${100 / COLUMNS}%`,
  },
  addWordButton: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 8,
    margin: 8,
    height: 44,
    marginTop: 0,
    flex: 0,
  },
  optionsRows: {
    padding: 8,
    gap: 8,
  },
  optionsRow: {
    display: "flex",
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 8,
  },
  searchOption: {
    paddingHorizontal: 10,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  dropdown: { flex: 1 },
  dropdownsRow: {},
});

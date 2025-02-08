import React, { useEffect, useMemo, useState } from "react";
import { Pressable, StyleSheet, View, VirtualizedList } from "react-native";
import BottomListPopup from "@/lib/components/bottom-list-popup";
import { useTranslation } from "react-i18next";
import { useTheme } from "@/lib/contexts/theme";
import { useUserDataContext } from "@/lib/contexts/user-data";
import CustomTextInput from "@/lib/components/custom-text-input";
import { CloseIcon, ArrowUpIcon, ArrowDownIcon } from "../icons";
import { listWords, wordOrderOptions } from "@/lib/data";
import { Span } from "../text";
import { router } from "expo-router";
import { logError } from "@/lib/log";
import { useDictionaryVersioning } from "@/lib/hooks/use-word-definitions";

const wordFilters = [-1];

const COLUMNS = 2;

function getRowCount(words: string[]) {
  return Math.ceil(words.length / COLUMNS);
}

function getRowWords(words: string[], start: number) {
  start *= 2;
  const end = start + COLUMNS;
  const list = [];

  for (let i = start; i < words.length && i < end; i++) {
    list.push(words[i]);
  }

  return list;
}

function WordRow({ item: words }: { item: string[] }) {
  const theme = useTheme();

  return (
    <View style={styles.wordRow}>
      {words.map((word) => (
        <Pressable
          key={word}
          style={[styles.wordButton, theme.styles.dictionaryWordButton]}
          android_ripple={theme.ripples.transparentButton}
          onPress={() =>
            router.navigate(`/words/${encodeURIComponent(word.toLowerCase())}`)
          }
        >
          <Span numberOfLines={1} style={theme.styles.dictionaryWordButtonText}>
            {word}
          </Span>
        </Pressable>
      ))}
    </View>
  );
}

export default function Dictionary() {
  const [t] = useTranslation();
  const theme = useTheme();
  const [userData] = useUserDataContext();

  const dictionary = userData.dictionaries.find(
    (d) => d.id == userData.activeDictionary
  )!;
  const [activeDictionaryId, setActiveDictionaryId] = useState(
    userData.activeDictionary
  );

  const [allWords, setAllWords] = useState<string[]>([]);
  const [searchValue, setSearchValue] = useState("");
  const [partOfSpeechFilter, setPartOfSpeechFilter] = useState(wordFilters[0]);
  const [orderBy, setOrderBy] = useState(() =>
    userData.dictionaryOrder != undefined &&
    wordOrderOptions.includes(userData.dictionaryOrder)
      ? userData.dictionaryOrder
      : wordOrderOptions[0]
  );
  const [ascending, setAscending] = useState(true);

  // resolve final word list
  const filteredWords = useMemo(() => {
    if (searchValue) {
      return allWords.filter((w) =>
        w.toLowerCase().includes(searchValue.toLowerCase())
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

    let partOfSpeechId =
      partOfSpeechFilter == -1 ? undefined : partOfSpeechFilter;

    if (activeDictionaryId != userData.activeDictionary) {
      setActiveDictionaryId(userData.activeDictionary);
      setPartOfSpeechFilter(-1);
      partOfSpeechId = undefined;
    }

    let cancelled = false;

    listWords(dictionary.id, {
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
  }, [
    userData.activeDictionary,
    partOfSpeechFilter,
    orderBy,
    dictionaryVersion,
  ]);

  // resolve parts of speech list
  const [partOfSpeechOptions, resolveWordFilterLabel] = useMemo(() => {
    const partOfSpeechOptions = [
      -1,
      ...dictionary.partsOfSpeech.map((p) => p.id),
    ];

    const partOfSpeechLabelMap: { [id: number]: string } = {};

    for (const partOfSpeech of dictionary.partsOfSpeech) {
      partOfSpeechLabelMap[partOfSpeech.id] = partOfSpeech.name;
    }

    const resolveWordFilterLabel = (value: number) => {
      if (value == -1) {
        return t("all");
      }

      return partOfSpeechLabelMap[value] || "undefined";
    };

    return [partOfSpeechOptions, resolveWordFilterLabel];
  }, [dictionary.partsOfSpeech]);

  return (
    <>
      <Pressable
        style={[styles.addWordButton, theme.styles.dictionaryAddWordButton]}
        android_ripple={theme.ripples.primaryButton}
        onPress={() => router.navigate("/new-word")}
      >
        <Span style={theme.styles.dictionaryAddWordButtonText}>
          {t("Add_Word")}
        </Span>
      </Pressable>

      <VirtualizedList
        ListHeaderComponent={() =>
          finalWords.length > 0 && (
            <View
              style={[theme.styles.separator, theme.styles.definitionBorders]}
            />
          )
        }
        style={[styles.wordList, theme.styles.backgroundDefinitionBorder]}
        data={finalWords}
        getItemCount={getRowCount}
        getItem={getRowWords}
        keyExtractor={(_, i) => String(i)}
        renderItem={({ item }) => <WordRow item={item} />}
      />

      <View
        style={[styles.optionsRows, theme.styles.backgroundDefinitionBorder]}
      >
        <View style={styles.optionsRow}>
          <View style={[styles.searchBar, theme.styles.searchInputContainer]}>
            <CustomTextInput
              style={[styles.searchInput, theme.styles.searchInput]}
              placeholder={t("search_placeholder")}
              value={searchValue}
              onChangeText={setSearchValue}
            />

            {searchValue && (
              <Pressable onPress={() => setSearchValue("")}>
                <CloseIcon size={24} color={theme.colors.text} />
              </Pressable>
            )}
          </View>
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
  searchInput: {
    flex: 1,
    fontSize: 16,
    height: 40,
    paddingHorizontal: 16,
  },
  searchBar: {
    flex: 1,
    display: "flex",
    flexDirection: "row",
    alignItems: "center",
    paddingRight: 10,
  },
  optionsRows: {
    padding: 8,
  },
  optionsRow: {
    display: "flex",
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 8,
    marginTop: 8,
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

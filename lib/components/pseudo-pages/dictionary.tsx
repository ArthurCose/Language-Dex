import React, { useEffect, useMemo, useState } from "react";
import { FlatList, Pressable, StyleSheet, View } from "react-native";
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
  const [userData] = useUserDataContext();

  const dictionary = userData.dictionaries.find(
    (d) => d.id == userData.activeDictionary
  )!;
  const [activeDictionaryId, setActiveDictionaryId] = useState(
    userData.activeDictionary
  );

  const [allWords, setAllWords] = useState<string[]>([]);
  const [searchValue, setSearchValue] = useState("");
  const [partOfSpeechFilter, setPartOfSpeechFilter] =
    useState(PART_OF_SPEECH_ALL);
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

    let partOfSpeechId: number | undefined | null = partOfSpeechFilter;

    if (partOfSpeechId == PART_OF_SPEECH_ALL) {
      partOfSpeechId = undefined;
    } else if (partOfSpeechId == PART_OF_SPEECH_UNKNOWN) {
      partOfSpeechId = null;
    }

    if (activeDictionaryId != userData.activeDictionary) {
      setActiveDictionaryId(userData.activeDictionary);
      setPartOfSpeechFilter(PART_OF_SPEECH_ALL);
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
      PART_OF_SPEECH_ALL,
      ...dictionary.partsOfSpeech.map((p) => p.id),
      PART_OF_SPEECH_UNKNOWN,
    ];

    const partOfSpeechLabelMap: { [id: number]: string } = {};

    for (const partOfSpeech of dictionary.partsOfSpeech) {
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
  }, [dictionary.partsOfSpeech]);

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

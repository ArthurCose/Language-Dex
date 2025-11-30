import { useEffect, useState } from "react";
import { listWords, WordDefinitionData } from "@/lib/data";
import Dialog, { DialogHeader } from "../dialog";
import { Pressable, StyleSheet, VirtualizedList } from "react-native";
import { useUserDataSignal } from "@/lib/contexts/user-data";
import { useSignalLens } from "@/lib/hooks/use-signal";
import { logError } from "@/lib/log";
import { useTranslation } from "react-i18next";
import { Span } from "../text";
import { useTheme } from "@/lib/contexts/theme";
import SearchInput from "../search-input";
import IconButton from "../icon-button";
import { ArrowLeftIcon } from "../icons";
import useWordDefinitions from "@/lib/hooks/use-word-definitions";

function SearchAllWords({
  words,
  visible,
  onSelect,
}: {
  words: string[];
  visible: boolean;
  onSelect: (spelling: string) => void;
}) {
  const theme = useTheme();
  const [filteredWords, setFilteredWords] = useState<string[]>([]);
  const [searchValue, setSearchValue] = useState("");

  useEffect(() => {
    const lowerCaseSearchValue = searchValue.toLowerCase();

    setFilteredWords(
      words.filter((word) =>
        word.toLowerCase().startsWith(lowerCaseSearchValue)
      )
    );
  }, [words, searchValue]);

  if (!visible) {
    return null;
  }

  return (
    <>
      <VirtualizedList
        data={filteredWords}
        initialNumToRender={20}
        keyExtractor={(item: string) => item}
        getItem={(_, i) => filteredWords[i]}
        getItemCount={() => filteredWords.length}
        renderItem={({ item }) => (
          <Pressable
            style={styles.row}
            android_ripple={theme.ripples.transparentButton}
            onPress={() => onSelect(item)}
          >
            <Span>{item}</Span>
          </Pressable>
        )}
      />

      <SearchInput
        style={styles.searchInput}
        value={searchValue}
        onChangeText={setSearchValue}
      />
    </>
  );
}

function ListWordDefinitions({
  dictionaryId,
  spelling,
  onSelect,
}: {
  dictionaryId: number;
  spelling: string;
  onSelect: (definition: WordDefinitionData) => void;
}) {
  const [t] = useTranslation();
  const theme = useTheme();

  const lowerCase = spelling.toLowerCase();
  const definitionMap = useWordDefinitions(dictionaryId, [lowerCase]);

  const definitions =
    definitionMap[lowerCase]?.definitionsResult?.definitions ?? [];

  const userDataSignal = useUserDataSignal();
  const activeDictionary = useSignalLens(userDataSignal, (data) =>
    data.dictionaries.find((d) => d.id == dictionaryId)
  )!;

  return (
    <>
      {definitions.map((definition) => {
        const partOfSpeech = activeDictionary.partsOfSpeech.find(
          (p) => p.id == definition.partOfSpeech
        )?.name;

        return (
          <Pressable
            key={definition.id}
            style={styles.definitionButton}
            android_ripple={theme.ripples.transparentButton}
            onPress={() => onSelect(definition)}
          >
            {/* todo: use DefinitionContent from definition-bubbles instead? mainly wanting a better name for the component */}
            <Span style={theme.styles.partOfSpeech}>
              {partOfSpeech ?? t("unknown")}
            </Span>

            <Span style={styles.definition}>{definition.definition}</Span>

            {definition.example.length > 0 && (
              <Span style={[styles.definition, theme.styles.example]}>
                {definition.example}
              </Span>
            )}
          </Pressable>
        );
      })}
    </>
  );
}

export default function SearchWordDialog({
  open,
  onSelect,
  onClose,
}: {
  open: boolean;
  onSelect: (definition: WordDefinitionData) => void;
  onClose: () => void;
}) {
  const [selectedWord, setSelectedWord] = useState<string | null>(null);

  const userDataSignal = useUserDataSignal();
  const activeDictionary = useSignalLens(
    userDataSignal,
    (data) => data.activeDictionary
  );

  useEffect(() => {
    // reset state
    if (open) {
      setSelectedWord(null);
    }
  }, [open]);

  const [words, setWords] = useState<string[]>([]);

  // possibly causes a lag spike when loading definition editor
  // but prevents visual issues when opening the dialog
  useEffect(() => {
    listWords(activeDictionary, {
      ascending: true,
      orderBy: "alphabetical",
    })
      .then(setWords)
      .catch(logError);
  }, []);

  return (
    <Dialog
      open={open}
      onClose={() => {
        if (selectedWord != undefined) {
          setSelectedWord(null);
        } else {
          onClose();
        }
      }}
    >
      {selectedWord && (
        <>
          <DialogHeader>
            <IconButton
              icon={ArrowLeftIcon}
              onPress={() => setSelectedWord(null)}
            />

            <Span>{selectedWord}</Span>
          </DialogHeader>

          <ListWordDefinitions
            dictionaryId={activeDictionary}
            spelling={selectedWord}
            onSelect={(definition) => onSelect(definition)}
          />
        </>
      )}

      <SearchAllWords
        visible={selectedWord == undefined}
        words={words}
        onSelect={setSelectedWord}
      />
    </Dialog>
  );
}

const styles = StyleSheet.create({
  definition: {
    paddingLeft: 16,
  },
  row: {
    display: "flex",
    flexDirection: "row",
    alignItems: "center",
    height: 48,
    paddingHorizontal: 16,
  },
  searchInput: {
    backgroundColor: "#0004",
    margin: 8,
  },
  definitionButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    minHeight: 16,
  },
});

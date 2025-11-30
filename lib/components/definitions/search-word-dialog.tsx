import { useEffect, useState } from "react";
import { listWords, WordDefinitionData } from "@/lib/data";
import Dialog from "../dialog";
import { Pressable, StyleSheet, View, VirtualizedList } from "react-native";
import { useUserDataSignal } from "@/lib/contexts/user-data";
import { useSignalLens } from "@/lib/hooks/use-signal";
import { logError } from "@/lib/log";
import { useTranslation } from "react-i18next";
import { Span } from "../text";
import { useTheme } from "@/lib/contexts/theme";
import SearchInput from "../search-input";
import useWordDefinitions from "@/lib/hooks/use-word-definitions";
import { CheckIcon, ChevronDownIcon, ChevronUpIcon } from "../icons";

function ListWordDefinitions({
  dictionaryId,
  spelling,
  selectedDefinitions,
  onSelect,
}: {
  dictionaryId: number;
  spelling: string;
  selectedDefinitions: WordDefinitionData[];
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

  const buttonStyles = [styles.definitionButton, styles.row];

  return (
    <>
      {definitions.map((definition) => {
        const partOfSpeech = activeDictionary.partsOfSpeech.find(
          (p) => p.id == definition.partOfSpeech
        )?.name;

        const selected = selectedDefinitions.some((d) => d.id == definition.id);

        return (
          <Pressable
            key={definition.id}
            style={buttonStyles}
            android_ripple={theme.ripples.transparentButton}
            onPress={() => onSelect(definition)}
          >
            {/* todo: use DefinitionContent from definition-bubbles instead? mainly wanting a better name for the component */}
            <View>
              <Span style={theme.styles.partOfSpeech}>
                {partOfSpeech ?? t("unknown")}
              </Span>

              <Span style={styles.definition}>{definition.definition}</Span>

              {definition.example.length > 0 && (
                <Span style={[styles.definition, theme.styles.example]}>
                  {definition.example}
                </Span>
              )}
            </View>

            <CheckIcon
              style={!selected && styles.hidden}
              size={32}
              color={theme.colors.iconButton}
            />
          </Pressable>
        );
      })}
    </>
  );
}

type Props = { open: boolean; onClose: () => void } & (
  | {
      multi?: false;
      onSelect: (definition: WordDefinitionData) => void;
    }
  | {
      multi: true;
      onSelect: (definitions: WordDefinitionData[]) => void;
    }
);

export default function SearchWordDialog({
  open,
  multi,
  onSelect,
  onClose,
}: Props) {
  const theme = useTheme();
  const [words, setWords] = useState<string[]>([]);
  const [filteredWords, setFilteredWords] = useState<string[]>([]);
  const [searchValue, setSearchValue] = useState("");
  const [expanded, setExpanded] = useState<{ [key: string]: boolean }>({});
  const [selectedList, setSelectedList] = useState<WordDefinitionData[]>([]);

  const userDataSignal = useUserDataSignal();
  const activeDictionary = useSignalLens(
    userDataSignal,
    (data) => data.activeDictionary
  );

  // resets state when opening the dialog
  useEffect(() => {
    if (open) {
      setExpanded({});
      setSelectedList([]);
    }
  }, [open]);

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

  useEffect(() => {
    const lowerCaseSearchValue = searchValue.toLowerCase();

    setFilteredWords(
      words.filter((word) =>
        word.toLowerCase().startsWith(lowerCaseSearchValue)
      )
    );
  }, [words, searchValue]);

  return (
    <Dialog open={open} onClose={onClose}>
      <VirtualizedList
        data={filteredWords}
        initialNumToRender={20}
        keyExtractor={(item: string) => item}
        getItem={(_, i) => filteredWords[i]}
        getItemCount={() => filteredWords.length}
        renderItem={({ item }) => (
          <View>
            <Pressable
              style={styles.row}
              android_ripple={theme.ripples.transparentButton}
              onPress={() =>
                setExpanded({ ...expanded, [item]: !expanded[item] })
              }
            >
              <Span>{item}</Span>

              {expanded[item] ? (
                <ChevronUpIcon size={32} color={theme.colors.iconButton} />
              ) : (
                <ChevronDownIcon size={32} color={theme.colors.iconButton} />
              )}
            </Pressable>

            {expanded[item] && (
              <ListWordDefinitions
                dictionaryId={activeDictionary}
                spelling={item}
                selectedDefinitions={selectedList}
                onSelect={(definition) => {
                  if (!multi) {
                    onSelect(definition);
                    onClose();
                    return;
                  }

                  const index = selectedList.findIndex(
                    (d) => d.id == definition.id
                  );

                  if (index == -1) {
                    setSelectedList([...selectedList, definition]);
                  } else {
                    setSelectedList(selectedList.toSpliced(index, 1));
                  }
                }}
              />
            )}
          </View>
        )}
      />

      <View style={styles.actions}>
        <SearchInput
          style={styles.searchInput}
          value={searchValue}
          onChangeText={setSearchValue}
        />

        {multi && (
          <Pressable
            style={[
              { backgroundColor: theme.colors.primary.default },
              styles.confirm,
            ]}
            android_ripple={theme.ripples.transparentButton}
            onPress={() => {
              onSelect(selectedList);
              onClose();
            }}
          >
            <CheckIcon size={32} color={theme.colors.primary.contrast} />
          </Pressable>
        )}
      </View>
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
    justifyContent: "space-between",
    minHeight: 48,
    paddingHorizontal: 16,
  },
  actions: {
    margin: 8,
    gap: 8,
    flexDirection: "row",
  },
  searchInput: {
    backgroundColor: "#0004",
    flex: 1,
  },
  confirm: {
    borderRadius: 24,
    justifyContent: "center",
    alignItems: "center",
    width: 80,
    overflow: "hidden",
  },
  definitionButton: {
    backgroundColor: "#0002",
    paddingVertical: 8,
    paddingLeft: 32,
    paddingRight: 16,
    minHeight: 16,
    gap: 8,
  },
  hidden: {
    opacity: 0,
  },
});

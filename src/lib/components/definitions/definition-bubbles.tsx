import { useMemo } from "react";
import { StyleSheet, Pressable, View } from "react-native";
import { useTranslation } from "react-i18next";
import { useUserDataSignal } from "@/src/lib/contexts/user-data-context";
import { useSignalLens } from "@/src/lib/hooks/use-signal";
import {
  DictionaryData,
  namePartOfSpeech,
  DictionaryEntry,
} from "@/src/lib/data";
import * as Clipboard from "expo-clipboard";
import { router } from "expo-router";
import { logError } from "@/src/lib/log";
import { useTheme } from "@/src/lib/contexts/theme-context";
import { Span } from "@/src/lib/components/text";
import ContextMenu, {
  ContextMenuPressable,
  ContextMenuSeparator,
} from "@/src/lib/components/context-menu";
import { normalize } from "@/src/lib/text-processing/normalization";

type DefinitionBubbleProps = {
  entry: DictionaryEntry;
  readOnly: boolean;
  contrast?: boolean;
  onRemove?: () => void;
  close: () => void;
};

type DefinitionsBubbleProps = {
  text: string;
  entryResult?: {
    spellings: string[];
    entries: DictionaryEntry[];
  };
  close: () => void;
  generateExample?: () => string;
};

function DefinitionContent({
  dictionary,
  entry,
}: {
  dictionary: DictionaryData;
  entry: DictionaryEntry;
}) {
  const theme = useTheme();
  const [t] = useTranslation();

  const partOfSpeech = namePartOfSpeech(dictionary, entry.partOfSpeech);

  return (
    <>
      <Span style={theme.styles.partOfSpeech}>
        {partOfSpeech ?? t("unknown")}
      </Span>

      <Span style={styles.definition}>{entry.definition}</Span>

      {entry.example.length > 0 && (
        <Span style={[styles.definition, theme.styles.example]}>
          {entry.example}
        </Span>
      )}
    </>
  );
}

export function DefinitionBubble({
  entry,
  readOnly,
  contrast,
  onRemove,
  close,
}: DefinitionBubbleProps) {
  const theme = useTheme();
  const [t] = useTranslation();
  const userDataSignal = useUserDataSignal();
  const dictionary = useSignalLens(
    userDataSignal,
    (data) => data.dictionaries.find((d) => d.id == data.activeDictionary)!,
  );

  const text = entry.spelling;

  return (
    <ContextMenu contrast={contrast} onClose={close}>
      <Pressable
        android_ripple={theme.ripples.popup}
        pointerEvents="box-only"
        disabled={readOnly}
        onPress={() => {
          router.navigate(`/words/existing/${encodeURIComponent(text)}`);
          close();
        }}
      >
        <Span style={styles.wordTitle}>{entry.spelling}</Span>
      </Pressable>

      <ContextMenuSeparator />

      <Pressable
        style={styles.definitionBlock}
        android_ripple={theme.ripples.popup}
        pointerEvents="box-only"
        disabled={readOnly}
        onPress={() => {
          router.navigate(
            `/words/existing/${encodeURIComponent(
              text,
            )}/entry/${encodeURIComponent(entry.id)}`,
          );
          close();
        }}
      >
        <DefinitionContent dictionary={dictionary} entry={entry} />
      </Pressable>

      <ContextMenuSeparator />

      {onRemove ? (
        <ContextMenuPressable
          onPress={() => {
            onRemove();
            close();
          }}
        >
          <Span>{t("Remove")}</Span>
        </ContextMenuPressable>
      ) : (
        <ContextMenuPressable
          onPress={() => {
            Clipboard.setStringAsync(entry.spelling).catch(logError);
            close();
          }}
        >
          <Span>{t("Copy")}</Span>
        </ContextMenuPressable>
      )}
    </ContextMenu>
  );
}

export function DefinitionsBubble({
  text,
  entryResult,
  close,
  generateExample,
}: DefinitionsBubbleProps) {
  const theme = useTheme();
  const [t] = useTranslation();
  const userDataSignal = useUserDataSignal();
  const dictionary = useSignalLens(
    userDataSignal,
    (data) => data.dictionaries.find((d) => d.id == data.activeDictionary)!,
  );

  const entryBlocks = useMemo(() => {
    if (!entryResult) {
      return;
    }

    type EntryBlock = {
      spelling: string;
      lowercaseSpelling: string;
      entries: DictionaryEntry[];
    };

    const lowercasedText = text.toLowerCase();
    const strictDiacritics = lowercasedText != normalize(text);

    const blocks: EntryBlock[] = [];
    let lastBlock: EntryBlock | undefined;

    for (const entry of entryResult.entries) {
      const lowercaseSpelling = entry.spelling.toLowerCase();

      if (lastBlock?.lowercaseSpelling == lowercaseSpelling) {
        lastBlock.entries.push(entry);
        continue;
      }

      if (strictDiacritics && lowercaseSpelling != lowercasedText) {
        continue;
      }

      lastBlock = {
        spelling: entry.spelling,
        lowercaseSpelling,
        entries: [entry],
      };

      if (lowercaseSpelling == lowercasedText) {
        // if this block matches the text, store it at the top
        blocks.unshift(lastBlock);
      } else {
        blocks.push(lastBlock);
      }
    }

    return blocks;
  }, [entryResult]);

  return (
    <ContextMenu onClose={close}>
      {entryBlocks &&
        entryBlocks.map((block) => (
          <View key={block.lowercaseSpelling}>
            <Pressable
              android_ripple={theme.ripples.popup}
              pointerEvents="box-only"
              onPress={() => {
                router.navigate(
                  `/words/existing/${encodeURIComponent(block.spelling)}`,
                );
                close();
              }}
            >
              <Span style={styles.wordTitle}>{block.spelling}</Span>
            </Pressable>

            <ContextMenuSeparator />

            {block.entries.map((entry) => {
              return (
                <View key={entry.id}>
                  <Pressable
                    style={styles.definitionBlock}
                    android_ripple={theme.ripples.popup}
                    pointerEvents="box-only"
                    onPress={() => {
                      router.navigate(
                        `/words/existing/${encodeURIComponent(
                          text,
                        )}/entry/${encodeURIComponent(entry.id)}`,
                      );
                      close();
                    }}
                  >
                    <DefinitionContent dictionary={dictionary} entry={entry} />
                  </Pressable>

                  <ContextMenuSeparator />
                </View>
              );
            })}
          </View>
        ))}

      <ContextMenuPressable
        onPress={() => {
          const wordParam = encodeURIComponent(text);
          let params = "";

          if (generateExample) {
            params = "example=" + encodeURIComponent(generateExample());
          }

          router.navigate(`/words/existing/${wordParam}/entry/add?${params}`);
          close();
        }}
      >
        <Span>{t("Add_Definition")}</Span>
      </ContextMenuPressable>

      <ContextMenuSeparator />

      <ContextMenuPressable
        onPress={() => {
          Clipboard.setStringAsync(text).catch(logError);
          close();
        }}
      >
        <Span>{t("Copy")}</Span>
      </ContextMenuPressable>
    </ContextMenu>
  );
}

const styles = StyleSheet.create({
  wordTitle: {
    fontWeight: "bold",
    textAlign: "center",
    textAlignVertical: "center",
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  definitionBlock: {
    paddingVertical: 4,
    paddingHorizontal: 12,
  },
  definition: {
    paddingLeft: 12,
  },
  example: {
    marginTop: 4,
    paddingLeft: 12,
  },
});

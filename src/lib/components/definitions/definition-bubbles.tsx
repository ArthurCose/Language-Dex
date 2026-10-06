import { StyleSheet, Pressable, View } from "react-native";
import { useTranslation } from "react-i18next";
import * as DropDownPrimitive from "@rn-primitives/dropdown-menu";
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
import { NavigationBarSpacer } from "../system-bar-spacers";

type DefinitionBubbleProps = {
  entry: DictionaryEntry;
  readOnly: boolean;
  contrast?: boolean;
  onRemove?: () => void;
  close: () => void;
};

type DefinitionsBubbleProps = {
  text: string;
  lowercase: string;
  entryResult?: {
    spelling: string;
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

  const lowercase = entry.spelling.toLowerCase();

  return (
    <DropDownPrimitive.Portal>
      <DropDownPrimitive.Overlay
        style={StyleSheet.absoluteFill}
        onPress={close}
      >
        <DropDownPrimitive.Content align="center">
          <View
            style={[
              styles.popup,
              theme.styles.dialog,
              theme.styles.definitionBubble,
              contrast && theme.styles.popupContrast,
            ]}
          >
            <Pressable
              style={[styles.bordered, theme.styles.definitionBorders]}
              android_ripple={theme.ripples.popup}
              pointerEvents="box-only"
              disabled={readOnly}
              onPress={() => {
                router.navigate(
                  `/words/existing/${encodeURIComponent(lowercase)}`,
                );
                close();
              }}
            >
              <Span style={[styles.wordTitle]}>{entry.spelling}</Span>
            </Pressable>

            <Pressable
              style={[
                styles.definitionBlock,
                styles.bordered,
                theme.styles.definitionBorders,
              ]}
              android_ripple={theme.ripples.popup}
              pointerEvents="box-only"
              disabled={readOnly}
              onPress={() => {
                router.navigate(
                  `/words/existing/${encodeURIComponent(
                    lowercase,
                  )}/entry/${encodeURIComponent(entry.id)}`,
                );
                close();
              }}
            >
              <DefinitionContent dictionary={dictionary} entry={entry} />
            </Pressable>

            {onRemove ? (
              <Pressable
                style={styles.action}
                android_ripple={theme.ripples.popup}
                pointerEvents="box-only"
                onPress={() => {
                  onRemove();
                  close();
                }}
              >
                <Span>{t("Remove")}</Span>
              </Pressable>
            ) : (
              <Pressable
                style={styles.action}
                android_ripple={theme.ripples.popup}
                pointerEvents="box-only"
                onPress={() => {
                  Clipboard.setStringAsync(entry.spelling).catch(logError);
                  close();
                }}
              >
                <Span>{t("Copy")}</Span>
              </Pressable>
            )}
          </View>

          <NavigationBarSpacer />
        </DropDownPrimitive.Content>
      </DropDownPrimitive.Overlay>
    </DropDownPrimitive.Portal>
  );
}

export function DefinitionsBubble({
  text,
  lowercase,
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

  return (
    <DropDownPrimitive.Portal>
      <DropDownPrimitive.Overlay
        style={StyleSheet.absoluteFill}
        onPress={close}
      >
        <DropDownPrimitive.Content align="center">
          <View
            style={[
              styles.popup,
              theme.styles.dialog,
              theme.styles.definitionBubble,
            ]}
          >
            {entryResult && (
              <>
                <Pressable
                  style={[styles.bordered, theme.styles.definitionBorders]}
                  android_ripple={theme.ripples.popup}
                  pointerEvents="box-only"
                  onPress={() => {
                    router.navigate(
                      `/words/existing/${encodeURIComponent(lowercase)}`,
                    );
                    close();
                  }}
                >
                  <Span style={[styles.wordTitle]}>{entryResult.spelling}</Span>
                </Pressable>

                {entryResult.entries.map((entry) => {
                  return (
                    <Pressable
                      key={entry.id}
                      style={[
                        styles.definitionBlock,
                        styles.bordered,
                        theme.styles.definitionBorders,
                      ]}
                      android_ripple={theme.ripples.popup}
                      pointerEvents="box-only"
                      onPress={() => {
                        router.navigate(
                          `/words/existing/${encodeURIComponent(
                            lowercase,
                          )}/entry/${encodeURIComponent(entry.id)}`,
                        );
                        close();
                      }}
                    >
                      <DefinitionContent
                        dictionary={dictionary}
                        entry={entry}
                      />
                    </Pressable>
                  );
                })}
              </>
            )}

            <Pressable
              style={[
                styles.action,
                styles.bordered,
                theme.styles.definitionBorders,
              ]}
              android_ripple={theme.ripples.popup}
              pointerEvents="box-only"
              onPress={() => {
                const wordParam = encodeURIComponent(lowercase);
                let params = "";

                if (generateExample) {
                  params = "example=" + encodeURIComponent(generateExample());
                }

                router.navigate(
                  `/words/existing/${wordParam}/entry/add?${params}`,
                );
                close();
              }}
            >
              <Span>{t("Add_Definition")}</Span>
            </Pressable>

            <Pressable
              style={styles.action}
              android_ripple={theme.ripples.popup}
              pointerEvents="box-only"
              onPress={() => {
                Clipboard.setStringAsync(text).catch(logError);
                close();
              }}
            >
              <Span>{t("Copy")}</Span>
            </Pressable>
          </View>

          <NavigationBarSpacer />
        </DropDownPrimitive.Content>
      </DropDownPrimitive.Overlay>
    </DropDownPrimitive.Portal>
  );
}

const styles = StyleSheet.create({
  popup: {
    marginHorizontal: 8,
    marginVertical: 4,
    minWidth: 100,
    maxWidth: 256,
  },
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
  bordered: {
    borderStyle: "solid",
    borderWidth: 0,
    borderBottomWidth: 1,
  },
  action: {
    padding: 8,
    paddingHorizontal: 16,
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
  },
});

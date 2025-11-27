import React from "react";
import { StyleSheet, Pressable, View } from "react-native";
import { useTranslation } from "react-i18next";
import * as DropDownPrimitive from "@rn-primitives/dropdown-menu";
import { useUserDataSignal } from "@/lib/contexts/user-data";
import { useSignalLens } from "@/lib/hooks/use-signal";
import {
  DictionaryData,
  namePartOfSpeech,
  WordDefinitionData,
} from "@/lib/data";
import * as Clipboard from "expo-clipboard";
import { router } from "expo-router";
import { logError } from "@/lib/log";
import { useTheme } from "@/lib/contexts/theme";
import { Span } from "@/lib/components/text";

type DefinitionsBubbleProps = {
  text: string;
  lowercase: string;
  definitionResult?: {
    spelling: string;
    definitions: WordDefinitionData[];
  };
  close: () => void;
};

function DefinitionContent({
  dictionary,
  definition,
}: {
  dictionary: DictionaryData;
  definition: WordDefinitionData;
}) {
  const theme = useTheme();
  const [t] = useTranslation();

  const partOfSpeech = namePartOfSpeech(dictionary, definition.partOfSpeech);

  return (
    <>
      <Span style={theme.styles.partOfSpeech}>
        {partOfSpeech ?? t("unknown")}
      </Span>

      <Span style={styles.definition}>{definition.definition}</Span>

      {definition.example.length > 0 && (
        <Span style={[styles.definition, theme.styles.example]}>
          {definition.example}
        </Span>
      )}
    </>
  );
}

export function DefinitionsBubble({
  text,
  lowercase,
  definitionResult,
  close,
}: DefinitionsBubbleProps) {
  const theme = useTheme();
  const [t] = useTranslation();
  const userDataSignal = useUserDataSignal();
  const dictionary = useSignalLens(
    userDataSignal,
    (data) => data.dictionaries.find((d) => d.id == data.activeDictionary)!
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
            {definitionResult && (
              <>
                <Pressable
                  style={[styles.bordered, theme.styles.definitionBorders]}
                  android_ripple={theme.ripples.popup}
                  pointerEvents="box-only"
                  onPress={() => {
                    router.navigate(
                      `/words/existing/${encodeURIComponent(lowercase)}`
                    );
                    close();
                  }}
                >
                  <Span style={[styles.wordTitle]}>
                    {definitionResult.spelling}
                  </Span>
                </Pressable>

                {definitionResult.definitions.map((definition) => {
                  return (
                    <Pressable
                      key={definition.id}
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
                            lowercase
                          )}/definition/${encodeURIComponent(definition.id)}`
                        );
                        close();
                      }}
                    >
                      <DefinitionContent
                        dictionary={dictionary}
                        definition={definition}
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
                router.navigate(
                  `/words/existing/${encodeURIComponent(
                    lowercase
                  )}/definition/add`
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
        </DropDownPrimitive.Content>
      </DropDownPrimitive.Overlay>
    </DropDownPrimitive.Portal>
  );
}

const styles = StyleSheet.create({
  popup: {
    marginHorizontal: 8,
    marginVertical: 4,
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

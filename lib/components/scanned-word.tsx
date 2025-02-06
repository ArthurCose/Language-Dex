import React, { useMemo, useRef, useState } from "react";
import { StyleSheet, Pressable, View } from "react-native";
import * as DropDownPrimitive from "@rn-primitives/dropdown-menu";
import { useTheme } from "@/lib/contexts/theme";
import useWordDefinitions from "@/lib/hooks/use-word-definitions";
import { Span } from "./text";
import { useTranslation } from "react-i18next";
import { useUserDataContext } from "@/lib/contexts/user-data";
import { namePartOfSpeech, WordDefinitionData } from "@/lib/data";
import * as Clipboard from "expo-clipboard";
import { router } from "expo-router";
import { logError } from "../log";

type Props = { dictionaryId: number; text: string; lowercase: string };

type DefinitionsBubbleProps = {
  text: string;
  lowercase: string;
  definitionResult?: {
    spelling: string;
    definitions: WordDefinitionData[];
  };
  close: () => void;
};

function DefinitionsBubble({
  text,
  lowercase,
  definitionResult,
  close,
}: DefinitionsBubbleProps) {
  const theme = useTheme();
  const [t] = useTranslation();
  const [userData] = useUserDataContext();
  const dictionary = userData.dictionaries.find(
    (d) => d.id == userData.activeDictionary
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
                  onPress={() => {
                    router.navigate(`/words/${encodeURIComponent(lowercase)}`);
                    close();
                  }}
                >
                  <Span style={[styles.wordTitle]}>
                    {definitionResult.spelling}
                  </Span>
                </Pressable>

                {definitionResult.definitions.map((definition) => {
                  const partOfSpeech = namePartOfSpeech(
                    dictionary,
                    definition.partOfSpeech
                  );

                  return (
                    <Pressable
                      key={definition.id}
                      style={[
                        styles.definitionBlock,
                        styles.bordered,
                        theme.styles.definitionBorders,
                      ]}
                      android_ripple={theme.ripples.popup}
                      onPress={() => {
                        router.navigate(
                          `/words/${encodeURIComponent(
                            lowercase
                          )}/definition/${encodeURIComponent(definition.id)}`
                        );
                        close();
                      }}
                    >
                      <Span style={[theme.styles.partOfSpeech]}>
                        {partOfSpeech ?? t("unknown")}
                      </Span>

                      <Span style={[styles.definition]}>
                        {definition.definition}
                      </Span>

                      {definition.example.length > 0 && (
                        <Span style={[styles.definition, theme.styles.example]}>
                          {definition.example}
                        </Span>
                      )}
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
              onPress={() => {
                router.navigate(
                  `/words/${encodeURIComponent(lowercase)}/definition/add`
                );
                close();
              }}
            >
              <Span>{t("Add_Definition")}</Span>
            </Pressable>

            <Pressable
              style={styles.action}
              android_ripple={theme.ripples.popup}
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

export default function ScannedWord({ dictionaryId, text, lowercase }: Props) {
  const theme = useTheme();
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<DropDownPrimitive.TriggerRef | null>(null);

  const wordDeps = useMemo(() => [lowercase], [lowercase]);
  const definitionMap = useWordDefinitions(dictionaryId, wordDeps);
  const definitionData = definitionMap[lowercase];
  const definitionResult = definitionData && definitionData.definitionsResult;

  const underlineStyles = [theme.styles.scanWord];

  if (definitionResult && definitionResult.definitions.length > 0) {
    underlineStyles.push(theme.styles.scanOldWord);
  } else if (definitionData?.loaded) {
    underlineStyles.push(theme.styles.scanNewWord);
  }

  const close = () => {
    setOpen(false);
    triggerRef.current?.close();
  };

  return (
    <DropDownPrimitive.Root>
      <DropDownPrimitive.Trigger ref={triggerRef} onPress={() => setOpen(true)}>
        <View style={underlineStyles}>
          <Span
            style={[theme.styles.scanText, open && theme.styles.scanTextActive]}
          >
            {text}
          </Span>
        </View>
      </DropDownPrimitive.Trigger>

      {open && (
        <DefinitionsBubble
          text={text}
          lowercase={lowercase}
          definitionResult={definitionResult}
          close={close}
        />
      )}
    </DropDownPrimitive.Root>
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

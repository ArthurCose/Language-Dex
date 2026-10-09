import { useRef, useState } from "react";
import { StyleSheet, Pressable, View, TextStyle } from "react-native";
import { useTranslation } from "react-i18next";
import * as DropDownPrimitive from "@rn-primitives/dropdown-menu";
import { Span } from "@/src/lib/components/text";
import { useTheme } from "@/src/lib/contexts/theme-context";
import CustomTextInput from "@/src/lib/components/custom-text-input";
import ContextMenu, {
  ContextMenuPressable,
  ContextMenuSeparator,
} from "@/src/lib/components/context-menu";

export default function VariantsEditor({
  spellings,
  setSpellings,
}: {
  spellings: string[];
  setSpellings?: (spellings: string[]) => void;
}) {
  const [t] = useTranslation();
  const theme = useTheme();
  const triggerRef = useRef<DropDownPrimitive.TriggerRef | null>(null);
  const [selectedWord, setSelectedWord] = useState<string | null>(null);
  const [pendingSpelling, setPendingSpelling] = useState<string | null>(null);

  const textStyle: TextStyle = {
    fontSize: 16,
    color: theme.colors.variantText,
  };
  const pressableStyle = [
    styles.wordPressable,
    { backgroundColor: theme.colors.variantBackground },
  ];

  return (
    <View style={styles.root}>
      <View style={styles.list}>
        {spellings.map((word) => {
          return (
            <DropDownPrimitive.Root key={word}>
              <DropDownPrimitive.Trigger
                ref={triggerRef}
                style={pressableStyle}
                onPress={() => setSelectedWord(word)}
                android_ripple={theme.ripples.transparentButton}
              >
                <Span style={textStyle}>{word}</Span>
              </DropDownPrimitive.Trigger>

              {selectedWord == word && (
                <ContextMenu
                  contrast
                  onClose={() => {
                    setSelectedWord(null);
                    triggerRef.current?.close();
                  }}
                >
                  <ContextMenuPressable
                    onPress={() => {
                      setSpellings?.(spellings.filter((w) => w != word));
                      setPendingSpelling(word);
                    }}
                  >
                    <Span>{t("Edit")}</Span>
                  </ContextMenuPressable>

                  <ContextMenuSeparator />

                  <ContextMenuPressable
                    onPress={() =>
                      setSpellings?.(spellings.filter((w) => w != word))
                    }
                  >
                    <Span>{t("Remove")}</Span>
                  </ContextMenuPressable>
                </ContextMenu>
              )}
            </DropDownPrimitive.Root>
          );
        })}

        {setSpellings && pendingSpelling != null && (
          <CustomTextInput
            style={[pressableStyle, textStyle]}
            defaultValue={pendingSpelling}
            autoFocus
            onChangeText={setPendingSpelling}
            onBlur={() => {
              const newSpelling = pendingSpelling.trim();

              if (newSpelling != "" && !spellings.includes(newSpelling)) {
                const newSpellings = [...spellings, newSpelling];
                newSpellings.sort();
                setSpellings(newSpellings);
              }

              setPendingSpelling(null);
            }}
          />
        )}

        {setSpellings && pendingSpelling == null && (
          <Pressable
            style={pressableStyle}
            onPress={() => setPendingSpelling("")}
            android_ripple={theme.ripples.transparentButton}
          >
            <Span style={textStyle}>+</Span>
          </Pressable>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    flexShrink: 1,
    flexDirection: "column",
  },
  list: {
    flexDirection: "row",
    flexWrap: "wrap",
  },
  wordPressable: {
    overflow: "hidden",
    justifyContent: "center",
    borderRadius: 18,
    height: 36,
    paddingHorizontal: 18,
    paddingVertical: 0,
    margin: 4,
  },
});

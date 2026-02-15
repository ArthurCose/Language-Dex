import { useMemo, useRef, useState } from "react";
import {
  ColorValue,
  Pressable,
  StyleProp,
  StyleSheet,
  View,
  ViewStyle,
} from "react-native";
import { useUserDataSignal } from "@/lib/contexts/user-data";
import {
  clearSynonymCluster,
  createSynonymCluster,
  deleteEmptySynonymCluster,
  getClusterAntonymsId,
  listWordsInSynonymCluster,
  RelationWord,
  setClusterAntonyms,
  setSynonymCluster,
  WordDefinitionData,
} from "@/lib/data";
import { Signal, useSignalLens, useSignalValue } from "@/lib/hooks/use-signal";
import useWordDefinitions, {
  DefinitionMap,
} from "@/lib/hooks/use-word-definitions";
import usePracticeColors from "@/lib/hooks/use-practice-colors";
import { useTranslation } from "react-i18next";
import FloatingSwitcher from "../floating-switcher";
import * as DropDownPrimitive from "@rn-primitives/dropdown-menu";
import { DefinitionBubble } from "./definition-bubbles";
import { Span } from "../text";
import SearchWordDialog from "./search-word-dialog";
import IconButton from "../icon-button";
import { CloseIcon, UnlinkIcon } from "../icons";
import { logError } from "@/lib/log";
import { useTheme } from "@/lib/contexts/theme";
import { createSetFromMapped } from "@/lib/structures/existence-set";
import { findAndSwapRemove } from "@/lib/structures/array";

function RelationList({
  style,
  color,
  backgroundColor,
  definitionMap,
  words,
  setWords,
  onAdd,
}: {
  style: StyleProp<ViewStyle>;
  color: ColorValue;
  backgroundColor: ColorValue;
  definitionMap: DefinitionMap;
  words: RelationWord[];
  setWords: (words: RelationWord[]) => void;
  onAdd?: () => void;
}) {
  const theme = useTheme();
  const triggerRef = useRef<DropDownPrimitive.TriggerRef | null>(null);
  const [selectedWord, setSelectedWord] = useState<RelationWord | null>(null);

  const textStyle = { color };
  const pressableStyle = [styles.wordPressable, { backgroundColor }];

  return (
    <View style={[styles.list, style]}>
      {words.map((word) => {
        const definition = definitionMap[
          word.spelling.toLowerCase()
        ]?.definitionsResult?.definitions.find((d) => d.id == word.id);

        return (
          <DropDownPrimitive.Root key={word.id}>
            <DropDownPrimitive.Trigger
              ref={triggerRef}
              style={pressableStyle}
              onPress={() => setSelectedWord(word)}
              android_ripple={theme.ripples.transparentButton}
            >
              <Span style={textStyle}>{word.spelling}</Span>
            </DropDownPrimitive.Trigger>

            {word == selectedWord && definition && (
              <DefinitionBubble
                definition={definition}
                readOnly
                contrast
                onRemove={() => {
                  setWords(words.filter((w) => w.id != word.id));
                }}
                close={() => {
                  setSelectedWord(null);
                  triggerRef.current?.close();
                }}
              />
            )}
          </DropDownPrimitive.Root>
        );
      })}

      {onAdd && (
        <Pressable
          style={pressableStyle}
          onPress={onAdd}
          android_ripple={theme.ripples.transparentButton}
        >
          <Span style={textStyle}>+</Span>
        </Pressable>
      )}
    </View>
  );
}

function sortWords(words: RelationWord[]) {
  words.sort((a, b) => {
    if (a.spelling < b.spelling) {
      return -1;
    }

    if (a.spelling == b.spelling) {
      return 0;
    }

    return 1;
  });
}

type TabName = "Synonyms" | "Antonyms";
type RelationEditorWord = {
  id: number;
  spelling: string;
  synonymsId?: number | null;
};

export class RelationsEditorData {
  definitionId?: number | null;
  synonymsId: Signal<number | null | undefined>;
  unlinkedSynonymsId?: number | null;
  antonymsId?: number | null;
  synonyms: Signal<RelationEditorWord[]>;
  antonyms: Signal<RelationEditorWord[]>;
  totalLoading: Signal<number>;
  modified: Signal<boolean>;
  loadedSynonymClusters: Set<number>;

  constructor(definition?: WordDefinitionData) {
    const synonymsId = definition?.synonymsId;

    this.definitionId = definition?.id;
    this.synonymsId = new Signal(synonymsId);
    this.synonyms = new Signal<RelationWord[]>([]);
    this.antonyms = new Signal<RelationWord[]>([]);
    this.totalLoading = new Signal(0);
    this.modified = new Signal(false);
    this.loadedSynonymClusters = new Set();

    if (synonymsId != null) {
      this.totalLoading.set(2);
      this.loadedSynonymClusters.add(synonymsId);

      // load synonyms
      listWordsInSynonymCluster(synonymsId)
        .then((words) => {
          // remove ourself from the synonym list
          findAndSwapRemove(words, (word) => word.id == this.definitionId);
          sortWords(words);
          this.synonyms.set(words);
        })
        .catch(logError)
        .finally(() => this.totalLoading.subtract(1));

      // load antonyms
      getClusterAntonymsId(synonymsId)
        .then((clusterId) => {
          if (clusterId == null) {
            return [];
          }

          this.antonymsId = clusterId;
          this.loadedSynonymClusters.add(clusterId);
          return listWordsInSynonymCluster(clusterId);
        })
        .then((words) => {
          sortWords(words);
          this.antonyms.set(words);
        })
        .catch(logError)
        .finally(() => this.totalLoading.subtract(1));
    }
  }

  updateWords(tab: TabName, words: RelationEditorWord[]) {
    this.modified.set(true);

    let appendSignal = this.synonyms;
    let antonymSignal = this.antonyms;

    if (tab == "Antonyms") {
      appendSignal = this.antonyms;
      antonymSignal = this.synonyms;
    }

    const wordSet = createSetFromMapped(words, (w) => w.id);
    let antonyms = [...antonymSignal.get()];

    for (const word of antonyms) {
      wordSet.add(word.id);
    }

    // pull in words from synonym clusters
    const promises: Promise<any>[] = [];

    for (const word of words) {
      const synonymsId = word.synonymsId;

      if (this.loadedSynonymClusters.has(word.id) || synonymsId == null) {
        continue;
      }

      this.loadedSynonymClusters.add(synonymsId);

      // load synonyms
      const promise = listWordsInSynonymCluster(synonymsId).then(
        (clusterWords) => {
          for (const word of clusterWords) {
            if (!wordSet.has(word.id)) {
              wordSet.add(word.id);
              words.push(word);
            }
          }
        },
      );

      promises.push(promise);

      // load antonyms
      const loadAntonyms = async () => {
        const antonymsId = await getClusterAntonymsId(synonymsId);

        if (antonymsId == null) {
          return;
        }

        const clusterWords = await listWordsInSynonymCluster(antonymsId);

        for (const word of clusterWords) {
          if (!wordSet.has(word.id)) {
            wordSet.add(word.id);
            antonyms.push(word);
          }
        }
      };

      promises.push(loadAntonyms());
    }

    const complete = () => {
      // avoid storing self in these lists
      if (this.definitionId != null && wordSet.has(this.definitionId)) {
        wordSet.delete(this.definitionId);
        findAndSwapRemove(words, (w) => w.id == this.definitionId);
        findAndSwapRemove(antonyms, (w) => w.id == this.definitionId);
      }

      // avoid storing words in both lists
      const set = createSetFromMapped(words, (w) => w.id);
      antonyms = antonyms.filter((w) => !set.has(w.id));

      sortWords(words);
      appendSignal.set(words);

      sortWords(antonyms);
      antonymSignal.set(antonyms);
    };

    if (promises.length > 0) {
      this.totalLoading.add(1);

      Promise.all(promises)
        .catch(logError)
        .finally(() => {
          this.totalLoading.subtract(1);
          complete();
        });
    } else {
      complete();
    }
  }

  unlink() {
    this.modified.set(true);

    if (this.synonymsId.get() != null) {
      // clear synonyms id to generate a new cluster
      this.unlinkedSynonymsId = this.synonymsId.get();
      this.synonymsId.set(null);
      this.antonymsId = null;
    }

    this.synonyms.set([]);
    this.antonyms.set([]);
  }

  async #saveSynonymCluster(
    clusterId: number | null | undefined,
    antonymsId: number | null | undefined,
    words: RelationEditorWord[],
  ): Promise<number> {
    if (clusterId == null) {
      clusterId = await createSynonymCluster(antonymsId);
    } else {
      // clear the cluster to remove old values
      await clearSynonymCluster(clusterId);
    }

    await Promise.all(words.map((w) => setSynonymCluster(w, clusterId)));

    // delete external clusters that we've fully taken words from
    const checkedEmpty = new Set();

    for (const word of words) {
      if (
        word.synonymsId == clusterId ||
        word.synonymsId == null ||
        checkedEmpty.has(word.synonymsId)
      ) {
        continue;
      }

      checkedEmpty.add(word.synonymsId);
      await deleteEmptySynonymCluster(word.synonymsId);
      word.synonymsId = clusterId;
    }

    return clusterId;
  }

  async save(definition: RelationEditorWord) {
    this.modified.set(false);

    await this.#saveClusters(definition);

    if (this.unlinkedSynonymsId != null) {
      if (this.synonymsId.get() == null) {
        // we didn't update to a new synonym cluster
        // so we need to unset the previous one
        await setSynonymCluster(definition, null);
      }

      // clean up old synonym cluster
      await deleteEmptySynonymCluster(this.unlinkedSynonymsId);
      this.unlinkedSynonymsId = null;
    }
  }

  async #saveClusters(definition: RelationEditorWord) {
    const synonyms = [...this.synonyms.get()];
    const antonyms = this.antonyms.get();
    const creatingAntonyms = this.antonymsId == null && antonyms.length > 0;

    let synonymsId = this.synonymsId.get();

    if (synonyms.length == 0 && antonyms.length == 0) {
      if (synonymsId == null) {
        // no need to create or delete a synonym cluster
        return;
      }

      // delete the synonym cluster
      await clearSynonymCluster(synonymsId);
      await deleteEmptySynonymCluster(synonymsId);
      this.synonymsId.set(null);

      if (this.antonymsId != null) {
        // delete the antonyms cluster
        await clearSynonymCluster(this.antonymsId);
        await deleteEmptySynonymCluster(this.antonymsId);
      }

      return;
    }

    // add ourself to the synonym cluster
    synonyms.push(definition);

    synonymsId = await this.#saveSynonymCluster(
      synonymsId,
      this.antonymsId,
      synonyms,
    );

    this.synonymsId.set(synonymsId);

    if (antonyms.length > 0 || this.antonymsId != null) {
      this.antonymsId = await this.#saveSynonymCluster(
        this.antonymsId,
        synonymsId,
        antonyms,
      );

      if (creatingAntonyms) {
        // antonymsId didn't exist when creating the synonym cluster
        await setClusterAntonyms(synonymsId, this.antonymsId);
      } else if (antonyms.length == 0) {
        await deleteEmptySynonymCluster(this.antonymsId);
      }
    }
  }
}

export function RelationsEditor({
  data,
  style,
}: {
  data: RelationsEditorData;
  style: StyleProp<ViewStyle>;
}) {
  const [t] = useTranslation();
  const [tab, setTab] = useState<TabName>("Synonyms");
  const [searchOpen, setSearchOpen] = useState(false);

  const synonyms = useSignalValue(data.synonyms);
  const antonyms = useSignalValue(data.antonyms);

  const userDataSignal = useUserDataSignal();
  const activeDictionary = useSignalLens(
    userDataSignal,
    (data) => data.activeDictionary,
  );

  const lowerCaseWords = useMemo(
    () => [
      ...synonyms.map((w) => w.spelling.toLowerCase()),
      ...antonyms.map((w) => w.spelling.toLowerCase()),
    ],
    [synonyms, antonyms],
  );
  const definitionMap = useWordDefinitions(activeDictionary, lowerCaseWords);

  const colors = usePracticeColors();
  const loadingWords = useSignalValue(data.totalLoading) > 0;

  const synonymsId = useSignalValue(data.synonymsId);

  return (
    <View style={style}>
      <FloatingSwitcher
        style={styles.switcher}
        items={["Synonyms", "Antonyms"] as TabName[]}
        selected={tab}
        keyExtractor={(value) => value}
        renderLabel={(value) => t(value)}
        onSelect={setTab}
      />

      <View style={styles.tabContent}>
        {tab == "Synonyms" && (
          <RelationList
            style={styles.listWrapper}
            color={colors.correct.color}
            backgroundColor={colors.correct.backgroundColor}
            definitionMap={definitionMap}
            words={synonyms}
            setWords={(words) => data.updateWords("Synonyms", words)}
            onAdd={() => setSearchOpen(true)}
          />
        )}

        {tab == "Antonyms" && (
          <RelationList
            style={styles.listWrapper}
            color={colors.mistake.color}
            definitionMap={definitionMap}
            backgroundColor={colors.mistake.backgroundColor}
            words={antonyms}
            setWords={(words) => data.updateWords("Antonyms", words)}
            onAdd={() => setSearchOpen(true)}
          />
        )}

        <View style={styles.options}>
          {(synonyms.length > 0 || antonyms.length > 0) && (
            <IconButton
              icon={synonymsId != null ? UnlinkIcon : CloseIcon}
              onPress={() => data.unlink()}
              disabled={loadingWords}
            />
          )}
        </View>
      </View>

      <SearchWordDialog<RelationEditorWord>
        open={searchOpen}
        multi
        value={tab == "Synonyms" ? synonyms : antonyms}
        onSelect={(definitions) => {
          setSearchOpen(false);
          data.updateWords(tab, definitions);
        }}
        onClose={() => setSearchOpen(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  switcher: {
    margin: 8,
  },
  tabContent: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  list: {
    flexDirection: "row",
    flexWrap: "wrap",
  },
  listWrapper: {
    flex: 1,
  },
  options: {
    flexDirection: "column",
    paddingRight: 8,
  },
  wordPressable: {
    overflow: "hidden",
    justifyContent: "center",
    borderRadius: 16,
    height: 32,
    paddingHorizontal: 16,
    margin: 4,
  },
});

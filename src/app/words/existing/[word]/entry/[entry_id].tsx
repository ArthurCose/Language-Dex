import { useEffect, useState } from "react";
import { useLocalSearchParams, useNavigation } from "expo-router";
import { useWordEntry } from "@/src/lib/hooks/use-word-entries";
import { useUserDataSignal } from "@/src/lib/contexts/user-data-context";
import EntryEditor from "@/src/lib/components/definitions/entry-editor";
import { useSignalLens } from "@/src/lib/hooks/use-signal";
import { normalize } from "@/src/lib/text-processing/normalization";

type SearchParams = {
  word?: string;
  entry_id?: string;
  example?: string;
};

export default function () {
  const navigation = useNavigation();
  const params = useLocalSearchParams<SearchParams>();
  const userDataSignal = useUserDataSignal();
  const activeDictionary = useSignalLens(
    userDataSignal,
    (data) => data.activeDictionary,
  );
  const [normalizedWord, setNormalizedWord] = useState(() =>
    params.word != null ? normalize(params.word) : undefined,
  );
  const [entryId, setEntryId] = useState(
    parseInt(params.entry_id!) || undefined,
  );

  const [entryLoaded, entry] = useWordEntry(
    activeDictionary,
    normalizedWord,
    entryId,
  );

  useEffect(() => {
    if (entryId == undefined || !entryLoaded || !navigation.isFocused()) {
      return;
    }

    if (!entry) {
      navigation.goBack();
    }
  }, [entryLoaded, entry]);

  return (
    <EntryEditor
      normalizedWord={normalizedWord}
      setNormalizedWord={setNormalizedWord}
      entryId={entryId}
      setEntryId={setEntryId}
      generatedExample={entryId == null ? params.example : undefined}
    />
  );
}

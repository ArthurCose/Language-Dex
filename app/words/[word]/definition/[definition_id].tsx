import React, { useEffect, useState } from "react";
import { useLocalSearchParams, useNavigation } from "expo-router";
import { useWordDefinition } from "@/lib/hooks/use-word-definitions";
import { useUserDataContext } from "@/lib/contexts/user-data";
import DefinitionEditor from "@/lib/components/definition-editor";
import { useTheme } from "@/lib/contexts/theme";

type SearchParams = {
  word?: string;
  definition_id?: string;
};

export default function () {
  const navigation = useNavigation();
  const params = useLocalSearchParams<SearchParams>();
  const theme = useTheme();
  const [userData] = useUserDataContext();
  const [word, setWord] = useState(() => params.word?.toLowerCase());
  const [definitionId, setDefinitionId] = useState(
    parseInt(params.definition_id!) || undefined
  );

  const [definitionLoaded, definitionData] = useWordDefinition(
    userData.activeDictionary,
    word,
    definitionId
  );

  useEffect(() => {
    if (
      definitionId == undefined ||
      !definitionLoaded ||
      !navigation.isFocused()
    ) {
      return;
    }

    if (!definitionData) {
      navigation.goBack();
    }
  }, [definitionLoaded, definitionData]);

  return (
    <DefinitionEditor
      lowerCaseWord={word}
      setLowerCaseWord={setWord}
      definitionId={definitionId}
      setDefinitionId={setDefinitionId}
    />
  );
}

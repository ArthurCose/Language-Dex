import React, { useState } from "react";
import { StyleProp, TextStyle, ViewStyle } from "react-native";
import { useTranslation } from "react-i18next";
import EditableListPopup from "./editable-list-popup";
import { useUserDataSignal } from "../contexts/user-data";
import {
  deleteDictionary,
  DictionaryData,
  negatableStats,
  prepareDictionaryUpdate,
} from "../data";
import ConfirmationDialog from "./confirmation-dialog";
import { bumpDictionaryVersion } from "../hooks/use-word-definitions";
import { useSignalLens } from "../hooks/use-signal";

type Props = {
  style?: StyleProp<ViewStyle>;
  labelStyle?: StyleProp<TextStyle>;
  value: number;
  onChange: (id: number) => void;
};

export default function DictionaryDropdown({
  style,
  labelStyle,
  value,
  onChange,
}: Props) {
  const userDataSignal = useUserDataSignal();
  const dictionaries = useSignalLens(
    userDataSignal,
    (data) => data.dictionaries
  );
  const [t] = useTranslation();
  const [deleteItem, setDeleteItem] = useState<DictionaryData | null>(null);
  const [deleteRequested, setDeleteRequested] = useState(false);

  return (
    <>
      <EditableListPopup
        name={t("Dictionary")}
        label={
          dictionaries.find((item) => item.id == value)?.name ?? t("unknown")
        }
        style={style}
        labelStyle={labelStyle}
        list={dictionaries}
        getItemText={(item) => item.name}
        keyExtractor={(item) => String(item.id)}
        addItemText={t("New_Dictionary")}
        onRename={(item, name) => {
          const [updatedData, updatedDictionary] = prepareDictionaryUpdate(
            userDataSignal.get(),
            item.id
          );

          updatedDictionary.name = name;

          userDataSignal.set(updatedData);
        }}
        onReorder={(list) => {
          const updatedData = { ...userDataSignal.get() };
          updatedData.dictionaries = list;
          userDataSignal.set(updatedData);
        }}
        onAdd={(name) => {
          const updatedData = { ...userDataSignal.get() };
          updatedData.dictionaries = [...updatedData.dictionaries];
          updatedData.dictionaries.push({
            name,
            id: updatedData.nextDictionaryId++,
            partsOfSpeech: [],
            nextPartOfSpeechId: 0,
            stats: {},
          });

          userDataSignal.set(updatedData);
        }}
        onDelete={(item) => {
          setDeleteItem(item);
          setDeleteRequested(true);
        }}
        onSelect={(item: DictionaryData) => onChange(item?.id)}
      />

      <ConfirmationDialog
        open={deleteRequested}
        title={t("Delete_Title", { name: deleteItem?.name })}
        description={t("Delete_Dictionary_Desc")}
        confirmationText={t("Confirm")}
        onCancel={() => setDeleteRequested(false)}
        onConfirm={async () => {
          if (!deleteItem) {
            return;
          }

          userDataSignal.set({ ...userDataSignal.get(), updatingStats: true });

          const id = deleteItem.id;
          await deleteDictionary(id);

          // make sure we're updating the latest userData since this is happening asynchronously

          const userData = { ...userDataSignal.get() };
          userData.updatingStats = false;

          const i = userData.dictionaries.findIndex((d) => d.id == id);
          const [dictionary] = userData.dictionaries.splice(i, 1);

          userData.stats = { ...userData.stats };

          for (const stat of negatableStats) {
            subStat(userData.stats, dictionary.stats, stat);
          }

          if (userData.dictionaries.length == 0) {
            userData.nextDictionaryId = 0;
            userData.dictionaries.push({
              name: t("New"),
              id: userData.nextDictionaryId++,
              partsOfSpeech: [],
              nextPartOfSpeechId: 0,
              stats: {},
            });
          }

          if (userData.activeDictionary == dictionary.id) {
            userData.activeDictionary = userData.dictionaries[0].id;
          }

          userDataSignal.set(userData);

          bumpDictionaryVersion();

          setDeleteRequested(false);
        }}
      />
    </>
  );
}

function subStat(
  a: { [key: string]: unknown },
  b: { [key: string]: unknown },
  key: string
) {
  if (typeof a[key] == "number" && typeof b[key] == "number") {
    a[key] = Math.max(a[key] - b[key], 0);
  }
}

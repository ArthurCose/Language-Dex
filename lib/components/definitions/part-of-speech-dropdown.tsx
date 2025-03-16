import React, { useState } from "react";
import { StyleProp, TextStyle, ViewStyle } from "react-native";
import { useTranslation } from "react-i18next";
import EditableListPopup from "../editable-list-popup";
import { useUserDataSignal } from "../../contexts/user-data";
import { useSignalLens } from "@/lib/hooks/use-signal";
import {
  deletePartOfSpeech,
  PartOfSpeechData,
  prepareDictionaryUpdate,
} from "../../data";
import ConfirmationDialog from "../confirmation-dialog";

type Props = {
  style?: StyleProp<ViewStyle>;
  labelStyle?: StyleProp<TextStyle>;
  value?: number | null;
  onChange: (id: number | null) => void;
};

export default function PartOfSpeechDropdown({
  style,
  labelStyle,
  value,
  onChange,
}: Props) {
  const userDataSignal = useUserDataSignal();
  const dictionary = useSignalLens(
    userDataSignal,
    (data) => data.dictionaries.find((d) => d.id == data.activeDictionary)!
  );
  const [t] = useTranslation();
  const [deleteItem, setDeleteItem] = useState<PartOfSpeechData | null>(null);
  const [deleteRequested, setDeleteRequested] = useState(false);

  return (
    <>
      <EditableListPopup
        name={t("Part_of_Speech")}
        label={
          dictionary.partsOfSpeech.find((item) => item.id == value)?.name ??
          t("Part_of_Speech")
        }
        style={style}
        labelStyle={labelStyle}
        list={dictionary.partsOfSpeech}
        getItemText={(item) => item.name}
        keyExtractor={(item) => String(item.id)}
        defaultItemText={t("unknown")}
        addItemText={t("Add_Part_of_Speech")}
        onRename={(item, name) => {
          const [updatedData, updatedDictionary] = prepareDictionaryUpdate(
            userDataSignal.get()
          );

          updatedDictionary.partsOfSpeech = updatedDictionary.partsOfSpeech.map(
            (existing) =>
              existing.id == item.id ? { ...existing, name } : existing
          );

          userDataSignal.set(updatedData);
        }}
        onReorder={(list) => {
          const [updatedData, updatedDictionary] = prepareDictionaryUpdate(
            userDataSignal.get()
          );

          updatedDictionary.partsOfSpeech = list;

          userDataSignal.set(updatedData);
        }}
        onAdd={(name) => {
          const [updatedData, updatedDictionary] = prepareDictionaryUpdate(
            userDataSignal.get()
          );

          const id = updatedDictionary.nextPartOfSpeechId++;
          updatedDictionary.partsOfSpeech =
            updatedDictionary.partsOfSpeech.concat({ id, name });

          userDataSignal.set(updatedData);
        }}
        onDelete={(item) => {
          setDeleteItem(item);
          setDeleteRequested(true);
        }}
        onSelect={(item?: PartOfSpeechData) => onChange(item?.id ?? null)}
      />

      <ConfirmationDialog
        open={deleteRequested}
        title={t("Delete_Title", { name: deleteItem?.name })}
        description={t("Delete_Part_of_Speech_Desc")}
        confirmationText={t("Confirm")}
        onCancel={() => setDeleteRequested(false)}
        onConfirm={async () => {
          if (!deleteItem) {
            return;
          }

          const id = deleteItem.id;

          await deletePartOfSpeech(dictionary.id, id);

          // make sure we're updating the latest userData since this is happening asynchronously
          const [updatedData, updatedDictionary] = prepareDictionaryUpdate(
            userDataSignal.get(),
            dictionary.id
          );

          updatedDictionary.partsOfSpeech =
            updatedDictionary.partsOfSpeech.filter(
              (existing) => existing.id != id
            );

          userDataSignal.set(updatedData);

          setDeleteRequested(false);
        }}
      />
    </>
  );
}

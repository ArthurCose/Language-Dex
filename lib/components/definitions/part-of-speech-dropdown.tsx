import React, { useState } from "react";
import { StyleProp, TextStyle, ViewStyle } from "react-native";
import { useTranslation } from "react-i18next";
import EditableListPopup from "../editable-list-popup";
import { useUserDataContext } from "../../contexts/user-data";
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
  const [userData, setUserData] = useUserDataContext();
  const [t] = useTranslation();
  const [deleteItem, setDeleteItem] = useState<PartOfSpeechData | null>(null);
  const [deleteRequested, setDeleteRequested] = useState(false);

  const dictionary = userData.dictionaries.find(
    (d) => d.id == userData.activeDictionary
  )!;

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
          const [updatedData, updatedDictionary] =
            prepareDictionaryUpdate(userData);

          updatedDictionary.partsOfSpeech = updatedDictionary.partsOfSpeech.map(
            (existing) =>
              existing.id == item.id ? { ...existing, name } : existing
          );

          setUserData(updatedData);
        }}
        onReorder={(list) => {
          const [updatedData, updatedDictionary] =
            prepareDictionaryUpdate(userData);

          updatedDictionary.partsOfSpeech = list;

          setUserData(updatedData);
        }}
        onAdd={(name) => {
          const [updatedData, updatedDictionary] =
            prepareDictionaryUpdate(userData);

          const id = updatedDictionary.nextPartOfSpeechId++;
          updatedDictionary.partsOfSpeech =
            updatedDictionary.partsOfSpeech.concat({ id, name });

          setUserData(updatedData);
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

          await deletePartOfSpeech(userData.activeDictionary, id);

          // make sure we're updating the latest userData since this is happening asynchronously
          setUserData((userData) => {
            const [updatedData, updatedDictionary] = prepareDictionaryUpdate(
              userData,
              userData.activeDictionary
            );

            updatedDictionary.partsOfSpeech =
              updatedDictionary.partsOfSpeech.filter(
                (existing) => existing.id != id
              );

            return updatedData;
          });

          setDeleteRequested(false);
        }}
      />
    </>
  );
}

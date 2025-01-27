import React, { useEffect, useState } from "react";
import {
  View,
  StyleSheet,
  Pressable,
  VirtualizedList,
  TextStyle,
  StyleProp,
  ViewStyle,
} from "react-native";
import {
  CancelEditIcon,
  DragVerticalIcon,
  DropdownIcon,
  EditIcon,
  LockIcon,
  TrashIcon,
} from "./icons";
import ReorderableList, {
  useReorderableDrag,
  reorderItems,
} from "react-native-reorderable-list";
import IconButton from "./icon-button";
import { Span } from "./text";
import { useTheme } from "../contexts/theme";
import { Theme } from "../themes";
import Dialog from "./dialog";
import CustomTextInput from "./custom-text-input";

type Props<T> = {
  style?: StyleProp<ViewStyle>;
  labelStyle?: StyleProp<TextStyle>;
  name: string;
  label: string;
  list: T[];
  getItemText: (item: T) => string;
  onReorder: (updatedList: T[], from: number, to: number) => void;
  keyExtractor: (item: T) => string;
  addItemText?: string;
  onRename?: (item: T, name: string) => void;
  onAdd?: () => void;
  onDelete?: (item: T) => void;
} & (
  | {
      defaultItemText?: undefined;
      onSelect?: (item: T) => void;
    }
  | {
      defaultItemText: string;
      onSelect?: (item?: T) => void;
    }
);

type EditableRowProps = {
  theme: Theme;
  text: string;
  onRename?: (text: string) => void;
  onDelete?: () => void;
};

function EditableRow({ theme, text, onRename, onDelete }: EditableRowProps) {
  const drag = useReorderableDrag();
  const [renaming, setRenaming] = useState<{ pending?: string } | null>(null);
  const [currentText, setCurrentText] = useState(text);

  useEffect(() => {
    if (text != currentText) {
      setCurrentText(text);
      setRenaming(null);
    }
  }, [text]);

  useEffect(() => {
    return () => {
      if (renaming && renaming.pending != undefined && renaming.pending != "") {
        onRename?.(renaming.pending);
      }
    };
  }, [renaming]);

  return (
    <View style={styles.rowStyle}>
      <Pressable style={styles.drag} onTouchStart={drag}>
        <DragVerticalIcon size={24} />
      </Pressable>

      {onRename ? (
        renaming ? (
          <CustomTextInput
            autoFocus
            style={[styles.renameInput, styles.textInput]}
            onChangeText={(text) => {
              setCurrentText(text);
              renaming.pending = text;
            }}
            onBlur={() => {
              if (currentText != "") onRename(currentText);
              renaming.pending = undefined;
              setRenaming(null);
            }}
            value={currentText}
          />
        ) : (
          <Pressable
            style={styles.renameInput}
            android_ripple={theme.ripples.transparentButton}
            onPress={() => setRenaming({})}
          >
            <Span>{text}</Span>
            {/* <TextboxIcon size={24} color={theme.colors.iconButton} /> */}
          </Pressable>
        )
      ) : (
        <View style={styles.renameInput}>
          <Span>{text}</Span>
        </View>
      )}

      {onDelete && <IconButton icon={TrashIcon} onPress={onDelete} />}
    </View>
  );
}

export default function EditableListPopup<T>({
  style,
  labelStyle,
  name,
  label,
  list,
  getItemText,
  onReorder: onSort,
  keyExtractor,
  defaultItemText,
  addItemText,
  onSelect,
  onRename,
  onAdd,
  onDelete,
}: Props<T>) {
  const theme = useTheme();
  const [editing, setEditing] = useState(false);
  const [open, setOpen] = useState(false);

  return (
    <>
      <Pressable onPress={() => setOpen(true)} style={[styles.button, style]}>
        <Span style={labelStyle}>{label} </Span>

        <View style={styles.dropDownIcon}>
          <DropdownIcon color={theme.colors.iconButton} size={20} />
        </View>
      </Pressable>

      <Dialog
        open={open}
        onClose={() => {
          setOpen(false);
          setEditing(false);
        }}
      >
        <View style={styles.headerStyle}>
          <Span>{name}</Span>

          <IconButton
            icon={editing ? CancelEditIcon : EditIcon}
            onPress={() => setEditing(!editing)}
          />
        </View>

        <View style={theme.styles.separator} />

        {editing ? (
          <ReorderableList
            ListHeaderComponent={
              defaultItemText != undefined ? (
                <View style={styles.rowStyle}>
                  <View style={styles.drag}>
                    <LockIcon size={24} color={theme.colors.iconButton} />
                  </View>
                  <Span>{defaultItemText}</Span>
                </View>
              ) : undefined
            }
            data={list}
            onReorder={({ from, to }) => {
              const newList = reorderItems(list, from, to);
              onSort(newList, from, to);
            }}
            renderItem={({ item }) => (
              <EditableRow
                theme={theme}
                text={getItemText(item)}
                onRename={onRename && ((name) => onRename(item, name))}
                onDelete={onDelete && (() => onDelete(item))}
              />
            )}
            cellAnimations={{ scale: false }}
            keyExtractor={keyExtractor}
          />
        ) : (
          <VirtualizedList
            ListHeaderComponent={
              defaultItemText != undefined ? (
                <Pressable
                  style={styles.rowStyle}
                  android_ripple={theme.ripples.transparentButton}
                  onPress={() => {
                    onSelect?.();
                    setOpen(false);
                  }}
                >
                  <Span style={styles.plainItem}>{defaultItemText}</Span>
                </Pressable>
              ) : undefined
            }
            data={list}
            getItem={(_, i) => list[i]}
            renderItem={({ item }) => (
              <Pressable
                style={styles.rowStyle}
                android_ripple={theme.ripples.transparentButton}
                onPress={() => {
                  onSelect?.(item);
                  setOpen(false);
                }}
              >
                <Span style={styles.plainItem}>{getItemText(item)}</Span>
              </Pressable>
            )}
            getItemCount={() => list.length}
            keyExtractor={keyExtractor}
          />
        )}

        {addItemText != undefined && (
          <>
            <View style={theme.styles.separator}></View>

            <Pressable
              style={styles.rowStyle}
              android_ripple={theme.ripples.transparentButton}
              onPress={() => onAdd?.()}
            >
              <Span style={styles.addItem}>{addItemText}</Span>
            </Pressable>
          </>
        )}
      </Dialog>
    </>
  );
}

const styles = StyleSheet.create({
  textInput: {
    fontSize: 16,
    padding: 0,
  },
  button: {
    display: "flex",
    flexDirection: "row",
    alignItems: "center",
    paddingRight: 8,
  },
  headerStyle: {
    paddingLeft: 16,
    display: "flex",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  rowStyle: {
    display: "flex",
    flexDirection: "row",
    alignItems: "center",
    height: 44,
  },
  plainItem: {
    paddingLeft: 16,
  },
  addItem: {
    marginHorizontal: "auto",
  },
  renameInput: {
    flex: 1,
    alignSelf: "stretch",
    display: "flex",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  drag: {
    display: "flex",
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "stretch",
    paddingHorizontal: 10,
  },
  dropDownIcon: {
    marginLeft: "auto",
  },
});

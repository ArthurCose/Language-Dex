import { ColorValue, StyleProp, TextStyle } from "react-native";
import MaterialDesignIcons from "@expo/vector-icons/MaterialCommunityIcons";

export type IconProps = {
  color?: ColorValue;
  size: number;
  style?: StyleProp<TextStyle>;
};

export function DictionaryIcon(props: IconProps) {
  return <MaterialDesignIcons name="book" {...props} />;
}

export function ScanIcon(props: IconProps) {
  return <MaterialDesignIcons name="text-search" {...props} />;
}

export function PuzzleIcon(props: IconProps) {
  return <MaterialDesignIcons name="puzzle" {...props} />;
}

export function StatisticsIcon(props: IconProps) {
  return <MaterialDesignIcons name="chart-bar" {...props} />;
}

export function ProfileIcon(props: IconProps) {
  return <MaterialDesignIcons name="account-outline" {...props} />;
}

export function SettingsIcon(props: IconProps) {
  return <MaterialDesignIcons name="cog" {...props} />;
}

export function HistoryIcon(props: IconProps) {
  return <MaterialDesignIcons name="history" {...props} />;
}

export function ConfirmReadyIcon(props: IconProps) {
  return <MaterialDesignIcons name="check" {...props} />;
}

export function CameraIcon(props: IconProps) {
  return <MaterialDesignIcons name="camera" {...props} />;
}

export function PlusIcon(props: IconProps) {
  return <MaterialDesignIcons name="plus" {...props} />;
}

export function CloseIcon(props: IconProps) {
  return <MaterialDesignIcons name="close" {...props} />;
}

export function EditIcon(props: IconProps) {
  return <MaterialDesignIcons name="pencil" {...props} />;
}

export function CancelEditIcon(props: IconProps) {
  return <MaterialDesignIcons name="pencil-off" {...props} />;
}

export function DropdownIcon(props: IconProps) {
  return <MaterialDesignIcons name="menu-down" {...props} />;
}

export function ArrowUpIcon(props: IconProps) {
  return <MaterialDesignIcons name="arrow-up" {...props} />;
}

export function ArrowDownIcon(props: IconProps) {
  return <MaterialDesignIcons name="arrow-down" {...props} />;
}

export function ArrowLeftIcon(props: IconProps) {
  return <MaterialDesignIcons name="arrow-left" {...props} />;
}

export function ArrowRightIcon(props: IconProps) {
  return <MaterialDesignIcons name="arrow-right" {...props} />;
}

export function TextboxIcon(props: IconProps) {
  return <MaterialDesignIcons name="form-textbox" {...props} />;
}

export function PartOfSpeechIcon(props: IconProps) {
  return <MaterialDesignIcons name="shape" {...props} />;
}

export function DefinitionIcon(props: IconProps) {
  return <MaterialDesignIcons name="text" {...props} />;
}

export function ExampleIcon(props: IconProps) {
  return <MaterialDesignIcons name="format-quote-open" {...props} />;
}

export function NotesIcon(props: IconProps) {
  return <MaterialDesignIcons name="alert-box-outline" {...props} />;
}

export function SaveIcon(props: IconProps) {
  return <MaterialDesignIcons name="content-save-outline" {...props} />;
}

export function TrashIcon(props: IconProps) {
  return <MaterialDesignIcons name="delete-outline" {...props} />;
}

export function CopyIcon(props: IconProps) {
  return <MaterialDesignIcons name="content-copy" {...props} />;
}

export function DragVerticalIcon(props: IconProps) {
  return <MaterialDesignIcons name="drag-horizontal-variant" {...props} />;
}

export function DragVerticalLongIcon(props: IconProps) {
  return <MaterialDesignIcons name="drag-vertical" {...props} />;
}

export function LockIcon(props: IconProps) {
  return <MaterialDesignIcons name="lock" {...props} />;
}

export function LinkIcon(props: IconProps) {
  return <MaterialDesignIcons name="link-variant" {...props} />;
}

export function TimerIcon(props: IconProps) {
  return <MaterialDesignIcons name="timer-outline" {...props} />;
}

export function ShuffleIcon(props: IconProps) {
  return <MaterialDesignIcons name="shuffle" {...props} />;
}

export function IncorrectIcon(props: IconProps) {
  return <MaterialDesignIcons name="close" {...props} />;
}

export function ShareIcon(props: IconProps) {
  return <MaterialDesignIcons name="share-variant" {...props} />;
}

export function PuzzleResultsIcon(props: IconProps) {
  return <MaterialDesignIcons name="medal-outline" {...props} />;
}

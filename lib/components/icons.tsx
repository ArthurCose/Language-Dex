import { ColorValue, StyleProp, TextStyle, Text } from "react-native";
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

export function PracticeIcon(props: IconProps) {
  return <MaterialDesignIcons name="weight-lifter" {...props} />;
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

export function CorrectIcon(props: IconProps) {
  return <MaterialDesignIcons name="check" {...props} />;
}

export function ShareIcon(props: IconProps) {
  return <MaterialDesignIcons name="share-variant" {...props} />;
}

export function AllDictionariesIcon(props: IconProps) {
  return <MaterialDesignIcons name="bookshelf" {...props} />;
}

export function PracticeResultsIcon(props: IconProps) {
  return <MaterialDesignIcons name="medal-outline" {...props} />;
}

export function HintIcon(props: IconProps) {
  return <MaterialDesignIcons name="lightbulb-on-outline" {...props} />;
}

export function ConcedeIcon(props: IconProps) {
  return <MaterialDesignIcons name="flag-variant-outline" {...props} />;
}

export function UnlockedIcon(props: IconProps) {
  return <MaterialDesignIcons name="lock-open-variant" {...props} />;
}

export function SentencePracticeIcon(props: IconProps) {
  return <MaterialDesignIcons name="tooltip-text-outline" {...props} />;
}

export function MicrophoneIcon(props: IconProps) {
  return <MaterialDesignIcons name="microphone" {...props} />;
}

export function PlayAudioIcon(props: IconProps) {
  return <MaterialDesignIcons name="volume-high" {...props} />;
}

export function RecordIcon(props: IconProps) {
  return <MaterialDesignIcons name="microphone" {...props} />;
}

export function StopRecordingIcon(props: IconProps) {
  return <MaterialDesignIcons name="stop" {...props} />;
}

export function EducationIcon(props: IconProps) {
  return <MaterialDesignIcons name="school" {...props} />;
}

export function ThumbUpIcon(props: IconProps) {
  return <MaterialDesignIcons name="thumb-up-outline" {...props} />;
}

export function ThumbDownIcon(props: IconProps) {
  return <MaterialDesignIcons name="thumb-down-outline" {...props} />;
}

export function RetryIcon(props: IconProps) {
  return <MaterialDesignIcons name="restore" {...props} />;
}

function createTextIcon(text: string) {
  return (props: IconProps) => (
    <Text
      style={[
        {
          color: props.color,
          fontSize: props.size,
          width: props.size + 7,
          height: props.size + 8,
        },
        props.style,
      ]}
    >
      {text}
    </Text>
  );
}

export const LowConfidenceIcon = createTextIcon("😵‍💫");
export const NeutralConfidenceIcon = createTextIcon("😶");
export const HighConfidenceIcon = createTextIcon("😊");
export const HighestConfidenceIcon = createTextIcon("🤓");

export function ConfidenceIcon({
  confidence,
  ...props
}: { confidence: number } & IconProps) {
  let Icon;

  if (confidence == 0) {
    Icon = NeutralConfidenceIcon;
  } else if (confidence < 0) {
    Icon = LowConfidenceIcon;
  } else if (confidence == 1) {
    Icon = HighConfidenceIcon;
  } else {
    Icon = HighestConfidenceIcon;
  }

  return <Icon {...props} />;
}

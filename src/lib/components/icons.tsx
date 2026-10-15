import { ColorValue, StyleProp, TextStyle, Text } from "react-native";
import {
  MaterialDesignIcons,
  MaterialDesignIconsIconName,
} from "@react-native-vector-icons/material-design-icons";

export type IconProps = {
  color?: ColorValue;
  size: number;
  style?: StyleProp<TextStyle>;
};

function createMaterialDesignIcon(name: MaterialDesignIconsIconName) {
  return (props: IconProps) => <MaterialDesignIcons name={name} {...props} />;
}

function createTextIcon(text: string, scale?: number) {
  return (props: IconProps) => (
    <Text
      style={[
        {
          color: props.color,
          fontSize: props.size * (scale ?? 1),
          width: props.size,
          height: props.size,
          textAlignVertical: "center",
          lineHeight: props.size,
          textAlign: "center",
          fontWeight: "bold",
        },
        props.style,
      ]}
    >
      {text}
    </Text>
  );
}

const EMOJI_SCALE = 28 / 32;
function createEmojiIcon(text: string) {
  return createTextIcon(text, EMOJI_SCALE);
}

// confidence icons
export const LowConfidenceIcon = createEmojiIcon("😵‍💫");
export const NeutralConfidenceIcon = createEmojiIcon("😶");
export const HighConfidenceIcon = createEmojiIcon("😊");
export const HighestConfidenceIcon = createEmojiIcon("🤓");

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

// bottom nav icons
export const DictionaryIcon = createMaterialDesignIcon("book");
export const ScanIcon = createMaterialDesignIcon("text-search");
export const PracticeIcon = createMaterialDesignIcon("weight-lifter");
export const StatisticsIcon = createMaterialDesignIcon("chart-bar");

// read tab icons
export const HistoryIcon = createMaterialDesignIcon("history");

// general icons
export const SaveIcon = createMaterialDesignIcon("content-save-outline");
export const TrashIcon = createMaterialDesignIcon("delete-outline");
export const CheckIcon = createMaterialDesignIcon("check");
export const PlusIcon = createMaterialDesignIcon("plus");
export const CopyIcon = createMaterialDesignIcon("content-copy");
export const LinkIcon = createMaterialDesignIcon("link-variant");
export const UnlinkIcon = createMaterialDesignIcon("link-off");
export const EditIcon = createMaterialDesignIcon("pencil");
export const CancelEditIcon = createMaterialDesignIcon("pencil-off");
export const CloseIcon = createMaterialDesignIcon("close");
export const DragVerticalIcon = createMaterialDesignIcon(
  "drag-horizontal-variant",
);
export const DragVerticalLongIcon = createMaterialDesignIcon("drag-vertical");

// arrows
export const ArrowUpIcon = createMaterialDesignIcon("arrow-up");
export const ArrowDownIcon = createMaterialDesignIcon("arrow-down");
export const ArrowLeftIcon = createMaterialDesignIcon("arrow-left");
export const ArrowRightIcon = createMaterialDesignIcon("arrow-right");
export const ChevronUpIcon = createMaterialDesignIcon("chevron-up");
export const ChevronDownIcon = createMaterialDesignIcon("chevron-down");
export const DropdownIcon = createMaterialDesignIcon("menu-down");

// entry editor
export const EducationIcon = createMaterialDesignIcon("school");
export const PartOfSpeechIcon = createMaterialDesignIcon("shape");
export const DefinitionIcon = createMaterialDesignIcon("text");
export const ExampleIcon = createMaterialDesignIcon("format-quote-open");
export const NotesIcon = createMaterialDesignIcon("alert-box-outline");
export const WordRelationIcon = createMaterialDesignIcon("set-left-center");
export const VariantIcon = createTextIcon("≈", 1.1);

// game icons
export const PracticeResultsIcon = createMaterialDesignIcon("medal-outline");
export const ScoreIcon = createMaterialDesignIcon("star-outline");
export const TimerIcon = createMaterialDesignIcon("timer-outline");
export const CorrectIcon = createMaterialDesignIcon("check");
export const IncorrectIcon = createMaterialDesignIcon("close");
export const HintIcon = createMaterialDesignIcon("lightbulb-on-outline");
export const ConcedeIcon = createMaterialDesignIcon("flag-variant-outline");
export const ThumbUpIcon = createMaterialDesignIcon("thumb-up-outline");
export const ThumbDownIcon = createMaterialDesignIcon("thumb-down-outline");
export const RetryIcon = createMaterialDesignIcon("restore");
export const ShuffleIcon = createMaterialDesignIcon("shuffle");
export const QuestionMarkIcon = createMaterialDesignIcon("help");

// practice list icons
export const LockIcon = createMaterialDesignIcon("lock");
export const UnlockedIcon = createMaterialDesignIcon("lock-open-variant");
export const SentencePracticeIcon = createMaterialDesignIcon(
  "tooltip-text-outline",
);

// audio icons
export const MicrophoneIcon = createMaterialDesignIcon("microphone");
export const PlayAudioIcon = createMaterialDesignIcon("volume-high");
export const RecordIcon = createMaterialDesignIcon("microphone");
export const StopRecordingIcon = createMaterialDesignIcon("stop");

// stats icons
export const AllDictionariesIcon = createMaterialDesignIcon("bookshelf");
export const ShareIcon = createMaterialDesignIcon("share-variant");

// settings icons
export const SettingsIcon = createMaterialDesignIcon("cog");
export const LightThemeIcon = createMaterialDesignIcon("brightness-7");
export const DarkThemeIcon = createMaterialDesignIcon("brightness-3");
export const AutoThemeIcon = createMaterialDesignIcon("brightness-6");
export const HomeIcon = createMaterialDesignIcon("home");
export const SortIcon = createMaterialDesignIcon("sort-variant");
export const ImportIcon = createMaterialDesignIcon("call-received");
export const ExportIcon = createMaterialDesignIcon("call-made");
export const PrivacyPolicyIcon = createMaterialDesignIcon("shield-lock");
export const LogsIcon = createMaterialDesignIcon("text-box-outline");
export const TablesIcon = createMaterialDesignIcon("table");
export const GitHubIcon = createMaterialDesignIcon("github");
export const LicenseIcon = createMaterialDesignIcon("scale-balance");
export const DonateIcon = createMaterialDesignIcon("heart");
export const TestIcon = createMaterialDesignIcon("test-tube");
export const GenerateIcon = createMaterialDesignIcon("dice-5");

// unused
// export const TextboxIcon = createMaterialDesignIcon("form-textbox");

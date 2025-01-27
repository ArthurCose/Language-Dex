import {
  ColorValue,
  PressableAndroidRippleConfig,
  TextStyle,
  ViewStyle,
} from "react-native";

export type Theme = {
  colors: Palette;
  styles: {
    root: ViewStyle;
    text: TextStyle;
    disabledText: TextStyle;
    inputLabel: TextStyle;
    poppingText: TextStyle;
    dialog: ViewStyle;
    bottomSheet: ViewStyle;
    bottomSheetItem: ViewStyle;
    dictionaryAddWordButton: ViewStyle;
    dictionaryAddWordButtonText: TextStyle;
    dictionaryWordButton: ViewStyle;
    dictionaryWordButtonText: TextStyle;
    searchInputContainer: ViewStyle;
    searchInput: TextStyle;
    searchOptionContainer: ViewStyle;
    searchOptionSeparator: ViewStyle;
    circleButton: ViewStyle;
    circleButtonDisabled: ViewStyle;
    scanTextInput: ViewStyle;
    scanText: TextStyle;
    scanTextActive: TextStyle;
    scanOutput: TextStyle;
    scanWord: ViewStyle;
    scanOldWord: ViewStyle;
    scanNewWord: ViewStyle;
    definitionBubble: ViewStyle;
    definitionBorders: ViewStyle;
    definitionBackground: ViewStyle;
    partOfSpeech: TextStyle;
    example: TextStyle;
    separator: ViewStyle;
    topNav: ViewStyle;
    subMenuTopNav: ViewStyle;
    bottomNav: ViewStyle;
  };
  ripples: {
    popup: PressableAndroidRippleConfig;
    primaryButton: PressableAndroidRippleConfig;
    transparentButton: PressableAndroidRippleConfig;
  };
};

type Palette = {
  body: ColorValue;
  bottomNav: ColorValue;
  definitionBackground: ColorValue;
  text: ColorValue;
  label: ColorValue;
  disabledText: ColorValue;
  oldWord: ColorValue;
  partOfSpeech: ColorValue;
  example: ColorValue;
  iconButton: ColorValue;
  subMenuIconButton: ColorValue;
  subMenuIconButtonDisabled: ColorValue;
  borders: ColorValue;
  primary: {
    default: ColorValue;
    light: ColorValue;
    contrast: ColorValue;
  };
};

function createSimpleTheme(colors: Palette): Theme {
  return {
    colors,
    styles: {
      root: {
        flex: 1,
        display: "flex",
        flexDirection: "column",
        backgroundColor: colors.body,
      },
      text: {
        color: colors.text,
      },
      disabledText: {
        color: colors.disabledText,
      },
      inputLabel: {
        fontSize: 14,
        color: colors.label,
      },
      poppingText: {
        color: colors.primary.default,
      },
      dialog: {
        backgroundColor: colors.definitionBackground,
        borderRadius: 8,
        margin: 16,
      },
      bottomSheet: {
        backgroundColor: colors.bottomNav,
        borderTopLeftRadius: 16,
        borderTopRightRadius: 16,
      },
      bottomSheetItem: {
        paddingHorizontal: 20,
        paddingVertical: 12,
      },
      dictionaryAddWordButton: {
        backgroundColor: colors.primary.default,
        borderColor: colors.primary.light,
        borderWidth: 1,
        borderRadius: 8,
      },
      dictionaryAddWordButtonText: {
        color: colors.primary.contrast,
      },
      dictionaryWordButton: {
        backgroundColor: colors.definitionBackground,
        borderColor: colors.borders,
        borderWidth: 1,
        borderTopWidth: 0,
        borderLeftWidth: 0.55,
        borderRightWidth: 0.55,
      },
      dictionaryWordButtonText: {
        color: colors.text,
      },
      searchInputContainer: {
        borderColor: colors.bottomNav,
        borderWidth: 1,
        borderRadius: 25,
        paddingHorizontal: 10,
        backgroundColor: colors.bottomNav,
      },
      searchInput: {
        padding: 8,
      },
      searchOptionContainer: {
        borderColor: colors.bottomNav,
        borderWidth: 1,
        borderRadius: 5,
        backgroundColor: colors.bottomNav,
        paddingVertical: 6,
        paddingHorizontal: 10,
      },
      searchOptionSeparator: {},
      circleButton: {
        backgroundColor: colors.primary.default,
        borderRadius: "50%",
      },
      circleButtonDisabled: {
        backgroundColor: "#aaa",
      },
      scanTextInput: {
        borderStyle: "solid",
        borderColor: colors.borders,
        borderWidth: 1,
        marginLeft: 8,
        marginRight: 8,
        borderRadius: 8,
        paddingHorizontal: 8,
        paddingVertical: 4,
        backgroundColor: "#e5e5e5",
      },
      scanOutput: {
        paddingHorizontal: 16.7,
        paddingVertical: 5,
        paddingBottom: 32,
      },
      scanText: {
        fontSize: 20,
        marginRight: 1,
      },
      scanTextActive: {
        color: colors.primary.default,
      },
      scanWord: {
        borderStyle: "solid",
        borderBottomWidth: 2,
        borderColor: "transparent",
        transform: [{ translateY: 8 }],
      },
      scanOldWord: {
        borderColor: colors.oldWord,
      },
      scanNewWord: {
        borderColor: colors.primary.default,
      },
      definitionBubble: {
        backgroundColor: colors.definitionBackground,
        borderRadius: 8,
        overflow: "hidden",
      },
      definitionBorders: {
        borderColor: colors.borders,
      },
      definitionBackground: {
        backgroundColor: colors.definitionBackground,
      },
      partOfSpeech: {
        color: colors.partOfSpeech,
        fontStyle: "italic",
      },
      example: {
        color: colors.example,
      },
      separator: {
        backgroundColor: colors.borders,
        width: "100%",
        height: 1,
      },
      topNav: {},
      subMenuTopNav: {
        backgroundColor: colors.primary.default,
      },
      bottomNav: {
        display: "flex",
        flexDirection: "row",
        backgroundColor: colors.bottomNav,
        paddingVertical: 2,
      },
    },
    ripples: {
      popup: { color: "rgba(0,0,0,0.05)" },
      primaryButton: { color: "rgba(255,255,255,0.3)" },
      transparentButton: { color: "rgba(0,0,0,0.3)" },
    },
  };
}

export const themeList = ["defaultTheme"];

export const themeConstructors: {
  [name: string]: (colorScheme: string) => Theme;
} = {
  defaultTheme: function (colorScheme: string) {
    return createSimpleTheme({
      body: "#f0f0f0",
      bottomNav: "white",
      definitionBackground: "white",
      text: "black",
      label: "#aaa",
      disabledText: "grey",
      oldWord: "#bbb",
      partOfSpeech: "grey",
      example: "grey",
      iconButton: "#444",
      subMenuIconButton: "white",
      subMenuIconButtonDisabled: "rgba(200,200,200,0.7)",
      borders: "lightgrey",
      primary: {
        default: "#a3f",
        light: "#eccfff",
        contrast: "white",
      },
    });
  },
};

import {
  PressableAndroidRippleConfig,
  TextStyle,
  ViewStyle,
} from "react-native";

export type Theme = {
  colors: Palette;
  styles: {
    root: ViewStyle;
    wordsRoot: ViewStyle;
    text: TextStyle;
    disabledText: TextStyle;
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
    borders: ViewStyle;
    gameListing: ViewStyle;
    topNav: ViewStyle;
    subMenuTopNav: ViewStyle;
    subMenuTitle: TextStyle;
    bottomNav: ViewStyle;
  };
  ripples: {
    popup: PressableAndroidRippleConfig;
    primaryButton: PressableAndroidRippleConfig;
    transparentButton: PressableAndroidRippleConfig;
  };
};

type Palette = {
  body: string;
  bottomNav: string;
  popup: string;
  scanInput: string;
  definitionBackground: string;
  text: string;
  label: string;
  disabledText: string;
  oldWord: string;
  partOfSpeech: string;
  example: string;
  iconButton: string;
  subMenuIconButton: string;
  subMenuIconButtonDisabled: string;
  borders: string;
  definitionBorder: string;
  primary: {
    default: string;
    light: string;
    contrast: string;
  };
  ripples: {
    popup: string;
    primaryButton: string;
    transparentButton: string;
  };
};

function createSimpleTheme(colors: Palette): Theme {
  return {
    colors,
    styles: {
      root: {
        flex: 1,
        backgroundColor: colors.body,
      },
      wordsRoot: {
        flex: 1,
        backgroundColor: colors.definitionBackground,
      },
      text: {
        color: colors.text,
      },
      disabledText: {
        color: colors.disabledText,
      },
      poppingText: {
        color: colors.primary.default,
      },
      dialog: {
        backgroundColor: colors.popup,
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
        borderRadius: 8,
      },
      dictionaryAddWordButtonText: {
        color: colors.primary.contrast,
      },
      dictionaryWordButton: {
        backgroundColor: colors.definitionBackground,
        borderColor: colors.definitionBorder,
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
      },
      circleButtonDisabled: {
        backgroundColor: "#aaa",
      },
      scanTextInput: {
        borderColor: colors.borders,
        borderWidth: 1,
        marginLeft: 8,
        marginRight: 8,
        borderRadius: 8,
        paddingHorizontal: 8,
        paddingVertical: 4,
        backgroundColor: colors.scanInput,
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
        borderRadius: 8,
        overflow: "hidden",
      },
      definitionBorders: {
        borderColor: colors.definitionBorder,
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
        borderColor: colors.borders,
        borderBottomWidth: 1,
        width: "100%",
      },
      borders: {
        borderColor: colors.borders,
      },
      gameListing: {
        borderColor: colors.borders,
        borderWidth: 1,
        backgroundColor: colors.scanInput,
      },
      topNav: {
        paddingBottom: -4,
      },
      subMenuTopNav: {
        // backgroundColor: colors.primary.default,
      },
      subMenuTitle: {
        color: colors.subMenuIconButton,
      },
      bottomNav: {
        display: "flex",
        flexDirection: "row",
        backgroundColor: colors.bottomNav,
        paddingVertical: 2,
      },
    },
    ripples: {
      popup: { color: colors.ripples.popup },
      primaryButton: { color: colors.ripples.primaryButton },
      transparentButton: { color: colors.ripples.transparentButton },
    },
  };
}

export const themeList = ["defaultTheme"];

export const themeConstructors: {
  [name: string]: (colorScheme: string) => Theme;
} = {
  defaultTheme: function (colorScheme: string) {
    const primary = {
      default: "#a3f",
      light: "#eccfff",
      contrast: "white",
    };

    if (colorScheme == "dark") {
      return createSimpleTheme({
        primary,
        body: "#09090b",
        bottomNav: "#1a1a1f",
        popup: "#1f1f24",
        scanInput: "#1a1a1d",
        definitionBackground: "#1a1a1f",
        text: "#bbb",
        label: "#aaa",
        disabledText: "#555",
        oldWord: "#bbb",
        partOfSpeech: "grey",
        example: "grey",
        iconButton: "#aaa",
        subMenuIconButton: "white",
        subMenuIconButtonDisabled: "grey",
        borders: "#303035",
        definitionBorder: "#09090b",
        ripples: {
          popup: "rgba(255,255,255,0.05)",
          primaryButton: "rgba(255,255,255,0.3)",
          transparentButton: "rgba(255,255,255,0.3)",
        },
      });
    }

    return createSimpleTheme({
      primary,
      body: "#f0f0f0",
      popup: "white",
      bottomNav: "white",
      scanInput: "#e5e5e5",
      definitionBackground: "white",
      text: "black",
      label: "#aaa",
      disabledText: "grey",
      oldWord: "#bbb",
      partOfSpeech: "grey",
      example: "grey",
      iconButton: "#444",
      subMenuIconButton: "#444",
      subMenuIconButtonDisabled: "#999",
      borders: "lightgrey",
      definitionBorder: "lightgrey",
      ripples: {
        popup: "rgba(0,0,0,0.05)",
        primaryButton: "rgba(255,255,255,0.3)",
        transparentButton: "rgba(0,0,0,0.3)",
      },
    });
  },
};

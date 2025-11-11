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
    hintScoreText: TextStyle;
    dialog: ViewStyle;
    bottomSheet: ViewStyle;
    dictionaryAddWordButton: ViewStyle;
    dictionaryAddWordButtonText: TextStyle;
    dictionaryWordButton: ViewStyle;
    dictionaryWordButtonText: TextStyle;
    searchInputContainer: ViewStyle;
    searchInput: TextStyle;
    searchOption: ViewStyle;
    circleButton: ViewStyle;
    circleButtonDisabled: ViewStyle;
    hintButton: ViewStyle;
    scanTextInput: ViewStyle;
    scanText: TextStyle;
    scanTextActive: TextStyle;
    scanWord: ViewStyle;
    scanOldWord: ViewStyle;
    scanNewWord: ViewStyle;
    definitionBubble: ViewStyle;
    definitionBorders: { borderColor: string };
    definitionBackground: { backgroundColor: string };
    partOfSpeech: TextStyle;
    example: TextStyle;
    separator: ViewStyle;
    borders: { borderColor: string };
    backgroundDefinitionBorder: ViewStyle;
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
  gameListing: string;
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
  hintScore: string;
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
      hintScoreText: {
        color: colors.hintScore,
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
      dictionaryAddWordButton: {
        backgroundColor: colors.primary.default,
        borderRadius: 8,
      },
      dictionaryAddWordButtonText: {
        color: colors.primary.contrast,
        fontSize: 17,
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
        backgroundColor: colors.bottomNav,
      },
      searchInput: {
        padding: 8,
      },
      searchOption: {
        borderColor: colors.bottomNav,
        borderWidth: 1,
        borderRadius: 5,
        backgroundColor: colors.bottomNav,
      },
      circleButton: {
        backgroundColor: colors.primary.default,
      },
      circleButtonDisabled: {
        backgroundColor: "#aaa",
      },
      hintButton: {
        backgroundColor: colors.hintScore,
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
      backgroundDefinitionBorder: {
        backgroundColor: colors.definitionBorder,
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
        backgroundColor: colors.gameListing,
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
      popup: {
        color: colors.ripples.popup,
        // https://github.com/callstack/react-native-paper/issues/4810#issuecomment-3388129843
        foreground: true,
      },
      primaryButton: {
        color: colors.ripples.primaryButton,
        // https://github.com/callstack/react-native-paper/issues/4810#issuecomment-3388129843
        foreground: true,
      },
      transparentButton: {
        color: colors.ripples.transparentButton,
        // https://github.com/callstack/react-native-paper/issues/4810#issuecomment-3388129843
        foreground: true,
      },
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
        scanInput: "#1a1a1f",
        definitionBackground: "#1a1a1f",
        gameListing: "transparent",
        text: "#bbb",
        label: "#aaa",
        disabledText: "#777",
        oldWord: "#bbb",
        partOfSpeech: "grey",
        example: "grey",
        iconButton: "#aaa",
        subMenuIconButton: "white",
        subMenuIconButtonDisabled: "grey",
        borders: "#303035",
        definitionBorder: "#09090b",
        hintScore: "#e8a200",
        ripples: {
          popup: "rgba(255,255,255,0.05)",
          primaryButton: "rgba(255,255,255,0.3)",
          transparentButton: "rgba(255,255,255,0.3)",
        },
      });
    }

    return createSimpleTheme({
      primary,
      body: "#eeeef2",
      popup: "white",
      bottomNav: "white",
      scanInput: "#f5f5f7",
      gameListing: "#f5f5f7",
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
      definitionBorder: "#eeeef2",
      hintScore: "#ffb200",
      ripples: {
        popup: "rgba(0,0,0,0.05)",
        primaryButton: "rgba(255,255,255,0.3)",
        transparentButton: "rgba(0,0,0,0.3)",
      },
    });
  },
};

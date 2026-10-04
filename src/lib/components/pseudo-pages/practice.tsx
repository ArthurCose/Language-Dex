import React, { useEffect, useState } from "react";
import { useTheme } from "@/src/lib/contexts/theme-context";
import {
  View,
  StyleSheet,
  Pressable,
  StyleProp,
  ViewStyle,
  ScrollView,
} from "react-native";
import { useTranslation } from "react-i18next";
import { Span } from "../text";
import { Theme } from "@/src/lib/themes";
import { Href, router } from "expo-router";
import { useDictionaryVersioning } from "@/src/lib/hooks/use-word-definitions";
import { listGameWords, listWords } from "@/src/lib/data";
import { logError } from "@/src/lib/log";
import ListPopup from "../list-popup";
import { LockIcon } from "../icons";
import { definitionMatchModeList } from "@/src/app/practice/[mode]/definition-match";
import { unscrambleModeList } from "@/src/app/practice/[mode]/unscramble";
import { useUserDataSignal } from "@/src/lib/contexts/user-data-context";
import { useSignalLens } from "@/src/lib/hooks/use-signal";
import Dialog, { DialogDescription, DialogTitle } from "../dialog";
import {
  ConfirmationDialogAction,
  ConfirmationDialogActions,
} from "../confirmation-dialog";
import { GameTitle } from "../practice/info";
import {
  CrosswordIcon,
  DefinitionMatchIcon,
  GuessTheWordIcon,
  UnscrambleIcon,
  PronunciationIcon,
  ShortAnswerIcon,
  UseInASentenceIcon,
  WordSearchIcon,
} from "../practice/practice-icons";

import Cat1 from "@/assets/svgs/Practice-1.svg";
import Cat2 from "@/assets/svgs/Practice-2.svg";
import CatInteraction from "@/src/lib/components/cat-interaction";

type GameListingProps = {
  label: string;
  icon?: React.ComponentType;
  style: StyleProp<ViewStyle>;
  theme: Theme;
  lockStatus: LockStatus;
  setLockDescription: (description: string) => void;
} & (
  | {
      href?: undefined;
      modes: string[];
      onSelect: (mode: string) => void;
    }
  | {
      modes?: undefined;
      onSelect?: undefined;
      href?: Href;
    }
);

function GameListing({
  label,
  icon: Icon,
  style,
  theme,
  href,
  lockStatus,
  setLockDescription,
  modes,
  onSelect,
}: GameListingProps) {
  const [t] = useTranslation();

  const content = (
    <>
      <View style={styles.iconContainer}>{Icon && <Icon />}</View>

      <Span style={styles.label}>{t(label)}</Span>

      {lockStatus.locked && (
        <View style={styles.lock}>
          <Span style={theme.styles.poppingText}>
            {lockStatus.obtained ?? "?"}/{lockStatus.required ?? "?"}
          </Span>
          <LockIcon size={24} color={theme.colors.iconButton} />
        </View>
      )}
    </>
  );

  let button;

  if (lockStatus.locked) {
    // display unlocking requirements
    button = (
      <Pressable
        style={styles.pressable}
        android_ripple={theme.ripples.transparentButton}
        onPress={() => setLockDescription(t(label + "_Requirements"))}
        pointerEvents="box-only"
      >
        {content}
      </Pressable>
    );
  } else if (modes) {
    // popup for the list of game modes
    button = (
      <ListPopup
        style={styles.pressable}
        android_ripple={theme.ripples.transparentButton}
        list={modes}
        getItemText={(mode) => t("mode_" + mode)}
        keyExtractor={(value) => value}
        centerItems
        onSelect={onSelect}
      >
        {content}
      </ListPopup>
    );
  } else {
    // there's no extra modes, so we can just start the game
    button = (
      <Pressable
        style={styles.pressable}
        android_ripple={theme.ripples.transparentButton}
        pointerEvents="box-only"
        onPress={() => {
          if (href != undefined) {
            router.navigate(href);
          }
        }}
      >
        {content}
      </Pressable>
    );
  }

  return <View style={[styles.listingContainer, style]}>{button}</View>;
}

type LockStatus = {
  obtained?: number;
  required?: number;
  locked: boolean;
};

function testLock<Options>(
  lockFn: (lock: LockStatus) => void,
  f: (
    dictionaryId: number,
    options: Options & { limit: number },
  ) => Promise<any[]>,
  dictionaryId: number,
  options: Options & { limit: number },
) {
  lockFn({
    required: options.limit,
    locked: true,
  });

  f(dictionaryId, options)
    .then((list) =>
      lockFn({
        obtained: list.length,
        required: options.limit,
        locked: list.length < options.limit,
      }),
    )
    .catch(logError);
}

export default function () {
  const theme = useTheme();
  const [t] = useTranslation();
  const userDataSignal = useUserDataSignal();
  const activeDictionary = useSignalLens(
    userDataSignal,
    (data) => data.activeDictionary,
  );
  const dictionaryVersion = useDictionaryVersioning();
  const [matchStatus, setMatchStatus] = useState({ locked: true });
  const [unscrambleStatus, setUnscrambleStatus] = useState({ locked: true });
  const [guessStatus, setGuessStatus] = useState({ locked: true });
  const [crosswordStatus, setCrosswordStatus] = useState({ locked: true });
  const [wordSearchStatus, setWordSearchStatus] = useState({ locked: true });
  const [shortAnswerStatus, setShortAnswerStatus] = useState({ locked: true });
  const [useInASentenceStatus, setUseInASentenceStatus] = useState({
    locked: true,
  });
  const [pronunciationStatus, setPronunciationStatus] = useState({
    locked: true,
  });
  const [lockedDialogOpen, setLockedDialogOpen] = useState(false);
  const [lockDescription, setLockDescription] = useState("");

  const listingStyles = theme.styles.gameListing;

  useEffect(() => {
    testLock(setMatchStatus, listGameWords, activeDictionary, {
      limit: 3,
    });

    testLock(setUnscrambleStatus, listGameWords, activeDictionary, {
      minLength: 2,
      limit: 5,
    });

    testLock(setGuessStatus, listWords, activeDictionary, {
      ascending: false,
      orderBy: "longest",
      limit: 10,
      belowMaxConfidence: true,
    });

    testLock(setCrosswordStatus, listWords, activeDictionary, {
      ascending: false,
      orderBy: "longest",
      limit: 10,
      minLength: 4,
      belowMaxConfidence: true,
    });

    testLock(setWordSearchStatus, listGameWords, activeDictionary, {
      limit: 5,
      minLength: 2,
      maxLength: 10,
    });

    testLock(setShortAnswerStatus, listGameWords, activeDictionary, {
      limit: 5,
    });

    testLock(setUseInASentenceStatus, listGameWords, activeDictionary, {
      limit: 5,
    });

    testLock(setPronunciationStatus, listGameWords, activeDictionary, {
      limit: 5,
    });
  }, [activeDictionary, dictionaryVersion]);

  const lockCallback = (desc: string) => {
    setLockDescription(desc);
    setLockedDialogOpen(true);
  };

  const closeLockDialog = () => {
    setLockedDialogOpen(false);
  };

  return (
    <View style={styles.content}>
      <View style={styles.title}>
        <View style={styles.titleDecoration}>
          <CatInteraction style={styles.cat}>
            <Cat1 width={130} height={32} />
          </CatInteraction>
        </View>

        <GameTitle>{t("Practice")}</GameTitle>

        <View style={styles.titleDecoration}>
          <Cat2 style={styles.yarn} width={56} height={32} />
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.list}>
        <GameListing
          label="Definition_Match"
          icon={DefinitionMatchIcon}
          style={listingStyles}
          theme={theme}
          modes={definitionMatchModeList}
          lockStatus={matchStatus}
          setLockDescription={lockCallback}
          onSelect={(mode) =>
            router.navigate(`/practice/${mode}/definition-match`)
          }
        />

        <GameListing
          label="Unscramble"
          icon={UnscrambleIcon}
          style={listingStyles}
          theme={theme}
          lockStatus={unscrambleStatus}
          setLockDescription={lockCallback}
          modes={unscrambleModeList}
          onSelect={(mode) => router.navigate(`/practice/${mode}/unscramble`)}
        />

        <GameListing
          label="Guess_the_Word"
          icon={GuessTheWordIcon}
          style={listingStyles}
          theme={theme}
          lockStatus={guessStatus}
          setLockDescription={lockCallback}
          href="/practice/guess-the-word"
        />

        <GameListing
          label="Crossword"
          icon={CrosswordIcon}
          style={listingStyles}
          theme={theme}
          lockStatus={crosswordStatus}
          setLockDescription={lockCallback}
          href="/practice/crossword"
        />

        <GameListing
          label="Word_Search"
          icon={WordSearchIcon}
          style={listingStyles}
          theme={theme}
          lockStatus={wordSearchStatus}
          setLockDescription={lockCallback}
          href="/practice/word-search"
        />

        <GameListing
          label="Short_Answer"
          icon={ShortAnswerIcon}
          style={listingStyles}
          theme={theme}
          lockStatus={shortAnswerStatus}
          setLockDescription={lockCallback}
          href="/practice/short-answer"
        />

        <GameListing
          label="Use_in_a_Sentence"
          icon={UseInASentenceIcon}
          style={listingStyles}
          theme={theme}
          lockStatus={useInASentenceStatus}
          setLockDescription={lockCallback}
          href="/practice/use-in-a-sentence"
        />

        <GameListing
          label="Pronunciation"
          icon={PronunciationIcon}
          style={listingStyles}
          theme={theme}
          lockStatus={pronunciationStatus}
          setLockDescription={lockCallback}
          href="/practice/pronunciation"
        />
      </ScrollView>

      <Dialog open={lockedDialogOpen} onClose={closeLockDialog}>
        <DialogTitle>{t("Locked")}</DialogTitle>
        <DialogDescription>{lockDescription}</DialogDescription>

        <ConfirmationDialogActions>
          <ConfirmationDialogAction onPress={closeLockDialog}>
            {t("Close")}
          </ConfirmationDialogAction>
        </ConfirmationDialogActions>
      </Dialog>
    </View>
  );
}

const styles = StyleSheet.create({
  title: {
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "center",
    gap: 16,
  },
  titleDecoration: {
    position: "relative",
    top: 14,
    width: 0,
  },
  cat: {
    position: "absolute",
    right: 0,
    bottom: 0,
  },
  yarn: {
    left: 20,
  },
  content: {
    gap: 16,
    paddingTop: 8,
    flex: 1,
  },
  list: {
    padding: 4,
    paddingTop: 0,
  },
  listingContainer: {
    margin: 4,
    overflow: "hidden",
  },
  pressable: {
    flexDirection: "row",
    flexGrow: 1,
    alignItems: "center",
    padding: 4,
  },
  iconContainer: {
    aspectRatio: 1,
    width: 64,
    margin: 8,
    alignItems: "center",
  },
  label: {
    fontSize: 20,
    fontWeight: "bold",
    marginLeft: 24,
  },
  lock: {
    position: "absolute",
    right: 2,
    top: 3,
    flexDirection: "row",
    alignItems: "flex-end",
  },
  spacer: {
    flexGrow: 1,
    flexShrink: 1,
    flexBasis: "50%",
  },
});

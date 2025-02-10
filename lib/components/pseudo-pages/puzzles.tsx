import React, { useEffect, useState } from "react";
import { useTheme } from "@/lib/contexts/theme";
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
import { Theme } from "@/lib/themes";
import { Href, router } from "expo-router";
import { useDictionaryVersioning } from "@/lib/hooks/use-word-definitions";
import { listGameWords, listWords } from "@/lib/data";
import { logError } from "@/lib/log";
import ListPopup from "../list-popup";
import { LockIcon } from "../icons";

import { definitionMatchModeList } from "@/app/puzzles/[mode]/definition-match";
import { unscrambleModeList } from "@/app/puzzles/[mode]/unscramble";
import { useUserDataContext } from "@/lib/contexts/user-data";
import Dialog, { DialogDescription, DialogTitle } from "../dialog";
import {
  ConfirmationDialogAction,
  ConfirmationDialogActions,
} from "../confirmation-dialog";
import { GameTitle } from "../puzzles/info";

type GameListingProps = {
  label: string;
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
  style,
  theme,
  href,
  lockStatus,
  setLockDescription,
  modes,
  onSelect,
}: GameListingProps) {
  const [t] = useTranslation();

  if (lockStatus.locked) {
    return (
      <View style={style}>
        <Pressable
          style={styles.pressable}
          android_ripple={theme.ripples.transparentButton}
          onPress={() => setLockDescription(t(label + "_Requirements"))}
        >
          <View style={styles.lock}>
            <Span style={theme.styles.poppingText}>
              {lockStatus.obtained ?? "?"}/{lockStatus.required ?? "?"}
            </Span>
            <LockIcon size={24} color={theme.colors.iconButton} />
          </View>

          <Span>{t(label)}</Span>
        </Pressable>
      </View>
    );
  }
  return (
    <View style={style}>
      {modes ? (
        <ListPopup
          style={styles.pressable}
          android_ripple={theme.ripples.transparentButton}
          list={modes}
          getItemText={(mode) => t("mode_" + mode)}
          keyExtractor={(value) => value}
          centerItems
          onSelect={onSelect}
        >
          <Span>{t(label)}</Span>
        </ListPopup>
      ) : (
        <Pressable
          style={styles.pressable}
          android_ripple={theme.ripples.transparentButton}
          onPress={() => {
            if (href != undefined) {
              router.navigate(href);
            }
          }}
        >
          <Span>{t(label)}</Span>
        </Pressable>
      )}
    </View>
  );
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
    options: Options & { limit: number }
  ) => Promise<any[]>,
  dictionaryId: number,
  options: Options & { limit: number }
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
      })
    )
    .catch(logError);
}

export default function () {
  const theme = useTheme();
  const [t] = useTranslation();
  const [userData] = useUserDataContext();
  const dictionaryVersion = useDictionaryVersioning();
  const [matchStatus, setMatchStatus] = useState({ locked: true });
  const [unscrambleStatus, setUnscrambleStatus] = useState({ locked: true });
  const [guessStatus, setGuessStatus] = useState({ locked: true });
  const [crosswordStatus, setCrosswordStatus] = useState({ locked: true });
  const [lockedDialogOpen, setLockedDialogOpen] = useState(false);
  const [lockDescription, setLockDescription] = useState("");

  const listingStyles = [theme.styles.gameListing, styles.listing];

  useEffect(() => {
    testLock(setMatchStatus, listGameWords, userData.activeDictionary, {
      limit: 3,
    });

    testLock(setUnscrambleStatus, listGameWords, userData.activeDictionary, {
      minLength: 2,
      limit: 3,
    });

    testLock(setGuessStatus, listWords, userData.activeDictionary, {
      ascending: false,
      orderBy: "longest",
      limit: 10,
    });

    testLock(setCrosswordStatus, listWords, userData.activeDictionary, {
      ascending: false,
      orderBy: "longest",
      limit: 20,
      minLength: 2,
    });
  }, [userData.activeDictionary, dictionaryVersion]);

  const lockCallback = (desc: string) => {
    setLockDescription(desc);
    setLockedDialogOpen(true);
  };

  const closeLockDialog = () => {
    setLockedDialogOpen(false);
  };

  return (
    <View style={styles.content}>
      <GameTitle>{t("Puzzles")}</GameTitle>

      <ScrollView contentContainerStyle={styles.list}>
        <View style={styles.row}>
          <GameListing
            label="Match"
            style={listingStyles}
            theme={theme}
            modes={definitionMatchModeList}
            lockStatus={matchStatus}
            setLockDescription={lockCallback}
            onSelect={(mode) =>
              router.navigate(`/puzzles/${mode}/definition-match`)
            }
          />

          <GameListing
            label="Unscramble"
            style={listingStyles}
            theme={theme}
            lockStatus={unscrambleStatus}
            setLockDescription={lockCallback}
            modes={unscrambleModeList}
            onSelect={(mode) => router.navigate(`/puzzles/${mode}/unscramble`)}
          />
        </View>

        <View style={styles.row}>
          <GameListing
            label="Guess"
            style={listingStyles}
            theme={theme}
            lockStatus={guessStatus}
            setLockDescription={lockCallback}
            href="/puzzles/guess"
          />

          <GameListing
            label="Crossword"
            style={listingStyles}
            theme={theme}
            lockStatus={crosswordStatus}
            setLockDescription={lockCallback}
          />
        </View>
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
  content: {
    gap: 8,
    paddingTop: 8,
    flex: 1,
  },
  list: {
    flexWrap: "wrap",
    gap: 8,
    padding: 8,
  },
  row: {
    flexDirection: "row",
    gap: 8,
  },
  listing: {
    flexDirection: "column",
    aspectRatio: 1,
    flexGrow: 1,
    flexShrink: 1,
    alignItems: "stretch",
    flexBasis: "50%",
  },
  lock: {
    position: "absolute",
    right: 2,
    top: 4,
    flexDirection: "row",
    alignItems: "flex-end",
  },
  pressable: {
    justifyContent: "center",
    alignItems: "center",
    flexGrow: 1,
  },
  spacer: {
    flexGrow: 1,
    flexShrink: 1,
    flexBasis: "50%",
  },
});

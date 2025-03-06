import React, { useEffect, useRef, useState } from "react";
import { Pressable, StyleSheet, View, ScrollView } from "react-native";
import { useTranslation } from "react-i18next";
import Dialog, { DialogTitle } from "../dialog";
import { AudioModule, AudioPlayer } from "expo-audio";
import { useTheme } from "@/lib/contexts/theme";
import { logError } from "@/lib/log";
import { Theme } from "@/lib/themes";
import { MicrophoneIcon, PlayAudioIcon } from "../icons";
import { Span } from "../text";
import IconButton from "../icon-button";
import RadioButton from "../radio-button";
import * as FileSystem from "expo-file-system";
import RecordAudioButton from "../record-audio-button";
import { stripProtocol } from "@/lib/path";

type PronunciationEditorProps = {
  saved: boolean;
  pronunciationUri?: string | null;
  setPronunciationUri: (uri: string | null) => void;
};

export default function PronunciationEditor(props: PronunciationEditorProps) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <IconButton icon={MicrophoneIcon} onPress={() => setOpen(true)} />

      <PronunciationEditorDialog
        open={open}
        onClose={() => setOpen(false)}
        {...props}
      />
    </>
  );
}

function Option({
  theme,
  selected,
  label,
  playing,
  onPress,
}: {
  theme: Theme;
  selected: boolean;
  label: string;
  playing?: boolean;
  onPress?: () => void;
}) {
  return (
    <Pressable
      style={styles.optionRow}
      android_ripple={theme.ripples.transparentButton}
      onPress={onPress}
    >
      <RadioButton selected={selected} />

      <Span style={styles.optionLabel}>{label}</Span>

      <View style={styles.optionActions}>
        {playing && <IconButton icon={PlayAudioIcon} />}
      </View>
    </Pressable>
  );
}

function PronunciationEditorDialog({
  open,
  onClose,
  saved,
  pronunciationUri,
  setPronunciationUri,
}: {
  open: boolean;
  onClose: () => void;
} & PronunciationEditorProps) {
  const [t] = useTranslation();
  const theme = useTheme();

  const playerRef = useRef<AudioPlayer | null>(null);
  const recordingsRef = useRef<string[]>([]);
  const [recordings, setRecordings] = useState<string[]>([]);
  const [recording, setRecording] = useState(false);
  const [playingIndex, setPlayingIndex] = useState<number | null>(null);
  const [selectedIndex, setSelectedIndex] = useState(0);

  const handleClose = () => {
    if (selectedIndex == 0) {
      setPronunciationUri(null);
    } else if (selectedIndex == 1) {
      setPronunciationUri(pronunciationUri ?? null);
    } else {
      setPronunciationUri(recordings[selectedIndex - 2]);
    }

    onClose();
  };

  useEffect(() => {
    return () => {
      playerRef.current?.release();

      recordingsRef.current.forEach((uri) => {
        FileSystem.deleteAsync(uri).catch(logError);
      });
    };
  }, []);

  useEffect(() => {
    if (!saved) {
      return;
    }

    recordingsRef.current.forEach((uri) => {
      FileSystem.deleteAsync(uri).catch(logError);
    });
    recordingsRef.current = [];
    setRecordings([]);
  }, [saved]);

  useEffect(() => {
    setSelectedIndex(pronunciationUri != undefined ? 1 : 0);
  }, [pronunciationUri]);

  const playIndex = (i: number, uri: string) => {
    playerRef.current?.release();

    if (playingIndex == i) {
      setPlayingIndex(null);
      return;
    }

    const player = new AudioModule.AudioPlayer(
      { uri: stripProtocol(uri) },
      500
    );

    player.play();
    player.addListener("playbackStatusUpdate", (status) => {
      if (!status.didJustFinish) {
        return;
      }

      if (playerRef.current == player) {
        // completed
        setPlayingIndex(null);
        player.release();
        playerRef.current = null;
      }
    });

    playerRef.current = player;

    setPlayingIndex(i);
  };

  return (
    <Dialog open={open} onClose={recording ? undefined : handleClose}>
      <DialogTitle>{t("Pronunciation")}</DialogTitle>

      <ScrollView>
        <Option
          selected={selectedIndex == 0}
          theme={theme}
          label={t("None")}
          onPress={() => setSelectedIndex(0)}
        />

        {pronunciationUri != undefined && (
          <Option
            selected={selectedIndex == 1}
            theme={theme}
            label={t("Saved_Pronunciation")}
            playing={playingIndex == 1}
            onPress={() => {
              setSelectedIndex(1);
              playIndex(1, pronunciationUri);
            }}
          />
        )}

        {recordings.slice(0).map((uri, i) => (
          <Option
            key={i}
            selected={selectedIndex == i + 2}
            theme={theme}
            label={t("Recording_number", { count: i + 1 })}
            playing={playingIndex == i + 2}
            onPress={() => {
              setSelectedIndex(i + 2);
              playIndex(i + 2, uri);
            }}
          />
        ))}
      </ScrollView>

      <View style={styles.dialogActionsRow}>
        <View style={styles.dialogAction} />

        <View style={styles.dialogAction}>
          <RecordAudioButton
            onStart={() => setRecording(true)}
            onEnd={(uri) => {
              setRecording(false);

              if (uri != null) {
                setRecordings([...recordings, uri]);
                recordingsRef.current.push(uri);
                setSelectedIndex(recordings.length + 2);
              }
            }}
          />
        </View>

        <View style={styles.dialogAction}>
          <Pressable
            style={styles.confirmButton}
            android_ripple={theme.ripples.transparentButton}
            onPress={handleClose}
          >
            <Span>{t("Confirm")}</Span>
          </Pressable>
        </View>
      </View>
    </Dialog>
  );
}

const styles = StyleSheet.create({
  optionRow: {
    flexDirection: "row",
    height: 48,
    alignItems: "center",
  },
  optionLabel: {},
  optionActions: {
    marginLeft: "auto",
  },
  dialogActionsRow: {
    flexDirection: "row",
  },
  dialogAction: {
    flex: 1,
    alignItems: "flex-end",
    justifyContent: "flex-end",
  },
  confirmButton: {
    padding: 16,
  },
});

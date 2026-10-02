import { useEffect, useRef, useState } from "react";
import { Pressable, StyleSheet, View, ScrollView } from "react-native";
import { useTranslation } from "react-i18next";
import Dialog, { DialogTitle } from "../dialog";
import { AudioPlayer, createAudioPlayer } from "expo-audio";
import { useTheme } from "@/src/lib/contexts/theme-context";
import { logError } from "@/src/lib/log";
import { MicrophoneIcon, PlayAudioIcon } from "../icons";
import { Span } from "../text";
import IconButton from "../icon-button";
import { RadioItem } from "../radio-button";
import * as FileSystem from "expo-file-system/legacy";
import RecordAudioButton from "../record-audio-button";
import { stripProtocol } from "@/src/lib/path";

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
  groupValue,
  value,
  label,
  playingIndex,
  onChange,
}: {
  groupValue: number;
  value: number;
  playingIndex?: number | null;
  label: string;
  onChange: (value: number) => void;
}) {
  return (
    <RadioItem groupValue={groupValue} value={value} onChange={onChange}>
      <Span style={styles.optionLabel}>{label}</Span>

      <View style={styles.optionActions}>
        {playingIndex == value && <IconButton icon={PlayAudioIcon} />}
      </View>
    </RadioItem>
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

    const player = createAudioPlayer({ uri: stripProtocol(uri) });

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
          groupValue={selectedIndex}
          value={0}
          label={t("None")}
          onChange={() => setSelectedIndex(0)}
        />

        {pronunciationUri != undefined && (
          <Option
            groupValue={selectedIndex}
            value={1}
            label={t("Saved_Pronunciation")}
            playingIndex={playingIndex}
            onChange={() => {
              setSelectedIndex(1);
              playIndex(1, pronunciationUri);
            }}
          />
        )}

        {recordings.slice(0).map((uri, i) => (
          <Option
            key={i}
            groupValue={selectedIndex}
            value={i + 2}
            playingIndex={playingIndex}
            label={t("Recording_number", { count: i + 1 })}
            onChange={(v) => {
              setSelectedIndex(v);
              playIndex(v, uri);
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
            pointerEvents="box-only"
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

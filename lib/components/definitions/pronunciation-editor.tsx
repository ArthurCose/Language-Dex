import React, { useEffect, useRef, useState } from "react";
import { Pressable, StyleSheet, View, ScrollView } from "react-native";
import { useTranslation } from "react-i18next";
import Dialog, { DialogTitle } from "../dialog";
import { AudioModule, AudioPlayer, RecordingPresets } from "expo-audio";
import RecordingModule, {
  AndroidAudioSource,
  AudioRecorder,
} from "recording-module";
import { useTheme } from "@/lib/contexts/theme";
import { logError } from "@/lib/log";
import { Theme } from "@/lib/themes";
import {
  MicrophoneIcon,
  PlayAudioIcon,
  RecordIcon,
  StopRecordingIcon,
} from "../icons";
import { Span } from "../text";
import IconButton from "../icon-button";
import RadioButton from "../radio-button";
import * as FileSystem from "expo-file-system";
import ListPopup from "../list-popup";

export default function PronunciationEditor() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <IconButton icon={MicrophoneIcon} onPress={() => setOpen(true)} />

      <PronunciationEditorDialog open={open} onClose={() => setOpen(false)} />
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

function PermissionRequester({
  requestPermission,
}: {
  requestPermission: () => Promise<any>;
}): undefined {
  useEffect(() => {
    requestPermission().catch(logError);
  }, []);
}

function PronunciationEditorDialog({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const [t] = useTranslation();
  const theme = useTheme();

  const [permissionGranted, setPermissionGranted] = useState(false);
  const playerRef = useRef<AudioPlayer | null>(null);
  const recordingRef = useRef<AudioRecorder | null>(null);
  const [recordings, setRecordings] = useState<string[]>([]);
  const [recording, setRecording] = useState(false);
  const [playingIndex, setPlayingIndex] = useState<number | null>(null);
  const [selectedIndex, setSelectedIndex] = useState(0);

  const [audioSource, setAudioSource] = useState<AndroidAudioSource>("default");

  const requestPermission = () =>
    AudioModule.requestRecordingPermissionsAsync().then((status) => {
      setPermissionGranted(status.granted);

      return status.granted;
    });

  useEffect(() => {
    return () => {
      recordingRef.current?.release();
      playerRef.current?.release();

      recordings.forEach((uri) => {
        FileSystem.deleteAsync("file:/" + uri).catch(logError);
      });
    };
  }, []);

  const playIndex = (i: number, uri: string) => {
    playerRef.current?.release();

    if (playingIndex == i) {
      setPlayingIndex(null);
      return;
    }

    const player = new AudioModule.AudioPlayer({ uri }, 500);

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

  const startRecording = () => {
    if (endRecording()) {
      return;
    }

    // start new recording
    const record = async () => {
      if (!permissionGranted && !(await requestPermission())) {
        return;
      }

      const preset = RecordingPresets.HIGH_QUALITY;
      const options = {
        ...preset,
        android: {
          ...preset.android,
          audioSource,
        },
        audioSource,
        numberOfChannels: 1,
      };

      const recorder = new RecordingModule.AudioRecorder(options);

      recorder
        .prepareToRecordAsync()
        .then(() => {
          recorder.record();

          // recorder.recordForDuration() is undefined?
          // custom limiter:
          setTimeout(() => {
            if (recorder.isRecording) {
              endRecording();
            }
          }, 5000);
        })
        .catch(logError);

      recordingRef.current = recorder;

      setRecording(true);
    };

    record().catch(logError);
  };

  const endRecording = () => {
    if (recordingRef.current) {
      // stop recording and append to list
      const { uri } = recordingRef.current;

      if (uri != null) {
        setRecordings([...recordings, uri]);
      }

      if (recordingRef.current.isRecording) {
        recordingRef.current.stop().catch(logError);
      }

      recordingRef.current = null;
      setRecording(false);

      return true;
    }

    return false;
  };

  return (
    <Dialog open={open} onClose={recording ? undefined : onClose}>
      {open && <PermissionRequester requestPermission={requestPermission} />}

      <DialogTitle>{t("Pronunciation")}</DialogTitle>

      <ScrollView>
        <Option
          selected={selectedIndex == 0}
          theme={theme}
          label={t("None")}
          onPress={() => setSelectedIndex(0)}
        />

        {recordings.slice(0).map((uri, i) => (
          <Option
            key={i}
            selected={selectedIndex - 2 == i}
            theme={theme}
            label={t("Recording_number", { count: i + 1 })}
            playing={playingIndex == i}
            onPress={() => {
              setSelectedIndex(i + 2);
              playIndex(i, uri);
            }}
          />
        ))}
      </ScrollView>

      <View style={styles.dialogActionsRow}>
        <ListPopup
          style={styles.dialogAction}
          list={[
            "default",
            "camcorder",
            "mic",
            "unprocessed",
            "voice_communication",
          ]}
          getItemText={(t) => t}
          keyExtractor={(t) => t}
          onSelect={(t: AndroidAudioSource) => setAudioSource(t)}
        >
          <Span>{audioSource}</Span>
        </ListPopup>

        <View style={styles.dialogAction}>
          <View
            style={[styles.recordButtonContainer, theme.styles.circleButton]}
          >
            <Pressable
              style={styles.recordButtonPressable}
              android_ripple={theme.ripples.primaryButton}
              delayLongPress={100}
              onLongPress={() => {
                if (!recordingRef.current) {
                  startRecording();
                }
              }}
              onPressOut={() => {
                // this will stop a recording started by long press
                // or start a new recording if there was no long press
                startRecording();
              }}
            >
              {recording ? (
                <StopRecordingIcon
                  size={40}
                  color={theme.colors.primary.contrast}
                />
              ) : (
                <RecordIcon size={40} color={theme.colors.primary.contrast} />
              )}
            </Pressable>
          </View>
        </View>

        <View style={styles.dialogAction}>
          <Pressable
            style={styles.confirmButton}
            android_ripple={theme.ripples.transparentButton}
            onPress={() => {
              // todo: confirm selection
              onClose();
            }}
          >
            <Span>{t("Confirm")}</Span>
          </Pressable>
        </View>
      </View>
    </Dialog>
  );
}

const styles = StyleSheet.create({
  recordButtonContainer: {
    borderRadius: "50%",
    overflow: "hidden",
    width: 56,
    aspectRatio: 1,
    alignSelf: "center",
    marginTop: 8,
    marginBottom: 8,
  },
  recordButtonPressable: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
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

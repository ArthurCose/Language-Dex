import React, { useEffect, useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import {
  AudioModule,
  RecordingOptions,
  RecordingPresets,
  useAudioRecorder,
} from "expo-audio";
import { RecordIcon, StopRecordingIcon } from "@/src/lib/components/icons";
import { useTheme } from "../contexts/theme";
import { logError } from "@/src/lib/log";
import { useSignal, useSignalValue } from "../hooks/use-signal";

const preset = RecordingPresets.HIGH_QUALITY;
const recordingOptions: RecordingOptions = {
  ...preset,
  android: {
    ...preset.android,
    audioSource: "voice_communication",
  },
  numberOfChannels: 1,
};

export default function RecordAudioButton({
  ignoreInput,
  onStart,
  onEnd,
}: {
  ignoreInput?: boolean;
  onStart?: () => void;
  onEnd?: (uri?: string) => void;
}) {
  const theme = useTheme();
  const recorder = useAudioRecorder(recordingOptions);
  const recordingSignal = useSignal(false);
  const recording = useSignalValue(recordingSignal);

  const [permissionRequested, setPermissionRequested] = useState(false);
  const [permissionGranted, setPermissionGranted] = useState(false);

  const requestPermission = () =>
    AudioModule.requestRecordingPermissionsAsync().then((status) => {
      setPermissionGranted(status.granted);

      return status.granted;
    });

  const startRecording = () => {
    if (recordingSignal.get()) {
      endRecording();
      return;
    }

    // start new recording
    const record = async () => {
      if (!permissionGranted && !(await requestPermission())) {
        return;
      }

      recordingSignal.set(true);

      recorder
        .prepareToRecordAsync()
        .then(() => {
          if (!recordingSignal.get()) {
            // cancelled
            return;
          }

          recorder.record();

          // recorder.recordForDuration() is undefined?
          // custom limiter:
          setTimeout(() => {
            if (recordingSignal.get()) {
              endRecording();
            }
          }, 5000);
        })
        .catch(logError);
    };

    record().catch(logError);
    onStart?.();
  };

  const endRecording = () => {
    if (!recordingSignal.get()) {
      return false;
    }

    // stop recording and append to list
    const uri = recorder.uri;

    if (recorder.isRecording) {
      recorder.stop().catch(logError);
    }

    recordingSignal.set(false);

    onEnd?.(uri != null ? uri : undefined);

    return true;
  };

  useEffect(() => {
    return () => {
      // prevent reading recording in endRecording after the component is dropped
      recordingSignal.set(false);
    };
  }, []);

  return (
    <View
      style={[styles.recordButtonContainer, theme.styles.circleButton]}
      onLayout={() => {
        if (!permissionRequested) {
          setPermissionRequested(true);
          requestPermission().catch(logError);
        }
      }}
    >
      <Pressable
        style={styles.recordButtonPressable}
        android_ripple={theme.ripples.primaryButton}
        pointerEvents="box-only"
        delayLongPress={100}
        disabled={ignoreInput}
        onLongPress={() => {
          if (!ignoreInput && !recording) {
            startRecording();
          }
        }}
        onPressOut={() => {
          if (!ignoreInput) {
            // this will stop a recording started by long press
            // or start a new recording if there was no long press
            startRecording();
          }
        }}
      >
        {recording ? (
          <StopRecordingIcon size={48} color={theme.colors.primary.contrast} />
        ) : (
          <RecordIcon size={48} color={theme.colors.primary.contrast} />
        )}
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  recordButtonContainer: {
    borderRadius: "50%",
    overflow: "hidden",
    aspectRatio: 1,
    alignSelf: "center",
    marginTop: 8,
    marginBottom: 8,
  },
  recordButtonPressable: {
    padding: 8,
    justifyContent: "center",
    alignItems: "center",
  },
});

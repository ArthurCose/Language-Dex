import { NativeModule, SharedObject } from "expo";
import {
  RecorderState,
  RecordingInput,
  RecordingOptions,
  RecordingStatus,
} from "./RecordingModule.types";

export declare class RecordingModule extends NativeModule {
  readonly AudioRecorder: typeof AudioRecorder;
}

export declare class AudioRecorder extends SharedObject<RecordingEvents> {
  /**
   * Initializes a new audio recorder instance with the given source.
   * @hidden
   */
  constructor(options: Partial<RecordingOptions>);

  /**
   * Unique identifier for the recorder object.
   */
  id: number;

  /**
   * The current length of the recording, in seconds.
   */
  currentTime: number;

  /**
   * Boolean value indicating whether the recording is in progress.
   */
  isRecording: boolean;

  /**
   * The uri of the recording.
   */
  uri: string | null;

  /**
   * Starts the recording.
   */
  record(): void;

  /**
   * Stop the recording.
   */
  stop(): Promise<void>;

  /**
   * Pause the recording.
   */
  pause(): void;

  /**
   * Returns a list of available recording inputs. This method can only be called if the `Recording` has been prepared.
   * @return A `Promise` that is fulfilled with an array of `RecordingInput` objects.
   */
  getAvailableInputs(): RecordingInput[];

  /**
   * Returns the currently-selected recording input. This method can only be called if the `Recording` has been prepared.
   * @return A `Promise` that is fulfilled with a `RecordingInput` object.
   */
  getCurrentInput(): RecordingInput;

  /**
   * Sets the current recording input.
   * @param inputUid The uid of a `RecordingInput`.
   * @return A `Promise` that is resolved if successful or rejected if not.
   */
  setInput(inputUid: string): void;

  /**
   * Status of the current recording.
   */
  getStatus(): RecorderState;

  /**
   * Starts the recording at the given time.
   * @param seconds The time in seconds to start recording at.
   */
  startRecordingAtTime(seconds: number): void;

  /**
   * Prepares the recording for recording.
   */
  prepareToRecordAsync(options?: Partial<RecordingOptions>): Promise<void>;

  /**
   * Stops the recording once the specified time has elapsed.
   * @param seconds The time in seconds to stop recording at.
   */
  recordForDuration(seconds: number): void;
}

export type RecordingEvents = {
  recordingStatusUpdate: (status: RecordingStatus) => void;
};

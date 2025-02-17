export type RecordingInput = {
  name: string;
  type: string;
  uid: string;
};

export type RecordingStatus = {
  id: number;
  isFinished: boolean;
  hasError: boolean;
  error: string | null;
  url: string | null;
};

export type RecorderState = {
  canRecord: boolean;
  isRecording: boolean;
  durationMillis: number;
  mediaServicesDidReset: boolean;
  metering?: number;
  url: string | null;
};

export type AndroidOutputFormat =
  | "default"
  | "3gp"
  | "mpeg4"
  | "amrnb"
  | "amrwb"
  | "aac_adts"
  | "mpeg2ts"
  | "webm";

export type AndroidAudioEncoder =
  | "default"
  | "amr_nb"
  | "amr_wb"
  | "aac"
  | "he_aac"
  | "aac_eld";

export type AndroidAudioSource =
  | "default"
  | "camcorder"
  | "mic"
  | "remote_submix"
  | "unprocessed"
  | "voice_call"
  | "voice_communication"
  | "voice_downlink"
  | "voice_performance"
  | "voice_recognition"
  | "voice_uplink";

export enum IOSOutputFormat {
  LINEARPCM = "lpcm",
  AC3 = "ac-3",
  "60958AC3" = "cac3",
  APPLEIMA4 = "ima4",
  MPEG4AAC = "aac ",
  MPEG4CELP = "celp",
  MPEG4HVXC = "hvxc",
  MPEG4TWINVQ = "twvq",
  MACE3 = "MAC3",
  MACE6 = "MAC6",
  ULAW = "ulaw",
  ALAW = "alaw",
  QDESIGN = "QDMC",
  QDESIGN2 = "QDM2",
  QUALCOMM = "Qclp",
  MPEGLAYER1 = ".mp1",
  MPEGLAYER2 = ".mp2",
  MPEGLAYER3 = ".mp3",
  APPLELOSSLESS = "alac",
  MPEG4AAC_HE = "aach",
  MPEG4AAC_LD = "aacl",
  MPEG4AAC_ELD = "aace",
  MPEG4AAC_ELD_SBR = "aacf",
  MPEG4AAC_ELD_V2 = "aacg",
  MPEG4AAC_HE_V2 = "aacp",
  MPEG4AAC_SPATIAL = "aacs",
  AMR = "samr",
  AMR_WB = "sawb",
  AUDIBLE = "AUDB",
  ILBC = "ilbc",
  DVIINTELIMA = 0x6d730011,
  MICROSOFTGSM = 0x6d730031,
  AES3 = "aes3",
  ENHANCEDAC3 = "ec-3",
}

export enum AudioQuality {
  MIN = 0,
  LOW = 0x20,
  MEDIUM = 0x40,
  HIGH = 0x60,
  MAX = 0x7f,
}

export type BitRateStrategy =
  | "constant"
  | "longTermAverage"
  | "variableConstrained"
  | "variable";

export type RecordingOptions = {
  /**
   * A boolean that determines whether audio level information will be part of the status object under the "metering" key.
   */
  isMeteringEnabled?: boolean;
  /**
   * The desired file extension.
   *
   * @example .caf
   */
  extension: string;
  /**
   * The desired sample rate.
   *
   * @example 44100
   */
  sampleRate: number;
  /**
   * The desired number of channels.
   *
   * @example 2
   */
  numberOfChannels: number;
  /**
   * The desired bit rate.
   *
   * @example 128000
   */
  bitRate: number;
  /**
   * Recording options for the Android platform.
   */
  android: RecordingOptionsAndroid;
  /**
   * Recording options for the iOS platform.
   */
  ios: RecordingOptionsIos;
  /**
   * Recording options for the Web platform.
   */
  web?: RecordingOptionsWeb;
};

export type RecordingOptionsWeb = {
  mimeType?: string;
  bitsPerSecond?: number;
};

export type RecordingOptionsIos = {
  /**
   * The desired file extension.
   *
   * @example .caf
   */
  extension?: string;
  /**
   * The desired sample rate.
   *
   * @example 44100
   */
  sampleRate?: number;
  /**
   * The desired file format. See the [`IOSOutputFormat`](#iosoutputformat) enum for all valid values.
   */
  outputFormat?: string | IOSOutputFormat | number;
  /**
   * The desired audio quality. See the [`AudioQuality`](#audioquality) enum for all valid values.
   */
  audioQuality: AudioQuality | number;
  /**
   * The desired bit rate strategy. See the next section for an enumeration of all valid values of `bitRateStrategy`.
   */
  bitRateStrategy?: number;
  /**
   * The desired bit depth hint.
   *
   * @example 16
   */
  bitDepthHint?: number;
  /**
   * The desired PCM bit depth.
   *
   * @example 16
   */
  linearPCMBitDepth?: number;
  /**
   * A boolean describing if the PCM data should be formatted in big endian.
   */
  linearPCMIsBigEndian?: boolean;
  /**
   * A boolean describing if the PCM data should be encoded in floating point or integral values.
   */
  linearPCMIsFloat?: boolean;
};

export type RecordingOptionsAndroid = {
  /**
   * The desired file extension.
   *
   * @example .caf
   */
  extension?: string;
  /**
   * The desired sample rate.
   *
   * @example 44100
   */
  sampleRate?: number;
  /**
   * The desired file format. See the [`AndroidOutputFormat`](#androidoutputformat) enum for all valid values.
   */
  outputFormat: AndroidOutputFormat;
  /**
   * The desired audio encoder. See the [`AndroidAudioEncoder`](#androidaudioencoder) enum for all valid values.
   */
  audioEncoder: AndroidAudioEncoder;
  audioSource?: AndroidAudioSource;
  /**
   * The desired maximum file size in bytes, after which the recording will stop (but `stopAndUnloadAsync()` must still
   * be called after this point).
   *
   * @example
   * `65536`
   */
  maxFileSize?: number;
};

export type AudioMode = {
  playsInSilentMode: boolean;
  /**
   * Determines how the audio session interacts with other sessions.
   *
   * @platform ios
   */
  interruptionMode: InterruptionMode;
  allowsRecording: boolean;
  shouldPlayInBackground: boolean;
  shouldRouteThroughEarpiece: boolean;
};

export type InterruptionMode = "mixWithOthers" | "doNotMix" | "duckOthers";

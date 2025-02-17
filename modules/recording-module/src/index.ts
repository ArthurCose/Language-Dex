// Reexport the native module. On web, it will be resolved to RecordingModule.web.ts
// and on native platforms to RecordingModule.ts
export { default } from "./RecordingModule";
export * from "./RecordingModule.types";
export * from "./AudioModule.types";

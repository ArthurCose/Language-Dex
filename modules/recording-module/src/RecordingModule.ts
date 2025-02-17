import { requireNativeModule } from "expo";
import { RecordingModule } from "./AudioModule.types";

// This call loads the native module object from the JSI.
export default requireNativeModule<RecordingModule>("RecordingModule");

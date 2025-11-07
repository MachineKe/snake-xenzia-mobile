
import structuredClone from "@ungap/structured-clone";
import { polyfillGlobal } from "react-native/Libraries/Utilities/PolyfillFunctions";
import {
  TextEncoderStream,
  TextDecoderStream,
} from "@stardazed/streams-text-encoding";

if (!("structuredClone" in global)) {
  polyfillGlobal("structuredClone", () => structuredClone);
}
polyfillGlobal("TextEncoderStream", () => TextEncoderStream);
polyfillGlobal("TextDecoderStream", () => TextDecoderStream);

export {};

import { httpWire } from "@mit-sdg/sync-engine-http/tooling";
import { assembleApplication } from "./src/assembly.ts";
import { policy } from "./src/http.ts";

export default {
  assemble: assembleApplication,
  title: "The Moment",
  wireName: "TheMomentWire",
  design: {
    version: 1,
    documents: [
      new URL("./design/types.md", import.meta.url),
      new URL("./design/compositions/User.md", import.meta.url),
      new URL("./design/compositions/Admin.md", import.meta.url),
      new URL("./design/compositions/Public.md", import.meta.url),
    ],
  },
  projections: [httpWire({ policy, name: "TheMomentWireHttp" })],
};
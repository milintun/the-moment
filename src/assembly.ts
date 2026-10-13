import { assemble } from "@mit-sdg/sync-engine/assembly";
import { composition as sessionsComposition } from "./compositions/Sessions.ts";
import { applicationConceptSet } from "./concepts.ts";
import { AuthenticatingConcept } from "./concepts/Authenticating.ts";
import { SessioningConcept } from "./concepts/Sessioning.ts";
import { db } from "./db.ts";

export function assembleApplication() {
  return assemble({
    conceptSet: applicationConceptSet,
    instances: {
      Authenticating: new AuthenticatingConcept(db),
      Sessioning: new SessioningConcept(db),
      // TODO: <Concept>: new <Concept>Concept(db),
    },
    composition: {
      Sessions: sessionsComposition,
      // TODO: <Composition>: composition,
    },
    // Print what went wrong. Otherwise a failure only shows up as INTERNAL_ERROR.
    rawFaultReporter: ({ error }) => console.error(error),
  });
}

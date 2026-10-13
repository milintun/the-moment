import { conceptSet, registerConcept } from "@mit-sdg/sync-engine/assembly";
import authenticatingSpec from "@design/concepts/Authenticating.md" with { type: "text" };
import {
  AuthenticatingConcept,
  InvalidCredentials,
  InvalidPassword,
  InvalidUsername,
  UsernameTaken,
} from "./concepts/Authenticating.ts";
import sessioningSpec from "@design/concepts/Sessioning.md" with { type: "text" };
import { SessioningConcept, UnknownSession } from "./concepts/Sessioning.ts";

// TODO: for each concept, import its spec and class, then register it:
// import spec from "@design/concepts/<Concept>.md" with { type: "text" };
// const <concept> = registerConcept({ class: <Concept>Concept, spec, refusals: { ... } });

const authenticating = registerConcept({
  class: AuthenticatingConcept,
  spec: authenticatingSpec,
  refusals: {
    INVALID_USERNAME: InvalidUsername,
    INVALID_PASSWORD: InvalidPassword,
    USERNAME_TAKEN: UsernameTaken,
    INVALID_CREDENTIALS: InvalidCredentials,
  },
});

const sessioning = registerConcept({
  class: SessioningConcept,
  spec: sessioningSpec,
  refusals: { UNKNOWN_SESSION: UnknownSession },
});

export const applicationConceptSet = conceptSet({
  Authenticating: authenticating,
  Sessioning: sessioning,
  // TODO: <Concept>: <concept>,
});
export const { concepts } = applicationConceptSet;

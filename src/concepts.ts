import { conceptSet, registerConcept } from "@mit-sdg/sync-engine/assembly";
import authenticatingSpec from "@design/concepts/Authenticating.md" with { type: "text" };
import {
  AuthenticatingConcept,
  InvalidCredentials,
  InvalidPassword,
  InvalidUsername,
  UsernameTaken,
} from "./concepts/Authenticating.ts";

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

export const applicationConceptSet = conceptSet({
  Authenticating: authenticating,
  // TODO: <Concept>: <concept>,
});
export const { concepts } = applicationConceptSet;

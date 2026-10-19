import { assemble } from "@mit-sdg/sync-engine/assembly";
import { composition as userComposition } from "./compositions/User.ts";
import { composition as adminComposition } from "./compositions/Admin.ts";
import { composition as publicComposition } from "./compositions/Public.ts";
import { applicationConceptSet } from "./concepts.ts";
import { AuthenticatingConcept } from "./concepts/Authenticating.ts";
import { SessioningConcept } from "./concepts/Sessioning.ts";
import { PostingConcept } from "./concepts/Posting.ts";
import { UpvotingConcept } from "./concepts/Upvoting.ts";
import { GroupingConcept } from "./concepts/Grouping.ts";
import { CyclingConcept } from "./concepts/Cycling.ts";
import { AdministratingConcept } from "./concepts/Administrating.ts";
import { NominatingConcept } from "./concepts/Nominating.ts";
import { db } from "./db.ts";

export function assembleApplication() {
  return assemble({
    conceptSet: applicationConceptSet,
    instances: {
      Authenticating: new AuthenticatingConcept(db),
      Sessioning: new SessioningConcept(db),
      Posting: new PostingConcept(db),
      Upvoting: new UpvotingConcept(db),
      Grouping: new GroupingConcept(db),
      Cycling: new CyclingConcept(db),
      Administrating: new AdministratingConcept(db),
      Nominating: new NominatingConcept(db),
      NominationVotes: new UpvotingConcept(db, "nominationvotes.votes"),
      // TODO: <Concept>: new <Concept>Concept(db),
    },
    composition: {
      User: userComposition,
      Admin: adminComposition,
      Public: publicComposition,
    },
    // Print what went wrong. Otherwise a failure only shows up as INTERNAL_ERROR.
    rawFaultReporter: ({ error }) => console.error(error),
  });
}

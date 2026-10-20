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
import { UploadingConcept } from "./concepts/Uploading.ts";
import { db } from "./db.ts";

// The clock supplies `now` to compositions; tests pass a fake one to move between runs.
export function assembleApplication({ clock }: { clock?: () => Date } = {}) {
  return assemble({
    ...(clock ? { clock } : {}),
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
      Uploading: new UploadingConcept(db),
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

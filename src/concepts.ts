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
import postingSpec from "@design/concepts/Posting.md" with {type: "text"};
import { PostingConcept, NoSuchPost, NotOwner } from "./concepts/Posting.ts";
import upvotingSpec from "@design/concepts/Upvoting.md" with { type: "text" };
import { AlreadyVoted, NotVoted, UpvotingConcept } from "./concepts/Upvoting.ts";
import groupingSpec from "@design/concepts/Grouping.md" with { type: "text" };
import { AlreadyInGroup, GroupingConcept, NameTaken, NoSuchGroup, NotInGroup } from "./concepts/Grouping.ts";

  const posting = registerConcept({
    class: PostingConcept,
    spec: postingSpec,                               
    refusals: { NO_SUCH_POST: NoSuchPost, NOT_OWNER: NotOwner },
  });

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

const upvoting = registerConcept({
  class: UpvotingConcept,
  spec: upvotingSpec,
  refusals: { ALREADY_VOTED: AlreadyVoted, NOT_VOTED: NotVoted },
});

const grouping = registerConcept({
  class: GroupingConcept,
  spec: groupingSpec,
  refusals: {
    NAME_TAKEN: NameTaken,
    NO_SUCH_GROUP: NoSuchGroup,
    ALREADY_IN_GROUP: AlreadyInGroup,
    NOT_IN_GROUP: NotInGroup,
  },
});

export const applicationConceptSet = conceptSet({
  Authenticating: authenticating,
  Sessioning: sessioning,
  Posting: posting,
  Upvoting: upvoting,
  Grouping: grouping,
});
export const { concepts } = applicationConceptSet;

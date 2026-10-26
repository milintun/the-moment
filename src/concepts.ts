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
import { AlreadyInGroup, DuplicateName, GroupingConcept, InvalidName as InvalidGroupName, NoNames, NoSuchGroup, NotInGroup } from "./concepts/Grouping.ts";
import cyclingSpec from "@design/concepts/Cycling.md" with { type: "text" };
import {
  AlreadyCycling,
  CyclingConcept,
  InvalidCycle,
  LastItem,
  NoLaterRun,
  NoSuchCycle,
  NotInCycle,
  RunUnderway,
  StartPassed,
} from "./concepts/Cycling.ts";
import administratingSpec from "@design/concepts/Administrating.md" with { type: "text" };
import { AdministratingConcept, AlreadyAdmin, NotAdmin, OwnerExists, OwnerProtected } from "./concepts/Administrating.ts";
import nominatingSpec from "@design/concepts/Nominating.md" with { type: "text" };
import {
  Chosen,
  InvalidName,
  NominatingConcept,
  NameTaken as CategoryNameTaken,
  NoSuchCategory,
  NoSuchNomination,
  NotNominator,
  TooSoon,
} from "./concepts/Nominating.ts";
import uploadingSpec from "@design/concepts/Uploading.md" with { type: "text" };
import { InvalidFile, NoSuchUpload, NotUploaded, NotYourUpload, UploadingConcept } from "./concepts/Uploading.ts";

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
    NO_NAMES: NoNames,
    INVALID_NAME: InvalidGroupName,
    DUPLICATE_NAME: DuplicateName,
    NO_SUCH_GROUP: NoSuchGroup,
    ALREADY_IN_GROUP: AlreadyInGroup,
    NOT_IN_GROUP: NotInGroup,
  },
});

const cycling = registerConcept({
  class: CyclingConcept,
  spec: cyclingSpec,
  refusals: {
    INVALID_CYCLE: InvalidCycle,
    ALREADY_CYCLING: AlreadyCycling,
    NO_SUCH_CYCLE: NoSuchCycle,
    NOT_IN_CYCLE: NotInCycle,
    NO_LATER_RUN: NoLaterRun,
    LAST_ITEM: LastItem,
    RUN_UNDERWAY: RunUnderway,
    START_PASSED: StartPassed,
  },
});

const administrating = registerConcept({
  class: AdministratingConcept,
  spec: administratingSpec,
  refusals: {
    OWNER_EXISTS: OwnerExists,
    ALREADY_ADMIN: AlreadyAdmin,
    NOT_ADMIN: NotAdmin,
    OWNER_PROTECTED: OwnerProtected,
  },
});

const nominating = registerConcept({
  class: NominatingConcept,
  spec: nominatingSpec,
  refusals: {
    NAME_TAKEN: CategoryNameTaken,
    NO_SUCH_CATEGORY: NoSuchCategory,
    INVALID_NAME: InvalidName,
    TOO_SOON: TooSoon,
    NO_SUCH_NOMINATION: NoSuchNomination,
    NOT_NOMINATOR: NotNominator,
    CHOSEN: Chosen,
  },
});

const uploading = registerConcept({
  class: UploadingConcept,
  spec: uploadingSpec,
  refusals: {
    NO_SUCH_UPLOAD: NoSuchUpload,
    NOT_YOUR_UPLOAD: NotYourUpload,
    NOT_UPLOADED: NotUploaded,
    INVALID_FILE: InvalidFile,
  },
});

export const applicationConceptSet = conceptSet({
  Authenticating: authenticating,
  Sessioning: sessioning,
  Posting: posting,
  Upvoting: upvoting,
  Grouping: grouping,
  Cycling: cycling,
  Administrating: administrating,
  Nominating: nominating,
  NominationVotes: upvoting,
  Uploading: uploading,
});
export const { concepts } = applicationConceptSet;

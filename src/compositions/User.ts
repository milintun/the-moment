import { endpoint, receive, respond } from "@mit-sdg/sync-engine/boundary";
import { each, form, former, is, no, now, reaction, view, when, where, whether } from "@mit-sdg/sync-engine/language";
import { concepts } from "../concepts.ts";

const { Authenticating, Sessioning, Posting, Grouping, Cycling, Upvoting, Nominating, NominationVotes, Uploading } =
  concepts;

// This application's image policy. Uploading itself accepts any file.
const IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp", "image/svg+xml"];
const MAX_IMAGE_BYTES = 10 * 1024 * 1024;

// ---------- Account ----------

const Register = endpoint(
  "/auth/register",
  ({ username, password, account, session, expiresAt }) =>
    receive({ username, password })
      .then(Authenticating.register({ username, password }).responds({ account }))
      .then(Sessioning.start({ subject: account }).responds({ session, expiresAt }))
      .then(respond({ account, session, expiresAt })),
);

const SignIn = endpoint(
  "/auth/sign-in",
  ({ username, password, account, session, expiresAt }) =>
    receive({ username, password })
      .then(Authenticating.authenticate({ username, password }).responds({ account }))
      .then(Sessioning.start({ subject: account }).responds({ session, expiresAt }))
      .then(respond({ account, session, expiresAt })),
);

const CurrentUser = endpoint(
  "/auth/current",
  ({ session, username }) =>
    receive({ session })
      .then(Sessioning.current({ session }).responds({ subject: username }))
      .then(respond({ username })),
);

const SignOut = endpoint(
  "/auth/sign-out",
  ({ session, signedOut }) =>
    receive({ session })
      .then(Sessioning.end({ session }).responds({ ended: signedOut }))
      .then(respond({ signedOut })),
);

// ---------- Uploading images ----------

const AcceptedImageType = view("(contentType) is an accepted image type", ({ contentType }, _outputs, _bindings) =>
  where(is.among(contentType, IMAGE_TYPES)),
).holds();

const RequestUpload = endpoint(
  "/uploads/request",
  ({ session, contentType, user, createdAt, upload, uploadUrl }) =>
    receive({ session, contentType })
      .then(Sessioning.current({ session }).responds({ subject: user }))
      .then(
        where(now(createdAt), AcceptedImageType({ contentType }))
          .then(Uploading.requestUpload({ owner: user, contentType, createdAt }).responds({ upload, uploadUrl }))
          .then(respond({ upload, uploadUrl }))
          .named("image"),
        where(no(AcceptedImageType({ contentType })))
          .then(respond({ error: "UNSUPPORTED_TYPE" }))
          .named("unsupported"),
      ),
);

// ---------- Posting ----------

// A post is in season when one of its groups has a run happening now and the post
// was created during that run.
const PostInSeason = view(
  "(post) is in season at (now)",
  ({ post, now }, _outputs, { createdAt, group, start, end }) =>
    where(
      Posting._get({ post }).is({ createdAt }),
      Grouping._groupsOf({ item: post }).is({ group }),
      Cycling._currentRun({ item: group, now }).is({ start, end }),
      is.ge(createdAt, start),
      is.lt(createdAt, end),
    ),
).holds();

// A group is open when it exists and its cycle has a run happening. A cycle also holds
// nomination categories, so a current run alone does not make something a group.
const GroupOpen = view("(group) is open at (now)", ({ group, now }, _outputs, _bindings) =>
  where(Grouping._get({ group }), Cycling._currentRun({ item: group, now })),
).holds();

// Every refusal happens before the post is created: Uploading checks the image first
// (whose it is, that it arrived, and this application's size limit), then the group.
const CreatePost = endpoint(
  "/posts/create",
  ({ session, group, content, caption, user, createdAt, post }) =>
    receive({ session, group, content, caption })
      .then(Sessioning.current({ session }).responds({ subject: user }))
      .then(Uploading.verify({ upload: content, owner: user, maxSize: MAX_IMAGE_BYTES }).responds({}))
      .then(
        where(now(createdAt), GroupOpen({ group, now: createdAt }))
          .then(Posting.create({ owner: user, content, caption, createdAt }).responds({ post }))
          .then(Grouping.addItem({ group, item: post }).responds({}))
          .then(respond({ post }))
          .named("open"),
        where(no(Grouping._get({ group })))
          .then(respond({ error: "GROUP_CLOSED" }))
          .named("not-a-group"),
        where(now(createdAt), Grouping._get({ group }), no(Cycling._currentRun({ item: group, now: createdAt })))
          .then(respond({ error: "GROUP_CLOSED" }))
          .named("closed"),
      ),
  // The caption is optional; leaving it out means no caption.
  { input: { required: ["session", "group", "content"], defaults: { caption: "" } } },
);

const DeletePost = endpoint(
  "/posts/delete",
  ({ session, post, user }) =>
    receive({ session, post })
      .then(Sessioning.current({ session }).responds({ subject: user }))
      .then(Posting.delete({ user, post }).responds({}))
      .then(respond({ post })),
);

// Cleanup: a deleted post leaves every group it was in, and its votes are cleared.
const DeletedPostLeavesGroups = reaction(({ post, group }) =>
  when(Posting.delete({ post }).responds({}))
    .where(Grouping._groupsOf({ item: post }).is({ group }))
    .then(Grouping.removeItem({ group, item: post })),
);

const DeletedPostLosesVotes = reaction(({ post }) =>
  when(Posting.delete({ post }).responds({})).then(Upvoting.clear({ target: post })),
);

// Cleanup: a deleted post's image is removed from storage.
const DeletedPostLosesImage = reaction(({ content }) =>
  when(Posting.delete({}).responds({ content })).then(Uploading.remove({ upload: content })),
);

// ---------- Voting on posts ----------

const Vote = endpoint(
  "/posts/vote",
  ({ session, post, user, instant }) =>
    receive({ session, post })
      .then(Sessioning.current({ session }).responds({ subject: user }))
      .then(
        where(now(instant), Posting._get({ post }).is.not({ owner: user }), PostInSeason({ post, now: instant }))
          .then(Upvoting.upvote({ voter: user, target: post }).responds({}))
          .then(respond({ post }))
          .named("allowed"),
        where(Posting._get({ post }).is({ owner: user }))
          .then(respond({ error: "OWN_POST" }))
          .named("own-post"),
        where(now(instant), Posting._get({ post }).is.not({ owner: user }), no(PostInSeason({ post, now: instant })))
          .then(respond({ error: "NOT_IN_SEASON" }))
          .named("out-of-season"),
        where(no(Posting._get({ post })))
          .then(respond({ error: "NO_SUCH_POST" }))
          .named("missing"),
      ),
);

const Unvote = endpoint(
  "/posts/unvote",
  ({ session, post, user, instant }) =>
    receive({ session, post })
      .then(Sessioning.current({ session }).responds({ subject: user }))
      .then(
        where(now(instant), Posting._get({ post }).is.not({ owner: user }), PostInSeason({ post, now: instant }))
          .then(Upvoting.unvote({ voter: user, target: post }).responds({}))
          .then(respond({ post }))
          .named("allowed"),
        where(Posting._get({ post }).is({ owner: user }))
          .then(respond({ error: "OWN_POST" }))
          .named("own-post"),
        where(now(instant), Posting._get({ post }).is.not({ owner: user }), no(PostInSeason({ post, now: instant })))
          .then(respond({ error: "NOT_IN_SEASON" }))
          .named("out-of-season"),
        where(no(Posting._get({ post })))
          .then(respond({ error: "NO_SUCH_POST" }))
          .named("missing"),
      ),
);

// The posts in a group that a person has upvoted.
const MyVotes = former("the posts in (group) upvoted by (user)", ({ group, user }, { post }) =>
  form({
    posts: each(Grouping._items({ group }).is({ item: post }))
      .where(Upvoting._voted({ voter: user, target: post }).is({ voted: true }))
      .form({ post }),
  }),
);

const ListMyVotes = endpoint(
  "/posts/my-votes",
  ({ session, group, user }) =>
    receive({ session, group })
      .then(Sessioning.current({ session }).responds({ subject: user }))
      .then(respond({ votes: MyVotes({ group, user }) })),
);

// ---------- My posts ----------

// The season (run, counted from 0) of group's cycle that a post made at createdAt was posted
// in; absent when that is no longer known, for example because the cycle was deleted.
const PostedSeason = former("the season of (group) at (createdAt)", ({ group, createdAt }, { run }) =>
  where(Cycling._currentRun({ item: group, now: createdAt }).is({ run })).form({ season: run }),
).optional();

// Marks a post that is still in season, which is exactly when it can still be voted on.
const InSeason = former("whether (post) is in season at (now)", ({ post, now }, _bindings) =>
  where(PostInSeason({ post, now })).form({ current: true }),
).optional();

// A person's posts, newest first, each with its votes, the galleries it is in with the
// season it was posted in, and whether it is still in season (current is null when not).
const MyPosts = former(
  "the posts of (user) at (now)",
  ({ user, now }, { post, content, caption, createdAt, votes, group, name }) =>
    form({
      posts: each(Posting._byOwner({ owner: user }).is({ post, content, caption, createdAt }))
        .where(Upvoting._count({ target: post }).is({ votes }))
        .form({
          post,
          content,
          caption,
          createdAt,
          votes,
          galleries: each(Grouping._groupsOf({ item: post }).is({ group }))
            .where(Grouping._get({ group }).is({ name }))
            .form({ group, name })
            .splicing(whether(PostedSeason({ group, createdAt }))),
        })
        .splicing(whether(InSeason({ post, now }))),
    }),
);

const ListMyPosts = endpoint(
  "/posts/mine",
  ({ session, user, instant }) =>
    receive({ session })
      .then(Sessioning.current({ session }).responds({ subject: user }))
      .then(where(now(instant)).then(respond({ mine: MyPosts({ user, now: instant }) })).named("list")),
);

// ---------- Nominating ----------

// A nomination is active while its category's cycle has a run happening and the
// nomination was made during that run, exactly like a post in season.
const NominationActive = view(
  "(nomination) is active at (now)",
  ({ nomination, now }, _outputs, { category, createdAt, start, end }) =>
    where(
      Nominating._get({ nomination }).is({ category, createdAt }),
      Cycling._currentRun({ item: category, now }).is({ start, end }),
      is.ge(createdAt, start),
      is.lt(createdAt, end),
    ),
).holds();

// An equivalent name was nominated in the category's current round.
const EquivalentActive = view(
  "an idea equivalent to (name) is active in (category) at (now)",
  ({ category, name, now }, _outputs, { createdAt, start, end }) =>
    where(
      Cycling._currentRun({ item: category, now }).is({ start, end }),
      Nominating._equivalent({ category, name }).is({ createdAt }),
      is.ge(createdAt, start),
      is.lt(createdAt, end),
    ),
).holds();

// ponytail: the duplicate check is a read before the write, so two simultaneous
// nominations of the same idea can both succeed; accepted by design.
const CreateNomination = endpoint(
  "/nominations/create",
  ({ session, category, name, user, createdAt, nomination }) =>
    receive({ session, category, name })
      .then(Sessioning.current({ session }).responds({ subject: user }))
      .then(
        where(
          now(createdAt),
          Cycling._currentRun({ item: category, now: createdAt }),
          no(EquivalentActive({ category, name, now: createdAt })),
        )
          .then(Nominating.nominate({ nominator: user, category, name, createdAt }).responds({ nomination }))
          .then(respond({ nomination }))
          .named("open"),
        where(now(createdAt), EquivalentActive({ category, name, now: createdAt }))
          .then(respond({ error: "ALREADY_NOMINATED" }))
          .named("duplicate"),
        where(now(createdAt), no(Cycling._currentRun({ item: category, now: createdAt })))
          .then(respond({ error: "CATEGORY_CLOSED" }))
          .named("closed"),
      ),
);

const WithdrawNomination = endpoint(
  "/nominations/withdraw",
  ({ session, nomination, user }) =>
    receive({ session, nomination })
      .then(Sessioning.current({ session }).responds({ subject: user }))
      .then(Nominating.withdraw({ nominator: user, nomination }).responds({}))
      .then(respond({ nomination })),
);

// Cleanup: a withdrawn nomination loses its votes.
const WithdrawnNominationLosesVotes = reaction(({ nomination }) =>
  when(Nominating.withdraw({ nomination }).responds({})).then(NominationVotes.clear({ target: nomination })),
);

// ---------- Voting on nominations ----------

const VoteNomination = endpoint(
  "/nominations/vote",
  ({ session, nomination, user, instant }) =>
    receive({ session, nomination })
      .then(Sessioning.current({ session }).responds({ subject: user }))
      .then(
        where(
          now(instant),
          Nominating._get({ nomination }).is.not({ nominator: user }),
          NominationActive({ nomination, now: instant }),
        )
          .then(NominationVotes.upvote({ voter: user, target: nomination }).responds({}))
          .then(respond({ nomination }))
          .named("allowed"),
        where(Nominating._get({ nomination }).is({ nominator: user }))
          .then(respond({ error: "OWN_NOMINATION" }))
          .named("own-nomination"),
        where(
          now(instant),
          Nominating._get({ nomination }).is.not({ nominator: user }),
          no(NominationActive({ nomination, now: instant })),
        )
          .then(respond({ error: "NOT_ACTIVE" }))
          .named("inactive"),
        where(no(Nominating._get({ nomination })))
          .then(respond({ error: "NO_SUCH_NOMINATION" }))
          .named("missing"),
      ),
);

const UnvoteNomination = endpoint(
  "/nominations/unvote",
  ({ session, nomination, user, instant }) =>
    receive({ session, nomination })
      .then(Sessioning.current({ session }).responds({ subject: user }))
      .then(
        where(
          now(instant),
          Nominating._get({ nomination }).is.not({ nominator: user }),
          NominationActive({ nomination, now: instant }),
        )
          .then(NominationVotes.unvote({ voter: user, target: nomination }).responds({}))
          .then(respond({ nomination }))
          .named("allowed"),
        where(Nominating._get({ nomination }).is({ nominator: user }))
          .then(respond({ error: "OWN_NOMINATION" }))
          .named("own-nomination"),
        where(
          now(instant),
          Nominating._get({ nomination }).is.not({ nominator: user }),
          no(NominationActive({ nomination, now: instant })),
        )
          .then(respond({ error: "NOT_ACTIVE" }))
          .named("inactive"),
        where(no(Nominating._get({ nomination })))
          .then(respond({ error: "NO_SUCH_NOMINATION" }))
          .named("missing"),
      ),
);

// The active nominations in a category that a person has upvoted.
const MyNominationVotes = former(
  "the active nominations in (category) upvoted by (user) at (now)",
  ({ category, user, now }, { nomination, createdAt, start, end }) =>
    form({
      nominations: each(Nominating._nominations({ category }).is({ nomination, createdAt }))
        .where(
          Cycling._currentRun({ item: category, now }).is({ start, end }),
          is.ge(createdAt, start),
          is.lt(createdAt, end),
          NominationVotes._voted({ voter: user, target: nomination }).is({ voted: true }),
        )
        .form({ nomination }),
    }),
);

const ListMyNominationVotes = endpoint(
  "/nominations/my-votes",
  ({ session, category, user, instant }) =>
    receive({ session, category })
      .then(Sessioning.current({ session }).responds({ subject: user }))
      .then(
        where(now(instant))
          .then(respond({ votes: MyNominationVotes({ category, user, now: instant }) }))
          .named("list"),
      ),
);

export const composition = {
  Register,
  SignIn,
  CurrentUser,
  SignOut,
  AcceptedImageType,
  RequestUpload,
  PostInSeason,
  GroupOpen,
  CreatePost,
  DeletePost,
  DeletedPostLeavesGroups,
  DeletedPostLosesVotes,
  DeletedPostLosesImage,
  Vote,
  Unvote,
  MyVotes,
  ListMyVotes,
  PostedSeason,
  InSeason,
  MyPosts,
  ListMyPosts,
  NominationActive,
  EquivalentActive,
  CreateNomination,
  WithdrawNomination,
  WithdrawnNominationLosesVotes,
  VoteNomination,
  UnvoteNomination,
  MyNominationVotes,
  ListMyNominationVotes,
};

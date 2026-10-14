import { endpoint, receive, respond } from "@mit-sdg/sync-engine/boundary";
import { is, no, now, reaction, view, when, where } from "@mit-sdg/sync-engine/language";
import { concepts } from "../concepts.ts";

const { Sessioning, Posting, Grouping, Cycling, Upvoting } = concepts;

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

const CreatePost = endpoint(
  "/posts/create",
  ({ session, group, content, user, createdAt, post }) =>
    receive({ session, group, content })
      .then(Sessioning.current({ session }).responds({ subject: user }))
      .then(
        where(now(createdAt), Cycling._currentRun({ item: group, now: createdAt }))
          .then(Posting.create({ owner: user, content, createdAt }).responds({ post }))
          .then(Grouping.addItem({ group, item: post }).responds({}))
          .then(respond({ post }))
          .named("open"),
        where(now(createdAt), no(Cycling._currentRun({ item: group, now: createdAt })))
          .then(respond({ error: "GROUP_CLOSED" }))
          .named("closed"),
      ),
);

const DeletePost = endpoint(
  "/posts/delete",
  ({ session, post, user }) =>
    receive({ session, post })
      .then(Sessioning.current({ session }).responds({ subject: user }))
      .then(Posting.delete({ user, post }).responds({}))
      .then(respond({ post })),
);

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

// Cleanup: a deleted post leaves every group it was in, and its votes are cleared.
const DeletedPostLeavesGroups = reaction(({ post, group }) =>
  when(Posting.delete({ post }).responds({}))
    .where(Grouping._groupsOf({ item: post }).is({ group }))
    .then(Grouping.removeItem({ group, item: post })),
);

const DeletedPostLosesVotes = reaction(({ post }) =>
  when(Posting.delete({ post }).responds({})).then(Upvoting.clear({ target: post })),
);

export const composition = {
  PostInSeason,
  CreatePost,
  DeletePost,
  Vote,
  Unvote,
  DeletedPostLeavesGroups,
  DeletedPostLosesVotes,
};

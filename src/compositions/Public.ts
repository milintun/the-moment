import { endpoint, receive, respond } from "@mit-sdg/sync-engine/boundary";
import { each, form, former, is, no, now, where, whether } from "@mit-sdg/sync-engine/language";
import { concepts } from "../concepts.ts";

const { Posting, Grouping, Cycling, Upvoting, Nominating, NominationVotes, Uploading } = concepts;

// The cycle a group belongs to, if any.
const GroupCycle = former("the cycle of (group)", ({ group }, { cycle, start, period, runs }) =>
  where(Cycling._cycle({ item: group }).is({ cycle, start, period, runs })).form({ cycle, start, period, runs }),
).optional();

// The run a group is in at a moment, if any.
const GroupRun = former("the run of (group) at (now)", ({ group, now }, { run, start, end }) =>
  where(Cycling._currentRun({ item: group, now }).is({ run, start, end })).form({
    run,
    runStart: start,
    runEnd: end,
  }),
).optional();

// Every group by name, with its cycle and current run left blank when it has none.
const GroupList = former("every group at (now)", ({ now }, { group, name }) =>
  form({
    groups: each(Grouping._groups({}).is({ group, name }))
      .form({ group, name })
      .splicing(whether(GroupCycle({ group })), whether(GroupRun({ group, now }))),
  }),
);

// The posts of a group created between start and end, most upvoted first and newest first
// among ties (rows arrive newest first and the vote sort keeps that order for equal votes).
// Shared by the live feed (the current season) and the archive (a finished one).
const SeasonPosts = former(
  "the posts of (group) from (start) to (end)",
  ({ group, start, end }, { post, owner, content, caption, createdAt, votes }) =>
    form({
      posts: each(Grouping._items({ group }).is({ item: post }))
        .where(
          Posting._get({ post }).is({ owner, content, caption, createdAt }),
          is.ge(createdAt, start),
          is.lt(createdAt, end),
          Upvoting._count({ target: post }).is({ votes }),
        )
        .arranged(votes, "descending")
        .form({ post, owner, content, caption, createdAt, votes }),
    }),
);

// One post with its vote count, whether or not it is still in a group.
const PostDetails = former("the details of (post)", ({ post }, { owner, content, caption, createdAt, votes }) =>
  where(
    Posting._get({ post }).is({ owner, content, caption, createdAt }),
    Upvoting._count({ target: post }).is({ votes }),
  ).form({ post, owner, content, caption, createdAt, votes }),
).optional();

// Every nomination category, with its current round left blank when it is closed.
const CategoryList = former("every nomination category at (now)", ({ now }, { category, name }) =>
  form({
    categories: each(Nominating._categories({}).is({ category, name }))
      .form({ category, name })
      .splicing(whether(GroupRun({ group: category, now }))),
  }),
);

// A category's nominations made between start and end, most upvoted first and newest
// first among ties. Shared by the current ranking here and the admin's previous ranking.
export const RoundRanking = former(
  "the ranking of (category) from (start) to (end)",
  ({ category, start, end }, { nomination, nominator, name, createdAt, votes }) =>
    form({
      nominations: each(Nominating._nominations({ category }).is({ nomination, nominator, name, createdAt }))
        .where(
          is.ge(createdAt, start),
          is.lt(createdAt, end),
          NominationVotes._count({ target: nomination }).is({ votes }),
        )
        .arranged(votes, "descending")
        .form({ nomination, nominator, name, createdAt, votes }),
    }),
);

const ListGroups = endpoint("/groups/list", ({ instant }) =>
  receive({})
    .where(now(instant))
    .then(respond({ list: GroupList({ now: instant }) })),
);

// The current season's posts; empty while the group is closed.
const Feed = endpoint("/groups/feed", ({ group, instant, start, end }) =>
  receive({ group }).then(
    where(now(instant), Cycling._currentRun({ item: group, now: instant }).is({ start, end }))
      .then(respond({ feed: SeasonPosts({ group, start, end }) }))
      .named("open"),
    where(now(instant), no(Cycling._currentRun({ item: group, now: instant })))
      .then(respond({ feed: { posts: [] } }))
      .named("closed"),
  ),
);

// A finished season's posts with their final votes. A season that hasn't ended yet, or that
// the group's cycle doesn't have, answers NO_SUCH_SEASON.
const Archive = endpoint("/groups/archive", ({ group, season, instant, start, end }) =>
  receive({ group, season }).then(
    where(now(instant), Cycling._run({ item: group, run: season }).is({ start, end }), is.le(end, instant))
      .then(respond({ archive: SeasonPosts({ group, start, end }) }))
      .named("finished"),
    where(now(instant), Cycling._run({ item: group, run: season }).is({ end }), is.gt(end, instant))
      .then(respond({ error: "NO_SUCH_SEASON" }))
      .named("not-finished"),
    where(no(Cycling._run({ item: group, run: season })))
      .then(respond({ error: "NO_SUCH_SEASON" }))
      .named("no-such-season"),
  ),
);

const GetPost = endpoint("/posts/get", ({ post }) =>
  receive({ post }).then(
    where(Posting._get({ post })).then(respond({ post: PostDetails({ post }) })).named("found"),
    where(no(Posting._get({ post }))).then(respond({ error: "NO_SUCH_POST" })).named("missing"),
  ),
);

// A fresh, short-lived link to a stored image. The HTTP policy also serves this as
// GET /images/{upload}, answered by redirecting the browser to the link.
const ImageLink = endpoint("/images/link", ({ upload, url }) =>
  receive({ upload })
    .then(Uploading.link({ upload }).responds({ url }))
    .then(respond({ url })),
);

const ListCategories = endpoint("/nominations/categories", ({ instant }) =>
  receive({})
    .where(now(instant))
    .then(respond({ list: CategoryList({ now: instant }) })),
);

const ListNominations = endpoint("/nominations/list", ({ category, instant, start, end }) =>
  receive({ category }).then(
    where(now(instant), Cycling._currentRun({ item: category, now: instant }).is({ start, end }))
      .then(respond({ ranking: RoundRanking({ category, start, end }) }))
      .named("open"),
    where(now(instant), no(Cycling._currentRun({ item: category, now: instant })))
      .then(respond({ ranking: { nominations: [] } }))
      .named("closed"),
  ),
);

export const composition = {
  GroupCycle,
  GroupRun,
  GroupList,
  SeasonPosts,
  PostDetails,
  ListGroups,
  Feed,
  Archive,
  GetPost,
  ImageLink,
  CategoryList,
  RoundRanking,
  ListCategories,
  ListNominations,
};

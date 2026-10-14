import { endpoint, receive, respond } from "@mit-sdg/sync-engine/boundary";
import { each, form, former, is, no, now, where, whether } from "@mit-sdg/sync-engine/language";
import { concepts } from "../concepts.ts";

const { Posting, Grouping, Cycling, Upvoting } = concepts;

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

// The posts of a group's current run, most upvoted first. Empty when the group is closed.
const GroupFeed = former(
  "the feed of (group) at (now)",
  ({ group, now }, { post, owner, content, createdAt, start, end, votes }) =>
    form({
      posts: each(Grouping._items({ group }).is({ item: post }))
        .where(
          Cycling._currentRun({ item: group, now }).is({ start, end }),
          Posting._get({ post }).is({ owner, content, createdAt }),
          is.ge(createdAt, start),
          is.lt(createdAt, end),
          Upvoting._count({ target: post }).is({ votes }),
        )
        .arranged(votes, "descending")
        .form({ post, owner, content, createdAt, votes }),
    }),
);

// One post with its vote count, whether or not it is still in a group.
const PostDetails = former("the details of (post)", ({ post }, { owner, content, createdAt, votes }) =>
  where(
    Posting._get({ post }).is({ owner, content, createdAt }),
    Upvoting._count({ target: post }).is({ votes }),
  ).form({ post, owner, content, createdAt, votes }),
).optional();

const ListGroups = endpoint("/groups/list", ({ instant }) =>
  receive({})
    .where(now(instant))
    .then(respond({ list: GroupList({ now: instant }) })),
);

const Feed = endpoint("/groups/feed", ({ group, instant }) =>
  receive({ group })
    .where(now(instant))
    .then(respond({ feed: GroupFeed({ group, now: instant }) })),
);

const GetPost = endpoint("/posts/get", ({ post }) =>
  receive({ post }).then(
    where(Posting._get({ post })).then(respond({ post: PostDetails({ post }) })).named("found"),
    where(no(Posting._get({ post }))).then(respond({ error: "NO_SUCH_POST" })).named("missing"),
  ),
);

export const composition = {
  GroupCycle,
  GroupRun,
  GroupList,
  GroupFeed,
  PostDetails,
  ListGroups,
  Feed,
  GetPost,
};

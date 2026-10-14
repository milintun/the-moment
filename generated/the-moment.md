<!-- Generated from the The Moment assembly. Do not edit. -->
<!-- Manifest producer: @mit-sdg/sync-engine@1.1.0; concept specification: sync-engine.concept-specification@1; renderer: @mit-sdg/sync-engine@1.1.0. -->

# The Moment — assembled read-back

_Assembled by sync-engine from registered concepts and composition. Edit the concept_
_specifications and composition source, then regenerate this file._

## Concepts

### Authenticating

Defined in [Authenticating](../design/concepts/Authenticating.md), line 1.

#### Actions

- `register(username: String, password: String) : returns (account: Account)`
  - Refuses `INVALID_USERNAME`: A username must contain 3 to 32 characters.
  - Refuses `INVALID_PASSWORD`: A password must contain 8 to 128 characters.
  - Refuses `USERNAME_TAKEN`: That username is already registered.
- `authenticate(username: String, password: String) : returns (account: Account)`
  - Refuses `INVALID_CREDENTIALS`: The username or password is incorrect.

#### Queries

- `_registered(username: String) : one (registered: Flag)`

#### Instances

- `Authenticating` — instance of `Authenticating` — [Application types](../design/types.md), line 15.

### Cycling

Defined in [Cycling](../design/concepts/Cycling.md), line 1.

#### Actions

- `create(start: DateTime, period: Number, runs: Number) : returns (cycle: Cycle)`
  - Refuses `INVALID_CYCLE`: A cycle needs a positive period and at least one run.
- `addItem(cycle: Cycle, item: Item) : returns ()`
  - Refuses `NO_SUCH_CYCLE`: There is no such cycle.
  - Refuses `ALREADY_CYCLING`: This item already belongs to a cycle.
- `removeItem(cycle: Cycle, item: Item) : returns ()`
  - Refuses `NO_SUCH_CYCLE`: There is no such cycle.
  - Refuses `NOT_IN_CYCLE`: This item is not in the cycle.
- `setRuns(cycle: Cycle, runs: Number) : returns ()`
  - Refuses `NO_SUCH_CYCLE`: There is no such cycle.
  - Refuses `INVALID_CYCLE`: A cycle needs a positive period and at least one run.
- `delete(cycle: Cycle) : returns ()`
  - Refuses `NO_SUCH_CYCLE`: There is no such cycle.

#### Queries

- `_cycle(item: Item) : optional (cycle: Cycle, start: DateTime, period: Number, runs: Number)`
- `_currentRun(item: Item, now: DateTime) : optional (run: Number, start: DateTime, end: DateTime)`
- `_all() : many (cycle: Cycle, start: DateTime, period: Number, runs: Number)`
- `_items(cycle: Cycle) : many (item: Item)`

#### Instances

- `Cycling` — instance of `Cycling` — [Application types](../design/types.md), line 31.
  - `Item` is `Grouping.Group` — [Application types](../design/types.md), line 32.

### Grouping

Defined in [Grouping](../design/concepts/Grouping.md), line 1.

#### Actions

- `create(name: String) : returns (group: Group)`
  - Refuses `NAME_TAKEN`: A group with this name already exists.
- `delete(group: Group) : returns ()`
  - Refuses `NO_SUCH_GROUP`: There is no such group.
- `addItem(group: Group, item: Item) : returns ()`
  - Refuses `NO_SUCH_GROUP`: There is no such group.
  - Refuses `ALREADY_IN_GROUP`: This item is already in the group.
- `removeItem(group: Group, item: Item) : returns ()`
  - Refuses `NO_SUCH_GROUP`: There is no such group.
  - Refuses `NOT_IN_GROUP`: This item is not in the group.

#### Queries

- `_groups() : many (group: Group, name: String)`
- `_items(group: Group) : many (item: Item)`
- `_groupsOf(item: Item) : many (group: Group)`
- `_byName(name: String) : optional (group: Group)`

#### Instances

- `Grouping` — instance of `Grouping` — [Application types](../design/types.md), line 28.
  - `Item` is `Posting.Post` — [Application types](../design/types.md), line 29.

### Posting

Defined in [Posting](../design/concepts/Posting.md), line 1.

#### Actions

- `create(owner: User, content: Content, createdAt: DateTime) : returns (post: Post)`
- `delete(user: User, post: Post) : returns ()`
  - Refuses `NO_SUCH_POST`: There is no such post.
  - Refuses `NOT_OWNER`: Only the owner of a post can delete it.

#### Queries

- `_get(post: Post) : optional (owner: User, content: Content, createdAt: DateTime)`

#### Instances

- `Posting` — instance of `Posting` — [Application types](../design/types.md), line 20.
  - `Content` is `ArtworkSource` — [Application types](../design/types.md), line 22.
  - `User` is `Authenticating.Account` — [Application types](../design/types.md), line 21.

### Sessioning

Defined in [Sessioning](../design/concepts/Sessioning.md), line 1.

#### Actions

- `start(subject: Subject) : returns (session: Session, expiresAt: DateTime)`
- `current(session: Session) : returns (subject: Subject)`
  - Refuses `UNKNOWN_SESSION`: This session is not active.
- `end(session: Session) : returns (ended: Flag)`
  - Refuses `UNKNOWN_SESSION`: This session is not active.

#### Queries

- `_active(session: Session) : optional (subject: Subject, expiresAt: DateTime)`

#### Instances

- `Sessioning` — instance of `Sessioning` — [Application types](../design/types.md), line 17.
  - `Subject` is `Authenticating.Account` — [Application types](../design/types.md), line 18.

### Upvoting

Defined in [Upvoting](../design/concepts/Upvoting.md), line 1.

#### Actions

- `upvote(voter: User, target: Item) : returns ()`
  - Refuses `ALREADY_VOTED`: You have already upvoted this.
- `unvote(voter: User, target: Item) : returns ()`
  - Refuses `NOT_VOTED`: You have not upvoted this.
- `clear(target: Item) : returns ()`

#### Queries

- `_count(target: Item) : one (votes: Number)`
- `_voted(voter: User, target: Item) : one (voted: Flag)`
- `_counts() : many (target: Item, votes: Number)`

#### Instances

- `Upvoting` — instance of `Upvoting` — [Application types](../design/types.md), line 24.
  - `Item` is `Posting.Post` — [Application types](../design/types.md), line 26.
  - `User` is `Authenticating.Account` — [Application types](../design/types.md), line 25.

## Application types

Concrete types:

- `ArtworkSource` — [Application types](../design/types.md), line 8.

## Views

_Views name reusable conditions. Multiple `where` blocks are alternatives._

### (post) is in season at (now)

Authored path: `User.PostInSeason`.
- Covered by [User](../design/compositions/User.md), line 29.

```view
(post) is in season at (now) — inputs (post, now); outputs (); bindings (createdAt, group, start, end)
  where
    Posting._get (post) has (createdAt)
    Grouping._groupsOf (item: post) has (group)
    Cycling._currentRun (item: group, now) has (end, start)
    createdAt is at least start
    createdAt is less than end
```

### (session) belongs to the admin

Authored path: `Admin.IsAdmin`.
- Covered by [Admin](../design/compositions/Admin.md), line 5.

```view
(session) belongs to the admin — inputs (session); outputs (); bindings ()
  where Sessioning._active (session) has (subject: "milin")
```

### (session) does not belong to the admin

Authored path: `Admin.IsNotAdmin`.
- Covered by [Admin](../design/compositions/Admin.md), line 7.

```view
(session) does not belong to the admin — inputs (session); outputs (); bindings ()
  where Sessioning._active (session) and not (subject: "milin")
```

## Formers

_Formers name result shapes evaluated when asked. The source former owns_
_the authored explanation; this section records the generated shape._

### every cycle

Authored path: `Admin.CycleList`.
- Covered by [Admin](../design/compositions/Admin.md), line 34.

```former
Former "every cycle" — inputs (); bindings (cycle, start, period, runs, group); promises exactly one record — forms:
  a record of
    cycles: each Cycling._all () has (cycle, period, runs, start)
      form a record of
        cycle
        groups: each Cycling._items (cycle) has (item: group)
          form a record of
            group
        period
        runs
        start
```

### the cycle of (group)

Authored path: `Public.GroupCycle`.
- Covered by [Public](../design/compositions/Public.md), line 10.

```former
Former "the cycle of (group)" — inputs (group); bindings (cycle, start, period, runs); promises at most one record — forms:
  a record of
    where Cycling._cycle (item: group) has (cycle, period, runs, start)
    cycle
    period
    runs
    start
```

### the run of (group) at (now)

Authored path: `Public.GroupRun`.
- Covered by [Public](../design/compositions/Public.md), line 11.

```former
Former "the run of (group) at (now)" — inputs (group, now); bindings (run, start, end); promises at most one record — forms:
  a record of
    where Cycling._currentRun (item: group, now) has (end, run, start)
    run
    runEnd: end
    runStart: start
```

### every group at (now)

Authored path: `Public.GroupList`.
- Covered by [Public](../design/compositions/Public.md), line 9.

```former
Former "every group at (now)" — inputs (now); bindings (group, name); promises exactly one record — forms:
  a record of
    groups: each Grouping._groups () has (group, name)
      form a record of
        group
        name
        … former "the cycle of (group)" with (group), with blank leaves if absent
        … former "the run of (group) at (now)" with (group, now), with blank leaves if absent
```

### the details of (post)

Authored path: `Public.PostDetails`.
- Covered by [Public](../design/compositions/Public.md), line 29.

```former
Former "the details of (post)" — inputs (post); bindings (owner, content, createdAt, votes); promises at most one record — forms:
  a record of
    where Posting._get (post) has (content, createdAt, owner)
    where Upvoting._count (target: post) has (votes)
    content
    createdAt
    owner
    post
    votes
```

### the feed of (group) at (now)

Authored path: `Public.GroupFeed`.
- Covered by [Public](../design/compositions/Public.md), line 19.

```former
Former "the feed of (group) at (now)" — inputs (group, now); bindings (post, owner, content, createdAt, start, end, votes); promises exactly one record — forms:
  a record of
    posts: each Grouping._items (group) has (item: post)
      where Cycling._currentRun (item: group, now) has (end, start)
      where Posting._get (post) has (content, createdAt, owner)
      where createdAt is at least start
      where createdAt is less than end
      where Upvoting._count (target: post) has (votes)
      arranged by votes, descending
      form a record of
        content
        createdAt
        owner
        post
        votes
```

### the posts in (group) upvoted by (user)

Authored path: `User.MyVotes`.
- Covered by [User](../design/compositions/User.md), line 41.

```former
Former "the posts in (group) upvoted by (user)" — inputs (group, user); bindings (post); promises exactly one record — forms:
  a record of
    posts: each Grouping._items (group) has (item: post)
      where Upvoting._voted (target: post, voter: user) has (voted: true)
      form a record of
        post
```

## Reactions

### Admin.AddGroupToCycle

Authored path: `Admin.AddGroupToCycle`.
- Covered by [Admin](../design/compositions/Admin.md), line 46.
- Covered by [Admin](../design/compositions/Admin.md), line 53.

```reaction
when RequestBoundary.request (cycle, group, path: "/admin/cycles/add-group", requestId, session)
then
  Sessioning.current (session)
```

### Admin.AddGroupToCycle:admin#2

Authored path: `Admin.AddGroupToCycle`.
- Covered by [Admin](../design/compositions/Admin.md), line 46.
- Covered by [Admin](../design/compositions/Admin.md), line 53.

```reaction
when Sessioning.current (session), asked by Admin.AddGroupToCycle
where
  view "(session) belongs to the admin" with (session)
  earlier, RequestBoundary.request (cycle, group, path: "/admin/cycles/add-group", requestId, session)
then
  Cycling.addItem (cycle, item: group)
```

### Admin.AddGroupToCycle:admin#3

Authored path: `Admin.AddGroupToCycle`.
- Covered by [Admin](../design/compositions/Admin.md), line 46.
- Covered by [Admin](../design/compositions/Admin.md), line 53.

```reaction
when Cycling.addItem (cycle, item: group), asked by Admin.AddGroupToCycle:admin#2
where
  earlier, RequestBoundary.request (cycle, group, path: "/admin/cycles/add-group", requestId, session)
then
  RequestBoundary.respond (cycle, group, requestId)
```

### Admin.AddGroupToCycle:not-admin#2

Authored path: `Admin.AddGroupToCycle`.
- Covered by [Admin](../design/compositions/Admin.md), line 46.
- Covered by [Admin](../design/compositions/Admin.md), line 53.

```reaction
when Sessioning.current (session), asked by Admin.AddGroupToCycle
where
  view "(session) does not belong to the admin" with (session)
  earlier, RequestBoundary.request (cycle, group, path: "/admin/cycles/add-group", requestId, session)
then
  RequestBoundary.respond (error: "ADMIN_ONLY", requestId)
```

### Admin.AddPostToGroup

Authored path: `Admin.AddPostToGroup`.
- Covered by [Admin](../design/compositions/Admin.md), line 23.
- Covered by [Admin](../design/compositions/Admin.md), line 27.

```reaction
when RequestBoundary.request (group, path: "/admin/groups/add-post", post, requestId, session)
then
  Sessioning.current (session)
```

### Admin.AddPostToGroup:admin#2

Authored path: `Admin.AddPostToGroup`.
- Covered by [Admin](../design/compositions/Admin.md), line 23.
- Covered by [Admin](../design/compositions/Admin.md), line 27.

```reaction
when Sessioning.current (session), asked by Admin.AddPostToGroup
where
  view "(session) belongs to the admin" with (session)
  earlier, RequestBoundary.request (group, path: "/admin/groups/add-post", post, requestId, session)
then
  Grouping.addItem (group, item: post)
```

### Admin.AddPostToGroup:admin#3

Authored path: `Admin.AddPostToGroup`.
- Covered by [Admin](../design/compositions/Admin.md), line 23.
- Covered by [Admin](../design/compositions/Admin.md), line 27.

```reaction
when Grouping.addItem (group, item: post), asked by Admin.AddPostToGroup:admin#2
where
  earlier, RequestBoundary.request (group, path: "/admin/groups/add-post", post, requestId, session)
then
  RequestBoundary.respond (group, post, requestId)
```

### Admin.AddPostToGroup:not-admin#2

Authored path: `Admin.AddPostToGroup`.
- Covered by [Admin](../design/compositions/Admin.md), line 23.
- Covered by [Admin](../design/compositions/Admin.md), line 27.

```reaction
when Sessioning.current (session), asked by Admin.AddPostToGroup
where
  view "(session) does not belong to the admin" with (session)
  earlier, RequestBoundary.request (group, path: "/admin/groups/add-post", post, requestId, session)
then
  RequestBoundary.respond (error: "ADMIN_ONLY", requestId)
```

### Admin.CreateCycle

Authored path: `Admin.CreateCycle`.
- Covered by [Admin](../design/compositions/Admin.md), line 35.
- Covered by [Admin](../design/compositions/Admin.md), line 41.

```reaction
when RequestBoundary.request (path: "/admin/cycles/create", period, requestId, runs, session)
then
  Sessioning.current (session)
```

### Admin.CreateCycle:admin#2

Authored path: `Admin.CreateCycle`.
- Covered by [Admin](../design/compositions/Admin.md), line 35.
- Covered by [Admin](../design/compositions/Admin.md), line 41.

```reaction
when Sessioning.current (session), asked by Admin.CreateCycle
where
  start is the current flow's instant
  view "(session) belongs to the admin" with (session)
  earlier, RequestBoundary.request (path: "/admin/cycles/create", period, requestId, runs, session)
then
  Cycling.create (period, runs, start)
```

### Admin.CreateCycle:admin#3

Authored path: `Admin.CreateCycle`.
- Covered by [Admin](../design/compositions/Admin.md), line 35.
- Covered by [Admin](../design/compositions/Admin.md), line 41.

```reaction
when Cycling.create (period, runs, start, cycle), asked by Admin.CreateCycle:admin#2
where
  earlier, RequestBoundary.request (path: "/admin/cycles/create", period, requestId, runs, session)
then
  RequestBoundary.respond (cycle, requestId)
```

### Admin.CreateCycle:not-admin#2

Authored path: `Admin.CreateCycle`.
- Covered by [Admin](../design/compositions/Admin.md), line 35.
- Covered by [Admin](../design/compositions/Admin.md), line 41.

```reaction
when Sessioning.current (session), asked by Admin.CreateCycle
where
  view "(session) does not belong to the admin" with (session)
  earlier, RequestBoundary.request (path: "/admin/cycles/create", period, requestId, runs, session)
then
  RequestBoundary.respond (error: "ADMIN_ONLY", requestId)
```

### Admin.CreateGroup

Authored path: `Admin.CreateGroup`.
- Covered by [Admin](../design/compositions/Admin.md), line 12.
- Covered by [Admin](../design/compositions/Admin.md), line 19.

```reaction
when RequestBoundary.request (name, path: "/admin/groups/create", requestId, session)
then
  Sessioning.current (session)
```

### Admin.CreateGroup:admin#2

Authored path: `Admin.CreateGroup`.
- Covered by [Admin](../design/compositions/Admin.md), line 12.
- Covered by [Admin](../design/compositions/Admin.md), line 19.

```reaction
when Sessioning.current (session), asked by Admin.CreateGroup
where
  view "(session) belongs to the admin" with (session)
  earlier, RequestBoundary.request (name, path: "/admin/groups/create", requestId, session)
then
  Grouping.create (name)
```

### Admin.CreateGroup:admin#3

Authored path: `Admin.CreateGroup`.
- Covered by [Admin](../design/compositions/Admin.md), line 12.
- Covered by [Admin](../design/compositions/Admin.md), line 19.

```reaction
when Grouping.create (name, group), asked by Admin.CreateGroup:admin#2
where
  earlier, RequestBoundary.request (name, path: "/admin/groups/create", requestId, session)
then
  RequestBoundary.respond (group, requestId)
```

### Admin.CreateGroup:not-admin#2

Authored path: `Admin.CreateGroup`.
- Covered by [Admin](../design/compositions/Admin.md), line 12.
- Covered by [Admin](../design/compositions/Admin.md), line 19.

```reaction
when Sessioning.current (session), asked by Admin.CreateGroup
where
  view "(session) does not belong to the admin" with (session)
  earlier, RequestBoundary.request (name, path: "/admin/groups/create", requestId, session)
then
  RequestBoundary.respond (error: "ADMIN_ONLY", requestId)
```

### Admin.DeleteCycle

Authored path: `Admin.DeleteCycle`.
- Covered by [Admin](../design/compositions/Admin.md), line 36.
- Covered by [Admin](../design/compositions/Admin.md), line 42.

```reaction
when RequestBoundary.request (cycle, path: "/admin/cycles/delete", requestId, session)
then
  Sessioning.current (session)
```

### Admin.DeleteCycle:admin#2

Authored path: `Admin.DeleteCycle`.
- Covered by [Admin](../design/compositions/Admin.md), line 36.
- Covered by [Admin](../design/compositions/Admin.md), line 42.

```reaction
when Sessioning.current (session), asked by Admin.DeleteCycle
where
  view "(session) belongs to the admin" with (session)
  earlier, RequestBoundary.request (cycle, path: "/admin/cycles/delete", requestId, session)
then
  Cycling.delete (cycle)
```

### Admin.DeleteCycle:admin#3

Authored path: `Admin.DeleteCycle`.
- Covered by [Admin](../design/compositions/Admin.md), line 36.
- Covered by [Admin](../design/compositions/Admin.md), line 42.

```reaction
when Cycling.delete (cycle), asked by Admin.DeleteCycle:admin#2
where
  earlier, RequestBoundary.request (cycle, path: "/admin/cycles/delete", requestId, session)
then
  RequestBoundary.respond (cycle, requestId)
```

### Admin.DeleteCycle:not-admin#2

Authored path: `Admin.DeleteCycle`.
- Covered by [Admin](../design/compositions/Admin.md), line 36.
- Covered by [Admin](../design/compositions/Admin.md), line 42.

```reaction
when Sessioning.current (session), asked by Admin.DeleteCycle
where
  view "(session) does not belong to the admin" with (session)
  earlier, RequestBoundary.request (cycle, path: "/admin/cycles/delete", requestId, session)
then
  RequestBoundary.respond (error: "ADMIN_ONLY", requestId)
```

### Admin.DeleteGroup

Authored path: `Admin.DeleteGroup`.
- Covered by [Admin](../design/compositions/Admin.md), line 13.
- Covered by [Admin](../design/compositions/Admin.md), line 20.

```reaction
when RequestBoundary.request (group, path: "/admin/groups/delete", requestId, session)
then
  Sessioning.current (session)
```

### Admin.DeleteGroup:admin#2

Authored path: `Admin.DeleteGroup`.
- Covered by [Admin](../design/compositions/Admin.md), line 13.
- Covered by [Admin](../design/compositions/Admin.md), line 20.

```reaction
when Sessioning.current (session), asked by Admin.DeleteGroup
where
  view "(session) belongs to the admin" with (session)
  earlier, RequestBoundary.request (group, path: "/admin/groups/delete", requestId, session)
then
  Grouping.delete (group)
```

### Admin.DeleteGroup:admin#3

Authored path: `Admin.DeleteGroup`.
- Covered by [Admin](../design/compositions/Admin.md), line 13.
- Covered by [Admin](../design/compositions/Admin.md), line 20.

```reaction
when Grouping.delete (group), asked by Admin.DeleteGroup:admin#2
where
  earlier, RequestBoundary.request (group, path: "/admin/groups/delete", requestId, session)
then
  RequestBoundary.respond (group, requestId)
```

### Admin.DeleteGroup:not-admin#2

Authored path: `Admin.DeleteGroup`.
- Covered by [Admin](../design/compositions/Admin.md), line 13.
- Covered by [Admin](../design/compositions/Admin.md), line 20.

```reaction
when Sessioning.current (session), asked by Admin.DeleteGroup
where
  view "(session) does not belong to the admin" with (session)
  earlier, RequestBoundary.request (group, path: "/admin/groups/delete", requestId, session)
then
  RequestBoundary.respond (error: "ADMIN_ONLY", requestId)
```

### Admin.DeletedGroupLeavesCycle

Authored path: `Admin.DeletedGroupLeavesCycle`.
- Covered by [Admin](../design/compositions/Admin.md), line 16.

```reaction
when Grouping.delete (group)
where
  Cycling._cycle (item: group) has (cycle)
then
  Cycling.removeItem (cycle, item: group)
```

### Admin.ListCycles

Authored path: `Admin.ListCycles`.
- Covered by [Admin](../design/compositions/Admin.md), line 33.
- Covered by [Admin](../design/compositions/Admin.md), line 40.

```reaction
when RequestBoundary.request (path: "/admin/cycles/list", requestId, session)
then
  Sessioning.current (session)
```

### Admin.ListCycles:admin#2

Authored path: `Admin.ListCycles`.
- Covered by [Admin](../design/compositions/Admin.md), line 33.
- Covered by [Admin](../design/compositions/Admin.md), line 40.

```reaction
when Sessioning.current (session), asked by Admin.ListCycles
where
  view "(session) belongs to the admin" with (session)
  earlier, RequestBoundary.request (path: "/admin/cycles/list", requestId, session)
then
  RequestBoundary.respond (list: former "every cycle", requestId)
```

### Admin.ListCycles:not-admin#2

Authored path: `Admin.ListCycles`.
- Covered by [Admin](../design/compositions/Admin.md), line 33.
- Covered by [Admin](../design/compositions/Admin.md), line 40.

```reaction
when Sessioning.current (session), asked by Admin.ListCycles
where
  view "(session) does not belong to the admin" with (session)
  earlier, RequestBoundary.request (path: "/admin/cycles/list", requestId, session)
then
  RequestBoundary.respond (error: "ADMIN_ONLY", requestId)
```

### Admin.RemoveGroupFromCycle

Authored path: `Admin.RemoveGroupFromCycle`.
- Covered by [Admin](../design/compositions/Admin.md), line 47.
- Covered by [Admin](../design/compositions/Admin.md), line 54.

```reaction
when RequestBoundary.request (cycle, group, path: "/admin/cycles/remove-group", requestId, session)
then
  Sessioning.current (session)
```

### Admin.RemoveGroupFromCycle:admin#2

Authored path: `Admin.RemoveGroupFromCycle`.
- Covered by [Admin](../design/compositions/Admin.md), line 47.
- Covered by [Admin](../design/compositions/Admin.md), line 54.

```reaction
when Sessioning.current (session), asked by Admin.RemoveGroupFromCycle
where
  view "(session) belongs to the admin" with (session)
  earlier, RequestBoundary.request (cycle, group, path: "/admin/cycles/remove-group", requestId, session)
then
  Cycling.removeItem (cycle, item: group)
```

### Admin.RemoveGroupFromCycle:admin#3

Authored path: `Admin.RemoveGroupFromCycle`.
- Covered by [Admin](../design/compositions/Admin.md), line 47.
- Covered by [Admin](../design/compositions/Admin.md), line 54.

```reaction
when Cycling.removeItem (cycle, item: group), asked by Admin.RemoveGroupFromCycle:admin#2
where
  earlier, RequestBoundary.request (cycle, group, path: "/admin/cycles/remove-group", requestId, session)
then
  RequestBoundary.respond (cycle, group, requestId)
```

### Admin.RemoveGroupFromCycle:not-admin#2

Authored path: `Admin.RemoveGroupFromCycle`.
- Covered by [Admin](../design/compositions/Admin.md), line 47.
- Covered by [Admin](../design/compositions/Admin.md), line 54.

```reaction
when Sessioning.current (session), asked by Admin.RemoveGroupFromCycle
where
  view "(session) does not belong to the admin" with (session)
  earlier, RequestBoundary.request (cycle, group, path: "/admin/cycles/remove-group", requestId, session)
then
  RequestBoundary.respond (error: "ADMIN_ONLY", requestId)
```

### Admin.RemovePostFromGroup

Authored path: `Admin.RemovePostFromGroup`.
- Covered by [Admin](../design/compositions/Admin.md), line 24.
- Covered by [Admin](../design/compositions/Admin.md), line 28.

```reaction
when RequestBoundary.request (group, path: "/admin/groups/remove-post", post, requestId, session)
then
  Sessioning.current (session)
```

### Admin.RemovePostFromGroup:admin#2

Authored path: `Admin.RemovePostFromGroup`.
- Covered by [Admin](../design/compositions/Admin.md), line 24.
- Covered by [Admin](../design/compositions/Admin.md), line 28.

```reaction
when Sessioning.current (session), asked by Admin.RemovePostFromGroup
where
  view "(session) belongs to the admin" with (session)
  earlier, RequestBoundary.request (group, path: "/admin/groups/remove-post", post, requestId, session)
then
  Grouping.removeItem (group, item: post)
```

### Admin.RemovePostFromGroup:admin#3

Authored path: `Admin.RemovePostFromGroup`.
- Covered by [Admin](../design/compositions/Admin.md), line 24.
- Covered by [Admin](../design/compositions/Admin.md), line 28.

```reaction
when Grouping.removeItem (group, item: post), asked by Admin.RemovePostFromGroup:admin#2
where
  earlier, RequestBoundary.request (group, path: "/admin/groups/remove-post", post, requestId, session)
then
  RequestBoundary.respond (group, post, requestId)
```

### Admin.RemovePostFromGroup:not-admin#2

Authored path: `Admin.RemovePostFromGroup`.
- Covered by [Admin](../design/compositions/Admin.md), line 24.
- Covered by [Admin](../design/compositions/Admin.md), line 28.

```reaction
when Sessioning.current (session), asked by Admin.RemovePostFromGroup
where
  view "(session) does not belong to the admin" with (session)
  earlier, RequestBoundary.request (group, path: "/admin/groups/remove-post", post, requestId, session)
then
  RequestBoundary.respond (error: "ADMIN_ONLY", requestId)
```

### Admin.SetCycleRuns

Authored path: `Admin.SetCycleRuns`.
- Covered by [Admin](../design/compositions/Admin.md), line 49.
- Covered by [Admin](../design/compositions/Admin.md), line 55.

```reaction
when RequestBoundary.request (cycle, path: "/admin/cycles/set-runs", requestId, runs, session)
then
  Sessioning.current (session)
```

### Admin.SetCycleRuns:admin#2

Authored path: `Admin.SetCycleRuns`.
- Covered by [Admin](../design/compositions/Admin.md), line 49.
- Covered by [Admin](../design/compositions/Admin.md), line 55.

```reaction
when Sessioning.current (session), asked by Admin.SetCycleRuns
where
  view "(session) belongs to the admin" with (session)
  earlier, RequestBoundary.request (cycle, path: "/admin/cycles/set-runs", requestId, runs, session)
then
  Cycling.setRuns (cycle, runs)
```

### Admin.SetCycleRuns:admin#3

Authored path: `Admin.SetCycleRuns`.
- Covered by [Admin](../design/compositions/Admin.md), line 49.
- Covered by [Admin](../design/compositions/Admin.md), line 55.

```reaction
when Cycling.setRuns (cycle, runs), asked by Admin.SetCycleRuns:admin#2
where
  earlier, RequestBoundary.request (cycle, path: "/admin/cycles/set-runs", requestId, runs, session)
then
  RequestBoundary.respond (cycle, requestId, runs)
```

### Admin.SetCycleRuns:not-admin#2

Authored path: `Admin.SetCycleRuns`.
- Covered by [Admin](../design/compositions/Admin.md), line 49.
- Covered by [Admin](../design/compositions/Admin.md), line 55.

```reaction
when Sessioning.current (session), asked by Admin.SetCycleRuns
where
  view "(session) does not belong to the admin" with (session)
  earlier, RequestBoundary.request (cycle, path: "/admin/cycles/set-runs", requestId, runs, session)
then
  RequestBoundary.respond (error: "ADMIN_ONLY", requestId)
```

### DeliverFaultToAsker

```reaction
when any action is faulted, not asked by DeliverFaultToAsker
where
  earlier, RequestBoundary.request (requestId)
then
  RequestBoundary.respondFramework (error: "INTERNAL_ERROR", requestId)
```

### DeliverRefusalToAsker

```reaction
when any action is refused (message), except RequestBoundary
where
  earlier, RequestBoundary.request (requestId)
then
  RequestBoundary.respond (error: message, requestId)
```

### Public.Feed

Authored path: `Public.Feed`.
- Covered by [Public](../design/compositions/Public.md), line 18.
- Covered by [Public](../design/compositions/Public.md), line 24.

```reaction
when RequestBoundary.request (group, path: "/groups/feed", requestId)
where
  instant is the current flow's instant
then
  RequestBoundary.respond (feed: former "the feed of (group) at (now)" with (group, now: instant), requestId)
```

### Public.GetPost:found

Authored path: `Public.GetPost`.
- Covered by [Public](../design/compositions/Public.md), line 29.
- Covered by [Public](../design/compositions/Public.md), line 34.

```reaction
when RequestBoundary.request (path: "/posts/get", post, requestId)
where
  Posting._get (post)
then
  RequestBoundary.respond (post: former "the details of (post)" with (post), requestId)
```

### Public.GetPost:missing

Authored path: `Public.GetPost`.
- Covered by [Public](../design/compositions/Public.md), line 29.
- Covered by [Public](../design/compositions/Public.md), line 34.

```reaction
when RequestBoundary.request (path: "/posts/get", post, requestId)
where
  no Posting._get (post)
then
  RequestBoundary.respond (error: "NO_SUCH_POST", requestId)
```

### Public.ListGroups

Authored path: `Public.ListGroups`.
- Covered by [Public](../design/compositions/Public.md), line 8.
- Covered by [Public](../design/compositions/Public.md), line 15.

```reaction
when RequestBoundary.request (path: "/groups/list", requestId)
where
  instant is the current flow's instant
then
  RequestBoundary.respond (list: former "every group at (now)" with (now: instant), requestId)
```

### Sessions.CurrentUser

Authored path: `Sessions.CurrentUser`.
- Covered by [Sessions](../design/compositions/Sessions.md), line 16.
- Covered by [Sessions](../design/compositions/Sessions.md), line 20.

```reaction
when RequestBoundary.request (path: "/auth/current", requestId, session)
then
  Sessioning.current (session)
```

### Sessions.CurrentUser#2

Authored path: `Sessions.CurrentUser`.
- Covered by [Sessions](../design/compositions/Sessions.md), line 16.
- Covered by [Sessions](../design/compositions/Sessions.md), line 20.

```reaction
when Sessioning.current (session, subject: username), asked by Sessions.CurrentUser
where
  earlier, RequestBoundary.request (path: "/auth/current", requestId, session)
then
  RequestBoundary.respond (requestId, username)
```

### Sessions.Register

Authored path: `Sessions.Register`.
- Covered by [Sessions](../design/compositions/Sessions.md), line 5.
- Covered by [Sessions](../design/compositions/Sessions.md), line 12.

```reaction
when RequestBoundary.request (password, path: "/auth/register", requestId, username)
then
  Authenticating.register (password, username)
```

### Sessions.Register#2

Authored path: `Sessions.Register`.
- Covered by [Sessions](../design/compositions/Sessions.md), line 5.
- Covered by [Sessions](../design/compositions/Sessions.md), line 12.

```reaction
when Authenticating.register (password, username, account), asked by Sessions.Register
then
  Sessioning.start (subject: account)
```

### Sessions.Register#3

Authored path: `Sessions.Register`.
- Covered by [Sessions](../design/compositions/Sessions.md), line 5.
- Covered by [Sessions](../design/compositions/Sessions.md), line 12.

```reaction
when Sessioning.start (subject: account, expiresAt, session), asked by Sessions.Register#2
where
  earlier, RequestBoundary.request (password, path: "/auth/register", requestId, username)
then
  RequestBoundary.respond (account, expiresAt, requestId, session)
```

### Sessions.SignIn

Authored path: `Sessions.SignIn`.
- Covered by [Sessions](../design/compositions/Sessions.md), line 7.
- Covered by [Sessions](../design/compositions/Sessions.md), line 13.

```reaction
when RequestBoundary.request (password, path: "/auth/sign-in", requestId, username)
then
  Authenticating.authenticate (password, username)
```

### Sessions.SignIn#2

Authored path: `Sessions.SignIn`.
- Covered by [Sessions](../design/compositions/Sessions.md), line 7.
- Covered by [Sessions](../design/compositions/Sessions.md), line 13.

```reaction
when Authenticating.authenticate (password, username, account), asked by Sessions.SignIn
then
  Sessioning.start (subject: account)
```

### Sessions.SignIn#3

Authored path: `Sessions.SignIn`.
- Covered by [Sessions](../design/compositions/Sessions.md), line 7.
- Covered by [Sessions](../design/compositions/Sessions.md), line 13.

```reaction
when Sessioning.start (subject: account, expiresAt, session), asked by Sessions.SignIn#2
where
  earlier, RequestBoundary.request (password, path: "/auth/sign-in", requestId, username)
then
  RequestBoundary.respond (account, expiresAt, requestId, session)
```

### Sessions.SignOut

Authored path: `Sessions.SignOut`.
- Covered by [Sessions](../design/compositions/Sessions.md), line 23.
- Covered by [Sessions](../design/compositions/Sessions.md), line 27.

```reaction
when RequestBoundary.request (path: "/auth/sign-out", requestId, session)
then
  Sessioning.end (session)
```

### Sessions.SignOut#2

Authored path: `Sessions.SignOut`.
- Covered by [Sessions](../design/compositions/Sessions.md), line 23.
- Covered by [Sessions](../design/compositions/Sessions.md), line 27.

```reaction
when Sessioning.end (session, ended: signedOut), asked by Sessions.SignOut
where
  earlier, RequestBoundary.request (path: "/auth/sign-out", requestId, session)
then
  RequestBoundary.respond (requestId, signedOut)
```

### User.CreatePost

Authored path: `User.CreatePost`.
- Covered by [User](../design/compositions/User.md), line 9.
- Covered by [User](../design/compositions/User.md), line 15.

```reaction
when RequestBoundary.request (content, group, path: "/posts/create", requestId, session)
then
  Sessioning.current (session)
```

### User.CreatePost:closed#2

Authored path: `User.CreatePost`.
- Covered by [User](../design/compositions/User.md), line 9.
- Covered by [User](../design/compositions/User.md), line 15.

```reaction
when Sessioning.current (session, subject: user), asked by User.CreatePost
where
  createdAt is the current flow's instant
  earlier, RequestBoundary.request (content, group, path: "/posts/create", requestId, session)
  no Cycling._currentRun (item: group, now: createdAt)
then
  RequestBoundary.respond (error: "GROUP_CLOSED", requestId)
```

### User.CreatePost:open#2

Authored path: `User.CreatePost`.
- Covered by [User](../design/compositions/User.md), line 9.
- Covered by [User](../design/compositions/User.md), line 15.

```reaction
when Sessioning.current (session, subject: user), asked by User.CreatePost
where
  createdAt is the current flow's instant
  earlier, RequestBoundary.request (content, group, path: "/posts/create", requestId, session)
  Cycling._currentRun (item: group, now: createdAt)
then
  Posting.create (content, createdAt, owner: user)
```

### User.CreatePost:open#3

Authored path: `User.CreatePost`.
- Covered by [User](../design/compositions/User.md), line 9.
- Covered by [User](../design/compositions/User.md), line 15.

```reaction
when Posting.create (content, createdAt, owner: user, post), asked by User.CreatePost:open#2
where
  earlier, RequestBoundary.request (content, group, path: "/posts/create", requestId, session)
then
  Grouping.addItem (group, item: post)
```

### User.CreatePost:open#4

Authored path: `User.CreatePost`.
- Covered by [User](../design/compositions/User.md), line 9.
- Covered by [User](../design/compositions/User.md), line 15.

```reaction
when Grouping.addItem (group, item: post), asked by User.CreatePost:open#3
where
  earlier, RequestBoundary.request (content, group, path: "/posts/create", requestId, session)
then
  RequestBoundary.respond (post, requestId)
```

### User.DeletePost

Authored path: `User.DeletePost`.
- Covered by [User](../design/compositions/User.md), line 18.
- Covered by [User](../design/compositions/User.md), line 24.

```reaction
when RequestBoundary.request (path: "/posts/delete", post, requestId, session)
then
  Sessioning.current (session)
```

### User.DeletePost#2

Authored path: `User.DeletePost`.
- Covered by [User](../design/compositions/User.md), line 18.
- Covered by [User](../design/compositions/User.md), line 24.

```reaction
when Sessioning.current (session, subject: user), asked by User.DeletePost
where
  earlier, RequestBoundary.request (path: "/posts/delete", post, requestId, session)
then
  Posting.delete (post, user)
```

### User.DeletePost#3

Authored path: `User.DeletePost`.
- Covered by [User](../design/compositions/User.md), line 18.
- Covered by [User](../design/compositions/User.md), line 24.

```reaction
when Posting.delete (post, user), asked by User.DeletePost#2
where
  earlier, RequestBoundary.request (path: "/posts/delete", post, requestId, session)
then
  RequestBoundary.respond (post, requestId)
```

### User.DeletedPostLeavesGroups

Authored path: `User.DeletedPostLeavesGroups`.
- Covered by [User](../design/compositions/User.md), line 20.

```reaction
when Posting.delete (post)
where
  Grouping._groupsOf (item: post) has (group)
then
  Grouping.removeItem (group, item: post)
```

### User.DeletedPostLosesVotes

Authored path: `User.DeletedPostLosesVotes`.
- Covered by [User](../design/compositions/User.md), line 21.

```reaction
when Posting.delete (post)
then
  Upvoting.clear (target: post)
```

### User.ListMyVotes

Authored path: `User.ListMyVotes`.
- Covered by [User](../design/compositions/User.md), line 40.
- Covered by [User](../design/compositions/User.md), line 45.

```reaction
when RequestBoundary.request (group, path: "/posts/my-votes", requestId, session)
then
  Sessioning.current (session)
```

### User.ListMyVotes#2

Authored path: `User.ListMyVotes`.
- Covered by [User](../design/compositions/User.md), line 40.
- Covered by [User](../design/compositions/User.md), line 45.

```reaction
when Sessioning.current (session, subject: user), asked by User.ListMyVotes
where
  earlier, RequestBoundary.request (group, path: "/posts/my-votes", requestId, session)
then
  RequestBoundary.respond (requestId, votes: former "the posts in (group) upvoted by (user)" with (group, user))
```

### User.Unvote

Authored path: `User.Unvote`.
- Covered by [User](../design/compositions/User.md), line 31.
- Covered by [User](../design/compositions/User.md), line 37.

```reaction
when RequestBoundary.request (path: "/posts/unvote", post, requestId, session)
then
  Sessioning.current (session)
```

### User.Unvote:allowed#2

Authored path: `User.Unvote`.
- Covered by [User](../design/compositions/User.md), line 31.
- Covered by [User](../design/compositions/User.md), line 37.

```reaction
when Sessioning.current (session, subject: user), asked by User.Unvote
where
  instant is the current flow's instant
  earlier, RequestBoundary.request (path: "/posts/unvote", post, requestId, session)
  Posting._get (post) and not (owner: user)
  view "(post) is in season at (now)" with (now: instant, post)
then
  Upvoting.unvote (target: post, voter: user)
```

### User.Unvote:allowed#3

Authored path: `User.Unvote`.
- Covered by [User](../design/compositions/User.md), line 31.
- Covered by [User](../design/compositions/User.md), line 37.

```reaction
when Upvoting.unvote (target: post, voter: user), asked by User.Unvote:allowed#2
where
  earlier, RequestBoundary.request (path: "/posts/unvote", post, requestId, session)
then
  RequestBoundary.respond (post, requestId)
```

### User.Unvote:missing#2

Authored path: `User.Unvote`.
- Covered by [User](../design/compositions/User.md), line 31.
- Covered by [User](../design/compositions/User.md), line 37.

```reaction
when Sessioning.current (session, subject: user), asked by User.Unvote
where
  earlier, RequestBoundary.request (path: "/posts/unvote", post, requestId, session)
  no Posting._get (post)
then
  RequestBoundary.respond (error: "NO_SUCH_POST", requestId)
```

### User.Unvote:out-of-season#2

Authored path: `User.Unvote`.
- Covered by [User](../design/compositions/User.md), line 31.
- Covered by [User](../design/compositions/User.md), line 37.

```reaction
when Sessioning.current (session, subject: user), asked by User.Unvote
where
  instant is the current flow's instant
  earlier, RequestBoundary.request (path: "/posts/unvote", post, requestId, session)
  Posting._get (post) and not (owner: user)
  no view "(post) is in season at (now)" with (now: instant, post)
then
  RequestBoundary.respond (error: "NOT_IN_SEASON", requestId)
```

### User.Unvote:own-post#2

Authored path: `User.Unvote`.
- Covered by [User](../design/compositions/User.md), line 31.
- Covered by [User](../design/compositions/User.md), line 37.

```reaction
when Sessioning.current (session, subject: user), asked by User.Unvote
where
  earlier, RequestBoundary.request (path: "/posts/unvote", post, requestId, session)
  Posting._get (post) has (owner: user)
then
  RequestBoundary.respond (error: "OWN_POST", requestId)
```

### User.Vote

Authored path: `User.Vote`.
- Covered by [User](../design/compositions/User.md), line 31.
- Covered by [User](../design/compositions/User.md), line 36.

```reaction
when RequestBoundary.request (path: "/posts/vote", post, requestId, session)
then
  Sessioning.current (session)
```

### User.Vote:allowed#2

Authored path: `User.Vote`.
- Covered by [User](../design/compositions/User.md), line 31.
- Covered by [User](../design/compositions/User.md), line 36.

```reaction
when Sessioning.current (session, subject: user), asked by User.Vote
where
  instant is the current flow's instant
  earlier, RequestBoundary.request (path: "/posts/vote", post, requestId, session)
  Posting._get (post) and not (owner: user)
  view "(post) is in season at (now)" with (now: instant, post)
then
  Upvoting.upvote (target: post, voter: user)
```

### User.Vote:allowed#3

Authored path: `User.Vote`.
- Covered by [User](../design/compositions/User.md), line 31.
- Covered by [User](../design/compositions/User.md), line 36.

```reaction
when Upvoting.upvote (target: post, voter: user), asked by User.Vote:allowed#2
where
  earlier, RequestBoundary.request (path: "/posts/vote", post, requestId, session)
then
  RequestBoundary.respond (post, requestId)
```

### User.Vote:missing#2

Authored path: `User.Vote`.
- Covered by [User](../design/compositions/User.md), line 31.
- Covered by [User](../design/compositions/User.md), line 36.

```reaction
when Sessioning.current (session, subject: user), asked by User.Vote
where
  earlier, RequestBoundary.request (path: "/posts/vote", post, requestId, session)
  no Posting._get (post)
then
  RequestBoundary.respond (error: "NO_SUCH_POST", requestId)
```

### User.Vote:out-of-season#2

Authored path: `User.Vote`.
- Covered by [User](../design/compositions/User.md), line 31.
- Covered by [User](../design/compositions/User.md), line 36.

```reaction
when Sessioning.current (session, subject: user), asked by User.Vote
where
  instant is the current flow's instant
  earlier, RequestBoundary.request (path: "/posts/vote", post, requestId, session)
  Posting._get (post) and not (owner: user)
  no view "(post) is in season at (now)" with (now: instant, post)
then
  RequestBoundary.respond (error: "NOT_IN_SEASON", requestId)
```

### User.Vote:own-post#2

Authored path: `User.Vote`.
- Covered by [User](../design/compositions/User.md), line 31.
- Covered by [User](../design/compositions/User.md), line 36.

```reaction
when Sessioning.current (session, subject: user), asked by User.Vote
where
  earlier, RequestBoundary.request (path: "/posts/vote", post, requestId, session)
  Posting._get (post) has (owner: user)
then
  RequestBoundary.respond (error: "OWN_POST", requestId)
```

## Endpoint input contracts

Before recording an action ask, the boundary rejects a body that is not an
object or lacks a required key. The response uses `INVALID_INPUT` and names
the path or missing key. A declared default fills an absent key. Endpoints
not listed here have no explicit input contract.

- `/admin/cycles/add-group` — requires `cycle`, `group`, `session`
- `/admin/cycles/create` — requires `period`, `runs`, `session`
- `/admin/cycles/delete` — requires `cycle`, `session`
- `/admin/cycles/list` — requires `session`
- `/admin/cycles/remove-group` — requires `cycle`, `group`, `session`
- `/admin/cycles/set-runs` — requires `cycle`, `runs`, `session`
- `/admin/groups/add-post` — requires `group`, `post`, `session`
- `/admin/groups/create` — requires `name`, `session`
- `/admin/groups/delete` — requires `group`, `session`
- `/admin/groups/remove-post` — requires `group`, `post`, `session`
- `/auth/current` — requires `session`
- `/auth/register` — requires `username`, `password`
- `/auth/sign-in` — requires `username`, `password`
- `/auth/sign-out` — requires `session`
- `/groups/feed` — requires `group`
- `/posts/create` — requires `content`, `group`, `session`
- `/posts/delete` — requires `post`, `session`
- `/posts/get` — requires `post`
- `/posts/my-votes` — requires `group`, `session`
- `/posts/unvote` — requires `post`, `session`
- `/posts/vote` — requires `post`, `session`

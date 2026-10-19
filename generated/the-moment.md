<!-- Generated from the The Moment assembly. Do not edit. -->
<!-- Manifest producer: @mit-sdg/sync-engine@1.1.0; concept specification: sync-engine.concept-specification@1; renderer: @mit-sdg/sync-engine@1.1.0. -->

# The Moment — assembled read-back

_Assembled by sync-engine from registered concepts and composition. Edit the concept_
_specifications and composition source, then regenerate this file._

## Concepts

### Administrating

Defined in [Administrating](../design/concepts/Administrating.md), line 1.

#### Actions

- `setOwner(user: User) : returns ()`
  - Refuses `OWNER_EXISTS`: The application already has an owner.
- `addAdmin(user: User) : returns ()`
  - Refuses `ALREADY_ADMIN`: This user is already an admin.
- `removeAdmin(user: User) : returns ()`
  - Refuses `NOT_ADMIN`: This user is not an admin.
  - Refuses `OWNER_PROTECTED`: The owner cannot be removed.

#### Queries

- `_isOwner(user: User) : one (owner: Flag)`
- `_isAdmin(user: User) : one (admin: Flag)`
- `_admins() : many (user: User, owner: Flag)`

#### Instances

- `Administrating` — instance of `Administrating` — [Application types](../design/types.md), line 22.
  - `User` is `Authenticating.Account` — [Application types](../design/types.md), line 23.

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

- `Authenticating` — instance of `Authenticating` — [Application types](../design/types.md), line 17.

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
- `_previousRun(item: Item, now: DateTime) : optional (run: Number, start: DateTime, end: DateTime)`
- `_all() : many (cycle: Cycle, start: DateTime, period: Number, runs: Number)`
- `_items(cycle: Cycle) : many (item: Item)`

#### Instances

- `Cycling` — instance of `Cycling` — [Application types](../design/types.md), line 36.
  - `Item` is `CycledItem` — [Application types](../design/types.md), line 37.

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
- `_get(group: Group) : optional (name: String)`
- `_items(group: Group) : many (item: Item)`
- `_groupsOf(item: Item) : many (group: Group)`
- `_byName(name: String) : optional (group: Group)`

#### Instances

- `Grouping` — instance of `Grouping` — [Application types](../design/types.md), line 33.
  - `Item` is `Posting.Post` — [Application types](../design/types.md), line 34.

### Nominating

Defined in [Nominating](../design/concepts/Nominating.md), line 1.

#### Actions

- `createCategory(name: String) : returns (category: Category)`
  - Refuses `NAME_TAKEN`: A category with this name already exists.
- `nominate(nominator: User, category: Category, name: String, createdAt: DateTime) : returns (nomination: Nomination)`
  - Refuses `NO_SUCH_CATEGORY`: There is no such category.
  - Refuses `INVALID_NAME`: A nomination needs a name.
  - Refuses `TOO_SOON`: You can nominate once a day.
- `withdraw(nominator: User, nomination: Nomination) : returns ()`
  - Refuses `NO_SUCH_NOMINATION`: There is no such nomination.
  - Refuses `NOT_NOMINATOR`: Only the nominator can withdraw a nomination.

#### Queries

- `_categories() : many (category: Category, name: String)`
- `_category(category: Category) : optional (name: String)`
- `_nominations(category: Category) : many (nomination: Nomination, nominator: User, name: String, createdAt: DateTime)`
- `_equivalent(category: Category, name: String) : many (nomination: Nomination, createdAt: DateTime)`
- `_get(nomination: Nomination) : optional (nominator: User, category: Category, name: String, createdAt: DateTime)`

#### Instances

- `Nominating` — instance of `Nominating` — [Application types](../design/types.md), line 39.
  - `User` is `Authenticating.Account` — [Application types](../design/types.md), line 40.

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

- `Posting` — instance of `Posting` — [Application types](../design/types.md), line 25.
  - `Content` is `ArtworkSource` — [Application types](../design/types.md), line 27.
  - `User` is `Authenticating.Account` — [Application types](../design/types.md), line 26.

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

- `Sessioning` — instance of `Sessioning` — [Application types](../design/types.md), line 19.
  - `Subject` is `Authenticating.Account` — [Application types](../design/types.md), line 20.

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

- `NominationVotes` — instance of `Upvoting` — [Application types](../design/types.md), line 42.
  - `Item` is `Nominating.Nomination` — [Application types](../design/types.md), line 44.
  - `User` is `Authenticating.Account` — [Application types](../design/types.md), line 43.
- `Upvoting` — instance of `Upvoting` — [Application types](../design/types.md), line 29.
  - `Item` is `Posting.Post` — [Application types](../design/types.md), line 31.
  - `User` is `Authenticating.Account` — [Application types](../design/types.md), line 30.

## Application types

Concrete types:

- `ArtworkSource` — [Application types](../design/types.md), line 9.
- `CycledItem` — [Application types](../design/types.md), line 12.

## Views

_Views name reusable conditions. Multiple `where` blocks are alternatives._

### (nomination) is active at (now)

Authored path: `User.NominationActive`.
- Covered by [User](../design/compositions/User.md), line 79.

```view
(nomination) is active at (now) — inputs (nomination, now); outputs (); bindings (category, createdAt, start, end)
  where
    Nominating._get (nomination) has (category, createdAt)
    Cycling._currentRun (item: category, now) has (end, start)
    createdAt is at least start
    createdAt is less than end
```

### (post) is in season at (now)

Authored path: `User.PostInSeason`.
- Covered by [User](../design/compositions/User.md), line 57.

```view
(post) is in season at (now) — inputs (post, now); outputs (); bindings (createdAt, group, start, end)
  where
    Posting._get (post) has (createdAt)
    Grouping._groupsOf (item: post) has (group)
    Cycling._currentRun (item: group, now) has (end, start)
    createdAt is at least start
    createdAt is less than end
```

### (session) belongs to an admin

Authored path: `Admin.IsAdmin`.
- Covered by [Admin](../design/compositions/Admin.md), line 6.

```view
(session) belongs to an admin — inputs (session); outputs (); bindings (user)
  where
    Sessioning._active (session) has (subject: user)
    Administrating._isAdmin (user) has (admin: true)
```

### (session) belongs to the owner

Authored path: `Admin.IsOwner`.
- Covered by [Admin](../design/compositions/Admin.md), line 9.

```view
(session) belongs to the owner — inputs (session); outputs (); bindings (user)
  where
    Sessioning._active (session) has (subject: user)
    Administrating._isOwner (user) has (owner: true)
```

### (session) does not belong to an admin

Authored path: `Admin.IsNotAdmin`.
- Covered by [Admin](../design/compositions/Admin.md), line 8.

```view
(session) does not belong to an admin — inputs (session); outputs (); bindings (user)
  where
    Sessioning._active (session) has (subject: user)
    Administrating._isAdmin (user) has (admin: false)
```

### (session) does not belong to the owner

Authored path: `Admin.IsNotOwner`.
- Covered by [Admin](../design/compositions/Admin.md), line 10.

```view
(session) does not belong to the owner — inputs (session); outputs (); bindings (user)
  where
    Sessioning._active (session) has (subject: user)
    Administrating._isOwner (user) has (owner: false)
```

### an idea equivalent to (name) is active in (category) at (now)

Authored path: `User.EquivalentActive`.
- Covered by [User](../design/compositions/User.md), line 87.

```view
an idea equivalent to (name) is active in (category) at (now) — inputs (category, name, now); outputs (); bindings (createdAt, start, end)
  where
    Cycling._currentRun (item: category, now) has (end, start)
    Nominating._equivalent (category, name) has (createdAt)
    createdAt is at least start
    createdAt is less than end
```

## Formers

_Formers name result shapes evaluated when asked. The source former owns_
_the authored explanation; this section records the generated shape._

### every admin

Authored path: `Admin.AdminList`.
- Covered by [Admin](../design/compositions/Admin.md), line 17.

```former
Former "every admin" — inputs (); bindings (user, owner); promises exactly one record — forms:
  a record of
    admins: each Administrating._admins () has (owner, user)
      form a record of
        owner
        user
```

### every cycle

Authored path: `Admin.CycleList`.
- Covered by [Admin](../design/compositions/Admin.md), line 75.

```former
Former "every cycle" — inputs (); bindings (cycle, start, period, runs, item); promises exactly one record — forms:
  a record of
    cycles: each Cycling._all () has (cycle, period, runs, start)
      form a record of
        cycle
        items: each Cycling._items (cycle) has (item)
          form a record of
            item
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

### every nomination category at (now)

Authored path: `Public.CategoryList`.
- Covered by [Public](../design/compositions/Public.md), line 43.

```former
Former "every nomination category at (now)" — inputs (now); bindings (category, name); promises exactly one record — forms:
  a record of
    categories: each Nominating._categories () has (category, name)
      form a record of
        category
        name
        … former "the run of (group) at (now)" with (group: category, now), with blank leaves if absent
```

### the active nominations in (category) upvoted by (user) at (now)

Authored path: `User.MyNominationVotes`.
- Covered by [User](../design/compositions/User.md), line 111.

```former
Former "the active nominations in (category) upvoted by (user) at (now)" — inputs (category, user, now); bindings (nomination, createdAt, start, end); promises exactly one record — forms:
  a record of
    nominations: each Nominating._nominations (category) has (createdAt, nomination)
      where Cycling._currentRun (item: category, now) has (end, start)
      where createdAt is at least start
      where createdAt is less than end
      where NominationVotes._voted (target: nomination, voter: user) has (voted: true)
      form a record of
        nomination
```

### the details of (post)

Authored path: `Public.PostDetails`.
- Covered by [Public](../design/compositions/Public.md), line 32.

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
- Covered by [Public](../design/compositions/Public.md), line 21.

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
- Covered by [User](../design/compositions/User.md), line 69.

```former
Former "the posts in (group) upvoted by (user)" — inputs (group, user); bindings (post); promises exactly one record — forms:
  a record of
    posts: each Grouping._items (group) has (item: post)
      where Upvoting._voted (target: post, voter: user) has (voted: true)
      form a record of
        post
```

### the ranking of (category) from (start) to (end)

Authored path: `Public.RoundRanking`.
- Covered by [Admin](../design/compositions/Admin.md), line 62.
- Covered by [Public](../design/compositions/Public.md), line 51.

```former
Former "the ranking of (category) from (start) to (end)" — inputs (category, start, end); bindings (nomination, nominator, name, createdAt, votes); promises exactly one record — forms:
  a record of
    nominations: each Nominating._nominations (category) has (createdAt, name, nomination, nominator)
      where createdAt is at least start
      where createdAt is less than end
      where NominationVotes._count (target: nomination) has (votes)
      arranged by votes, descending
      form a record of
        createdAt
        name
        nomination
        nominator
        votes
```

## Reactions

### Admin.AddAdmin

Authored path: `Admin.AddAdmin`.
- Covered by [Admin](../design/compositions/Admin.md), line 14.
- Covered by [Admin](../design/compositions/Admin.md), line 24.

```reaction
when RequestBoundary.request (path: "/admin/admins/add", requestId, session, user)
then
  Sessioning.current (session)
```

### Admin.AddAdmin:not-owner#2

Authored path: `Admin.AddAdmin`.
- Covered by [Admin](../design/compositions/Admin.md), line 14.
- Covered by [Admin](../design/compositions/Admin.md), line 24.

```reaction
when Sessioning.current (session), asked by Admin.AddAdmin
where
  view "(session) does not belong to the owner" with (session)
  earlier, RequestBoundary.request (path: "/admin/admins/add", requestId, session, user)
then
  RequestBoundary.respond (error: "OWNER_ONLY", requestId)
```

### Admin.AddAdmin:owner#2

Authored path: `Admin.AddAdmin`.
- Covered by [Admin](../design/compositions/Admin.md), line 14.
- Covered by [Admin](../design/compositions/Admin.md), line 24.

```reaction
when Sessioning.current (session), asked by Admin.AddAdmin
where
  view "(session) belongs to the owner" with (session)
  earlier, RequestBoundary.request (path: "/admin/admins/add", requestId, session, user)
then
  Administrating.addAdmin (user)
```

### Admin.AddAdmin:owner#3

Authored path: `Admin.AddAdmin`.
- Covered by [Admin](../design/compositions/Admin.md), line 14.
- Covered by [Admin](../design/compositions/Admin.md), line 24.

```reaction
when Administrating.addAdmin (user), asked by Admin.AddAdmin:owner#2
where
  earlier, RequestBoundary.request (path: "/admin/admins/add", requestId, session, user)
then
  RequestBoundary.respond (requestId, user)
```

### Admin.AddItemToCycle

Authored path: `Admin.AddItemToCycle`.
- Covered by [Admin](../design/compositions/Admin.md), line 87.
- Covered by [Admin](../design/compositions/Admin.md), line 95.

```reaction
when RequestBoundary.request (cycle, item, path: "/admin/cycles/add-item", requestId, session)
then
  Sessioning.current (session)
```

### Admin.AddItemToCycle:category#2

Authored path: `Admin.AddItemToCycle`.
- Covered by [Admin](../design/compositions/Admin.md), line 87.
- Covered by [Admin](../design/compositions/Admin.md), line 95.

```reaction
when Sessioning.current (session), asked by Admin.AddItemToCycle
where
  view "(session) belongs to an admin" with (session)
  earlier, RequestBoundary.request (cycle, item, path: "/admin/cycles/add-item", requestId, session)
  Nominating._category (category: item)
then
  Cycling.addItem (cycle, item)
```

### Admin.AddItemToCycle:category#3

Authored path: `Admin.AddItemToCycle`.
- Covered by [Admin](../design/compositions/Admin.md), line 87.
- Covered by [Admin](../design/compositions/Admin.md), line 95.

```reaction
when Cycling.addItem (cycle, item), asked by Admin.AddItemToCycle:category#2
where
  earlier, RequestBoundary.request (cycle, item, path: "/admin/cycles/add-item", requestId, session)
then
  RequestBoundary.respond (cycle, item, requestId)
```

### Admin.AddItemToCycle:group#2

Authored path: `Admin.AddItemToCycle`.
- Covered by [Admin](../design/compositions/Admin.md), line 87.
- Covered by [Admin](../design/compositions/Admin.md), line 95.

```reaction
when Sessioning.current (session), asked by Admin.AddItemToCycle
where
  view "(session) belongs to an admin" with (session)
  earlier, RequestBoundary.request (cycle, item, path: "/admin/cycles/add-item", requestId, session)
  Grouping._get (group: item)
then
  Cycling.addItem (cycle, item)
```

### Admin.AddItemToCycle:group#3

Authored path: `Admin.AddItemToCycle`.
- Covered by [Admin](../design/compositions/Admin.md), line 87.
- Covered by [Admin](../design/compositions/Admin.md), line 95.

```reaction
when Cycling.addItem (cycle, item), asked by Admin.AddItemToCycle:group#2
where
  earlier, RequestBoundary.request (cycle, item, path: "/admin/cycles/add-item", requestId, session)
then
  RequestBoundary.respond (cycle, item, requestId)
```

### Admin.AddItemToCycle:neither#2

Authored path: `Admin.AddItemToCycle`.
- Covered by [Admin](../design/compositions/Admin.md), line 87.
- Covered by [Admin](../design/compositions/Admin.md), line 95.

```reaction
when Sessioning.current (session), asked by Admin.AddItemToCycle
where
  view "(session) belongs to an admin" with (session)
  earlier, RequestBoundary.request (cycle, item, path: "/admin/cycles/add-item", requestId, session)
  no Grouping._get (group: item)
  no Nominating._category (category: item)
then
  RequestBoundary.respond (error: "NO_SUCH_ITEM", requestId)
```

### Admin.AddItemToCycle:not-admin#2

Authored path: `Admin.AddItemToCycle`.
- Covered by [Admin](../design/compositions/Admin.md), line 87.
- Covered by [Admin](../design/compositions/Admin.md), line 95.

```reaction
when Sessioning.current (session), asked by Admin.AddItemToCycle
where
  view "(session) does not belong to an admin" with (session)
  earlier, RequestBoundary.request (cycle, item, path: "/admin/cycles/add-item", requestId, session)
then
  RequestBoundary.respond (error: "ADMIN_ONLY", requestId)
```

### Admin.AddPostToGroup

Authored path: `Admin.AddPostToGroup`.
- Covered by [Admin](../design/compositions/Admin.md), line 42.
- Covered by [Admin](../design/compositions/Admin.md), line 46.

```reaction
when RequestBoundary.request (group, path: "/admin/groups/add-post", post, requestId, session)
then
  Sessioning.current (session)
```

### Admin.AddPostToGroup:admin#2

Authored path: `Admin.AddPostToGroup`.
- Covered by [Admin](../design/compositions/Admin.md), line 42.
- Covered by [Admin](../design/compositions/Admin.md), line 46.

```reaction
when Sessioning.current (session), asked by Admin.AddPostToGroup
where
  view "(session) belongs to an admin" with (session)
  earlier, RequestBoundary.request (group, path: "/admin/groups/add-post", post, requestId, session)
then
  Grouping.addItem (group, item: post)
```

### Admin.AddPostToGroup:admin#3

Authored path: `Admin.AddPostToGroup`.
- Covered by [Admin](../design/compositions/Admin.md), line 42.
- Covered by [Admin](../design/compositions/Admin.md), line 46.

```reaction
when Grouping.addItem (group, item: post), asked by Admin.AddPostToGroup:admin#2
where
  earlier, RequestBoundary.request (group, path: "/admin/groups/add-post", post, requestId, session)
then
  RequestBoundary.respond (group, post, requestId)
```

### Admin.AddPostToGroup:not-admin#2

Authored path: `Admin.AddPostToGroup`.
- Covered by [Admin](../design/compositions/Admin.md), line 42.
- Covered by [Admin](../design/compositions/Admin.md), line 46.

```reaction
when Sessioning.current (session), asked by Admin.AddPostToGroup
where
  view "(session) does not belong to an admin" with (session)
  earlier, RequestBoundary.request (group, path: "/admin/groups/add-post", post, requestId, session)
then
  RequestBoundary.respond (error: "ADMIN_ONLY", requestId)
```

### Admin.CreateCategory

Authored path: `Admin.CreateCategory`.
- Covered by [Admin](../design/compositions/Admin.md), line 52.
- Covered by [Admin](../design/compositions/Admin.md), line 57.

```reaction
when RequestBoundary.request (name, path: "/admin/categories/create", requestId, session)
then
  Sessioning.current (session)
```

### Admin.CreateCategory:admin#2

Authored path: `Admin.CreateCategory`.
- Covered by [Admin](../design/compositions/Admin.md), line 52.
- Covered by [Admin](../design/compositions/Admin.md), line 57.

```reaction
when Sessioning.current (session), asked by Admin.CreateCategory
where
  view "(session) belongs to an admin" with (session)
  earlier, RequestBoundary.request (name, path: "/admin/categories/create", requestId, session)
then
  Nominating.createCategory (name)
```

### Admin.CreateCategory:admin#3

Authored path: `Admin.CreateCategory`.
- Covered by [Admin](../design/compositions/Admin.md), line 52.
- Covered by [Admin](../design/compositions/Admin.md), line 57.

```reaction
when Nominating.createCategory (name, category), asked by Admin.CreateCategory:admin#2
where
  earlier, RequestBoundary.request (name, path: "/admin/categories/create", requestId, session)
then
  RequestBoundary.respond (category, requestId)
```

### Admin.CreateCategory:not-admin#2

Authored path: `Admin.CreateCategory`.
- Covered by [Admin](../design/compositions/Admin.md), line 52.
- Covered by [Admin](../design/compositions/Admin.md), line 57.

```reaction
when Sessioning.current (session), asked by Admin.CreateCategory
where
  view "(session) does not belong to an admin" with (session)
  earlier, RequestBoundary.request (name, path: "/admin/categories/create", requestId, session)
then
  RequestBoundary.respond (error: "ADMIN_ONLY", requestId)
```

### Admin.CreateCycle

Authored path: `Admin.CreateCycle`.
- Covered by [Admin](../design/compositions/Admin.md), line 76.
- Covered by [Admin](../design/compositions/Admin.md), line 82.

```reaction
when RequestBoundary.request (path: "/admin/cycles/create", period, requestId, runs, session)
then
  Sessioning.current (session)
```

### Admin.CreateCycle:admin#2

Authored path: `Admin.CreateCycle`.
- Covered by [Admin](../design/compositions/Admin.md), line 76.
- Covered by [Admin](../design/compositions/Admin.md), line 82.

```reaction
when Sessioning.current (session), asked by Admin.CreateCycle
where
  start is the current flow's instant
  view "(session) belongs to an admin" with (session)
  earlier, RequestBoundary.request (path: "/admin/cycles/create", period, requestId, runs, session)
then
  Cycling.create (period, runs, start)
```

### Admin.CreateCycle:admin#3

Authored path: `Admin.CreateCycle`.
- Covered by [Admin](../design/compositions/Admin.md), line 76.
- Covered by [Admin](../design/compositions/Admin.md), line 82.

```reaction
when Cycling.create (period, runs, start, cycle), asked by Admin.CreateCycle:admin#2
where
  earlier, RequestBoundary.request (path: "/admin/cycles/create", period, requestId, runs, session)
then
  RequestBoundary.respond (cycle, requestId)
```

### Admin.CreateCycle:not-admin#2

Authored path: `Admin.CreateCycle`.
- Covered by [Admin](../design/compositions/Admin.md), line 76.
- Covered by [Admin](../design/compositions/Admin.md), line 82.

```reaction
when Sessioning.current (session), asked by Admin.CreateCycle
where
  view "(session) does not belong to an admin" with (session)
  earlier, RequestBoundary.request (path: "/admin/cycles/create", period, requestId, runs, session)
then
  RequestBoundary.respond (error: "ADMIN_ONLY", requestId)
```

### Admin.CreateGroup

Authored path: `Admin.CreateGroup`.
- Covered by [Admin](../design/compositions/Admin.md), line 31.
- Covered by [Admin](../design/compositions/Admin.md), line 38.

```reaction
when RequestBoundary.request (name, path: "/admin/groups/create", requestId, session)
then
  Sessioning.current (session)
```

### Admin.CreateGroup:admin#2

Authored path: `Admin.CreateGroup`.
- Covered by [Admin](../design/compositions/Admin.md), line 31.
- Covered by [Admin](../design/compositions/Admin.md), line 38.

```reaction
when Sessioning.current (session), asked by Admin.CreateGroup
where
  view "(session) belongs to an admin" with (session)
  earlier, RequestBoundary.request (name, path: "/admin/groups/create", requestId, session)
then
  Grouping.create (name)
```

### Admin.CreateGroup:admin#3

Authored path: `Admin.CreateGroup`.
- Covered by [Admin](../design/compositions/Admin.md), line 31.
- Covered by [Admin](../design/compositions/Admin.md), line 38.

```reaction
when Grouping.create (name, group), asked by Admin.CreateGroup:admin#2
where
  earlier, RequestBoundary.request (name, path: "/admin/groups/create", requestId, session)
then
  RequestBoundary.respond (group, requestId)
```

### Admin.CreateGroup:not-admin#2

Authored path: `Admin.CreateGroup`.
- Covered by [Admin](../design/compositions/Admin.md), line 31.
- Covered by [Admin](../design/compositions/Admin.md), line 38.

```reaction
when Sessioning.current (session), asked by Admin.CreateGroup
where
  view "(session) does not belong to an admin" with (session)
  earlier, RequestBoundary.request (name, path: "/admin/groups/create", requestId, session)
then
  RequestBoundary.respond (error: "ADMIN_ONLY", requestId)
```

### Admin.DeleteCycle

Authored path: `Admin.DeleteCycle`.
- Covered by [Admin](../design/compositions/Admin.md), line 77.
- Covered by [Admin](../design/compositions/Admin.md), line 83.

```reaction
when RequestBoundary.request (cycle, path: "/admin/cycles/delete", requestId, session)
then
  Sessioning.current (session)
```

### Admin.DeleteCycle:admin#2

Authored path: `Admin.DeleteCycle`.
- Covered by [Admin](../design/compositions/Admin.md), line 77.
- Covered by [Admin](../design/compositions/Admin.md), line 83.

```reaction
when Sessioning.current (session), asked by Admin.DeleteCycle
where
  view "(session) belongs to an admin" with (session)
  earlier, RequestBoundary.request (cycle, path: "/admin/cycles/delete", requestId, session)
then
  Cycling.delete (cycle)
```

### Admin.DeleteCycle:admin#3

Authored path: `Admin.DeleteCycle`.
- Covered by [Admin](../design/compositions/Admin.md), line 77.
- Covered by [Admin](../design/compositions/Admin.md), line 83.

```reaction
when Cycling.delete (cycle), asked by Admin.DeleteCycle:admin#2
where
  earlier, RequestBoundary.request (cycle, path: "/admin/cycles/delete", requestId, session)
then
  RequestBoundary.respond (cycle, requestId)
```

### Admin.DeleteCycle:not-admin#2

Authored path: `Admin.DeleteCycle`.
- Covered by [Admin](../design/compositions/Admin.md), line 77.
- Covered by [Admin](../design/compositions/Admin.md), line 83.

```reaction
when Sessioning.current (session), asked by Admin.DeleteCycle
where
  view "(session) does not belong to an admin" with (session)
  earlier, RequestBoundary.request (cycle, path: "/admin/cycles/delete", requestId, session)
then
  RequestBoundary.respond (error: "ADMIN_ONLY", requestId)
```

### Admin.DeleteGroup

Authored path: `Admin.DeleteGroup`.
- Covered by [Admin](../design/compositions/Admin.md), line 32.
- Covered by [Admin](../design/compositions/Admin.md), line 39.

```reaction
when RequestBoundary.request (group, path: "/admin/groups/delete", requestId, session)
then
  Sessioning.current (session)
```

### Admin.DeleteGroup:admin#2

Authored path: `Admin.DeleteGroup`.
- Covered by [Admin](../design/compositions/Admin.md), line 32.
- Covered by [Admin](../design/compositions/Admin.md), line 39.

```reaction
when Sessioning.current (session), asked by Admin.DeleteGroup
where
  view "(session) belongs to an admin" with (session)
  earlier, RequestBoundary.request (group, path: "/admin/groups/delete", requestId, session)
then
  Grouping.delete (group)
```

### Admin.DeleteGroup:admin#3

Authored path: `Admin.DeleteGroup`.
- Covered by [Admin](../design/compositions/Admin.md), line 32.
- Covered by [Admin](../design/compositions/Admin.md), line 39.

```reaction
when Grouping.delete (group), asked by Admin.DeleteGroup:admin#2
where
  earlier, RequestBoundary.request (group, path: "/admin/groups/delete", requestId, session)
then
  RequestBoundary.respond (group, requestId)
```

### Admin.DeleteGroup:not-admin#2

Authored path: `Admin.DeleteGroup`.
- Covered by [Admin](../design/compositions/Admin.md), line 32.
- Covered by [Admin](../design/compositions/Admin.md), line 39.

```reaction
when Sessioning.current (session), asked by Admin.DeleteGroup
where
  view "(session) does not belong to an admin" with (session)
  earlier, RequestBoundary.request (group, path: "/admin/groups/delete", requestId, session)
then
  RequestBoundary.respond (error: "ADMIN_ONLY", requestId)
```

### Admin.DeletedGroupLeavesCycle

Authored path: `Admin.DeletedGroupLeavesCycle`.
- Covered by [Admin](../design/compositions/Admin.md), line 35.

```reaction
when Grouping.delete (group)
where
  Cycling._cycle (item: group) has (cycle)
then
  Cycling.removeItem (cycle, item: group)
```

### Admin.ListAdmins

Authored path: `Admin.ListAdmins`.
- Covered by [Admin](../design/compositions/Admin.md), line 16.
- Covered by [Admin](../design/compositions/Admin.md), line 26.

```reaction
when RequestBoundary.request (path: "/admin/admins/list", requestId, session)
then
  Sessioning.current (session)
```

### Admin.ListAdmins:admin#2

Authored path: `Admin.ListAdmins`.
- Covered by [Admin](../design/compositions/Admin.md), line 16.
- Covered by [Admin](../design/compositions/Admin.md), line 26.

```reaction
when Sessioning.current (session), asked by Admin.ListAdmins
where
  view "(session) belongs to an admin" with (session)
  earlier, RequestBoundary.request (path: "/admin/admins/list", requestId, session)
then
  RequestBoundary.respond (list: former "every admin", requestId)
```

### Admin.ListAdmins:not-admin#2

Authored path: `Admin.ListAdmins`.
- Covered by [Admin](../design/compositions/Admin.md), line 16.
- Covered by [Admin](../design/compositions/Admin.md), line 26.

```reaction
when Sessioning.current (session), asked by Admin.ListAdmins
where
  view "(session) does not belong to an admin" with (session)
  earlier, RequestBoundary.request (path: "/admin/admins/list", requestId, session)
then
  RequestBoundary.respond (error: "ADMIN_ONLY", requestId)
```

### Admin.ListCycles

Authored path: `Admin.ListCycles`.
- Covered by [Admin](../design/compositions/Admin.md), line 74.
- Covered by [Admin](../design/compositions/Admin.md), line 81.

```reaction
when RequestBoundary.request (path: "/admin/cycles/list", requestId, session)
then
  Sessioning.current (session)
```

### Admin.ListCycles:admin#2

Authored path: `Admin.ListCycles`.
- Covered by [Admin](../design/compositions/Admin.md), line 74.
- Covered by [Admin](../design/compositions/Admin.md), line 81.

```reaction
when Sessioning.current (session), asked by Admin.ListCycles
where
  view "(session) belongs to an admin" with (session)
  earlier, RequestBoundary.request (path: "/admin/cycles/list", requestId, session)
then
  RequestBoundary.respond (list: former "every cycle", requestId)
```

### Admin.ListCycles:not-admin#2

Authored path: `Admin.ListCycles`.
- Covered by [Admin](../design/compositions/Admin.md), line 74.
- Covered by [Admin](../design/compositions/Admin.md), line 81.

```reaction
when Sessioning.current (session), asked by Admin.ListCycles
where
  view "(session) does not belong to an admin" with (session)
  earlier, RequestBoundary.request (path: "/admin/cycles/list", requestId, session)
then
  RequestBoundary.respond (error: "ADMIN_ONLY", requestId)
```

### Admin.PreviousRanking

Authored path: `Admin.PreviousRanking`.
- Covered by [Admin](../design/compositions/Admin.md), line 61.
- Covered by [Admin](../design/compositions/Admin.md), line 67.

```reaction
when RequestBoundary.request (category, path: "/admin/nominations/previous", requestId, session)
then
  Sessioning.current (session)
```

### Admin.PreviousRanking:admin#2

Authored path: `Admin.PreviousRanking`.
- Covered by [Admin](../design/compositions/Admin.md), line 61.
- Covered by [Admin](../design/compositions/Admin.md), line 67.

```reaction
when Sessioning.current (session), asked by Admin.PreviousRanking
where
  instant is the current flow's instant
  view "(session) belongs to an admin" with (session)
  earlier, RequestBoundary.request (category, path: "/admin/nominations/previous", requestId, session)
  Cycling._previousRun (item: category, now: instant) has (end, start)
then
  RequestBoundary.respond (ranking: former "the ranking of (category) from (start) to (end)" with (category, end, start), requestId)
```

### Admin.PreviousRanking:no-previous-round#2

Authored path: `Admin.PreviousRanking`.
- Covered by [Admin](../design/compositions/Admin.md), line 61.
- Covered by [Admin](../design/compositions/Admin.md), line 67.

```reaction
when Sessioning.current (session), asked by Admin.PreviousRanking
where
  instant is the current flow's instant
  view "(session) belongs to an admin" with (session)
  earlier, RequestBoundary.request (category, path: "/admin/nominations/previous", requestId, session)
  no Cycling._previousRun (item: category, now: instant)
then
  RequestBoundary.respond (ranking: (nominations: []), requestId)
```

### Admin.PreviousRanking:not-admin#2

Authored path: `Admin.PreviousRanking`.
- Covered by [Admin](../design/compositions/Admin.md), line 61.
- Covered by [Admin](../design/compositions/Admin.md), line 67.

```reaction
when Sessioning.current (session), asked by Admin.PreviousRanking
where
  view "(session) does not belong to an admin" with (session)
  earlier, RequestBoundary.request (category, path: "/admin/nominations/previous", requestId, session)
then
  RequestBoundary.respond (error: "ADMIN_ONLY", requestId)
```

### Admin.RemoveAdmin

Authored path: `Admin.RemoveAdmin`.
- Covered by [Admin](../design/compositions/Admin.md), line 15.
- Covered by [Admin](../design/compositions/Admin.md), line 25.

```reaction
when RequestBoundary.request (path: "/admin/admins/remove", requestId, session, user)
then
  Sessioning.current (session)
```

### Admin.RemoveAdmin:not-owner#2

Authored path: `Admin.RemoveAdmin`.
- Covered by [Admin](../design/compositions/Admin.md), line 15.
- Covered by [Admin](../design/compositions/Admin.md), line 25.

```reaction
when Sessioning.current (session), asked by Admin.RemoveAdmin
where
  view "(session) does not belong to the owner" with (session)
  earlier, RequestBoundary.request (path: "/admin/admins/remove", requestId, session, user)
then
  RequestBoundary.respond (error: "OWNER_ONLY", requestId)
```

### Admin.RemoveAdmin:owner#2

Authored path: `Admin.RemoveAdmin`.
- Covered by [Admin](../design/compositions/Admin.md), line 15.
- Covered by [Admin](../design/compositions/Admin.md), line 25.

```reaction
when Sessioning.current (session), asked by Admin.RemoveAdmin
where
  view "(session) belongs to the owner" with (session)
  earlier, RequestBoundary.request (path: "/admin/admins/remove", requestId, session, user)
then
  Administrating.removeAdmin (user)
```

### Admin.RemoveAdmin:owner#3

Authored path: `Admin.RemoveAdmin`.
- Covered by [Admin](../design/compositions/Admin.md), line 15.
- Covered by [Admin](../design/compositions/Admin.md), line 25.

```reaction
when Administrating.removeAdmin (user), asked by Admin.RemoveAdmin:owner#2
where
  earlier, RequestBoundary.request (path: "/admin/admins/remove", requestId, session, user)
then
  RequestBoundary.respond (requestId, user)
```

### Admin.RemoveItemFromCycle

Authored path: `Admin.RemoveItemFromCycle`.
- Covered by [Admin](../design/compositions/Admin.md), line 88.
- Covered by [Admin](../design/compositions/Admin.md), line 96.

```reaction
when RequestBoundary.request (cycle, item, path: "/admin/cycles/remove-item", requestId, session)
then
  Sessioning.current (session)
```

### Admin.RemoveItemFromCycle:admin#2

Authored path: `Admin.RemoveItemFromCycle`.
- Covered by [Admin](../design/compositions/Admin.md), line 88.
- Covered by [Admin](../design/compositions/Admin.md), line 96.

```reaction
when Sessioning.current (session), asked by Admin.RemoveItemFromCycle
where
  view "(session) belongs to an admin" with (session)
  earlier, RequestBoundary.request (cycle, item, path: "/admin/cycles/remove-item", requestId, session)
then
  Cycling.removeItem (cycle, item)
```

### Admin.RemoveItemFromCycle:admin#3

Authored path: `Admin.RemoveItemFromCycle`.
- Covered by [Admin](../design/compositions/Admin.md), line 88.
- Covered by [Admin](../design/compositions/Admin.md), line 96.

```reaction
when Cycling.removeItem (cycle, item), asked by Admin.RemoveItemFromCycle:admin#2
where
  earlier, RequestBoundary.request (cycle, item, path: "/admin/cycles/remove-item", requestId, session)
then
  RequestBoundary.respond (cycle, item, requestId)
```

### Admin.RemoveItemFromCycle:not-admin#2

Authored path: `Admin.RemoveItemFromCycle`.
- Covered by [Admin](../design/compositions/Admin.md), line 88.
- Covered by [Admin](../design/compositions/Admin.md), line 96.

```reaction
when Sessioning.current (session), asked by Admin.RemoveItemFromCycle
where
  view "(session) does not belong to an admin" with (session)
  earlier, RequestBoundary.request (cycle, item, path: "/admin/cycles/remove-item", requestId, session)
then
  RequestBoundary.respond (error: "ADMIN_ONLY", requestId)
```

### Admin.RemovePostFromGroup

Authored path: `Admin.RemovePostFromGroup`.
- Covered by [Admin](../design/compositions/Admin.md), line 43.
- Covered by [Admin](../design/compositions/Admin.md), line 47.

```reaction
when RequestBoundary.request (group, path: "/admin/groups/remove-post", post, requestId, session)
then
  Sessioning.current (session)
```

### Admin.RemovePostFromGroup:admin#2

Authored path: `Admin.RemovePostFromGroup`.
- Covered by [Admin](../design/compositions/Admin.md), line 43.
- Covered by [Admin](../design/compositions/Admin.md), line 47.

```reaction
when Sessioning.current (session), asked by Admin.RemovePostFromGroup
where
  view "(session) belongs to an admin" with (session)
  earlier, RequestBoundary.request (group, path: "/admin/groups/remove-post", post, requestId, session)
then
  Grouping.removeItem (group, item: post)
```

### Admin.RemovePostFromGroup:admin#3

Authored path: `Admin.RemovePostFromGroup`.
- Covered by [Admin](../design/compositions/Admin.md), line 43.
- Covered by [Admin](../design/compositions/Admin.md), line 47.

```reaction
when Grouping.removeItem (group, item: post), asked by Admin.RemovePostFromGroup:admin#2
where
  earlier, RequestBoundary.request (group, path: "/admin/groups/remove-post", post, requestId, session)
then
  RequestBoundary.respond (group, post, requestId)
```

### Admin.RemovePostFromGroup:not-admin#2

Authored path: `Admin.RemovePostFromGroup`.
- Covered by [Admin](../design/compositions/Admin.md), line 43.
- Covered by [Admin](../design/compositions/Admin.md), line 47.

```reaction
when Sessioning.current (session), asked by Admin.RemovePostFromGroup
where
  view "(session) does not belong to an admin" with (session)
  earlier, RequestBoundary.request (group, path: "/admin/groups/remove-post", post, requestId, session)
then
  RequestBoundary.respond (error: "ADMIN_ONLY", requestId)
```

### Admin.SetCycleRuns

Authored path: `Admin.SetCycleRuns`.
- Covered by [Admin](../design/compositions/Admin.md), line 91.
- Covered by [Admin](../design/compositions/Admin.md), line 97.

```reaction
when RequestBoundary.request (cycle, path: "/admin/cycles/set-runs", requestId, runs, session)
then
  Sessioning.current (session)
```

### Admin.SetCycleRuns:admin#2

Authored path: `Admin.SetCycleRuns`.
- Covered by [Admin](../design/compositions/Admin.md), line 91.
- Covered by [Admin](../design/compositions/Admin.md), line 97.

```reaction
when Sessioning.current (session), asked by Admin.SetCycleRuns
where
  view "(session) belongs to an admin" with (session)
  earlier, RequestBoundary.request (cycle, path: "/admin/cycles/set-runs", requestId, runs, session)
then
  Cycling.setRuns (cycle, runs)
```

### Admin.SetCycleRuns:admin#3

Authored path: `Admin.SetCycleRuns`.
- Covered by [Admin](../design/compositions/Admin.md), line 91.
- Covered by [Admin](../design/compositions/Admin.md), line 97.

```reaction
when Cycling.setRuns (cycle, runs), asked by Admin.SetCycleRuns:admin#2
where
  earlier, RequestBoundary.request (cycle, path: "/admin/cycles/set-runs", requestId, runs, session)
then
  RequestBoundary.respond (cycle, requestId, runs)
```

### Admin.SetCycleRuns:not-admin#2

Authored path: `Admin.SetCycleRuns`.
- Covered by [Admin](../design/compositions/Admin.md), line 91.
- Covered by [Admin](../design/compositions/Admin.md), line 97.

```reaction
when Sessioning.current (session), asked by Admin.SetCycleRuns
where
  view "(session) does not belong to an admin" with (session)
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
- Covered by [Public](../design/compositions/Public.md), line 20.
- Covered by [Public](../design/compositions/Public.md), line 27.

```reaction
when RequestBoundary.request (group, path: "/groups/feed", requestId)
where
  instant is the current flow's instant
then
  RequestBoundary.respond (feed: former "the feed of (group) at (now)" with (group, now: instant), requestId)
```

### Public.GetPost:found

Authored path: `Public.GetPost`.
- Covered by [Public](../design/compositions/Public.md), line 32.
- Covered by [Public](../design/compositions/Public.md), line 37.

```reaction
when RequestBoundary.request (path: "/posts/get", post, requestId)
where
  Posting._get (post)
then
  RequestBoundary.respond (post: former "the details of (post)" with (post), requestId)
```

### Public.GetPost:missing

Authored path: `Public.GetPost`.
- Covered by [Public](../design/compositions/Public.md), line 32.
- Covered by [Public](../design/compositions/Public.md), line 37.

```reaction
when RequestBoundary.request (path: "/posts/get", post, requestId)
where
  no Posting._get (post)
then
  RequestBoundary.respond (error: "NO_SUCH_POST", requestId)
```

### Public.ListCategories

Authored path: `Public.ListCategories`.
- Covered by [Public](../design/compositions/Public.md), line 42.
- Covered by [Public](../design/compositions/Public.md), line 47.

```reaction
when RequestBoundary.request (path: "/nominations/categories", requestId)
where
  instant is the current flow's instant
then
  RequestBoundary.respond (list: former "every nomination category at (now)" with (now: instant), requestId)
```

### Public.ListGroups

Authored path: `Public.ListGroups`.
- Covered by [Public](../design/compositions/Public.md), line 8.
- Covered by [Public](../design/compositions/Public.md), line 17.

```reaction
when RequestBoundary.request (path: "/groups/list", requestId)
where
  instant is the current flow's instant
then
  RequestBoundary.respond (list: former "every group at (now)" with (now: instant), requestId)
```

### Public.ListNominations:closed

Authored path: `Public.ListNominations`.
- Covered by [Public](../design/compositions/Public.md), line 50.
- Covered by [Public](../design/compositions/Public.md), line 57.

```reaction
when RequestBoundary.request (category, path: "/nominations/list", requestId)
where
  instant is the current flow's instant
  no Cycling._currentRun (item: category, now: instant)
then
  RequestBoundary.respond (ranking: (nominations: []), requestId)
```

### Public.ListNominations:open

Authored path: `Public.ListNominations`.
- Covered by [Public](../design/compositions/Public.md), line 50.
- Covered by [Public](../design/compositions/Public.md), line 57.

```reaction
when RequestBoundary.request (category, path: "/nominations/list", requestId)
where
  instant is the current flow's instant
  Cycling._currentRun (item: category, now: instant) has (end, start)
then
  RequestBoundary.respond (ranking: former "the ranking of (category) from (start) to (end)" with (category, end, start), requestId)
```

### User.CreateNomination

Authored path: `User.CreateNomination`.
- Covered by [User](../design/compositions/User.md), line 84.
- Covered by [User](../design/compositions/User.md), line 93.

```reaction
when RequestBoundary.request (category, name, path: "/nominations/create", requestId, session)
then
  Sessioning.current (session)
```

### User.CreateNomination:closed#2

Authored path: `User.CreateNomination`.
- Covered by [User](../design/compositions/User.md), line 84.
- Covered by [User](../design/compositions/User.md), line 93.

```reaction
when Sessioning.current (session, subject: user), asked by User.CreateNomination
where
  createdAt is the current flow's instant
  earlier, RequestBoundary.request (category, name, path: "/nominations/create", requestId, session)
  no Cycling._currentRun (item: category, now: createdAt)
then
  RequestBoundary.respond (error: "CATEGORY_CLOSED", requestId)
```

### User.CreateNomination:duplicate#2

Authored path: `User.CreateNomination`.
- Covered by [User](../design/compositions/User.md), line 84.
- Covered by [User](../design/compositions/User.md), line 93.

```reaction
when Sessioning.current (session, subject: user), asked by User.CreateNomination
where
  createdAt is the current flow's instant
  earlier, RequestBoundary.request (category, name, path: "/nominations/create", requestId, session)
  view "an idea equivalent to (name) is active in (category) at (now)" with (category, name, now: createdAt)
then
  RequestBoundary.respond (error: "ALREADY_NOMINATED", requestId)
```

### User.CreateNomination:open#2

Authored path: `User.CreateNomination`.
- Covered by [User](../design/compositions/User.md), line 84.
- Covered by [User](../design/compositions/User.md), line 93.

```reaction
when Sessioning.current (session, subject: user), asked by User.CreateNomination
where
  createdAt is the current flow's instant
  earlier, RequestBoundary.request (category, name, path: "/nominations/create", requestId, session)
  Cycling._currentRun (item: category, now: createdAt)
  no view "an idea equivalent to (name) is active in (category) at (now)" with (category, name, now: createdAt)
then
  Nominating.nominate (category, createdAt, name, nominator: user)
```

### User.CreateNomination:open#3

Authored path: `User.CreateNomination`.
- Covered by [User](../design/compositions/User.md), line 84.
- Covered by [User](../design/compositions/User.md), line 93.

```reaction
when Nominating.nominate (category, createdAt, name, nominator: user, nomination), asked by User.CreateNomination:open#2
where
  earlier, RequestBoundary.request (category, name, path: "/nominations/create", requestId, session)
then
  RequestBoundary.respond (nomination, requestId)
```

### User.CreatePost

Authored path: `User.CreatePost`.
- Covered by [User](../design/compositions/User.md), line 34.
- Covered by [User](../design/compositions/User.md), line 43.

```reaction
when RequestBoundary.request (content, group, path: "/posts/create", requestId, session)
then
  Sessioning.current (session)
```

### User.CreatePost:closed#2

Authored path: `User.CreatePost`.
- Covered by [User](../design/compositions/User.md), line 34.
- Covered by [User](../design/compositions/User.md), line 43.

```reaction
when Sessioning.current (session, subject: user), asked by User.CreatePost
where
  createdAt is the current flow's instant
  earlier, RequestBoundary.request (content, group, path: "/posts/create", requestId, session)
  Grouping._get (group)
  no Cycling._currentRun (item: group, now: createdAt)
then
  RequestBoundary.respond (error: "GROUP_CLOSED", requestId)
```

### User.CreatePost:not-a-group#2

Authored path: `User.CreatePost`.
- Covered by [User](../design/compositions/User.md), line 34.
- Covered by [User](../design/compositions/User.md), line 43.

```reaction
when Sessioning.current (session, subject: user), asked by User.CreatePost
where
  earlier, RequestBoundary.request (content, group, path: "/posts/create", requestId, session)
  no Grouping._get (group)
then
  RequestBoundary.respond (error: "GROUP_CLOSED", requestId)
```

### User.CreatePost:open#2

Authored path: `User.CreatePost`.
- Covered by [User](../design/compositions/User.md), line 34.
- Covered by [User](../design/compositions/User.md), line 43.

```reaction
when Sessioning.current (session, subject: user), asked by User.CreatePost
where
  createdAt is the current flow's instant
  earlier, RequestBoundary.request (content, group, path: "/posts/create", requestId, session)
  Grouping._get (group)
  Cycling._currentRun (item: group, now: createdAt)
then
  Posting.create (content, createdAt, owner: user)
```

### User.CreatePost:open#3

Authored path: `User.CreatePost`.
- Covered by [User](../design/compositions/User.md), line 34.
- Covered by [User](../design/compositions/User.md), line 43.

```reaction
when Posting.create (content, createdAt, owner: user, post), asked by User.CreatePost:open#2
where
  earlier, RequestBoundary.request (content, group, path: "/posts/create", requestId, session)
then
  Grouping.addItem (group, item: post)
```

### User.CreatePost:open#4

Authored path: `User.CreatePost`.
- Covered by [User](../design/compositions/User.md), line 34.
- Covered by [User](../design/compositions/User.md), line 43.

```reaction
when Grouping.addItem (group, item: post), asked by User.CreatePost:open#3
where
  earlier, RequestBoundary.request (content, group, path: "/posts/create", requestId, session)
then
  RequestBoundary.respond (post, requestId)
```

### User.CurrentUser

Authored path: `User.CurrentUser`.
- Covered by [User](../design/compositions/User.md), line 22.
- Covered by [User](../design/compositions/User.md), line 28.

```reaction
when RequestBoundary.request (path: "/auth/current", requestId, session)
then
  Sessioning.current (session)
```

### User.CurrentUser#2

Authored path: `User.CurrentUser`.
- Covered by [User](../design/compositions/User.md), line 22.
- Covered by [User](../design/compositions/User.md), line 28.

```reaction
when Sessioning.current (session, subject: username), asked by User.CurrentUser
where
  earlier, RequestBoundary.request (path: "/auth/current", requestId, session)
then
  RequestBoundary.respond (requestId, username)
```

### User.DeletePost

Authored path: `User.DeletePost`.
- Covered by [User](../design/compositions/User.md), line 46.
- Covered by [User](../design/compositions/User.md), line 52.

```reaction
when RequestBoundary.request (path: "/posts/delete", post, requestId, session)
then
  Sessioning.current (session)
```

### User.DeletePost#2

Authored path: `User.DeletePost`.
- Covered by [User](../design/compositions/User.md), line 46.
- Covered by [User](../design/compositions/User.md), line 52.

```reaction
when Sessioning.current (session, subject: user), asked by User.DeletePost
where
  earlier, RequestBoundary.request (path: "/posts/delete", post, requestId, session)
then
  Posting.delete (post, user)
```

### User.DeletePost#3

Authored path: `User.DeletePost`.
- Covered by [User](../design/compositions/User.md), line 46.
- Covered by [User](../design/compositions/User.md), line 52.

```reaction
when Posting.delete (post, user), asked by User.DeletePost#2
where
  earlier, RequestBoundary.request (path: "/posts/delete", post, requestId, session)
then
  RequestBoundary.respond (post, requestId)
```

### User.DeletedPostLeavesGroups

Authored path: `User.DeletedPostLeavesGroups`.
- Covered by [User](../design/compositions/User.md), line 48.

```reaction
when Posting.delete (post)
where
  Grouping._groupsOf (item: post) has (group)
then
  Grouping.removeItem (group, item: post)
```

### User.DeletedPostLosesVotes

Authored path: `User.DeletedPostLosesVotes`.
- Covered by [User](../design/compositions/User.md), line 49.

```reaction
when Posting.delete (post)
then
  Upvoting.clear (target: post)
```

### User.ListMyNominationVotes

Authored path: `User.ListMyNominationVotes`.
- Covered by [User](../design/compositions/User.md), line 110.
- Covered by [User](../design/compositions/User.md), line 116.

```reaction
when RequestBoundary.request (category, path: "/nominations/my-votes", requestId, session)
then
  Sessioning.current (session)
```

### User.ListMyNominationVotes#2

Authored path: `User.ListMyNominationVotes`.
- Covered by [User](../design/compositions/User.md), line 110.
- Covered by [User](../design/compositions/User.md), line 116.

```reaction
when Sessioning.current (session, subject: user), asked by User.ListMyNominationVotes
where
  instant is the current flow's instant
  earlier, RequestBoundary.request (category, path: "/nominations/my-votes", requestId, session)
then
  RequestBoundary.respond (requestId, votes: former "the active nominations in (category) upvoted by (user) at (now)" with (category, now: instant, user))
```

### User.ListMyVotes

Authored path: `User.ListMyVotes`.
- Covered by [User](../design/compositions/User.md), line 68.
- Covered by [User](../design/compositions/User.md), line 73.

```reaction
when RequestBoundary.request (group, path: "/posts/my-votes", requestId, session)
then
  Sessioning.current (session)
```

### User.ListMyVotes#2

Authored path: `User.ListMyVotes`.
- Covered by [User](../design/compositions/User.md), line 68.
- Covered by [User](../design/compositions/User.md), line 73.

```reaction
when Sessioning.current (session, subject: user), asked by User.ListMyVotes
where
  earlier, RequestBoundary.request (group, path: "/posts/my-votes", requestId, session)
then
  RequestBoundary.respond (requestId, votes: former "the posts in (group) upvoted by (user)" with (group, user))
```

### User.Register

Authored path: `User.Register`.
- Covered by [User](../design/compositions/User.md), line 11.
- Covered by [User](../design/compositions/User.md), line 18.

```reaction
when RequestBoundary.request (password, path: "/auth/register", requestId, username)
then
  Authenticating.register (password, username)
```

### User.Register#2

Authored path: `User.Register`.
- Covered by [User](../design/compositions/User.md), line 11.
- Covered by [User](../design/compositions/User.md), line 18.

```reaction
when Authenticating.register (password, username, account), asked by User.Register
then
  Sessioning.start (subject: account)
```

### User.Register#3

Authored path: `User.Register`.
- Covered by [User](../design/compositions/User.md), line 11.
- Covered by [User](../design/compositions/User.md), line 18.

```reaction
when Sessioning.start (subject: account, expiresAt, session), asked by User.Register#2
where
  earlier, RequestBoundary.request (password, path: "/auth/register", requestId, username)
then
  RequestBoundary.respond (account, expiresAt, requestId, session)
```

### User.SignIn

Authored path: `User.SignIn`.
- Covered by [User](../design/compositions/User.md), line 13.
- Covered by [User](../design/compositions/User.md), line 19.

```reaction
when RequestBoundary.request (password, path: "/auth/sign-in", requestId, username)
then
  Authenticating.authenticate (password, username)
```

### User.SignIn#2

Authored path: `User.SignIn`.
- Covered by [User](../design/compositions/User.md), line 13.
- Covered by [User](../design/compositions/User.md), line 19.

```reaction
when Authenticating.authenticate (password, username, account), asked by User.SignIn
then
  Sessioning.start (subject: account)
```

### User.SignIn#3

Authored path: `User.SignIn`.
- Covered by [User](../design/compositions/User.md), line 13.
- Covered by [User](../design/compositions/User.md), line 19.

```reaction
when Sessioning.start (subject: account, expiresAt, session), asked by User.SignIn#2
where
  earlier, RequestBoundary.request (password, path: "/auth/sign-in", requestId, username)
then
  RequestBoundary.respond (account, expiresAt, requestId, session)
```

### User.SignOut

Authored path: `User.SignOut`.
- Covered by [User](../design/compositions/User.md), line 24.
- Covered by [User](../design/compositions/User.md), line 29.

```reaction
when RequestBoundary.request (path: "/auth/sign-out", requestId, session)
then
  Sessioning.end (session)
```

### User.SignOut#2

Authored path: `User.SignOut`.
- Covered by [User](../design/compositions/User.md), line 24.
- Covered by [User](../design/compositions/User.md), line 29.

```reaction
when Sessioning.end (session, ended: signedOut), asked by User.SignOut
where
  earlier, RequestBoundary.request (path: "/auth/sign-out", requestId, session)
then
  RequestBoundary.respond (requestId, signedOut)
```

### User.Unvote

Authored path: `User.Unvote`.
- Covered by [User](../design/compositions/User.md), line 59.
- Covered by [User](../design/compositions/User.md), line 65.

```reaction
when RequestBoundary.request (path: "/posts/unvote", post, requestId, session)
then
  Sessioning.current (session)
```

### User.Unvote:allowed#2

Authored path: `User.Unvote`.
- Covered by [User](../design/compositions/User.md), line 59.
- Covered by [User](../design/compositions/User.md), line 65.

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
- Covered by [User](../design/compositions/User.md), line 59.
- Covered by [User](../design/compositions/User.md), line 65.

```reaction
when Upvoting.unvote (target: post, voter: user), asked by User.Unvote:allowed#2
where
  earlier, RequestBoundary.request (path: "/posts/unvote", post, requestId, session)
then
  RequestBoundary.respond (post, requestId)
```

### User.Unvote:missing#2

Authored path: `User.Unvote`.
- Covered by [User](../design/compositions/User.md), line 59.
- Covered by [User](../design/compositions/User.md), line 65.

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
- Covered by [User](../design/compositions/User.md), line 59.
- Covered by [User](../design/compositions/User.md), line 65.

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
- Covered by [User](../design/compositions/User.md), line 59.
- Covered by [User](../design/compositions/User.md), line 65.

```reaction
when Sessioning.current (session, subject: user), asked by User.Unvote
where
  earlier, RequestBoundary.request (path: "/posts/unvote", post, requestId, session)
  Posting._get (post) has (owner: user)
then
  RequestBoundary.respond (error: "OWN_POST", requestId)
```

### User.UnvoteNomination

Authored path: `User.UnvoteNomination`.
- Covered by [User](../design/compositions/User.md), line 107.
- Covered by [User](../design/compositions/User.md), line 115.

```reaction
when RequestBoundary.request (nomination, path: "/nominations/unvote", requestId, session)
then
  Sessioning.current (session)
```

### User.UnvoteNomination:allowed#2

Authored path: `User.UnvoteNomination`.
- Covered by [User](../design/compositions/User.md), line 107.
- Covered by [User](../design/compositions/User.md), line 115.

```reaction
when Sessioning.current (session, subject: user), asked by User.UnvoteNomination
where
  instant is the current flow's instant
  earlier, RequestBoundary.request (nomination, path: "/nominations/unvote", requestId, session)
  Nominating._get (nomination) and not (nominator: user)
  view "(nomination) is active at (now)" with (nomination, now: instant)
then
  NominationVotes.unvote (target: nomination, voter: user)
```

### User.UnvoteNomination:allowed#3

Authored path: `User.UnvoteNomination`.
- Covered by [User](../design/compositions/User.md), line 107.
- Covered by [User](../design/compositions/User.md), line 115.

```reaction
when NominationVotes.unvote (target: nomination, voter: user), asked by User.UnvoteNomination:allowed#2
where
  earlier, RequestBoundary.request (nomination, path: "/nominations/unvote", requestId, session)
then
  RequestBoundary.respond (nomination, requestId)
```

### User.UnvoteNomination:inactive#2

Authored path: `User.UnvoteNomination`.
- Covered by [User](../design/compositions/User.md), line 107.
- Covered by [User](../design/compositions/User.md), line 115.

```reaction
when Sessioning.current (session, subject: user), asked by User.UnvoteNomination
where
  instant is the current flow's instant
  earlier, RequestBoundary.request (nomination, path: "/nominations/unvote", requestId, session)
  Nominating._get (nomination) and not (nominator: user)
  no view "(nomination) is active at (now)" with (nomination, now: instant)
then
  RequestBoundary.respond (error: "NOT_ACTIVE", requestId)
```

### User.UnvoteNomination:missing#2

Authored path: `User.UnvoteNomination`.
- Covered by [User](../design/compositions/User.md), line 107.
- Covered by [User](../design/compositions/User.md), line 115.

```reaction
when Sessioning.current (session, subject: user), asked by User.UnvoteNomination
where
  earlier, RequestBoundary.request (nomination, path: "/nominations/unvote", requestId, session)
  no Nominating._get (nomination)
then
  RequestBoundary.respond (error: "NO_SUCH_NOMINATION", requestId)
```

### User.UnvoteNomination:own-nomination#2

Authored path: `User.UnvoteNomination`.
- Covered by [User](../design/compositions/User.md), line 107.
- Covered by [User](../design/compositions/User.md), line 115.

```reaction
when Sessioning.current (session, subject: user), asked by User.UnvoteNomination
where
  earlier, RequestBoundary.request (nomination, path: "/nominations/unvote", requestId, session)
  Nominating._get (nomination) has (nominator: user)
then
  RequestBoundary.respond (error: "OWN_NOMINATION", requestId)
```

### User.Vote

Authored path: `User.Vote`.
- Covered by [User](../design/compositions/User.md), line 59.
- Covered by [User](../design/compositions/User.md), line 64.

```reaction
when RequestBoundary.request (path: "/posts/vote", post, requestId, session)
then
  Sessioning.current (session)
```

### User.Vote:allowed#2

Authored path: `User.Vote`.
- Covered by [User](../design/compositions/User.md), line 59.
- Covered by [User](../design/compositions/User.md), line 64.

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
- Covered by [User](../design/compositions/User.md), line 59.
- Covered by [User](../design/compositions/User.md), line 64.

```reaction
when Upvoting.upvote (target: post, voter: user), asked by User.Vote:allowed#2
where
  earlier, RequestBoundary.request (path: "/posts/vote", post, requestId, session)
then
  RequestBoundary.respond (post, requestId)
```

### User.Vote:missing#2

Authored path: `User.Vote`.
- Covered by [User](../design/compositions/User.md), line 59.
- Covered by [User](../design/compositions/User.md), line 64.

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
- Covered by [User](../design/compositions/User.md), line 59.
- Covered by [User](../design/compositions/User.md), line 64.

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
- Covered by [User](../design/compositions/User.md), line 59.
- Covered by [User](../design/compositions/User.md), line 64.

```reaction
when Sessioning.current (session, subject: user), asked by User.Vote
where
  earlier, RequestBoundary.request (path: "/posts/vote", post, requestId, session)
  Posting._get (post) has (owner: user)
then
  RequestBoundary.respond (error: "OWN_POST", requestId)
```

### User.VoteNomination

Authored path: `User.VoteNomination`.
- Covered by [User](../design/compositions/User.md), line 106.
- Covered by [User](../design/compositions/User.md), line 114.

```reaction
when RequestBoundary.request (nomination, path: "/nominations/vote", requestId, session)
then
  Sessioning.current (session)
```

### User.VoteNomination:allowed#2

Authored path: `User.VoteNomination`.
- Covered by [User](../design/compositions/User.md), line 106.
- Covered by [User](../design/compositions/User.md), line 114.

```reaction
when Sessioning.current (session, subject: user), asked by User.VoteNomination
where
  instant is the current flow's instant
  earlier, RequestBoundary.request (nomination, path: "/nominations/vote", requestId, session)
  Nominating._get (nomination) and not (nominator: user)
  view "(nomination) is active at (now)" with (nomination, now: instant)
then
  NominationVotes.upvote (target: nomination, voter: user)
```

### User.VoteNomination:allowed#3

Authored path: `User.VoteNomination`.
- Covered by [User](../design/compositions/User.md), line 106.
- Covered by [User](../design/compositions/User.md), line 114.

```reaction
when NominationVotes.upvote (target: nomination, voter: user), asked by User.VoteNomination:allowed#2
where
  earlier, RequestBoundary.request (nomination, path: "/nominations/vote", requestId, session)
then
  RequestBoundary.respond (nomination, requestId)
```

### User.VoteNomination:inactive#2

Authored path: `User.VoteNomination`.
- Covered by [User](../design/compositions/User.md), line 106.
- Covered by [User](../design/compositions/User.md), line 114.

```reaction
when Sessioning.current (session, subject: user), asked by User.VoteNomination
where
  instant is the current flow's instant
  earlier, RequestBoundary.request (nomination, path: "/nominations/vote", requestId, session)
  Nominating._get (nomination) and not (nominator: user)
  no view "(nomination) is active at (now)" with (nomination, now: instant)
then
  RequestBoundary.respond (error: "NOT_ACTIVE", requestId)
```

### User.VoteNomination:missing#2

Authored path: `User.VoteNomination`.
- Covered by [User](../design/compositions/User.md), line 106.
- Covered by [User](../design/compositions/User.md), line 114.

```reaction
when Sessioning.current (session, subject: user), asked by User.VoteNomination
where
  earlier, RequestBoundary.request (nomination, path: "/nominations/vote", requestId, session)
  no Nominating._get (nomination)
then
  RequestBoundary.respond (error: "NO_SUCH_NOMINATION", requestId)
```

### User.VoteNomination:own-nomination#2

Authored path: `User.VoteNomination`.
- Covered by [User](../design/compositions/User.md), line 106.
- Covered by [User](../design/compositions/User.md), line 114.

```reaction
when Sessioning.current (session, subject: user), asked by User.VoteNomination
where
  earlier, RequestBoundary.request (nomination, path: "/nominations/vote", requestId, session)
  Nominating._get (nomination) has (nominator: user)
then
  RequestBoundary.respond (error: "OWN_NOMINATION", requestId)
```

### User.WithdrawNomination

Authored path: `User.WithdrawNomination`.
- Covered by [User](../design/compositions/User.md), line 96.
- Covered by [User](../design/compositions/User.md), line 101.

```reaction
when RequestBoundary.request (nomination, path: "/nominations/withdraw", requestId, session)
then
  Sessioning.current (session)
```

### User.WithdrawNomination#2

Authored path: `User.WithdrawNomination`.
- Covered by [User](../design/compositions/User.md), line 96.
- Covered by [User](../design/compositions/User.md), line 101.

```reaction
when Sessioning.current (session, subject: user), asked by User.WithdrawNomination
where
  earlier, RequestBoundary.request (nomination, path: "/nominations/withdraw", requestId, session)
then
  Nominating.withdraw (nomination, nominator: user)
```

### User.WithdrawNomination#3

Authored path: `User.WithdrawNomination`.
- Covered by [User](../design/compositions/User.md), line 96.
- Covered by [User](../design/compositions/User.md), line 101.

```reaction
when Nominating.withdraw (nomination, nominator: user), asked by User.WithdrawNomination#2
where
  earlier, RequestBoundary.request (nomination, path: "/nominations/withdraw", requestId, session)
then
  RequestBoundary.respond (nomination, requestId)
```

### User.WithdrawnNominationLosesVotes

Authored path: `User.WithdrawnNominationLosesVotes`.
- Covered by [User](../design/compositions/User.md), line 98.

```reaction
when Nominating.withdraw (nomination)
then
  NominationVotes.clear (target: nomination)
```

## Endpoint input contracts

Before recording an action ask, the boundary rejects a body that is not an
object or lacks a required key. The response uses `INVALID_INPUT` and names
the path or missing key. A declared default fills an absent key. Endpoints
not listed here have no explicit input contract.

- `/admin/admins/add` — requires `session`, `user`
- `/admin/admins/list` — requires `session`
- `/admin/admins/remove` — requires `session`, `user`
- `/admin/categories/create` — requires `name`, `session`
- `/admin/cycles/add-item` — requires `cycle`, `item`, `session`
- `/admin/cycles/create` — requires `period`, `runs`, `session`
- `/admin/cycles/delete` — requires `cycle`, `session`
- `/admin/cycles/list` — requires `session`
- `/admin/cycles/remove-item` — requires `cycle`, `item`, `session`
- `/admin/cycles/set-runs` — requires `cycle`, `runs`, `session`
- `/admin/groups/add-post` — requires `group`, `post`, `session`
- `/admin/groups/create` — requires `name`, `session`
- `/admin/groups/delete` — requires `group`, `session`
- `/admin/groups/remove-post` — requires `group`, `post`, `session`
- `/admin/nominations/previous` — requires `category`, `session`
- `/auth/current` — requires `session`
- `/auth/register` — requires `password`, `username`
- `/auth/sign-in` — requires `password`, `username`
- `/auth/sign-out` — requires `session`
- `/groups/feed` — requires `group`
- `/nominations/create` — requires `category`, `name`, `session`
- `/nominations/list` — requires `category`
- `/nominations/my-votes` — requires `category`, `session`
- `/nominations/unvote` — requires `nomination`, `session`
- `/nominations/vote` — requires `nomination`, `session`
- `/nominations/withdraw` — requires `nomination`, `session`
- `/posts/create` — requires `content`, `group`, `session`
- `/posts/delete` — requires `post`, `session`
- `/posts/get` — requires `post`
- `/posts/my-votes` — requires `group`, `session`
- `/posts/unvote` — requires `post`, `session`
- `/posts/vote` — requires `post`, `session`

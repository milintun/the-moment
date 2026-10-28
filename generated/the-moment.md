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

- `Administrating` — instance of `Administrating` — [Application types](../design/types.md), line 25.
  - `User` is `Authenticating.Account` — [Application types](../design/types.md), line 26.

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

- `create(start: DateTime, period: Number, runs: Number, earliest: DateTime) : returns (cycle: Cycle)`
  - Refuses `INVALID_CYCLE`: A cycle needs a positive period and at least one run.
  - Refuses `START_PASSED`: A cycle can't start in the past.
- `addItem(cycle: Cycle, item: Item) : returns ()`
  - Refuses `NO_SUCH_CYCLE`: There is no such cycle.
  - Refuses `ALREADY_CYCLING`: This item already belongs to a cycle.
- `addItems(cycle: Cycle, items: List<Item>) : returns ()`
  - Refuses `NO_SUCH_CYCLE`: There is no such cycle.
  - Refuses `ALREADY_CYCLING`: This item already belongs to a cycle.
- `removeItem(cycle: Cycle, item: Item, now: DateTime) : returns ()`
  - Refuses `NO_SUCH_CYCLE`: There is no such cycle.
  - Refuses `NOT_IN_CYCLE`: This item is not in the cycle.
  - Refuses `NO_LATER_RUN`: There is no later run for this item to leave from.
  - Refuses `LAST_ITEM`: Every run needs at least one item.
- `setRuns(cycle: Cycle, runs: Number, now: DateTime) : returns ()`
  - Refuses `NO_SUCH_CYCLE`: There is no such cycle.
  - Refuses `INVALID_CYCLE`: A cycle needs a positive period and at least one run.
  - Refuses `RUN_UNDERWAY`: A cycle can't end before the run underway has finished.
  - Refuses `LAST_ITEM`: Every run needs at least one item.
- `delete(cycle: Cycle) : returns (items: List<Item>)`
  - Refuses `NO_SUCH_CYCLE`: There is no such cycle.

#### Queries

- `_cycle(item: Item) : optional (cycle: Cycle, start: DateTime, period: Number, runs: Number, itemRuns: Number)`
- `_currentRun(item: Item, now: DateTime) : optional (run: Number, start: DateTime, end: DateTime)`
- `_previousRun(item: Item, now: DateTime) : optional (run: Number, start: DateTime, end: DateTime)`
- `_run(item: Item, run: Number) : optional (start: DateTime, end: DateTime)`
- `_overlapping(start: DateTime, period: Number, runs: Number, except: String) : many (cycle: Cycle)`
- `_all() : many (cycle: Cycle, start: DateTime, period: Number, runs: Number)`
- `_items(cycle: Cycle) : many (item: Item, itemRuns: Number)`

#### Instances

- `Cycling` — instance of `Cycling` — [Application types](../design/types.md), line 40.
  - `Item` is `CycledItem` — [Application types](../design/types.md), line 41.
  - `List` is `Sequence` — [Application types](../design/types.md), line 42.

### Grouping

Defined in [Grouping](../design/concepts/Grouping.md), line 1.

#### Actions

- `create(name: String, createdAt: DateTime) : returns (group: Group)`
- `createMany(names: List<String>, createdAt: DateTime) : returns (groups: List<Group>)`
  - Refuses `NO_NAMES`: Name at least one group.
  - Refuses `INVALID_NAME`: Every group needs a name.
  - Refuses `DUPLICATE_NAME`: Groups made together need different names.
- `delete(group: Group) : returns ()`
  - Refuses `NO_SUCH_GROUP`: There is no such group.
- `addItem(group: Group, item: Item, addedAt: DateTime) : returns ()`
  - Refuses `NO_SUCH_GROUP`: There is no such group.
  - Refuses `ALREADY_IN_GROUP`: This item is already in the group.
- `deleteMany(groups: List<Group>) : returns ()`
- `removeItem(group: Group, item: Item) : returns ()`
  - Refuses `NO_SUCH_GROUP`: There is no such group.
  - Refuses `NOT_IN_GROUP`: This item is not in the group.

#### Queries

- `_groups() : many (group: Group, name: String)`
- `_page(offset: Number, limit: Number) : many (group: Group, name: String)`
- `_get(group: Group) : optional (name: String)`
- `_items(group: Group) : many (item: Item)`
- `_itemsAdded(group: Group, from: DateTime, to: DateTime) : many (item: Item, addedAt: DateTime)`
- `_groupsOf(item: Item) : many (group: Group)`
- `_nameAmong(group: Group, names: List<String>) : optional (name: String)`
- `_byName(name: String) : many (group: Group)`

#### Instances

- `Grouping` — instance of `Grouping` — [Application types](../design/types.md), line 36.
  - `Item` is `Posting.Post` — [Application types](../design/types.md), line 37.
  - `List` is `Sequence` — [Application types](../design/types.md), line 38.

### Nominating

Defined in [Nominating](../design/concepts/Nominating.md), line 1.

#### Actions

- `createCategory(name: String) : returns (category: Category)`
  - Refuses `NAME_TAKEN`: A category with this name already exists.
- `nominate(nominator: User, category: Category, name: String, createdAt: DateTime) : returns (nomination: Nomination)`
  - Refuses `NO_SUCH_CATEGORY`: There is no such category.
  - Refuses `INVALID_NAME`: A nomination needs a name of at most 40 characters.
  - Refuses `TOO_SOON`: You can nominate once a day.
- `withdraw(nominator: User, nomination: Nomination) : returns ()`
  - Refuses `NO_SUCH_NOMINATION`: There is no such nomination.
  - Refuses `NOT_NOMINATOR`: Only the nominator can withdraw a nomination.
  - Refuses `CHOSEN`: A chosen nomination can't be withdrawn.
- `choose(nominations: List<Nomination>, chosenAt: DateTime) : returns ()`
  - Refuses `NO_SUCH_NOMINATION`: There is no such nomination.
  - Refuses `CHOSEN`: This nomination has already been chosen.

#### Queries

- `_categories() : many (category: Category, name: String)`
- `_category(category: Category) : optional (name: String)`
- `_nominations(category: Category) : many (nomination: Nomination, nominator: User, name: String, createdAt: DateTime, chosen: Flag)`
- `_equivalent(category: Category, name: String) : many (nomination: Nomination, createdAt: DateTime)`
- `_byNominator(nominator: User) : many (nomination: Nomination, category: Category, name: String, createdAt: DateTime, chosen: Flag)`
- `_unavailable(nominations: List<Nomination>) : many (nomination: Nomination)`
- `_get(nomination: Nomination) : optional (nominator: User, category: Category, name: String, createdAt: DateTime, chosen: Flag)`

#### Instances

- `Nominating` — instance of `Nominating` — [Application types](../design/types.md), line 44.
  - `List` is `Sequence` — [Application types](../design/types.md), line 46.
  - `User` is `Authenticating.Account` — [Application types](../design/types.md), line 45.

### Posting

Defined in [Posting](../design/concepts/Posting.md), line 1.

#### Actions

- `create(owner: User, content: Content, caption: String, createdAt: DateTime) : returns (post: Post)`
- `delete(user: User, post: Post) : returns (content: Content)`
  - Refuses `NO_SUCH_POST`: There is no such post.
  - Refuses `NOT_OWNER`: Only the owner of a post can delete it.

#### Queries

- `_get(post: Post) : optional (owner: User, content: Content, caption: String, createdAt: DateTime)`
- `_byOwner(owner: User) : many (post: Post, content: Content, caption: String, createdAt: DateTime)`

#### Instances

- `Posting` — instance of `Posting` — [Application types](../design/types.md), line 28.
  - `Content` is `Uploading.Upload` — [Application types](../design/types.md), line 30.
  - `User` is `Authenticating.Account` — [Application types](../design/types.md), line 29.

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

### Uploading

Defined in [Uploading](../design/concepts/Uploading.md), line 1.

#### Actions

- `requestUpload(owner: User, contentType: String, createdAt: DateTime) : returns (upload: Upload, uploadUrl: String)`
- `verify(upload: Upload, owner: User, maxSize: Number) : returns ()`
  - Refuses `NO_SUCH_UPLOAD`: There is no such upload.
  - Refuses `NOT_YOUR_UPLOAD`: This upload belongs to someone else.
  - Refuses `NOT_UPLOADED`: The file has not been uploaded yet.
  - Refuses `INVALID_FILE`: The file is too large or not of the requested type.
- `remove(upload: Upload) : returns ()`
  - Refuses `NO_SUCH_UPLOAD`: There is no such upload.
- `link(upload: Upload) : returns (url: String)`
  - Refuses `NO_SUCH_UPLOAD`: There is no such upload.

#### Queries

- `_get(upload: Upload) : optional (owner: User, contentType: String, createdAt: DateTime)`

#### Instances

- `Uploading` — instance of `Uploading` — [Application types](../design/types.md), line 22.
  - `User` is `Authenticating.Account` — [Application types](../design/types.md), line 23.

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

- `NominationVotes` — instance of `Upvoting` — [Application types](../design/types.md), line 48.
  - `Item` is `Nominating.Nomination` — [Application types](../design/types.md), line 50.
  - `User` is `Authenticating.Account` — [Application types](../design/types.md), line 49.
- `Upvoting` — instance of `Upvoting` — [Application types](../design/types.md), line 32.
  - `Item` is `Posting.Post` — [Application types](../design/types.md), line 34.
  - `User` is `Authenticating.Account` — [Application types](../design/types.md), line 33.

## Application types

Concrete types:

- `CycledItem` — [Application types](../design/types.md), line 9.
- `Sequence` — [Application types](../design/types.md), line 12.

## Views

_Views name reusable conditions. Multiple `where` blocks are alternatives._

### (contentType) is an accepted image type

Authored path: `User.AcceptedImageType`.
- Covered by [User](../design/compositions/User.md), line 38.

```view
(contentType) is an accepted image type — inputs (contentType); outputs (); bindings ()
  where contentType is among ["image/jpeg", "image/png", "image/webp", "image/svg+xml"]
```

### (cycle) hasn't started at (now)

Authored path: `Admin.Upcoming`.
- Covered by [Admin](../design/compositions/Admin.md), line 89.

```view
(cycle) hasn't started at (now) — inputs (cycle, now); outputs (); bindings (start)
  where
    Cycling._all () has (cycle, start)
    start is greater than now
```

### (cycle) holds a nomination category

Authored path: `Admin.HoldsCategory`.
- Covered by [Admin](../design/compositions/Admin.md), line 52.

```view
(cycle) holds a nomination category — inputs (cycle); outputs (); bindings (item)
  where
    Cycling._items (cycle) has (item)
    Nominating._category (category: item)
```

### (cycle) with (runs) seasons would overlap another schedule

Authored path: `Admin.OverlapsAnother`.
- Covered by [Admin](../design/compositions/Admin.md), line 81.

```view
(cycle) with (runs) seasons would overlap another schedule — inputs (cycle, runs); outputs (); bindings (start, period, other)
  where
    Cycling._all () has (cycle, period, start)
    Cycling._overlapping (except: cycle, period, runs, start) has (cycle: other)
    no view "(cycle) holds a nomination category" with (cycle: other)
```

### (group) is open at (now)

Authored path: `User.GroupOpen`.
- Covered by [User](../design/compositions/User.md), line 53.

```view
(group) is open at (now) — inputs (group, now); outputs (); bindings ()
  where
    Grouping._get (group)
    Cycling._currentRun (item: group, now)
```

### (nomination) is active at (now)

Authored path: `User.NominationActive`.
- Covered by [User](../design/compositions/User.md), line 113.

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
- Covered by [User](../design/compositions/User.md), line 77.

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

### a schedule from (start), (runs) seasons of (period), would overlap another

Authored path: `Admin.Overlaps`.
- Covered by [Admin](../design/compositions/Admin.md), line 57.

```view
a schedule from (start), (runs) seasons of (period), would overlap another — inputs (start, period, runs); outputs (); bindings (other)
  where
    Cycling._overlapping (except: "", period, runs, start) has (cycle: other)
    no view "(cycle) holds a nomination category" with (cycle: other)
```

### an idea equivalent to (name) is active in (category) at (now)

Authored path: `User.EquivalentActive`.
- Covered by [User](../design/compositions/User.md), line 121.

```view
an idea equivalent to (name) is active in (category) at (now) — inputs (category, name, now); outputs (); bindings (createdAt, start, end)
  where
    Cycling._currentRun (item: category, now) has (end, start)
    Nominating._equivalent (category, name) has (createdAt)
    createdAt is at least start
    createdAt is less than end
```

### one of (names) matches a gallery in (cycle)

Authored path: `Admin.NameTaken`.
- Covered by [Admin](../design/compositions/Admin.md), line 75.

```view
one of (names) matches a gallery in (cycle) — inputs (cycle, names); outputs (); bindings (item)
  where
    Cycling._items (cycle) has (item)
    Grouping._nameAmong (group: item, names)
```

### some of (nominations) can't be chosen

Authored path: `Admin.PicksUnavailable`.
- Covered by [Admin](../design/compositions/Admin.md), line 59.

```view
some of (nominations) can't be chosen — inputs (nominations); outputs (); bindings ()
  where Nominating._unavailable (nominations)
```

## Formers

_Formers name result shapes evaluated when asked. The source former owns_
_the authored explanation; this section records the generated shape._

### every admin

Authored path: `Admin.AdminList`.
- Covered by [Admin](../design/compositions/Admin.md), line 18.

```former
Former "every admin" — inputs (); bindings (user, owner); promises exactly one record — forms:
  a record of
    admins: each Administrating._admins () has (owner, user)
      form a record of
        owner
        user
```

### the cycle of (group)

Authored path: `Public.GroupCycle`.
- Covered by [Public](../design/compositions/Public.md), line 10.

```former
Former "the cycle of (group)" — inputs (group); bindings (cycle, start, period, runs); promises at most one record — forms:
  a record of
    where Cycling._cycle (item: group) has (cycle, itemRuns: runs, period, start)
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
- Covered by [Public](../design/compositions/Public.md), line 74.

```former
Former "every nomination category at (now)" — inputs (now); bindings (category, name); promises exactly one record — forms:
  a record of
    categories: each Nominating._categories () has (category, name)
      form a record of
        category
        name
        … former "the run of (group) at (now)" with (group: category, now), with blank leaves if absent
```

### every schedule

Authored path: `Admin.ScheduleList`.
- Covered by [Admin](../design/compositions/Admin.md), line 50.

```former
Former "every schedule" — inputs (); bindings (cycle, start, period, runs, group, name, itemRuns); promises exactly one record — forms:
  a record of
    schedules: each Cycling._all () has (cycle, period, runs, start)
      where no view "(cycle) holds a nomination category" with (cycle)
      form a record of
        cycle
        galleries: each Cycling._items (cycle) has (item: group, itemRuns)
          where Grouping._get (group) has (name)
          form a record of
            group
            name
            runs: itemRuns
        period
        runs
        start
```

### the active nominations in (category) upvoted by (user) at (now)

Authored path: `User.MyNominationVotes`.
- Covered by [User](../design/compositions/User.md), line 157.

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
- Covered by [Public](../design/compositions/Public.md), line 63.

```former
Former "the details of (post)" — inputs (post); bindings (owner, content, caption, createdAt, votes); promises at most one record — forms:
  a record of
    where Posting._get (post) has (caption, content, createdAt, owner)
    where Upvoting._count (target: post) has (votes)
    caption
    content
    createdAt
    owner
    post
    votes
```

### the groups from (offset), at most (limit)

Authored path: `Public.GroupPage`.
- Covered by [Public](../design/compositions/Public.md), line 42.

```former
Former "the groups from (offset), at most (limit)" — inputs (offset, limit); bindings (group, name); promises exactly one record — forms:
  a record of
    groups: each Grouping._page (limit, offset) has (group, name)
      form a record of
        group
        name
        … former "the cycle of (group)" with (group), with blank leaves if absent
```

### whether (nomination) is active at (now)

Authored path: `User.NominationCurrent`.
- Covered by [User](../design/compositions/User.md), line 144.

```former
Former "whether (nomination) is active at (now)" — inputs (nomination, now); bindings (); promises at most one record — forms:
  a record of
    where view "(nomination) is active at (now)" with (nomination, now)
    current: true
```

### the nominations of (user) at (now)

Authored path: `User.MyNominations`.
- Covered by [User](../design/compositions/User.md), line 142.

```former
Former "the nominations of (user) at (now)" — inputs (user, now); bindings (nomination, name, createdAt, votes, chosen); promises exactly one record — forms:
  a record of
    nominations: each Nominating._byNominator (nominator: user) has (chosen, createdAt, name, nomination)
      where NominationVotes._count (target: nomination) has (votes)
      form a record of
        chosen
        createdAt
        name
        nomination
        votes
        … former "whether (nomination) is active at (now)" with (nomination, now), with blank leaves if absent
```

### the posts in (group) upvoted by (user)

Authored path: `User.MyVotes`.
- Covered by [User](../design/compositions/User.md), line 89.

```former
Former "the posts in (group) upvoted by (user)" — inputs (group, user); bindings (post); promises exactly one record — forms:
  a record of
    posts: each Grouping._items (group) has (item: post)
      where Upvoting._voted (target: post, voter: user) has (voted: true)
      form a record of
        post
```

### the posts of (group) from (start) to (end)

Authored path: `Public.SeasonPosts`.
- Covered by [Public](../design/compositions/Public.md), line 23.

```former
Former "the posts of (group) from (start) to (end)" — inputs (group, start, end); bindings (post, owner, content, caption, createdAt, votes); promises exactly one record — forms:
  a record of
    posts: each Grouping._itemsAdded (from: start, group, to: end) has (item: post)
      where Posting._get (post) has (caption, content, createdAt, owner)
      where createdAt is at least start
      where createdAt is less than end
      where Upvoting._count (target: post) has (votes)
      arranged by votes, descending
      form a record of
        caption
        content
        createdAt
        owner
        post
        votes
```

### the season of (group) at (createdAt)

Authored path: `User.PostedSeason`.
- Covered by [User](../design/compositions/User.md), line 101.

```former
Former "the season of (group) at (createdAt)" — inputs (group, createdAt); bindings (run); promises at most one record — forms:
  a record of
    where Cycling._currentRun (item: group, now: createdAt) has (run)
    season: run
```

### whether (post) is in season at (now)

Authored path: `User.InSeason`.
- Covered by [User](../design/compositions/User.md), line 103.

```former
Former "whether (post) is in season at (now)" — inputs (post, now); bindings (); promises at most one record — forms:
  a record of
    where view "(post) is in season at (now)" with (now, post)
    current: true
```

### the posts of (user) at (now)

Authored path: `User.MyPosts`.
- Covered by [User](../design/compositions/User.md), line 99.

```former
Former "the posts of (user) at (now)" — inputs (user, now); bindings (post, content, caption, createdAt, votes, group, name); promises exactly one record — forms:
  a record of
    posts: each Posting._byOwner (owner: user) has (caption, content, createdAt, post)
      where Upvoting._count (target: post) has (votes)
      form a record of
        caption
        content
        createdAt
        galleries: each Grouping._groupsOf (item: post) has (group)
          where Grouping._get (group) has (name)
          form a record of
            group
            name
            … former "the season of (group) at (createdAt)" with (createdAt, group), with blank leaves if absent
        post
        votes
        … former "whether (post) is in season at (now)" with (now, post), with blank leaves if absent
```

### the ranking of (category) from (start) to (end)

Authored path: `Public.RoundRanking`.
- Covered by [Admin](../design/compositions/Admin.md), line 109.
- Covered by [Public](../design/compositions/Public.md), line 82.

```former
Former "the ranking of (category) from (start) to (end)" — inputs (category, start, end); bindings (nomination, nominator, name, createdAt, votes, chosen); promises exactly one record — forms:
  a record of
    nominations: each Nominating._nominations (category) has (chosen, createdAt, name, nomination, nominator)
      where createdAt is at least start
      where createdAt is less than end
      where NominationVotes._count (target: nomination) has (votes)
      arranged by votes, descending
      form a record of
        chosen
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
- Covered by [Admin](../design/compositions/Admin.md), line 27.

```reaction
when RequestBoundary.request (path: "/admin/admins/add", requestId, session, user)
then
  Sessioning.current (session)
```

### Admin.AddAdmin:not-owner#2

Authored path: `Admin.AddAdmin`.
- Covered by [Admin](../design/compositions/Admin.md), line 14.
- Covered by [Admin](../design/compositions/Admin.md), line 27.

```reaction
when Sessioning.current (session), asked by Admin.AddAdmin
where
  view "(session) does not belong to the owner" with (session)
  earlier, RequestBoundary.request (path: "/admin/admins/add", requestId, session, user)
then
  RequestBoundary.respond (error: "OWNER_ONLY", requestId)
```

### Admin.AddAdmin:not-registered#2

Authored path: `Admin.AddAdmin`.
- Covered by [Admin](../design/compositions/Admin.md), line 14.
- Covered by [Admin](../design/compositions/Admin.md), line 27.

```reaction
when Sessioning.current (session), asked by Admin.AddAdmin
where
  view "(session) belongs to the owner" with (session)
  earlier, RequestBoundary.request (path: "/admin/admins/add", requestId, session, user)
  Authenticating._registered (username: user) has (registered: false)
then
  RequestBoundary.respond (error: "NO_SUCH_USER", requestId)
```

### Admin.AddAdmin:owner#2

Authored path: `Admin.AddAdmin`.
- Covered by [Admin](../design/compositions/Admin.md), line 14.
- Covered by [Admin](../design/compositions/Admin.md), line 27.

```reaction
when Sessioning.current (session), asked by Admin.AddAdmin
where
  view "(session) belongs to the owner" with (session)
  earlier, RequestBoundary.request (path: "/admin/admins/add", requestId, session, user)
  Authenticating._registered (username: user) has (registered: true)
then
  Administrating.addAdmin (user)
```

### Admin.AddAdmin:owner#3

Authored path: `Admin.AddAdmin`.
- Covered by [Admin](../design/compositions/Admin.md), line 14.
- Covered by [Admin](../design/compositions/Admin.md), line 27.

```reaction
when Administrating.addAdmin (user), asked by Admin.AddAdmin:owner#2
where
  earlier, RequestBoundary.request (path: "/admin/admins/add", requestId, session, user)
then
  RequestBoundary.respond (requestId, user)
```

### Admin.AddGalleries

Authored path: `Admin.AddGalleries`.
- Covered by [Admin](../design/compositions/Admin.md), line 73.
- Covered by [Admin](../design/compositions/Admin.md), line 94.

```reaction
when RequestBoundary.request (cycle, names, nominations, path: "/admin/schedules/add-galleries", requestId, session)
then
  Sessioning.current (session)
```

### Admin.AddGalleries:name-taken#2

Authored path: `Admin.AddGalleries`.
- Covered by [Admin](../design/compositions/Admin.md), line 73.
- Covered by [Admin](../design/compositions/Admin.md), line 94.

```reaction
when Sessioning.current (session), asked by Admin.AddGalleries
where
  instant is the current flow's instant
  view "(session) belongs to an admin" with (session)
  earlier, RequestBoundary.request (cycle, names, nominations, path: "/admin/schedules/add-galleries", requestId, session)
  view "(cycle) hasn't started at (now)" with (cycle, now: instant)
  view "one of (names) matches a gallery in (cycle)" with (cycle, names)
then
  RequestBoundary.respond (error: "DUPLICATE_NAME", requestId)
```

### Admin.AddGalleries:nomination-unavailable#2

Authored path: `Admin.AddGalleries`.
- Covered by [Admin](../design/compositions/Admin.md), line 73.
- Covered by [Admin](../design/compositions/Admin.md), line 94.

```reaction
when Sessioning.current (session), asked by Admin.AddGalleries
where
  instant is the current flow's instant
  view "(session) belongs to an admin" with (session)
  earlier, RequestBoundary.request (cycle, names, nominations, path: "/admin/schedules/add-galleries", requestId, session)
  view "(cycle) hasn't started at (now)" with (cycle, now: instant)
  no view "one of (names) matches a gallery in (cycle)" with (cycle, names)
  view "some of (nominations) can't be chosen" with (nominations)
then
  RequestBoundary.respond (error: "NOMINATION_UNAVAILABLE", requestId)
```

### Admin.AddGalleries:not-admin#2

Authored path: `Admin.AddGalleries`.
- Covered by [Admin](../design/compositions/Admin.md), line 73.
- Covered by [Admin](../design/compositions/Admin.md), line 94.

```reaction
when Sessioning.current (session), asked by Admin.AddGalleries
where
  view "(session) does not belong to an admin" with (session)
  earlier, RequestBoundary.request (cycle, names, nominations, path: "/admin/schedules/add-galleries", requestId, session)
then
  RequestBoundary.respond (error: "ADMIN_ONLY", requestId)
```

### Admin.AddGalleries:started#2

Authored path: `Admin.AddGalleries`.
- Covered by [Admin](../design/compositions/Admin.md), line 73.
- Covered by [Admin](../design/compositions/Admin.md), line 94.

```reaction
when Sessioning.current (session), asked by Admin.AddGalleries
where
  instant is the current flow's instant
  view "(session) belongs to an admin" with (session)
  earlier, RequestBoundary.request (cycle, names, nominations, path: "/admin/schedules/add-galleries", requestId, session)
  no view "(cycle) hasn't started at (now)" with (cycle, now: instant)
then
  RequestBoundary.respond (error: "ALREADY_STARTED", requestId)
```

### Admin.AddGalleries:upcoming#2

Authored path: `Admin.AddGalleries`.
- Covered by [Admin](../design/compositions/Admin.md), line 73.
- Covered by [Admin](../design/compositions/Admin.md), line 94.

```reaction
when Sessioning.current (session), asked by Admin.AddGalleries
where
  instant is the current flow's instant
  view "(session) belongs to an admin" with (session)
  earlier, RequestBoundary.request (cycle, names, nominations, path: "/admin/schedules/add-galleries", requestId, session)
  view "(cycle) hasn't started at (now)" with (cycle, now: instant)
  no view "one of (names) matches a gallery in (cycle)" with (cycle, names)
  no view "some of (nominations) can't be chosen" with (nominations)
then
  Grouping.createMany (createdAt: instant, names)
```

### Admin.AddGalleries:upcoming#3

Authored path: `Admin.AddGalleries`.
- Covered by [Admin](../design/compositions/Admin.md), line 73.
- Covered by [Admin](../design/compositions/Admin.md), line 94.

```reaction
when Grouping.createMany (createdAt: instant, names, groups), asked by Admin.AddGalleries:upcoming#2
where
  earlier, RequestBoundary.request (cycle, names, nominations, path: "/admin/schedules/add-galleries", requestId, session)
then
  Cycling.addItems (cycle, items: groups)
```

### Admin.AddGalleries:upcoming#4

Authored path: `Admin.AddGalleries`.
- Covered by [Admin](../design/compositions/Admin.md), line 73.
- Covered by [Admin](../design/compositions/Admin.md), line 94.

```reaction
when Cycling.addItems (cycle, items: groups), asked by Admin.AddGalleries:upcoming#3
where
  earlier, Grouping.createMany (createdAt: instant, names, groups), asked by Admin.AddGalleries:upcoming#2
  earlier, RequestBoundary.request (cycle, names, nominations, path: "/admin/schedules/add-galleries", requestId, session)
then
  Nominating.choose (chosenAt: instant, nominations)
```

### Admin.AddGalleries:upcoming#5

Authored path: `Admin.AddGalleries`.
- Covered by [Admin](../design/compositions/Admin.md), line 73.
- Covered by [Admin](../design/compositions/Admin.md), line 94.

```reaction
when Nominating.choose (chosenAt: instant, nominations), asked by Admin.AddGalleries:upcoming#4
where
  earlier, Grouping.createMany (createdAt: instant, names, groups), asked by Admin.AddGalleries:upcoming#2
  earlier, Cycling.addItems (cycle, items: groups), asked by Admin.AddGalleries:upcoming#3
  earlier, RequestBoundary.request (cycle, names, nominations, path: "/admin/schedules/add-galleries", requestId, session)
then
  RequestBoundary.respond (cycle, groups, requestId)
```

### Admin.CancelSchedule

Authored path: `Admin.CancelSchedule`.
- Covered by [Admin](../design/compositions/Admin.md), line 90.
- Covered by [Admin](../design/compositions/Admin.md), line 97.

```reaction
when RequestBoundary.request (cycle, path: "/admin/schedules/cancel", requestId, session)
then
  Sessioning.current (session)
```

### Admin.CancelSchedule:not-admin#2

Authored path: `Admin.CancelSchedule`.
- Covered by [Admin](../design/compositions/Admin.md), line 90.
- Covered by [Admin](../design/compositions/Admin.md), line 97.

```reaction
when Sessioning.current (session), asked by Admin.CancelSchedule
where
  view "(session) does not belong to an admin" with (session)
  earlier, RequestBoundary.request (cycle, path: "/admin/schedules/cancel", requestId, session)
then
  RequestBoundary.respond (error: "ADMIN_ONLY", requestId)
```

### Admin.CancelSchedule:started#2

Authored path: `Admin.CancelSchedule`.
- Covered by [Admin](../design/compositions/Admin.md), line 90.
- Covered by [Admin](../design/compositions/Admin.md), line 97.

```reaction
when Sessioning.current (session), asked by Admin.CancelSchedule
where
  instant is the current flow's instant
  view "(session) belongs to an admin" with (session)
  earlier, RequestBoundary.request (cycle, path: "/admin/schedules/cancel", requestId, session)
  no view "(cycle) hasn't started at (now)" with (cycle, now: instant)
then
  RequestBoundary.respond (error: "ALREADY_STARTED", requestId)
```

### Admin.CancelSchedule:upcoming#2

Authored path: `Admin.CancelSchedule`.
- Covered by [Admin](../design/compositions/Admin.md), line 90.
- Covered by [Admin](../design/compositions/Admin.md), line 97.

```reaction
when Sessioning.current (session), asked by Admin.CancelSchedule
where
  instant is the current flow's instant
  view "(session) belongs to an admin" with (session)
  earlier, RequestBoundary.request (cycle, path: "/admin/schedules/cancel", requestId, session)
  view "(cycle) hasn't started at (now)" with (cycle, now: instant)
then
  Cycling.delete (cycle)
```

### Admin.CancelSchedule:upcoming#3

Authored path: `Admin.CancelSchedule`.
- Covered by [Admin](../design/compositions/Admin.md), line 90.
- Covered by [Admin](../design/compositions/Admin.md), line 97.

```reaction
when Cycling.delete (cycle, items), asked by Admin.CancelSchedule:upcoming#2
then
  Grouping.deleteMany (groups: items)
```

### Admin.CancelSchedule:upcoming#4

Authored path: `Admin.CancelSchedule`.
- Covered by [Admin](../design/compositions/Admin.md), line 90.
- Covered by [Admin](../design/compositions/Admin.md), line 97.

```reaction
when Grouping.deleteMany (groups: items), asked by Admin.CancelSchedule:upcoming#3
where
  earlier, Cycling.delete (cycle, items), asked by Admin.CancelSchedule:upcoming#2
  earlier, RequestBoundary.request (cycle, path: "/admin/schedules/cancel", requestId, session)
then
  RequestBoundary.respond (cycle, requestId)
```

### Admin.CreateSchedule

Authored path: `Admin.CreateSchedule`.
- Covered by [Admin](../design/compositions/Admin.md), line 54.
- Covered by [Admin](../design/compositions/Admin.md), line 69.

```reaction
when RequestBoundary.request (names, nominations, path: "/admin/schedules/create", period, requestId, runs, session, start)
then
  Sessioning.current (session)
```

### Admin.CreateSchedule:admin#2

Authored path: `Admin.CreateSchedule`.
- Covered by [Admin](../design/compositions/Admin.md), line 54.
- Covered by [Admin](../design/compositions/Admin.md), line 69.

```reaction
when Sessioning.current (session), asked by Admin.CreateSchedule
where
  instant is the current flow's instant
  view "(session) belongs to an admin" with (session)
  earlier, RequestBoundary.request (names, nominations, path: "/admin/schedules/create", period, requestId, runs, session, start)
  no view "a schedule from (start), (runs) seasons of (period), would overlap another" with (period, runs, start)
  no view "some of (nominations) can't be chosen" with (nominations)
then
  Grouping.createMany (createdAt: instant, names)
```

### Admin.CreateSchedule:admin#3

Authored path: `Admin.CreateSchedule`.
- Covered by [Admin](../design/compositions/Admin.md), line 54.
- Covered by [Admin](../design/compositions/Admin.md), line 69.

```reaction
when Grouping.createMany (createdAt: instant, names, groups), asked by Admin.CreateSchedule:admin#2
where
  earlier, RequestBoundary.request (names, nominations, path: "/admin/schedules/create", period, requestId, runs, session, start)
then
  Cycling.create (earliest: instant, period, runs, start)
```

### Admin.CreateSchedule:admin#4

Authored path: `Admin.CreateSchedule`.
- Covered by [Admin](../design/compositions/Admin.md), line 54.
- Covered by [Admin](../design/compositions/Admin.md), line 69.

```reaction
when Cycling.create (earliest: instant, period, runs, start, cycle), asked by Admin.CreateSchedule:admin#3
where
  earlier, Grouping.createMany (createdAt: instant, names, groups), asked by Admin.CreateSchedule:admin#2
then
  Cycling.addItems (cycle, items: groups)
```

### Admin.CreateSchedule:admin#5

Authored path: `Admin.CreateSchedule`.
- Covered by [Admin](../design/compositions/Admin.md), line 54.
- Covered by [Admin](../design/compositions/Admin.md), line 69.

```reaction
when Cycling.addItems (cycle, items: groups), asked by Admin.CreateSchedule:admin#4
where
  earlier, Grouping.createMany (createdAt: instant, names, groups), asked by Admin.CreateSchedule:admin#2
  earlier, RequestBoundary.request (names, nominations, path: "/admin/schedules/create", period, requestId, runs, session, start)
then
  Nominating.choose (chosenAt: instant, nominations)
```

### Admin.CreateSchedule:admin#6

Authored path: `Admin.CreateSchedule`.
- Covered by [Admin](../design/compositions/Admin.md), line 54.
- Covered by [Admin](../design/compositions/Admin.md), line 69.

```reaction
when Nominating.choose (chosenAt: instant, nominations), asked by Admin.CreateSchedule:admin#5
where
  earlier, Grouping.createMany (createdAt: instant, names, groups), asked by Admin.CreateSchedule:admin#2
  earlier, Cycling.create (earliest: instant, period, runs, start, cycle), asked by Admin.CreateSchedule:admin#3
  earlier, RequestBoundary.request (names, nominations, path: "/admin/schedules/create", period, requestId, runs, session, start)
then
  RequestBoundary.respond (cycle, groups, requestId)
```

### Admin.CreateSchedule:nomination-unavailable#2

Authored path: `Admin.CreateSchedule`.
- Covered by [Admin](../design/compositions/Admin.md), line 54.
- Covered by [Admin](../design/compositions/Admin.md), line 69.

```reaction
when Sessioning.current (session), asked by Admin.CreateSchedule
where
  view "(session) belongs to an admin" with (session)
  earlier, RequestBoundary.request (names, nominations, path: "/admin/schedules/create", period, requestId, runs, session, start)
  no view "a schedule from (start), (runs) seasons of (period), would overlap another" with (period, runs, start)
  view "some of (nominations) can't be chosen" with (nominations)
then
  RequestBoundary.respond (error: "NOMINATION_UNAVAILABLE", requestId)
```

### Admin.CreateSchedule:not-admin#2

Authored path: `Admin.CreateSchedule`.
- Covered by [Admin](../design/compositions/Admin.md), line 54.
- Covered by [Admin](../design/compositions/Admin.md), line 69.

```reaction
when Sessioning.current (session), asked by Admin.CreateSchedule
where
  view "(session) does not belong to an admin" with (session)
  earlier, RequestBoundary.request (names, nominations, path: "/admin/schedules/create", period, requestId, runs, session, start)
then
  RequestBoundary.respond (error: "ADMIN_ONLY", requestId)
```

### Admin.CreateSchedule:overlapping#2

Authored path: `Admin.CreateSchedule`.
- Covered by [Admin](../design/compositions/Admin.md), line 54.
- Covered by [Admin](../design/compositions/Admin.md), line 69.

```reaction
when Sessioning.current (session), asked by Admin.CreateSchedule
where
  view "(session) belongs to an admin" with (session)
  earlier, RequestBoundary.request (names, nominations, path: "/admin/schedules/create", period, requestId, runs, session, start)
  view "a schedule from (start), (runs) seasons of (period), would overlap another" with (period, runs, start)
then
  RequestBoundary.respond (error: "OVERLAPPING_SCHEDULE", requestId)
```

### Admin.ListAdmins

Authored path: `Admin.ListAdmins`.
- Covered by [Admin](../design/compositions/Admin.md), line 17.
- Covered by [Admin](../design/compositions/Admin.md), line 29.

```reaction
when RequestBoundary.request (path: "/admin/admins/list", requestId, session)
then
  Sessioning.current (session)
```

### Admin.ListAdmins:admin#2

Authored path: `Admin.ListAdmins`.
- Covered by [Admin](../design/compositions/Admin.md), line 17.
- Covered by [Admin](../design/compositions/Admin.md), line 29.

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
- Covered by [Admin](../design/compositions/Admin.md), line 17.
- Covered by [Admin](../design/compositions/Admin.md), line 29.

```reaction
when Sessioning.current (session), asked by Admin.ListAdmins
where
  view "(session) does not belong to an admin" with (session)
  earlier, RequestBoundary.request (path: "/admin/admins/list", requestId, session)
then
  RequestBoundary.respond (error: "ADMIN_ONLY", requestId)
```

### Admin.ListSchedules

Authored path: `Admin.ListSchedules`.
- Covered by [Admin](../design/compositions/Admin.md), line 49.
- Covered by [Admin](../design/compositions/Admin.md), line 68.

```reaction
when RequestBoundary.request (path: "/admin/schedules/list", requestId, session)
then
  Sessioning.current (session)
```

### Admin.ListSchedules:admin#2

Authored path: `Admin.ListSchedules`.
- Covered by [Admin](../design/compositions/Admin.md), line 49.
- Covered by [Admin](../design/compositions/Admin.md), line 68.

```reaction
when Sessioning.current (session), asked by Admin.ListSchedules
where
  view "(session) belongs to an admin" with (session)
  earlier, RequestBoundary.request (path: "/admin/schedules/list", requestId, session)
then
  RequestBoundary.respond (list: former "every schedule", requestId)
```

### Admin.ListSchedules:not-admin#2

Authored path: `Admin.ListSchedules`.
- Covered by [Admin](../design/compositions/Admin.md), line 49.
- Covered by [Admin](../design/compositions/Admin.md), line 68.

```reaction
when Sessioning.current (session), asked by Admin.ListSchedules
where
  view "(session) does not belong to an admin" with (session)
  earlier, RequestBoundary.request (path: "/admin/schedules/list", requestId, session)
then
  RequestBoundary.respond (error: "ADMIN_ONLY", requestId)
```

### Admin.RemoveAdmin

Authored path: `Admin.RemoveAdmin`.
- Covered by [Admin](../design/compositions/Admin.md), line 16.
- Covered by [Admin](../design/compositions/Admin.md), line 28.

```reaction
when RequestBoundary.request (path: "/admin/admins/remove", requestId, session, user)
then
  Sessioning.current (session)
```

### Admin.RemoveAdmin:not-owner#2

Authored path: `Admin.RemoveAdmin`.
- Covered by [Admin](../design/compositions/Admin.md), line 16.
- Covered by [Admin](../design/compositions/Admin.md), line 28.

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
- Covered by [Admin](../design/compositions/Admin.md), line 16.
- Covered by [Admin](../design/compositions/Admin.md), line 28.

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
- Covered by [Admin](../design/compositions/Admin.md), line 16.
- Covered by [Admin](../design/compositions/Admin.md), line 28.

```reaction
when Administrating.removeAdmin (user), asked by Admin.RemoveAdmin:owner#2
where
  earlier, RequestBoundary.request (path: "/admin/admins/remove", requestId, session, user)
then
  RequestBoundary.respond (requestId, user)
```

### Admin.RemoveGallery

Authored path: `Admin.RemoveGallery`.
- Covered by [Admin](../design/compositions/Admin.md), line 82.
- Covered by [Admin](../design/compositions/Admin.md), line 96.

```reaction
when RequestBoundary.request (cycle, group, path: "/admin/schedules/remove-gallery", requestId, session)
then
  Sessioning.current (session)
```

### Admin.RemoveGallery:admin#2

Authored path: `Admin.RemoveGallery`.
- Covered by [Admin](../design/compositions/Admin.md), line 82.
- Covered by [Admin](../design/compositions/Admin.md), line 96.

```reaction
when Sessioning.current (session), asked by Admin.RemoveGallery
where
  instant is the current flow's instant
  view "(session) belongs to an admin" with (session)
  earlier, RequestBoundary.request (cycle, group, path: "/admin/schedules/remove-gallery", requestId, session)
then
  Cycling.removeItem (cycle, item: group, now: instant)
```

### Admin.RemoveGallery:admin#3

Authored path: `Admin.RemoveGallery`.
- Covered by [Admin](../design/compositions/Admin.md), line 82.
- Covered by [Admin](../design/compositions/Admin.md), line 96.

```reaction
when Cycling.removeItem (cycle, item: group, now: instant), asked by Admin.RemoveGallery:admin#2
where
  earlier, RequestBoundary.request (cycle, group, path: "/admin/schedules/remove-gallery", requestId, session)
then
  RequestBoundary.respond (cycle, group, requestId)
```

### Admin.RemoveGallery:not-admin#2

Authored path: `Admin.RemoveGallery`.
- Covered by [Admin](../design/compositions/Admin.md), line 82.
- Covered by [Admin](../design/compositions/Admin.md), line 96.

```reaction
when Sessioning.current (session), asked by Admin.RemoveGallery
where
  view "(session) does not belong to an admin" with (session)
  earlier, RequestBoundary.request (cycle, group, path: "/admin/schedules/remove-gallery", requestId, session)
then
  RequestBoundary.respond (error: "ADMIN_ONLY", requestId)
```

### Admin.RemovePostFromGroup

Authored path: `Admin.RemovePostFromGroup`.
- Covered by [Admin](../design/compositions/Admin.md), line 34.
- Covered by [Admin](../design/compositions/Admin.md), line 38.

```reaction
when RequestBoundary.request (group, path: "/admin/groups/remove-post", post, requestId, session)
then
  Sessioning.current (session)
```

### Admin.RemovePostFromGroup:admin#2

Authored path: `Admin.RemovePostFromGroup`.
- Covered by [Admin](../design/compositions/Admin.md), line 34.
- Covered by [Admin](../design/compositions/Admin.md), line 38.

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
- Covered by [Admin](../design/compositions/Admin.md), line 34.
- Covered by [Admin](../design/compositions/Admin.md), line 38.

```reaction
when Grouping.removeItem (group, item: post), asked by Admin.RemovePostFromGroup:admin#2
where
  earlier, RequestBoundary.request (group, path: "/admin/groups/remove-post", post, requestId, session)
then
  RequestBoundary.respond (group, post, requestId)
```

### Admin.RemovePostFromGroup:not-admin#2

Authored path: `Admin.RemovePostFromGroup`.
- Covered by [Admin](../design/compositions/Admin.md), line 34.
- Covered by [Admin](../design/compositions/Admin.md), line 38.

```reaction
when Sessioning.current (session), asked by Admin.RemovePostFromGroup
where
  view "(session) does not belong to an admin" with (session)
  earlier, RequestBoundary.request (group, path: "/admin/groups/remove-post", post, requestId, session)
then
  RequestBoundary.respond (error: "ADMIN_ONLY", requestId)
```

### Admin.RoundOfNominations

Authored path: `Admin.RoundOfNominations`.
- Covered by [Admin](../design/compositions/Admin.md), line 108.
- Covered by [Admin](../design/compositions/Admin.md), line 114.

```reaction
when RequestBoundary.request (category, path: "/admin/nominations/round", requestId, round, session)
then
  Sessioning.current (session)
```

### Admin.RoundOfNominations:finished#2

Authored path: `Admin.RoundOfNominations`.
- Covered by [Admin](../design/compositions/Admin.md), line 108.
- Covered by [Admin](../design/compositions/Admin.md), line 114.

```reaction
when Sessioning.current (session), asked by Admin.RoundOfNominations
where
  instant is the current flow's instant
  view "(session) belongs to an admin" with (session)
  earlier, RequestBoundary.request (category, path: "/admin/nominations/round", requestId, round, session)
  Cycling._run (item: category, run: round) has (end, start)
  end is at most instant
then
  RequestBoundary.respond (ranking: former "the ranking of (category) from (start) to (end)" with (category, end, start), requestId)
```

### Admin.RoundOfNominations:no-such-round#2

Authored path: `Admin.RoundOfNominations`.
- Covered by [Admin](../design/compositions/Admin.md), line 108.
- Covered by [Admin](../design/compositions/Admin.md), line 114.

```reaction
when Sessioning.current (session), asked by Admin.RoundOfNominations
where
  view "(session) belongs to an admin" with (session)
  earlier, RequestBoundary.request (category, path: "/admin/nominations/round", requestId, round, session)
  no Cycling._run (item: category, run: round)
then
  RequestBoundary.respond (error: "NO_SUCH_ROUND", requestId)
```

### Admin.RoundOfNominations:not-admin#2

Authored path: `Admin.RoundOfNominations`.
- Covered by [Admin](../design/compositions/Admin.md), line 108.
- Covered by [Admin](../design/compositions/Admin.md), line 114.

```reaction
when Sessioning.current (session), asked by Admin.RoundOfNominations
where
  view "(session) does not belong to an admin" with (session)
  earlier, RequestBoundary.request (category, path: "/admin/nominations/round", requestId, round, session)
then
  RequestBoundary.respond (error: "ADMIN_ONLY", requestId)
```

### Admin.RoundOfNominations:not-finished#2

Authored path: `Admin.RoundOfNominations`.
- Covered by [Admin](../design/compositions/Admin.md), line 108.
- Covered by [Admin](../design/compositions/Admin.md), line 114.

```reaction
when Sessioning.current (session), asked by Admin.RoundOfNominations
where
  instant is the current flow's instant
  view "(session) belongs to an admin" with (session)
  earlier, RequestBoundary.request (category, path: "/admin/nominations/round", requestId, round, session)
  Cycling._run (item: category, run: round) has (end)
  end is greater than instant
then
  RequestBoundary.respond (error: "NO_SUCH_ROUND", requestId)
```

### Admin.SetScheduleRuns

Authored path: `Admin.SetScheduleRuns`.
- Covered by [Admin](../design/compositions/Admin.md), line 79.
- Covered by [Admin](../design/compositions/Admin.md), line 95.

```reaction
when RequestBoundary.request (cycle, path: "/admin/schedules/set-runs", requestId, runs, session)
then
  Sessioning.current (session)
```

### Admin.SetScheduleRuns:admin#2

Authored path: `Admin.SetScheduleRuns`.
- Covered by [Admin](../design/compositions/Admin.md), line 79.
- Covered by [Admin](../design/compositions/Admin.md), line 95.

```reaction
when Sessioning.current (session), asked by Admin.SetScheduleRuns
where
  instant is the current flow's instant
  view "(session) belongs to an admin" with (session)
  earlier, RequestBoundary.request (cycle, path: "/admin/schedules/set-runs", requestId, runs, session)
  no view "(cycle) with (runs) seasons would overlap another schedule" with (cycle, runs)
then
  Cycling.setRuns (cycle, now: instant, runs)
```

### Admin.SetScheduleRuns:admin#3

Authored path: `Admin.SetScheduleRuns`.
- Covered by [Admin](../design/compositions/Admin.md), line 79.
- Covered by [Admin](../design/compositions/Admin.md), line 95.

```reaction
when Cycling.setRuns (cycle, now: instant, runs), asked by Admin.SetScheduleRuns:admin#2
where
  earlier, RequestBoundary.request (cycle, path: "/admin/schedules/set-runs", requestId, runs, session)
then
  RequestBoundary.respond (cycle, requestId, runs)
```

### Admin.SetScheduleRuns:not-admin#2

Authored path: `Admin.SetScheduleRuns`.
- Covered by [Admin](../design/compositions/Admin.md), line 79.
- Covered by [Admin](../design/compositions/Admin.md), line 95.

```reaction
when Sessioning.current (session), asked by Admin.SetScheduleRuns
where
  view "(session) does not belong to an admin" with (session)
  earlier, RequestBoundary.request (cycle, path: "/admin/schedules/set-runs", requestId, runs, session)
then
  RequestBoundary.respond (error: "ADMIN_ONLY", requestId)
```

### Admin.SetScheduleRuns:overlapping#2

Authored path: `Admin.SetScheduleRuns`.
- Covered by [Admin](../design/compositions/Admin.md), line 79.
- Covered by [Admin](../design/compositions/Admin.md), line 95.

```reaction
when Sessioning.current (session), asked by Admin.SetScheduleRuns
where
  view "(session) belongs to an admin" with (session)
  earlier, RequestBoundary.request (cycle, path: "/admin/schedules/set-runs", requestId, runs, session)
  view "(cycle) with (runs) seasons would overlap another schedule" with (cycle, runs)
then
  RequestBoundary.respond (error: "OVERLAPPING_SCHEDULE", requestId)
```

### Admin.UnstartedGalleryIsDeleted

Authored path: `Admin.UnstartedGalleryIsDeleted`.
- Covered by [Admin](../design/compositions/Admin.md), line 85.

```reaction
when Cycling.removeItem (item)
where
  no Cycling._cycle (item)
  Grouping._get (group: item)
then
  Grouping.delete (group: item)
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

### Public.Archive:finished

Authored path: `Public.Archive`.
- Covered by [Public](../design/compositions/Public.md), line 32.
- Covered by [Public](../design/compositions/Public.md), line 38.

```reaction
when RequestBoundary.request (group, path: "/groups/archive", requestId, season)
where
  instant is the current flow's instant
  Cycling._run (item: group, run: season) has (end, start)
  end is at most instant
then
  RequestBoundary.respond (archive: former "the posts of (group) from (start) to (end)" with (end, group, start), requestId)
```

### Public.Archive:no-such-season

Authored path: `Public.Archive`.
- Covered by [Public](../design/compositions/Public.md), line 32.
- Covered by [Public](../design/compositions/Public.md), line 38.

```reaction
when RequestBoundary.request (group, path: "/groups/archive", requestId, season)
where
  no Cycling._run (item: group, run: season)
then
  RequestBoundary.respond (error: "NO_SUCH_SEASON", requestId)
```

### Public.Archive:not-finished

Authored path: `Public.Archive`.
- Covered by [Public](../design/compositions/Public.md), line 32.
- Covered by [Public](../design/compositions/Public.md), line 38.

```reaction
when RequestBoundary.request (group, path: "/groups/archive", requestId, season)
where
  instant is the current flow's instant
  Cycling._run (item: group, run: season) has (end)
  end is greater than instant
then
  RequestBoundary.respond (error: "NO_SUCH_SEASON", requestId)
```

### Public.ArchiveGalleries

Authored path: `Public.ArchiveGalleries`.
- Covered by [Public](../design/compositions/Public.md), line 41.
- Covered by [Public](../design/compositions/Public.md), line 48.

```reaction
when RequestBoundary.request (limit, offset, path: "/archive/galleries", requestId)
then
  RequestBoundary.respond (page: former "the groups from (offset), at most (limit)" with (limit, offset), requestId)
```

### Public.Feed:closed

Authored path: `Public.Feed`.
- Covered by [Public](../design/compositions/Public.md), line 22.
- Covered by [Public](../design/compositions/Public.md), line 29.

```reaction
when RequestBoundary.request (group, path: "/groups/feed", requestId)
where
  instant is the current flow's instant
  no Cycling._currentRun (item: group, now: instant)
then
  RequestBoundary.respond (feed: (posts: []), requestId)
```

### Public.Feed:open

Authored path: `Public.Feed`.
- Covered by [Public](../design/compositions/Public.md), line 22.
- Covered by [Public](../design/compositions/Public.md), line 29.

```reaction
when RequestBoundary.request (group, path: "/groups/feed", requestId)
where
  instant is the current flow's instant
  Cycling._currentRun (item: group, now: instant) has (end, start)
then
  RequestBoundary.respond (feed: former "the posts of (group) from (start) to (end)" with (end, group, start), requestId)
```

### Public.GetPost:found

Authored path: `Public.GetPost`.
- Covered by [Public](../design/compositions/Public.md), line 63.
- Covered by [Public](../design/compositions/Public.md), line 68.

```reaction
when RequestBoundary.request (path: "/posts/get", post, requestId)
where
  Posting._get (post)
then
  RequestBoundary.respond (post: former "the details of (post)" with (post), requestId)
```

### Public.GetPost:missing

Authored path: `Public.GetPost`.
- Covered by [Public](../design/compositions/Public.md), line 63.
- Covered by [Public](../design/compositions/Public.md), line 68.

```reaction
when RequestBoundary.request (path: "/posts/get", post, requestId)
where
  no Posting._get (post)
then
  RequestBoundary.respond (error: "NO_SUCH_POST", requestId)
```

### Public.ImageLink

Authored path: `Public.ImageLink`.
- Covered by [Public](../design/compositions/Public.md), line 52.
- Covered by [Public](../design/compositions/Public.md), line 58.

```reaction
when RequestBoundary.request (path: "/images/link", requestId, upload)
then
  Uploading.link (upload)
```

### Public.ImageLink#2

Authored path: `Public.ImageLink`.
- Covered by [Public](../design/compositions/Public.md), line 52.
- Covered by [Public](../design/compositions/Public.md), line 58.

```reaction
when Uploading.link (upload, url), asked by Public.ImageLink
where
  earlier, RequestBoundary.request (path: "/images/link", requestId, upload)
then
  RequestBoundary.respond (requestId, url)
```

### Public.ListCategories

Authored path: `Public.ListCategories`.
- Covered by [Public](../design/compositions/Public.md), line 73.
- Covered by [Public](../design/compositions/Public.md), line 78.

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
- Covered by [Public](../design/compositions/Public.md), line 19.

```reaction
when RequestBoundary.request (path: "/groups/list", requestId)
where
  instant is the current flow's instant
then
  RequestBoundary.respond (list: former "every group at (now)" with (now: instant), requestId)
```

### Public.ListNominations:closed

Authored path: `Public.ListNominations`.
- Covered by [Public](../design/compositions/Public.md), line 81.
- Covered by [Public](../design/compositions/Public.md), line 88.

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
- Covered by [Public](../design/compositions/Public.md), line 81.
- Covered by [Public](../design/compositions/Public.md), line 88.

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
- Covered by [User](../design/compositions/User.md), line 118.
- Covered by [User](../design/compositions/User.md), line 127.

```reaction
when RequestBoundary.request (category, name, path: "/nominations/create", requestId, session)
then
  Sessioning.current (session)
```

### User.CreateNomination:closed#2

Authored path: `User.CreateNomination`.
- Covered by [User](../design/compositions/User.md), line 118.
- Covered by [User](../design/compositions/User.md), line 127.

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
- Covered by [User](../design/compositions/User.md), line 118.
- Covered by [User](../design/compositions/User.md), line 127.

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
- Covered by [User](../design/compositions/User.md), line 118.
- Covered by [User](../design/compositions/User.md), line 127.

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
- Covered by [User](../design/compositions/User.md), line 118.
- Covered by [User](../design/compositions/User.md), line 127.

```reaction
when Nominating.nominate (category, createdAt, name, nominator: user, nomination), asked by User.CreateNomination:open#2
where
  earlier, RequestBoundary.request (category, name, path: "/nominations/create", requestId, session)
then
  RequestBoundary.respond (nomination, requestId)
```

### User.CreatePost

Authored path: `User.CreatePost`.
- Covered by [User](../design/compositions/User.md), line 48.
- Covered by [User](../design/compositions/User.md), line 62.

```reaction
when RequestBoundary.request (caption, content, group, path: "/posts/create", requestId, session)
then
  Sessioning.current (session)
```

### User.CreatePost#2

Authored path: `User.CreatePost`.
- Covered by [User](../design/compositions/User.md), line 48.
- Covered by [User](../design/compositions/User.md), line 62.

```reaction
when Sessioning.current (session, subject: user), asked by User.CreatePost
where
  earlier, RequestBoundary.request (caption, content, group, path: "/posts/create", requestId, session)
then
  Uploading.verify (maxSize: 10485760, owner: user, upload: content)
```

### User.CreatePost:closed#3

Authored path: `User.CreatePost`.
- Covered by [User](../design/compositions/User.md), line 48.
- Covered by [User](../design/compositions/User.md), line 62.

```reaction
when Uploading.verify (maxSize: 10485760, owner: user, upload: content), asked by User.CreatePost#2
where
  createdAt is the current flow's instant
  earlier, RequestBoundary.request (caption, content, group, path: "/posts/create", requestId, session)
  Grouping._get (group)
  no Cycling._currentRun (item: group, now: createdAt)
then
  RequestBoundary.respond (error: "GROUP_CLOSED", requestId)
```

### User.CreatePost:not-a-group#3

Authored path: `User.CreatePost`.
- Covered by [User](../design/compositions/User.md), line 48.
- Covered by [User](../design/compositions/User.md), line 62.

```reaction
when Uploading.verify (maxSize: 10485760, owner: user, upload: content), asked by User.CreatePost#2
where
  earlier, RequestBoundary.request (caption, content, group, path: "/posts/create", requestId, session)
  no Grouping._get (group)
then
  RequestBoundary.respond (error: "GROUP_CLOSED", requestId)
```

### User.CreatePost:open#3

Authored path: `User.CreatePost`.
- Covered by [User](../design/compositions/User.md), line 48.
- Covered by [User](../design/compositions/User.md), line 62.

```reaction
when Uploading.verify (maxSize: 10485760, owner: user, upload: content), asked by User.CreatePost#2
where
  createdAt is the current flow's instant
  earlier, RequestBoundary.request (caption, content, group, path: "/posts/create", requestId, session)
  view "(group) is open at (now)" with (group, now: createdAt)
then
  Posting.create (caption, content, createdAt, owner: user)
```

### User.CreatePost:open#4

Authored path: `User.CreatePost`.
- Covered by [User](../design/compositions/User.md), line 48.
- Covered by [User](../design/compositions/User.md), line 62.

```reaction
when Posting.create (caption, content, createdAt, owner: user, post), asked by User.CreatePost:open#3
where
  earlier, RequestBoundary.request (caption, content, group, path: "/posts/create", requestId, session)
then
  Grouping.addItem (addedAt: createdAt, group, item: post)
```

### User.CreatePost:open#5

Authored path: `User.CreatePost`.
- Covered by [User](../design/compositions/User.md), line 48.
- Covered by [User](../design/compositions/User.md), line 62.

```reaction
when Grouping.addItem (addedAt: createdAt, group, item: post), asked by User.CreatePost:open#4
where
  earlier, RequestBoundary.request (caption, content, group, path: "/posts/create", requestId, session)
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
- Covered by [User](../design/compositions/User.md), line 65.
- Covered by [User](../design/compositions/User.md), line 72.

```reaction
when RequestBoundary.request (path: "/posts/delete", post, requestId, session)
then
  Sessioning.current (session)
```

### User.DeletePost#2

Authored path: `User.DeletePost`.
- Covered by [User](../design/compositions/User.md), line 65.
- Covered by [User](../design/compositions/User.md), line 72.

```reaction
when Sessioning.current (session, subject: user), asked by User.DeletePost
where
  earlier, RequestBoundary.request (path: "/posts/delete", post, requestId, session)
then
  Posting.delete (post, user)
```

### User.DeletePost#3

Authored path: `User.DeletePost`.
- Covered by [User](../design/compositions/User.md), line 65.
- Covered by [User](../design/compositions/User.md), line 72.

```reaction
when Posting.delete (post, user), asked by User.DeletePost#2
where
  earlier, RequestBoundary.request (path: "/posts/delete", post, requestId, session)
then
  RequestBoundary.respond (post, requestId)
```

### User.DeletedPostLeavesGroups

Authored path: `User.DeletedPostLeavesGroups`.
- Covered by [User](../design/compositions/User.md), line 67.

```reaction
when Posting.delete (post)
where
  Grouping._groupsOf (item: post) has (group)
then
  Grouping.removeItem (group, item: post)
```

### User.DeletedPostLosesImage

Authored path: `User.DeletedPostLosesImage`.
- Covered by [User](../design/compositions/User.md), line 69.

```reaction
when Posting.delete (content)
then
  Uploading.remove (upload: content)
```

### User.DeletedPostLosesVotes

Authored path: `User.DeletedPostLosesVotes`.
- Covered by [User](../design/compositions/User.md), line 68.

```reaction
when Posting.delete (post)
then
  Upvoting.clear (target: post)
```

### User.ListMyNominationVotes

Authored path: `User.ListMyNominationVotes`.
- Covered by [User](../design/compositions/User.md), line 156.
- Covered by [User](../design/compositions/User.md), line 162.

```reaction
when RequestBoundary.request (category, path: "/nominations/my-votes", requestId, session)
then
  Sessioning.current (session)
```

### User.ListMyNominationVotes#2

Authored path: `User.ListMyNominationVotes`.
- Covered by [User](../design/compositions/User.md), line 156.
- Covered by [User](../design/compositions/User.md), line 162.

```reaction
when Sessioning.current (session, subject: user), asked by User.ListMyNominationVotes
where
  instant is the current flow's instant
  earlier, RequestBoundary.request (category, path: "/nominations/my-votes", requestId, session)
then
  RequestBoundary.respond (requestId, votes: former "the active nominations in (category) upvoted by (user) at (now)" with (category, now: instant, user))
```

### User.ListMyNominations

Authored path: `User.ListMyNominations`.
- Covered by [User](../design/compositions/User.md), line 141.
- Covered by [User](../design/compositions/User.md), line 147.

```reaction
when RequestBoundary.request (path: "/nominations/mine", requestId, session)
then
  Sessioning.current (session)
```

### User.ListMyNominations#2

Authored path: `User.ListMyNominations`.
- Covered by [User](../design/compositions/User.md), line 141.
- Covered by [User](../design/compositions/User.md), line 147.

```reaction
when Sessioning.current (session, subject: user), asked by User.ListMyNominations
where
  instant is the current flow's instant
  earlier, RequestBoundary.request (path: "/nominations/mine", requestId, session)
then
  RequestBoundary.respond (mine: former "the nominations of (user) at (now)" with (now: instant, user), requestId)
```

### User.ListMyPosts

Authored path: `User.ListMyPosts`.
- Covered by [User](../design/compositions/User.md), line 98.
- Covered by [User](../design/compositions/User.md), line 107.

```reaction
when RequestBoundary.request (path: "/posts/mine", requestId, session)
then
  Sessioning.current (session)
```

### User.ListMyPosts#2

Authored path: `User.ListMyPosts`.
- Covered by [User](../design/compositions/User.md), line 98.
- Covered by [User](../design/compositions/User.md), line 107.

```reaction
when Sessioning.current (session, subject: user), asked by User.ListMyPosts
where
  instant is the current flow's instant
  earlier, RequestBoundary.request (path: "/posts/mine", requestId, session)
then
  RequestBoundary.respond (mine: former "the posts of (user) at (now)" with (now: instant, user), requestId)
```

### User.ListMyVotes

Authored path: `User.ListMyVotes`.
- Covered by [User](../design/compositions/User.md), line 88.
- Covered by [User](../design/compositions/User.md), line 93.

```reaction
when RequestBoundary.request (group, path: "/posts/my-votes", requestId, session)
then
  Sessioning.current (session)
```

### User.ListMyVotes#2

Authored path: `User.ListMyVotes`.
- Covered by [User](../design/compositions/User.md), line 88.
- Covered by [User](../design/compositions/User.md), line 93.

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

### User.RequestUpload

Authored path: `User.RequestUpload`.
- Covered by [User](../design/compositions/User.md), line 35.
- Covered by [User](../design/compositions/User.md), line 43.

```reaction
when RequestBoundary.request (contentType, path: "/uploads/request", requestId, session)
then
  Sessioning.current (session)
```

### User.RequestUpload:image#2

Authored path: `User.RequestUpload`.
- Covered by [User](../design/compositions/User.md), line 35.
- Covered by [User](../design/compositions/User.md), line 43.

```reaction
when Sessioning.current (session, subject: user), asked by User.RequestUpload
where
  createdAt is the current flow's instant
  earlier, RequestBoundary.request (contentType, path: "/uploads/request", requestId, session)
  view "(contentType) is an accepted image type" with (contentType)
then
  Uploading.requestUpload (contentType, createdAt, owner: user)
```

### User.RequestUpload:image#3

Authored path: `User.RequestUpload`.
- Covered by [User](../design/compositions/User.md), line 35.
- Covered by [User](../design/compositions/User.md), line 43.

```reaction
when Uploading.requestUpload (contentType, createdAt, owner: user, upload, uploadUrl), asked by User.RequestUpload:image#2
where
  earlier, RequestBoundary.request (contentType, path: "/uploads/request", requestId, session)
then
  RequestBoundary.respond (requestId, upload, uploadUrl)
```

### User.RequestUpload:unsupported#2

Authored path: `User.RequestUpload`.
- Covered by [User](../design/compositions/User.md), line 35.
- Covered by [User](../design/compositions/User.md), line 43.

```reaction
when Sessioning.current (session, subject: user), asked by User.RequestUpload
where
  earlier, RequestBoundary.request (contentType, path: "/uploads/request", requestId, session)
  no view "(contentType) is an accepted image type" with (contentType)
then
  RequestBoundary.respond (error: "UNSUPPORTED_TYPE", requestId)
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
- Covered by [User](../design/compositions/User.md), line 79.
- Covered by [User](../design/compositions/User.md), line 85.

```reaction
when RequestBoundary.request (path: "/posts/unvote", post, requestId, session)
then
  Sessioning.current (session)
```

### User.Unvote:allowed#2

Authored path: `User.Unvote`.
- Covered by [User](../design/compositions/User.md), line 79.
- Covered by [User](../design/compositions/User.md), line 85.

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
- Covered by [User](../design/compositions/User.md), line 79.
- Covered by [User](../design/compositions/User.md), line 85.

```reaction
when Upvoting.unvote (target: post, voter: user), asked by User.Unvote:allowed#2
where
  earlier, RequestBoundary.request (path: "/posts/unvote", post, requestId, session)
then
  RequestBoundary.respond (post, requestId)
```

### User.Unvote:missing#2

Authored path: `User.Unvote`.
- Covered by [User](../design/compositions/User.md), line 79.
- Covered by [User](../design/compositions/User.md), line 85.

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
- Covered by [User](../design/compositions/User.md), line 79.
- Covered by [User](../design/compositions/User.md), line 85.

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
- Covered by [User](../design/compositions/User.md), line 79.
- Covered by [User](../design/compositions/User.md), line 85.

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
- Covered by [User](../design/compositions/User.md), line 153.
- Covered by [User](../design/compositions/User.md), line 161.

```reaction
when RequestBoundary.request (nomination, path: "/nominations/unvote", requestId, session)
then
  Sessioning.current (session)
```

### User.UnvoteNomination:allowed#2

Authored path: `User.UnvoteNomination`.
- Covered by [User](../design/compositions/User.md), line 153.
- Covered by [User](../design/compositions/User.md), line 161.

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
- Covered by [User](../design/compositions/User.md), line 153.
- Covered by [User](../design/compositions/User.md), line 161.

```reaction
when NominationVotes.unvote (target: nomination, voter: user), asked by User.UnvoteNomination:allowed#2
where
  earlier, RequestBoundary.request (nomination, path: "/nominations/unvote", requestId, session)
then
  RequestBoundary.respond (nomination, requestId)
```

### User.UnvoteNomination:inactive#2

Authored path: `User.UnvoteNomination`.
- Covered by [User](../design/compositions/User.md), line 153.
- Covered by [User](../design/compositions/User.md), line 161.

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
- Covered by [User](../design/compositions/User.md), line 153.
- Covered by [User](../design/compositions/User.md), line 161.

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
- Covered by [User](../design/compositions/User.md), line 153.
- Covered by [User](../design/compositions/User.md), line 161.

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
- Covered by [User](../design/compositions/User.md), line 79.
- Covered by [User](../design/compositions/User.md), line 84.

```reaction
when RequestBoundary.request (path: "/posts/vote", post, requestId, session)
then
  Sessioning.current (session)
```

### User.Vote:allowed#2

Authored path: `User.Vote`.
- Covered by [User](../design/compositions/User.md), line 79.
- Covered by [User](../design/compositions/User.md), line 84.

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
- Covered by [User](../design/compositions/User.md), line 79.
- Covered by [User](../design/compositions/User.md), line 84.

```reaction
when Upvoting.upvote (target: post, voter: user), asked by User.Vote:allowed#2
where
  earlier, RequestBoundary.request (path: "/posts/vote", post, requestId, session)
then
  RequestBoundary.respond (post, requestId)
```

### User.Vote:missing#2

Authored path: `User.Vote`.
- Covered by [User](../design/compositions/User.md), line 79.
- Covered by [User](../design/compositions/User.md), line 84.

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
- Covered by [User](../design/compositions/User.md), line 79.
- Covered by [User](../design/compositions/User.md), line 84.

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
- Covered by [User](../design/compositions/User.md), line 79.
- Covered by [User](../design/compositions/User.md), line 84.

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
- Covered by [User](../design/compositions/User.md), line 152.
- Covered by [User](../design/compositions/User.md), line 160.

```reaction
when RequestBoundary.request (nomination, path: "/nominations/vote", requestId, session)
then
  Sessioning.current (session)
```

### User.VoteNomination:allowed#2

Authored path: `User.VoteNomination`.
- Covered by [User](../design/compositions/User.md), line 152.
- Covered by [User](../design/compositions/User.md), line 160.

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
- Covered by [User](../design/compositions/User.md), line 152.
- Covered by [User](../design/compositions/User.md), line 160.

```reaction
when NominationVotes.upvote (target: nomination, voter: user), asked by User.VoteNomination:allowed#2
where
  earlier, RequestBoundary.request (nomination, path: "/nominations/vote", requestId, session)
then
  RequestBoundary.respond (nomination, requestId)
```

### User.VoteNomination:inactive#2

Authored path: `User.VoteNomination`.
- Covered by [User](../design/compositions/User.md), line 152.
- Covered by [User](../design/compositions/User.md), line 160.

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
- Covered by [User](../design/compositions/User.md), line 152.
- Covered by [User](../design/compositions/User.md), line 160.

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
- Covered by [User](../design/compositions/User.md), line 152.
- Covered by [User](../design/compositions/User.md), line 160.

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
- Covered by [User](../design/compositions/User.md), line 130.
- Covered by [User](../design/compositions/User.md), line 136.

```reaction
when RequestBoundary.request (nomination, path: "/nominations/withdraw", requestId, session)
then
  Sessioning.current (session)
```

### User.WithdrawNomination#2

Authored path: `User.WithdrawNomination`.
- Covered by [User](../design/compositions/User.md), line 130.
- Covered by [User](../design/compositions/User.md), line 136.

```reaction
when Sessioning.current (session, subject: user), asked by User.WithdrawNomination
where
  earlier, RequestBoundary.request (nomination, path: "/nominations/withdraw", requestId, session)
then
  Nominating.withdraw (nomination, nominator: user)
```

### User.WithdrawNomination#3

Authored path: `User.WithdrawNomination`.
- Covered by [User](../design/compositions/User.md), line 130.
- Covered by [User](../design/compositions/User.md), line 136.

```reaction
when Nominating.withdraw (nomination, nominator: user), asked by User.WithdrawNomination#2
where
  earlier, RequestBoundary.request (nomination, path: "/nominations/withdraw", requestId, session)
then
  RequestBoundary.respond (nomination, requestId)
```

### User.WithdrawnNominationLosesVotes

Authored path: `User.WithdrawnNominationLosesVotes`.
- Covered by [User](../design/compositions/User.md), line 133.

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
- `/admin/groups/remove-post` — requires `group`, `post`, `session`
- `/admin/nominations/round` — requires `category`, `round`, `session`
- `/admin/schedules/add-galleries` — requires `session`, `cycle`, `names`; fills `nominations` with [] when absent
- `/admin/schedules/cancel` — requires `cycle`, `session`
- `/admin/schedules/create` — requires `session`, `period`, `runs`, `start`, `names`; fills `nominations` with [] when absent
- `/admin/schedules/list` — requires `session`
- `/admin/schedules/remove-gallery` — requires `cycle`, `group`, `session`
- `/admin/schedules/set-runs` — requires `cycle`, `runs`, `session`
- `/archive/galleries` — requires `limit`, `offset`
- `/auth/current` — requires `session`
- `/auth/register` — requires `password`, `username`
- `/auth/sign-in` — requires `password`, `username`
- `/auth/sign-out` — requires `session`
- `/groups/archive` — requires `group`, `season`
- `/groups/feed` — requires `group`
- `/images/link` — requires `upload`
- `/nominations/create` — requires `category`, `name`, `session`
- `/nominations/list` — requires `category`
- `/nominations/mine` — requires `session`
- `/nominations/my-votes` — requires `category`, `session`
- `/nominations/unvote` — requires `nomination`, `session`
- `/nominations/vote` — requires `nomination`, `session`
- `/nominations/withdraw` — requires `nomination`, `session`
- `/posts/create` — requires `session`, `group`, `content`; fills `caption` with "" when absent
- `/posts/delete` — requires `post`, `session`
- `/posts/get` — requires `post`
- `/posts/mine` — requires `session`
- `/posts/my-votes` — requires `group`, `session`
- `/posts/unvote` — requires `post`, `session`
- `/posts/vote` — requires `post`, `session`
- `/uploads/request` — requires `contentType`, `session`

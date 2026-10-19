# Role and objective

Work unit `revise-curation`; role `critic`; phase `contracts`.

# Contract critic

Independently review the complete changed contract set after authored syntax validation. Use the brief, affected approved contracts, and supplied decomposition as authority.

Check scope, sole mechanism ownership, opaque peer identities, action success and refusal state, repetition, lifecycle, query cardinality and ordering, authorization enforcement, effect ownership, acknowledgement order, and recoverable obligations.

Record one compact assessment row per affected obligation covering trigger, closing reaction, visible success, false interval, acknowledgement order, retry identity, whether the owner accepts that identity, recovery action, and duplicate-effect risk. Inventory selected endpoints, internal reactions, views, formers, computations, links, and endpoint paths. Check that every derived value or optional-input branch implied by the prose has exactly one declared computation and that no computation depends on concept state.

Missing authority, bypassable authorization, duplicate ownership, unrecoverable required work, or behavior required for visible success/refusal is a blocker. When the brief or decomposition requires endpoints, links, or cross-concept behavior, the absence of an application contract in supplied or granted design is a blocker. Return a `Blocked` verdict for that absence, not `Approve` with a note. Give other consequential mismatches stable material-finding IDs. Ignore naming polish, parser mechanics, implementation staging, and unrelated pre-existing issues.

Do not edit design, prescribe implementation, or infer missing context.

# Access

Root: "/Users/milintunsiricharoengul/Desktop/the-moment". The short native message explicitly authorizes reading this prompt file; all assignment context is inline below. This is already a compiled role assignment: do not load a skill, workflow, harness guide, or another instruction file.

- Read: `design:compositions` ("/Users/milintunsiricharoengul/Desktop/the-moment/design/compositions"), `design:concepts` ("/Users/milintunsiricharoengul/Desktop/the-moment/design/concepts"), `design:types.md` ("/Users/milintunsiricharoengul/Desktop/the-moment/design/types.md").
- Write: none.
- Tools: `repository-read`.
- Shell: `none`; network: no; generated output: no; long-running processes: no.

Inspect only listed files or directories. In coordinator simulation, this grant binds the coordinator itself; broader coordinator access and prior discovery are unavailable to the assignment. Project checks may transitively read other project files, but do not inspect them yourself. Use supplied or task-named package-owned public documentation; do not browse package trees. Never inspect package `dist`, framework internals, caches, sibling applications, or undeclared declarations. Exclude `.git`, `.sync-engine` except this prompt, harness/skill configuration, agent traces, parent directories, and unrelated generated output. Ask for context instead of searching outside the grant. Generated files come only from granted commands. Never grantable: `git-mutation`, `dependency-installation`, `framework-internals`, `workflow-management`, `skill-cli-invocation`, `delegation-or-handoff`.

# Guidance

# Contract design and review

Use the supplied decomposition as boundary authority; without one, use the brief and affected approved contracts. Preserve accepted obligation IDs and their trigger, closing reaction, false interval, retry identity, and recovery.

## Concepts own complete mechanisms

Purpose names one mechanism and rules out a plausible alternative. Principle gives a short event-ordered story with real actors and values. State describes observable identity, relations, lifecycle, order, multiplicity, and invariants—not storage. External identities remain opaque and peer facts are never interpreted locally.

For every action, settle:

- inputs and returned identity;
- successful state transition;
- each expected refusal and the unchanged post-refusal state;
- repetition or deduplication behavior;
- lifecycle stage, deletion, expiry, and repair when applicable; and
- the owner action that enforces each race-sensitive or security-critical invariant.

A refusal has no partial effect. Repetition must succeed again, return the prior result, or refuse. Deduplication requires an operation identity accepted and checked atomically by the owner; a trace correlation ID is not enough.

Queries have no effects. State `one`, `optional`, or `many`, the empty or unknown case, and stable ordering for `many`. Do not invent CRUD symmetry or expose storage operations that are not part of the mechanism.

## Composition coordinates without stealing authority

Composition owns cross-concept policy, coordination, boundary adaptation, and recovery—not concept invariants. For each visible flow, state:

- actor and authenticated authority;
- requested resource and authorization condition;
- enforcement point;
- visible success and refusals;
- effect owner;
- ordering of required effects relative to acknowledgement; and
- material partial-failure and recovery behavior.

Request data is a claim, not authentication. Reject bypassable authorization, duplicate effect ownership, required work deferred after visible success when it can be lost, compensation without an available owner action, and claims of atomic or exactly-once behavior across independent owners.

For each obligation, verify that the trigger can occur, the closing reaction owns the intended effect, the owner accepts the retry identity, the false interval matches visible behavior, and recovery can run from an available action. This applies to synchronously awaited endpoint steps as well as deferred reactions. Never assume rollback between owners or exactly-once network delivery. Choose and state a realizable server-side acknowledgement boundary rather than adding protocol state solely to model whether a client received bytes.

## Select every executable explicitly

Inventory each selected static instance, endpoint, internal reaction, view, former, and computation. Give every executable declaration one exact typed link, and put all concrete types and instances needed by a new application in `design/types.md`. Each endpoint additionally needs exactly one matching `Declaration.Identity at /path` entry. The module, group, declaration, and pathname must agree.

A computation is a pure derivation of its declared inputs, such as normalization, a generated identifier, the current instant, or deciding whether an optional input was supplied. Anything read from concept state belongs in a query, view, or former, never a computation. Declare every computation the composition prose implies before review, including one for each optional-input branch. Implementation blocks on a missing declaration rather than inventing one.

An endpoint-linked reaction may own the full coordination required before its answer. Add a separate internal reaction only for intentionally distinct deferred or independently triggered behavior. Do not duplicate one effect in both declarations.

Contracts specify behavior, ownership, acknowledgement, and failure—not framework stages, trigger syntax, binding flow, host methods, status codes, or storage layout.

---

# Reading Simple State Form

State fences are declarations, not storage. Read them for what they promise:

- `a set of Items` and `a seq of Items` introduce identities; a `seq` also fixes order.
- A plain set holds every individual of its type in the state: with `a set of Users with
a reputation Number`, every User anywhere in the concept has a reputation, whether
  User is owned or external. An external type's set introduces no identity.
- `a set of Completed Items` classifies members of `Items`, and `a set of Late Completed
Items` members of `Completed Items`. A subset declares no second collection and no
  identity, subsets may overlap, and `a reviewer Verified User` holds only members of
  `Verified Users`.
- `an Author` is the field `author`; the type names a field written without a name.
- `an optional owner Person` may be absent. Collections never carry `optional`; empty
  means absent, so a set that must reject duplicates cannot also promise to detect them.
- `a Settings` has exactly one member.
- `alias WorkItem for Items` renames one declaration; it adds nothing.
- A `Rule:` line is prose the checker keeps verbatim and proves nothing.

Which side declares a relation implies no storage, navigation, or ownership.

---

# What a design says about its boundary

An endpoint takes one request and produces one answer. Endpoints are the only way into
the application, and every caller reaches them the same way, regardless of caller.

Say what a caller supplies, what comes back, and every refusal with a stable code and its
meaning. Each selected endpoint separately declares its exact `endpoint(...)` pathname in
an `endpoints` fence. Do not put transport rendering in behavioral prose or that fence: no
methods, status codes, headers, exit codes, or projected external routes.

When two refusals have to be indistinguishable to a caller, say that as behaviour.

A concept needing the current time or a generated identifier says so in its prose and
takes it as an action input; it never reaches for a clock. Composition binds one instant
per flow and passes it in, so no concept reports the time.

# Context

## Review task

**.sync-engine/work/revise-curation/inputs/critic-task.md**

# Review task

Review the candidate design for one bounded change to The Moment (an online, publicly
curated museum for contemporary art) and return one verdict.

## Change being reviewed
- New concept Administrating: one owner plus a set of admins; the owner is an admin,
  cannot be removed, and ownership is set once (by a setup script) and not transferred.
- New concept Nominating: categories and nominations (nominator, category, name, createdAt),
  a once-a-day limit per user counted from the last nomination time (withdrawing does not
  reset it), case-insensitive name equivalence, withdraw by the nominator.
- Cycling: new `_previousRun` query; its Item is now bound to `CycledItem` (a group or a
  nomination category).
- Upvoting gains a second instance, NominationVotes, over nominations.
- Admin composition: admin checks read Administrating instead of a hard-coded username;
  owner-only add/remove admin; admin-only category creation; previous-round ranking;
  cycle add-item/remove-item replace add-group/remove-group.
- Compositions are now exactly three: User (accounts/sessions, posting, post votes,
  nominating, nomination votes), Admin (admins, groups, categories, cycles, previous
  ranking), and Public (group list, feed, post details, category list, current ranking).
  The former Sessions and Nominations documents were merged into these.
- Nomination behavior: a category is active while its cycle has a current run;
  a nomination is active while made during that run; one active entry per equivalent
  name per category is enforced by the composition (accepted: a rare near-simultaneous
  duplicate); voting only on active nominations and never on your own; public ranked
  list (most votes, newest first among ties).
- Feed ranking: most votes, newest first among ties.
- The brief is the unfilled template by user decision; this task is the authoritative scope.

## Decided by the user (do not re-open)
- Admin is one level plus an owner. Promotion of nominations into galleries is manual.
- Nominations follow the same time-window model as posts (createdAt inside the current run
  of the category's cycle), not stored expiry.
- Duplicate-name refusal lives in the composition, accepting the race.
- Backend only; tests are out of scope for this change.

## Acceptance criteria for an Approve
- Each concept's spec is self-contained (no peer concept APIs), its actions cover every
  refusal it names, and its principle exercises its purpose.
- Every endpoint in the composition documents has branches that answer every request
  exactly once, and every composition-authored error is named.
- Bindings in types.md are consistent with how compositions pass identities.

Return findings with IDs, each naming the file and the concrete problem.

## Brief

**.sync-engine/work/revise-curation/brief.md**

# <!-- Change title -->

## Goal

<!-- State the useful outcome of this bounded change. -->

## Scope

<!-- List included behavior or areas and intentional exclusions. -->

## Requirements

<!-- List observable successes, refusals, and constraints. -->

## Active decisions

<!-- Record only product or process choices that later work must know. Explicit user direction overrides skill defaults unless it conflicts with safety or repository instructions. -->

- None.

## Done when

<!-- List each outcome and the evidence that establishes it. -->

## Open questions

None.

## Activity

<!-- Keep a concise chronological record of phase selection, delegated or simulated roles, material findings, validation, and handback. Detailed prompts and results live in the run artifacts. -->

- Work item started.

## Changed candidate contracts

**design/compositions/Admin.md**

# Admin

Curating groups, cycles, and nomination categories is reserved for admins, and only
the owner decides who the admins are. Every request resolves its session first, so a
request without an active session is refused. A session
[belongs to an admin](view:Admin.IsAdmin) when Administrating says its account is an
admin, which includes the owner; one that
[does not belong to an admin](view:Admin.IsNotAdmin) answers `ADMIN_ONLY` and changes
nothing. Likewise a session [belongs to the owner](view:Admin.IsOwner) or
[does not belong to the owner](view:Admin.IsNotOwner), which answers `OWNER_ONLY`.

## Admins

The owner may [add an admin](reaction:Admin.AddAdmin) and
[remove an admin](reaction:Admin.RemoveAdmin); Administrating refuses removing the
owner. Any admin may [list the admins](reaction:Admin.ListAdmins) as
[every admin and whether they are the owner](former:Admin.AdminList). The owner itself
is set once outside the application, by a setup script.

```endpoints
Admin.AddAdmin at /admin/admins/add
Admin.RemoveAdmin at /admin/admins/remove
Admin.ListAdmins at /admin/admins/list
```

## Groups

An admin may [create a group](reaction:Admin.CreateGroup) with a unique name and
[delete a group](reaction:Admin.DeleteGroup). Deleting a group does not delete its
posts; they simply stop appearing in any feed, because feeds reach posts through a
group. A deleted group also
[leaves the cycle it belonged to](reaction:Admin.DeletedGroupLeavesCycle).

```endpoints
Admin.CreateGroup at /admin/groups/create
Admin.DeleteGroup at /admin/groups/delete
```

An admin may also [add a post to a group](reaction:Admin.AddPostToGroup) or
[remove a post from a group](reaction:Admin.RemovePostFromGroup).

```endpoints
Admin.AddPostToGroup at /admin/groups/add-post
Admin.RemovePostFromGroup at /admin/groups/remove-post
```

## Nomination categories

Only an admin may [create a nomination category](reaction:Admin.CreateCategory), such
as "Future galleries". A category takes nominations only while it belongs to a cycle
with a run happening, so an admin adds it to a cycle like a group.

```endpoints
Admin.CreateCategory at /admin/categories/create
```

Choosing the next galleries is the admin's decision, informed by the crowd. An admin
may read [the previous round's ranking](reaction:Admin.PreviousRanking) of a category:
[the round's nominations ranked by votes](former:Public.RoundRanking) for the most
recent run of the category's cycle that has ended. By convention the top nomination
becomes a gallery, and the admin chooses the rest.

```endpoints
Admin.PreviousRanking at /admin/nominations/previous
```

## Cycles

A cycle sets the seasons for the groups and categories it holds. Gallery periods are
dynamic: a cycle may have any period, and its number of runs may change while it runs.
An admin may [list every cycle](reaction:Admin.ListCycles) as
[each cycle with the items it holds](former:Admin.CycleList),
[create a cycle](reaction:Admin.CreateCycle), which starts at the request's time with
the given period and number of runs, and [delete a cycle](reaction:Admin.DeleteCycle),
which closes every item it held.

```endpoints
Admin.ListCycles at /admin/cycles/list
Admin.CreateCycle at /admin/cycles/create
Admin.DeleteCycle at /admin/cycles/delete
```

A group or category is closed until it belongs to a cycle. An admin may
[add an item to a cycle](reaction:Admin.AddItemToCycle) or
[remove an item from a cycle](reaction:Admin.RemoveItemFromCycle); an item belongs to
at most one cycle. An admin may
[change how many runs a cycle has](reaction:Admin.SetCycleRuns) to extend it or to end
it immediately.

```endpoints
Admin.AddItemToCycle at /admin/cycles/add-item
Admin.RemoveItemFromCycle at /admin/cycles/remove-item
Admin.SetCycleRuns at /admin/cycles/set-runs
```

**design/compositions/Public.md**

# Public

Anyone may browse groups and posts without an account, so these reads take no
session.

## Groups

The [group list](reaction:Public.ListGroups) shows
[every group by name](former:Public.GroupList), each with
[the cycle it belongs to](former:Public.GroupCycle) and
[the run it is in right now](former:Public.GroupRun), either of which is blank when
the group has none. The frontend hides groups with no cycle and tells wings from
galleries by their cycle's period: 30 days or longer is a wing. Periods are dynamic,
since a cycle may have any length and its number of runs may change.

```endpoints
Public.ListGroups at /groups/list
```

A [group's feed](reaction:Public.Feed) shows
[the posts of its current run](former:Public.GroupFeed): the posts in the group
created during the run happening now, each with its owner, content, creation time,
and vote count. Posts are ranked by votes, most upvoted first, and among posts with the
same number of votes the newest comes first. A closed group's feed is empty.

```endpoints
Public.Feed at /groups/feed
```

## Posts

A [single post](reaction:Public.GetPost) shows [its details](former:Public.PostDetails),
including its vote count, even when it no longer appears in any group. A post that
does not exist answers `NO_SUCH_POST`.

```endpoints
Public.GetPost at /posts/get
```

## Nominations

Anyone may [list the nomination categories](reaction:Public.ListCategories) as
[every category with its current round](former:Public.CategoryList), which is blank
when the category is closed.

```endpoints
Public.ListCategories at /nominations/categories
```

Anyone may [read a category's current ranking](reaction:Public.ListNominations):
[the round's nominations ranked by votes](former:Public.RoundRanking) for the run
happening now, most upvoted first and newest first among ties. A closed category's
ranking is empty. Admins read the previous round's ranking through the same
construction.

```endpoints
Public.ListNominations at /nominations/list
```

**design/compositions/User.md**

# User

Everything a person does with their own account: signing in and out, posting art,
voting on posts, and nominating ideas for future galleries. Apart from registering
and signing in, every request resolves its session to an account first, so the account
becomes the post's owner, the vote's voter, or the nomination's nominator, and a caller
cannot act as anyone else. A request without an active session is refused.

## Account

Registration [establishes a new account and starts a session](reaction:User.Register)
for the returned account reference, which is that account's username.
[Sign-in](reaction:User.SignIn) proves an existing account's credentials and starts a
new session for the returned account reference. In both cases callers cannot choose a
different subject.

```endpoints
User.Register at /auth/register
User.SignIn at /auth/sign-in
```

An [active session resolves to its subject username](reaction:User.CurrentUser). An
unknown, ended, or expired session does not identify a current account.
[Signing out ends the presented active session](reaction:User.SignOut); other sessions
for the same account remain independent.

```endpoints
User.CurrentUser at /auth/current
User.SignOut at /auth/sign-out
```

## Posting

A person may [create a post in a group](reaction:User.CreatePost) only while that
group's cycle has a run happening. The post is created with the request's time as its
creation time and added to the group. A group that has no cycle, has not started, or
has finished every run answers `GROUP_CLOSED`.

```endpoints
User.CreatePost at /posts/create
```

The owner of a post may [delete it](reaction:User.DeletePost); anyone else is refused
by Posting. A deleted post
[leaves every group it was in](reaction:User.DeletedPostLeavesGroups) and
[loses its votes](reaction:User.DeletedPostLosesVotes).

```endpoints
User.DeletePost at /posts/delete
```

## Voting on posts

A post is [in season](view:User.PostInSeason) when one of its groups has a run
happening now and the post was created during that run. A person may
[upvote](reaction:User.Vote) or [take back an upvote on](reaction:User.Unvote) a post
only when it is in season and they do not own it. Otherwise the request answers
`OWN_POST`, `NOT_IN_SEASON`, or `NO_SUCH_POST` for a post that does not exist.

```endpoints
User.Vote at /posts/vote
User.Unvote at /posts/unvote
```

A person may [list their own votes in a group](reaction:User.ListMyVotes), which
answers [the posts in the group they have upvoted](former:User.MyVotes), so a page can
show whether each post is upvoted.

```endpoints
User.ListMyVotes at /posts/my-votes
```

## Nominating

A nomination category belongs to a cycle like a group, and a round is the cycle's
current run. A nomination is [active](view:User.NominationActive) while its category's
cycle has a run happening and the nomination was made during that run. When the run
ends, its nominations stop being active without anything changing, and the next round
starts empty.

A person may [nominate an idea](reaction:User.CreateNomination) in a category only
while the category has a round happening; otherwise the request answers
`CATEGORY_CLOSED`. Each round holds one entry per idea: when
[an equivalent name is already active](view:User.EquivalentActive) in the category,
the request answers `ALREADY_NOMINATED` so the person can upvote that entry instead.
Otherwise the nomination is made with the request's time, and Nominating still limits
each person to one nomination a day.

```endpoints
User.CreateNomination at /nominations/create
```

A nominator may [withdraw their nomination](reaction:User.WithdrawNomination); anyone
else is refused by Nominating. A withdrawn nomination
[loses its votes](reaction:User.WithdrawnNominationLosesVotes).

```endpoints
User.WithdrawNomination at /nominations/withdraw
```

## Voting on nominations

A person may [upvote](reaction:User.VoteNomination) or
[take back an upvote on](reaction:User.UnvoteNomination) a nomination only while it is
active and they did not make it. Otherwise the request answers `OWN_NOMINATION`,
`NOT_ACTIVE`, or `NO_SUCH_NOMINATION` for a nomination that does not exist. A person
may also [list their own votes in a category](reaction:User.ListMyNominationVotes),
which answers [the active nominations they have upvoted](former:User.MyNominationVotes).

```endpoints
User.VoteNomination at /nominations/vote
User.UnvoteNomination at /nominations/unvote
User.ListMyNominationVotes at /nominations/my-votes
```

**design/concepts/Administrating.md**

# Administrating

## Purpose

Give a chosen subset of users wider authority, under one owner who decides who
belongs to it.

## Principle

Milin is made the owner and is therefore an admin. Milin adds Gigi and Sid as admins,
so they are admins but not the owner, while Sasha is not an admin. Adding Gigi again
is refused. Milin removes Sid, and Sid is no longer an admin; removing Sid again is
refused, and removing Milin is refused because the owner cannot be removed. Making
Sasha the owner is refused because an owner already exists.

## Types

```types
external User
  A person who may be given authority.
```

## State

```state
a set of Admins with
  a unique user User
  an owner Flag
  Rule: at most one admin is the owner, and the owner can never be removed
```

## Actions

```actions
setOwner (user: User) : returns ()
  where an owner exists
  then
    refuses OWNER_EXISTS "The application already has an owner."
  where no owner exists
  then
    make user an admin if they are not one already, and mark them as the owner
    returns

addAdmin (user: User) : returns ()
  where user is already an admin
  then
    refuses ALREADY_ADMIN "This user is already an admin."
  where user is not an admin
  then
    add user as an admin who is not the owner
    returns

removeAdmin (user: User) : returns ()
  where user is not an admin
  then
    refuses NOT_ADMIN "This user is not an admin."
  where user is the owner
  then
    refuses OWNER_PROTECTED "The owner cannot be removed."
  where user is an admin and not the owner
  then
    remove user from the admins
    returns
```

## Queries

```queries
_isOwner (user: User) : one (owner: Flag)
  answers whether user is the owner, and false for anyone else

_isAdmin (user: User) : one (admin: Flag)
  answers whether user is an admin, which is true for the owner, and false for anyone else

_admins () : many (user: User, owner: Flag)
  answers every admin and whether they are the owner, ordered by user, and no rows when there are none
```

**design/concepts/Cycling.md**

# Cycling

## Purpose

Regularly limit and fix the amount of time that items are active for.

## Principle

A cycle is created with a start time, a fixed period, and a number of runs, and
items are added to it. The first run lasts one period from the start time; when it
ends, the next run begins immediately, and so on until the last run ends. While a
run is happening every item in the cycle is active in that run, and once every run
has ended the items are no longer active. Changing the number of runs extends the
cycle or ends it early.

## Types

```types
external Item
  The thing whose active time is cycled.
```

## State

```state
a set of Cycles with
  a start DateTime
  a period Number
  a runs Number
  an items set of Item
  Rule: period is a positive number of milliseconds and runs is a whole number of at least 1
  Rule: an item belongs to at most one cycle
```

## Actions

```actions
create (start: DateTime, period: Number, runs: Number) : returns (cycle: Cycle)
  where period is not positive or runs is not a whole number of at least 1
  then
    refuses INVALID_CYCLE "A cycle needs a positive period and at least one run."
  where period and runs are valid
  then
    create a new cycle with this start, period, and runs, and no items
    returns cycle

addItem (cycle: Cycle, item: Item) : returns ()
  where cycle is not in Cycles
  then
    refuses NO_SUCH_CYCLE "There is no such cycle."
  where item already belongs to a cycle
  then
    refuses ALREADY_CYCLING "This item already belongs to a cycle."
  where cycle is in Cycles and item belongs to no cycle
  then
    add item to cycle
    returns

removeItem (cycle: Cycle, item: Item) : returns ()
  where cycle is not in Cycles
  then
    refuses NO_SUCH_CYCLE "There is no such cycle."
  where item is not in cycle
  then
    refuses NOT_IN_CYCLE "This item is not in the cycle."
  where cycle is in Cycles and item is in cycle
  then
    remove item from cycle
    returns

setRuns (cycle: Cycle, runs: Number) : returns ()
  where cycle is not in Cycles
  then
    refuses NO_SUCH_CYCLE "There is no such cycle."
  where runs is not a whole number of at least 1
  then
    refuses INVALID_CYCLE "A cycle needs a positive period and at least one run."
  where cycle is in Cycles and runs is valid
  then
    set the cycle's runs to runs, which ends the cycle immediately when its runs have already elapsed
    returns

delete (cycle: Cycle) : returns ()
  where cycle is not in Cycles
  then
    refuses NO_SUCH_CYCLE "There is no such cycle."
  where cycle is in Cycles
  then
    delete cycle, so its items belong to no cycle
    returns
```

## Queries

```queries
_cycle (item: Item) : optional (cycle: Cycle, start: DateTime, period: Number, runs: Number)
  answers the cycle item belongs to, and no row when it belongs to none

_currentRun (item: Item, now: DateTime) : optional (run: Number, start: DateTime, end: DateTime)
  answers the run of item's cycle happening at now, counting runs from 0, where run k
  starts at the cycle's start plus k periods and ends one period later; no row when
  item belongs to no cycle, when now is before the cycle's start, or when every run
  has ended

_previousRun (item: Item, now: DateTime) : optional (run: Number, start: DateTime, end: DateTime)
  answers the most recent run of item's cycle that has ended by now: the run before the
  current one, or the last run once every run has ended; no row when item belongs to no
  cycle or no run has ended yet

_all () : many (cycle: Cycle, start: DateTime, period: Number, runs: Number)
  answers every cycle ordered by start, and no rows when there are none

_items (cycle: Cycle) : many (item: Item)
  answers the items in cycle ordered by item, and no rows when cycle is not in Cycles
  or holds no items
```

**design/concepts/Nominating.md**

# Nominating

## Purpose

Let a crowd openly name ideas for a category, so the ideas can be compared and the
best taken forward.

## Principle

A category "Future galleries" is created. Gigi nominates "Hands", and the category
lists it with the time it was made. Looking up " hands " in the category finds Gigi's
nomination, because names that differ only in spacing or case name the same idea.
Gigi's second nomination later that day is refused because Gigi nominated less than a
day ago. Sid nominates "Rainy days", and the category lists Sid's nomination before
Gigi's because it is newer. Gigi withdraws "Hands", and the category no longer lists
it.

## Types

```types
external User
  A person who names ideas.
```

## State

```state
a set of Categories with
  a unique name String

a set of Nominations with
  a nominator User
  a category Category
  a name String
  a createdAt DateTime
  Rule: names are equivalent when they match after trimming outer spaces, collapsing inner spaces, and ignoring case

a set of Users with
  a lastNominatedAt DateTime
```

## Actions

```actions
createCategory (name: String) : returns (category: Category)
  where a category with this name exists
  then
    refuses NAME_TAKEN "A category with this name already exists."
  where no category has this name
  then
    create a new category with this name
    returns category

nominate (nominator: User, category: Category, name: String, createdAt: DateTime) : returns (nomination: Nomination)
  where category is not in Categories
  then
    refuses NO_SUCH_CATEGORY "There is no such category."
  where name is empty after trimming
  then
    refuses INVALID_NAME "A nomination needs a name."
  where nominator's lastNominatedAt is less than one day before createdAt
  then
    refuses TOO_SOON "You can nominate once a day."
  where category is in Categories, name is not empty, and nominator may nominate
  then
    create a new nomination with nominator, category, name as written, and createdAt
    set nominator's lastNominatedAt to createdAt
    returns nomination

withdraw (nominator: User, nomination: Nomination) : returns ()
  where nomination is not in Nominations
  then
    refuses NO_SUCH_NOMINATION "There is no such nomination."
  where nominator is not the nomination's nominator
  then
    refuses NOT_NOMINATOR "Only the nominator can withdraw a nomination."
  where nomination exists and nominator is its nominator
  then
    delete nomination, leaving nominator's lastNominatedAt unchanged
    returns
```

## Queries

```queries
_categories () : many (category: Category, name: String)
  answers every category with its name, ordered by name, and no rows when there are none

_nominations (category: Category) : many (nomination: Nomination, nominator: User, name: String, createdAt: DateTime)
  answers every nomination in category, newest first, and no rows when there are none

_equivalent (category: Category, name: String) : many (nomination: Nomination, createdAt: DateTime)
  answers the nominations in category whose names are equivalent to name, newest first, and no rows when there are none

_get (nomination: Nomination) : optional (nominator: User, category: Category, name: String, createdAt: DateTime)
  answers the nomination's details, and no row when nomination is not in Nominations
```

**design/types.md**

# Application types

Every person is identified by their account's username, so each concept's user,
voter, owner, or nominator is an Authenticating account. Posts are artwork sources,
galleries and wings are groups of posts, and a cycle sets the seasons for both the
groups and the nomination categories it holds.

```types
concrete ArtworkSource
  The source of an artwork image, such as its URL.

concrete CycledItem
  Something whose seasons a cycle sets: a group of posts or a nomination category.
```

```instances
instantiate Authenticating

instantiate Sessioning with
  Subject is Authenticating.Account

instantiate Administrating with
  User is Authenticating.Account

instantiate Posting with
  User is Authenticating.Account
  Content is ArtworkSource

instantiate Upvoting with
  User is Authenticating.Account
  Item is Posting.Post

instantiate Grouping with
  Item is Posting.Post

instantiate Cycling with
  Item is CycledItem

instantiate Nominating with
  User is Authenticating.Account

instantiate Upvoting as NominationVotes with
  User is Authenticating.Account
  Item is Nominating.Nomination
```

## Affected existing contracts

**design/concepts/Authenticating.md**

# Authenticating

## Purpose

Establish a username from a password, so an identity claim alone cannot act as proof of identity.

## Principle

Ari registers username `ari` with a password. `_registered` then reports `ari`
as registered, and another registration of `ari` is refused.
Authenticating `ari` with the wrong password is refused. The correct password
authenticates Ari, returning the account reference, which is the username `ari`.

## Types

```types
opaque Secret
  A password verifier; its representation is the implementer's choice.
```

## State

```state
a set of Accounts with
  a unique username String
  a salt String
  a passwordVerifier Secret
```

## Actions

```actions
register (username: String, password: String) : returns (account: Account)
  where username is not 3 to 32 letters
  then
    refuses INVALID_USERNAME "A username must contain 3 to 32 characters."
  where password is shorter than 8 characters or longer than 128 characters
  then
    refuses INVALID_PASSWORD "A password must contain 8 to 128 characters."
  where username is already registered
  then
    refuses USERNAME_TAKEN "That username is already registered."
  where username and password are accepted
  then
    add a new account with username, a fresh salt, and a verifier derived from password and that salt
    bind account to that account
    returns account

authenticate (username: String, password: String) : returns (account: Account)
  where username is unknown or password does not verify
  then
    refuses INVALID_CREDENTIALS "The username or password is incorrect."
  where password verifies
  then
    bind account to the verified account
    returns account
```

## Queries

```queries
_registered (username: String) : one (registered: Flag)
  answers false for an unknown username
```

**design/concepts/Grouping.md**

# Grouping

## Purpose

Organize items with shared characteristics, so people are not overwhelmed by many
unrelated items.

## Principle

A group is created with a name. Items are added to it and removed from it, and the
group lists the items it holds. Deleting the group leaves its items untouched.

## Types

```types
external Item
  The thing being grouped.
```

## State

```state
a set of Groups with
  a unique name String
  an items set of Item
```

## Actions

```actions
create (name: String) : returns (group: Group)
  where a group with this name exists
  then
    refuses NAME_TAKEN "A group with this name already exists."
  where no group has this name
  then
    create a new group with this name and no items
    returns group

delete (group: Group) : returns ()
  where group is not in Groups
  then
    refuses NO_SUCH_GROUP "There is no such group."
  where group is in Groups
  then
    delete group
    returns

addItem (group: Group, item: Item) : returns ()
  where group is not in Groups
  then
    refuses NO_SUCH_GROUP "There is no such group."
  where item is already in group
  then
    refuses ALREADY_IN_GROUP "This item is already in the group."
  where group is in Groups and item is not in group
  then
    add item to group
    returns

removeItem (group: Group, item: Item) : returns ()
  where group is not in Groups
  then
    refuses NO_SUCH_GROUP "There is no such group."
  where item is not in group
  then
    refuses NOT_IN_GROUP "This item is not in the group."
  where group is in Groups and item is in group
  then
    remove item from group
    returns
```

## Queries

```queries
_groups () : many (group: Group, name: String)
  answers every group with its name, ordered by name, and no rows when there are none

_items (group: Group) : many (item: Item)
  answers the items in group ordered by item, and no rows when group is not in Groups or holds no items

_groupsOf (item: Item) : many (group: Group)
  answers every group that holds item, ordered by group, and no rows when none does

_byName (name: String) : optional (group: Group)
  answers the group with this name, and no row when no group has it
```

**design/concepts/Posting.md**

# Posting

## Purpose

Share content to a public forum to receive feedback from many other users.

## Principle

An author can create and delete a post.

## Types

```types
external User
  The author who owns a post.

external Content
  What a post shares.
```

## State

```state
a set of Posts with
  an owner User
  a content Content
  a createdAt DateTime
```

## Actions

```actions
create (owner: User, content: Content, createdAt: DateTime) : returns (post: Post)
  where true
  then
    create a new post with this owner, content, and createdAt
    returns post

delete (user: User, post: Post) : returns ()
  where post is not in Posts
  then
    refuses NO_SUCH_POST "There is no such post."
  where user is not the owner of post
  then
    refuses NOT_OWNER "Only the owner of a post can delete it."
  where post exists and user is the owner of post
  then
    delete this post
    returns
```

## Queries

```queries
_get (post: Post) : optional (owner: User, content: Content, createdAt: DateTime)
  answers the post's owner, content, and createdAt, and no row when the post is not in Posts
```

**design/concepts/Sessioning.md**

# Sessioning

## Purpose

Keep a short-lived opaque session for an external subject, so temporary access
can end without changing that subject's identity.

## Principle

Ari starts a session for subject `ari`. Before the session expires, `_active`
returns a row whose subject is `ari`, and `current` resolves the session to
`ari`. Ending the session makes it unknown, so another `current` call is
refused. An invented or expired session is refused in the same way, and
`_active` returns no row for it.

## Types

```types
external Subject
  The external identity represented by a session.
```

## State

```state
a set of Sessions with
  a subject Subject
  an expiresAt DateTime
```

## Actions

```actions
start (subject: Subject) : returns (session: Session, expiresAt: DateTime)
  where true
  then
    delete every expired session
    add a new opaque session for subject expiring 30 minutes from now
    returns session, expiresAt

current (session: Session) : returns (subject: Subject)
  where session is unknown, ended, or expired
  then
    delete the session if it is expired
    refuses UNKNOWN_SESSION "This session is not active."
  where session is active
  then
    bind subject to the Session's subject
    returns subject

end (session: Session) : returns (ended: Flag)
  where session is unknown, ended, or expired
  then
    delete the session if it is expired
    refuses UNKNOWN_SESSION "This session is not active."
  where session is active
  then
    delete session
    set ended to true
    returns ended
```

## Queries

```queries
_active (session: Session) : optional (subject: Subject, expiresAt: DateTime)
  answers no row for an unknown, ended, or expired Session
  does not delete an expired Session
```

**design/concepts/Upvoting.md**

# Upvoting

## Purpose

Rank items by popularity, so people are not overwhelmed with low quality items.

## Principle

A voter upvotes an item they resonate with and can take the vote back. Items are
ranked by their number of votes.

## Types

```types
external User
  The person who casts a vote.

external Item
  The thing being voted on.
```

## State

```state
a set of Votes with
  a voter User
  a target Item
  unique voter and target
```

## Actions

```actions
upvote (voter: User, target: Item) : returns ()
  where a vote with this voter and target exists
  then
    refuses ALREADY_VOTED "You have already upvoted this."
  where a vote with this voter and target does not exist
  then
    create a new vote with this voter and target
    returns

unvote (voter: User, target: Item) : returns ()
  where a vote with this voter and target does not exist
  then
    refuses NOT_VOTED "You have not upvoted this."
  where a vote with this voter and target exists
  then
    delete the vote with this voter and target
    returns

clear (target: Item) : returns ()
  where true
  then
    delete every vote for target
    returns
```

## Queries

```queries
_count (target: Item) : one (votes: Number)
  answers the number of votes for target, and 0 when it has none

_voted (voter: User, target: Item) : one (voted: Flag)
  answers whether voter has a vote for target, and false when it does not

_counts () : many (target: Item, votes: Number)
  answers every item with at least one vote and its number of votes, ordered by votes from most to fewest, then by target
```

# Result

Unless the task requests another format, return these headings in order. Omit progress narration.

- `## Verdict` — required. First line is exactly `Approve`, `Revise`, or `Blocked`.
- `## Assessments` — required. Compact obligation-by-obligation semantic assessment; do not restate contracts.
- `## Findings` — required. Stable-ID blocker or material findings, or none.

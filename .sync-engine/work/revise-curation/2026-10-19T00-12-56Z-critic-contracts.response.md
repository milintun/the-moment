## Verdict

Revise

## Assessments

Inventory. Instances: Authenticating, Sessioning, Administrating, Posting, Upvoting, Grouping, Cycling (Item is CycledItem), Nominating, NominationVotes (Upvoting). Endpoints: User 15 (auth 4, posts 5, nominations 6), Admin 15, Public 5; every endpoint has one `endpoints` entry and one reaction link. Views: User.PostInSeason, User.NominationActive, User.EquivalentActive, Admin.IsAdmin/IsNotAdmin/IsOwner/IsNotOwner. Formers: User.MyVotes, User.MyNominationVotes, Admin.AdminList, Admin.CycleList, Public.GroupList/GroupCycle/GroupRun/GroupFeed/PostDetails/CategoryList/RoundRanking. Internal reactions: DeletedPostLeavesGroups, DeletedPostLosesVotes, WithdrawnNominationLosesVotes, DeletedGroupLeavesCycle. No computations are implied; the current instant comes from the flow.

Concepts. Administrating owns ownership and membership completely; OWNER_EXISTS, ALREADY_ADMIN, NOT_ADMIN, OWNER_PROTECTED leave state unchanged; queries state one/many and order. Nominating owns categories, nominations, equivalence, and the daily limit; refusals are effect-free; withdraw deliberately preserves lastNominatedAt so repetition cannot reset the limit; `_nominations`/`_equivalent` order newest first. Cycling `_previousRun` is a pure query with a stated empty case. No concept reads a peer API.

Authorization. Admin endpoints resolve the session (refused when inactive) and branch on Administrating `_isAdmin` true/false; owner endpoints branch on `_isOwner` true/false; the branches are complementary for any active session. User endpoints take the actor only from the session. Accepted by the user: duplicate-name refusal is a composition observation and a near-simultaneous duplicate can occur.

| Obligation | Trigger | Closing step | Visible success | False interval | Ack order | Retry identity / owner accepts | Recovery | Duplicate risk |
|---|---|---|---|---|---|---|---|---|
| Post enters group | /posts/create open branch | Grouping.addItem after Posting.create | `{ post }` | none if addItem succeeds | before ack | none; a retry creates a second post | none declared | yes, see U1 |
| Deleted post leaves groups and votes | Posting.delete returns | Grouping.removeItem per group; Upvoting.clear | `{ post }` | until reactions run | after ack | post ID; removeItem refuses NOT_IN_GROUP on repeat, clear idempotent | rerunnable from same owners | none |
| Withdrawn nomination loses votes | Nominating.withdraw returns | NominationVotes.clear | `{}`-style ack | until reaction runs | after ack | nomination ID; clear idempotent | rerunnable | none; stale votes target a deleted nomination and are not listed |
| Deleted group leaves cycle | Grouping.delete returns | Cycling.removeItem | `{ group }` | until reaction runs | after ack | group ID; refuses NOT_IN_CYCLE on repeat | rerunnable | none |
| Owner exists | setup outside endpoints | Administrating.setOwner | none | until setup runs | n/a | user; OWNER_EXISTS on repeat | rerun setup | none, see A1 |

## Findings

- U1 (material): Cycling's Item is now CycledItem, so "the group has a current run" no longer implies the identifier is a group. `/posts/create` with a nomination category's identifier (or a group deleted between the run check and the add) passes the open branch, `Posting.create` succeeds, then `Grouping.addItem` refuses `NO_SUCH_GROUP`: the caller sees a refusal while a post now exists outside every group. The contract states no ordering, existence check, or recovery for this partial effect. (User.md, Posting; types.md CycledItem.)
- C1 (material): `/admin/cycles/add-item` accepts any identifier. Admin.md and types.md say a cycle holds groups and nomination categories, but no endpoint branch requires the item to be an existing group or category, so a post, nomination, or unknown identifier can join a cycle and later satisfy "open" checks (feeding U1). (Admin.md.)
- A1 (material): The owner is set "once outside the application, by a setup script", but endpoints are the only declared way into the application and no selected declaration covers `Administrating.setOwner`. The design must either declare the bootstrap as an explicit out-of-band host step with its failure and repeat behavior, or select a declaration for it; until then every owner-only endpoint depends on undeclared state. (Admin.md, Administrating.md.)

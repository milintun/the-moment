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

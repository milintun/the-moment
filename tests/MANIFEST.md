# Test manifest

Every test runs with `bun test` against a fresh, empty MongoDB test database, so tests
never touch real data or each other. Each refusal test asserts both the exact error and
that nothing changed (checked through the concept's own queries or follow-up reads).
Times are fixed dates, never the real clock.

## Setup

- `tests/helpers.ts`: fresh test database per test; a fake clock that tests move
  forward; for composition tests, the assembled app with an in-process client, plus
  helpers to register users and get their session tokens.
- `package.json`: `"test"` script pointing `MONGODB_URL` at a `themoment_test` database.
- Small production changes:
  - **Sessioning** takes an optional clock (defaults to the real one).
  - **`assembleApplication`** accepts an optional clock, passed to the engine for `now`.
- Composition tests call endpoints in-process, so they see exact error codes
  (`OWN_POST`), not HTTP categories (`FORBIDDEN`). The owner is set the way the setup
  script does it: `Administrating.setOwner` directly.

---

## Concept tests (`tests/concepts/`)

### Authenticating.test.ts
- **principle**: Milin registers → `_registered` true → registering Milin again refuses `USERNAME_TAKEN` → wrong password refuses `INVALID_CREDENTIALS` → right password returns `{ account: "milin" }`.
- **register**
  - returns `{ account: username }`
  - refuses `INVALID_USERNAME` for 2 and 33 characters; not registered afterwards
  - accepts the 3- and 32-character boundaries
  - refuses `INVALID_PASSWORD` for 7 and 129 characters; not registered afterwards
  - accepts the 8- and 128-character boundaries
  - refuses `USERNAME_TAKEN`; the original password still works and the new one does not
- **authenticate**
  - unknown username refuses `INVALID_CREDENTIALS`
  - wrong password refuses `INVALID_CREDENTIALS` (same error as unknown username)
- **scenarios**
  - the stored account never contains the plain password
- **queries**
  - `_registered` is false for an unknown username

### Sessioning.test.ts
- **principle**: start for Gigi → `current` returns Gigi and `_active` has a row → `end` returns `{ ended: true }` → `current` refuses `UNKNOWN_SESSION` and `_active` is empty.
- **start**
  - `expiresAt` is exactly 30 minutes after the clock
  - two sessions for the same subject are independent
- **current**
  - an invented session refuses `UNKNOWN_SESSION`
  - a session at exactly `expiresAt` refuses `UNKNOWN_SESSION`
  - an expired session refuses `UNKNOWN_SESSION` and is deleted (moving the clock back doesn't revive it)
- **end**
  - ending twice refuses `UNKNOWN_SESSION`
  - ending an expired session refuses `UNKNOWN_SESSION`
  - ending one session leaves the subject's other session active
- **scenarios**
  - `start` deletes other expired sessions
- **queries**
  - `_active` answers no row for an expired session but does not delete it (moving the clock back, `current` works again)

### Administrating.test.ts
- **principle**: Milin made owner (and admin) → Milin adds Gigi and Sid → adding Gigi again refuses `ALREADY_ADMIN` → removing Sid works → removing Sid again refuses `NOT_ADMIN` → removing Milin refuses `OWNER_PROTECTED` → making Sasha owner refuses `OWNER_EXISTS`.
- **setOwner**
  - makes a non-admin both admin and owner
  - promotes an existing admin to owner
  - refuses `OWNER_EXISTS`; Sasha is still neither admin nor owner
- **addAdmin**
  - adds a non-owner admin
  - refuses `ALREADY_ADMIN`, including for the owner; the owner stays owner
- **removeAdmin**
  - removes an admin, who can then be added again
  - refuses `NOT_ADMIN` for a non-admin
  - refuses `OWNER_PROTECTED`; the owner is still admin and owner
- **queries**
  - `_isAdmin` and `_isOwner` are false for unknown users
  - `_admins` is empty at first, then ordered by user with owner flags

### Posting.test.ts
- **principle**: Gigi creates a post → `_get` returns owner, content, createdAt → Gigi deletes it → `_get` is empty.
- **create**
  - two posts get different identities
  - `createdAt` is stored exactly as given
- **delete**
  - refuses `NOT_OWNER` for Sid; the post still exists
  - refuses `NO_SUCH_POST` for an unknown post
  - deleting twice refuses `NO_SUCH_POST`
- **queries**
  - `_get` answers no row for an unknown post

### Upvoting.test.ts
- **principle**: Gigi and Sid upvote p1, Gigi upvotes p2 → `_counts` ranks p1 (2) then p2 (1) → Gigi unvotes p1 → `_count(p1)` is 1.
- **upvote**
  - records a vote (`_voted` true)
  - refuses `ALREADY_VOTED`; the count stays 1
- **unvote**
  - removes the vote (`_voted` false)
  - refuses `NOT_VOTED` with no vote and after unvoting; the count is unchanged
  - re-upvoting after unvoting works
- **clear**
  - deletes every vote for the target and leaves other targets alone
  - succeeds when the target has no votes
- **scenarios**
  - two instances on different collections (posts vs nominations) don't share votes
- **queries**
  - `_count` is 0 for an item with no votes
  - `_counts` breaks ties by target and leaves out items with no votes

### Grouping.test.ts
- **principle**: create "Doodles" → add p1 and p2 → `_items` lists both → remove p1 → delete the group → `_items` empty, and p2's other groups are unaffected.
- **create**
  - refuses `NAME_TAKEN`; still only one group with that name
- **delete**
  - refuses `NO_SUCH_GROUP`
- **addItem**
  - refuses `NO_SUCH_GROUP`
  - refuses `ALREADY_IN_GROUP`; items unchanged
- **removeItem**
  - refuses `NO_SUCH_GROUP`
  - refuses `NOT_IN_GROUP`; items unchanged
- **queries**
  - `_groups` ordered by name
  - `_get` gives the name, or no row when unknown
  - `_items` most recently added first, and empty for an unknown group
  - `_groupsOf` lists every group holding the item, ordered
  - `_byName` finds the group, or no row when unknown

### Cycling.test.ts
- **principle**: a 1-day cycle with 3 runs holds a group and a category → both are in run 0, then run 1, then run 2 → after run 2 neither has a current run → `setRuns` to 4 reopens run 3 for both.
- **create**
  - refuses `INVALID_CYCLE` for period 0, a negative period, 0 runs, and 1.5 runs; no cycle created
- **addItem**
  - refuses `NO_SUCH_CYCLE`
  - refuses `ALREADY_CYCLING` for the same cycle and for a second cycle; the item stays in the first
- **removeItem**
  - removes the item (no current run afterwards)
  - refuses `NO_SUCH_CYCLE`
  - refuses `NOT_IN_CYCLE`, including an item in another cycle, which stays there
- **setRuns**
  - extends a cycle
  - lowering runs below the current run ends it immediately
  - refuses `INVALID_CYCLE` (0 and 1.5); runs unchanged
  - refuses `NO_SUCH_CYCLE`
- **delete**
  - deletes the cycle, and its items can join another cycle
  - refuses `NO_SUCH_CYCLE`
- **queries**
  - `_currentRun` before start, at start, just before and at a run boundary, and after the last run
  - `_previousRun` has none during run 0, gives run k−1 during run k, and gives the last run after the cycle ends
  - `_cycle` and `_items` for a member and a non-member
  - `_all` ordered by start

### Nominating.test.ts
- **principle**: create "Future galleries" → Gigi nominates "Hands" → `_equivalent(" hands ")` finds it → Gigi's second nomination that day refuses `TOO_SOON` → Sid nominates "Rainy days", listed before Gigi's → Gigi withdraws "Hands", which is no longer listed.
- **createCategory**
  - refuses `NAME_TAKEN`; still one category with that name
- **nominate**
  - refuses `NO_SUCH_CATEGORY`
  - refuses `INVALID_NAME` for a blank name; nothing created
  - refuses `TOO_SOON` 23h59m later; nothing created and the limit is still measured from the first nomination
  - allows exactly 24h later
  - the limit applies across categories
  - stores the name as written
- **withdraw**
  - refuses `NO_SUCH_NOMINATION`, including withdrawing twice
  - refuses `NOT_NOMINATOR`; still listed
  - withdrawing does not reset the daily limit
- **queries**
  - `_nominations` newest first, per category
  - `_equivalent` matches spacing and case variants but not "Hand", and only in its own category
  - `_categories` ordered by name
  - `_category` and `_get` give no row when unknown

### Uploading.test.ts
Runs against local storage (RustFS), in the `the-moment-test` bucket.
- **principle**: request → check before sending refuses `NOT_UPLOADED` → 2 MB file passes → someone else's check refuses `NOT_YOUR_UPLOAD` → 12 MB file refuses `INVALID_FILE` and is removed → read link works → after `remove`, `link` refuses `NO_SUCH_UPLOAD`.
- **requestUpload**
  - records the upload and returns a 10-minute link; nothing stored yet
  - accepts any type (the application decides which types it allows)
  - two requests get different uploads
- **verify**
  - refuses `NO_SUCH_UPLOAD`
  - refuses `NOT_YOUR_UPLOAD`; the file stays
  - refuses `NOT_UPLOADED` before the file arrives
  - accepts exactly `maxSize`; refuses `INVALID_FILE` one byte over and removes it
  - refuses `INVALID_FILE` when the sent type differs from the requested one, removing it
- **remove**
  - removes the record and the stored file
  - removes an upload whose file never arrived
  - refuses `NO_SUCH_UPLOAD`, including removing twice
- **link**
  - a 5-minute link that reads the file
  - refuses `NO_SUCH_UPLOAD`

---

## Composition tests (`tests/compositions/`)

### User.test.ts
- **uploads/request**
  - an accepted type gets an upload and a working upload link
  - all four accepted types (JPEG, PNG, WebP, SVG) are allowed
  - refuses `UNSUPPORTED_TYPE` for GIF, HEIC, and PDF; no upload recorded
  - refuses `UNKNOWN_SESSION`
- **auth**
  - register returns `account` and a session
  - current returns the username
  - sign-out, then current refuses `UNKNOWN_SESSION`
  - sign-in with the wrong password refuses `INVALID_CREDENTIALS`
  - registering twice refuses `USERNAME_TAKEN`
- **posts/create** (every post uses a real uploaded file)
  - into an open group: the post appears in the group's feed with its upload as content
  - refuses `NO_SUCH_UPLOAD`, `NOT_YOUR_UPLOAD` (the owner's file stays), `NOT_UPLOADED`, and `INVALID_FILE` over 10 MB or of the wrong type (file removed); nothing created
  - accepts exactly 10 MB
  - refuses `GROUP_CLOSED` for a category ID; no post created
  - refuses `GROUP_CLOSED` for a group with no cycle, and after the cycle ends
  - refuses `UNKNOWN_SESSION` without a session
- **posts/delete**
  - the owner deletes: the post leaves its groups, its votes are cleared, and its image is removed from storage
  - refuses `NOT_OWNER` for anyone else; nothing removed, image kept
- **posts/vote** and **posts/unvote**
  - allowed while in season
  - refuses `OWN_POST`
  - refuses `NOT_IN_SEASON` after the run rolls over
  - refuses `NO_SUCH_POST`
  - refuses `ALREADY_VOTED` and `NOT_VOTED`
  - vote counts unchanged after each refusal
- **posts/my-votes**
  - lists exactly the posts you upvoted in the group
- **nominations/create**
  - allowed in an open category
  - refuses `ALREADY_NOMINATED` for an equivalent name in the same round
  - the same name is allowed again in the next round
  - refuses `CATEGORY_CLOSED` with no cycle and after the cycle ends
  - passes through `TOO_SOON`
  - refuses `NO_SUCH_CATEGORY` for a group's ID
- **nominations/withdraw**
  - the nominator withdraws: its votes are cleared
  - refuses `NOT_NOMINATOR`
- **nominations/vote** and **nominations/unvote**
  - allowed while active
  - refuses `OWN_NOMINATION`
  - refuses `NOT_ACTIVE` after the round rolls over
  - refuses `NO_SUCH_NOMINATION`
- **nominations/my-votes**
  - lists only active nominations you upvoted

### Admin.test.ts
- **access**
  - before an owner exists, admin endpoints refuse `ADMIN_ONLY`
  - every admin-only endpoint refuses `ADMIN_ONLY` for a non-admin (one loop over all of them)
  - every owner-only endpoint refuses `OWNER_ONLY` for an admin who isn't the owner
  - no session refuses `UNKNOWN_SESSION`
- **admins**
  - the owner adds and removes admins
  - refuses `ALREADY_ADMIN` and `OWNER_PROTECTED`
  - an admin lists the admins
- **groups**
  - create, and refuses `NAME_TAKEN`
  - delete: the group leaves its cycle
  - add-post and remove-post
- **categories**
  - create, and refuses `NAME_TAKEN`
- **previous ranking**
  - empty during the first round
  - after the round rolls over: that round's nominations, most votes first and newest first on ties
- **cycles**
  - create and list with items
  - add-item for a group and for a category, and refuses `NO_SUCH_ITEM` for anything else
  - remove-item
  - set-runs ending a cycle early closes its group to posting
  - delete

### Public.test.ts
- **groups/list**
  - each group with its cycle and current run; blank for a group with no cycle
- **groups/feed**
  - only the current run's posts
  - ranked by votes, newest first on ties
  - empty for a closed group
- **images/link**
  - a working 5-minute link to the image; refuses `NO_SUCH_UPLOAD`
  - over HTTP, `GET /api/images/<upload>` answers 302 to the image, and 404 for an unknown upload
- **posts/get**
  - details with the vote count
  - still readable after the post leaves every group
  - refuses `NO_SUCH_POST`
- **nominations/categories**
  - each category with its current round; blank when closed
- **nominations/list**
  - the current round ranked by votes, newest first on ties
  - empty when closed

---

## Coverage checklist

| Concept | Actions (each run at least once) | Refusals (each triggered at least once) |
|---|---|---|
| Authenticating | register, authenticate | INVALID_USERNAME, INVALID_PASSWORD, USERNAME_TAKEN, INVALID_CREDENTIALS |
| Sessioning | start, current, end | UNKNOWN_SESSION |
| Administrating | setOwner, addAdmin, removeAdmin | OWNER_EXISTS, ALREADY_ADMIN, NOT_ADMIN, OWNER_PROTECTED |
| Posting | create, delete | NO_SUCH_POST, NOT_OWNER |
| Upvoting | upvote, unvote, clear | ALREADY_VOTED, NOT_VOTED |
| Grouping | create, delete, addItem, removeItem | NAME_TAKEN, NO_SUCH_GROUP, ALREADY_IN_GROUP, NOT_IN_GROUP |
| Cycling | create, addItem, removeItem, setRuns, delete | INVALID_CYCLE, NO_SUCH_CYCLE, ALREADY_CYCLING, NOT_IN_CYCLE |
| Nominating | createCategory, nominate, withdraw | NAME_TAKEN, NO_SUCH_CATEGORY, INVALID_NAME, TOO_SOON, NO_SUCH_NOMINATION, NOT_NOMINATOR |
| Uploading | requestUpload, verify, remove, link | NO_SUCH_UPLOAD, NOT_YOUR_UPLOAD, NOT_UPLOADED, INVALID_FILE |

Every endpoint (36) is called at least once in the composition tests, and every
composition-authored error (GROUP_CLOSED, OWN_POST, NOT_IN_SEASON, ADMIN_ONLY,
OWNER_ONLY, CATEGORY_CLOSED, ALREADY_NOMINATED, OWN_NOMINATION, NOT_ACTIVE,
NO_SUCH_ITEM, UNSUPPORTED_TYPE) is triggered at least once.

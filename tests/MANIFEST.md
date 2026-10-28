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
  - `_byOwner` lists only that owner's posts, newest first, and is empty for someone with none

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
- **principle**: create "Doodles" → add p1 and p2 → `_items` lists both → remove p1 → delete the group → `_items` empty, and p2's other groups are unaffected (deleting removes only that group's memberships).
- **create**
  - two groups may share a name
- **createMany**
  - a group per name, in order, even names an older group has
  - refuses `NO_NAMES`, `INVALID_NAME`, and `DUPLICATE_NAME` (ignoring case and spacing); nothing made
- **delete**
  - refuses `NO_SUCH_GROUP`
- **addItem**
  - refuses `NO_SUCH_GROUP`
  - refuses `ALREADY_IN_GROUP`; items unchanged
- **removeItem**
  - refuses `NO_SUCH_GROUP`
  - refuses `NOT_IN_GROUP`; items unchanged
- **queries**
  - `_groups` lists the oldest first, then by name
  - `_get` gives the name, or no row when unknown
  - `_items` most recently added first, and empty for an unknown group
  - `_groupsOf` lists every group holding the item, ordered
  - `_byName` finds the group, or no row when unknown
  - `_nameAmong` answers the name when it matches one of the names ignoring case and spacing, else no row
  - `deleteMany` deletes the given groups and their memberships, skipping unknown ones
  - `_page` answers a window of `_groups`; nothing past the end or for a bad offset/limit
  - `_itemsAdded` lists items added at or after `from` and before `to`, newest first

### Cycling.test.ts
- **principle**: a 1-day cycle with 3 runs holds two items → run 0, run 1 → one item removed during run 1 finishes it and is gone from run 2 → the other runs on → shortening below the run underway refuses `RUN_UNDERWAY` → extending to 4 opens run 3 for the item that stayed only.
- **create**
  - refuses `INVALID_CYCLE` for period 0, a negative period, 0 runs, and 1.5 runs; no cycle created
  - refuses `START_PASSED` more than a minute before `earliest`; within the minute is fine
  - reads a start sent as an ISO string
- **addItem and addItems**
  - refuse `NO_SUCH_CYCLE`
  - refuse `ALREADY_CYCLING` for the same cycle and for a second cycle; the item stays in the first
  - `addItems` adds all or none: one already cycling, or one listed twice, adds nothing
- **removeItem**
  - before the start: takes the item out entirely
  - once started: stays for the run underway and leaves from the next
  - refuses `NOT_IN_CYCLE` for an item elsewhere or already leaving
  - refuses `NO_LATER_RUN` during the last run
  - refuses `LAST_ITEM` when no other item would be left, before or after the start
  - refuses `NO_SUCH_CYCLE`
- **setRuns**
  - extends, and shortens down to the run underway
  - before the start any number; after the end it can be extended again
  - refuses `RUN_UNDERWAY` below the run underway; runs unchanged
  - refuses `LAST_ITEM` extending a cycle no item would stay in
  - refuses `INVALID_CYCLE` (0 and 1.5) and `NO_SUCH_CYCLE`
- **delete**
  - deletes the cycle, answers its items, and they can join another cycle
  - refuses `NO_SUCH_CYCLE`
- **queries**
  - `_currentRun` before start, at start, just before and at a run boundary, and after the last run
  - `_previousRun` none in run 0, run k−1 in run k, and an item's own last run after it left
  - `_run` gives the window of runs the item is in, and nothing past them
  - `_cycle` and `_items` report each item's own number of runs
  - `_overlapping` finds cycles of the same length and runs whose time overlaps (not ones touching at an end), leaving out `except`
  - `_all` ordered by start

### Nominating.test.ts
- **principle**: create "Future galleries" → Gigi nominates "Hands" → `_equivalent(" hands ")` finds it → Gigi's second nomination that day refuses `TOO_SOON` → Sid nominates "Rainy days", listed before Gigi's → Gigi withdraws "Hands", which is no longer listed → Sid's "Rainy days" is chosen, stays listed marked chosen, and can't be withdrawn or chosen again.
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
- **choose**
  - marks every listed nomination chosen; a chosen one can't be withdrawn (`CHOSEN`)
  - refuses `NO_SUCH_NOMINATION`, and `CHOSEN` for one already chosen or listed twice; none chosen
  - `_unavailable` answers the missing, chosen, and repeated ones
- **queries**
  - `_nominations` newest first, per category
  - `_equivalent` matches spacing and case variants but not "Hand", and only in its own category
  - `_byNominator` lists one person's nominations from every category, newest first
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

## Setup steps (`tests/owner.test.ts`, `tests/nominations.test.ts`)
- `makeOwner`: makes a registered account the owner; never an unregistered name; never replaces an owner
- `ensureFutureGalleries`: creates the one Future galleries category; never a second one on restart; it follows a weekly cycle starting Monday 12 AM Eastern, running now, a week per round; restarting reuses that cycle; moves the category out of an admin-made cycle, leaving that cycle's galleries

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
- **posts/mine**
  - your posts newest first, with caption, time, votes, gallery, season, and current; others' posts excluded
  - keeps the season a post was made in; stops marking it current once the season ends
  - lists every gallery a post is in
  - a post whose gallery was deleted is still listed, with no galleries
  - empty for someone with no posts; refuses `UNKNOWN_SESSION`
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
- **nominations/mine**
  - your nominations from every round with votes, the current round's marked current; empty for someone with none; refuses `UNKNOWN_SESSION`
- **nominations/my-votes**
  - lists only active nominations you upvoted

### Admin.test.ts
- **access**
  - before an owner exists, admin endpoints refuse `ADMIN_ONLY`
  - every admin-only endpoint refuses `ADMIN_ONLY` for a non-admin (one loop over all of them)
  - every owner-only endpoint refuses `OWNER_ONLY` for an admin who isn't the owner
  - no session refuses `UNKNOWN_SESSION`
- **admins**
  - the owner adds and removes admins, who gain and lose access
  - refuses `NO_SUCH_USER`, `ALREADY_ADMIN`, and `OWNER_PROTECTED`
  - an admin lists the admins
- **groups/remove-post**
  - takes a post off a wall, keeping the post
- **schedules/create**
  - makes the schedule and its galleries, open from the start, and lists them
  - a later start keeps the galleries closed until then
  - refuses `START_PASSED` beyond a minute's grace; no schedule
  - refuses `NO_NAMES`, `INVALID_NAME`, `DUPLICATE_NAME`, `INVALID_CYCLE`; nothing made
  - names only need to differ within a schedule
  - refuses `OVERLAPPING_SCHEDULE` for the same length and number while one runs; touching ends, other numbers, and other lengths may overlap
  - marks picked nominations chosen (then `CHOSEN` on withdraw); refuses `NOMINATION_UNAVAILABLE` for a chosen one, making nothing
  - the cycle nomination rounds follow isn't listed, and never counts as overlapping
- **schedules/add-galleries**
  - adds typed and picked galleries to an upcoming schedule, marking nominations chosen; they open with it
  - refuses `DUPLICATE_NAME` for a name already in the schedule (ignoring case and spacing), making nothing; other schedules' names don't count
  - refuses `ALREADY_STARTED` once started, and `NOMINATION_UNAVAILABLE`
- **schedules/set-runs**
  - extends and ends early, never before the season underway (`RUN_UNDERWAY`)
  - refuses `OVERLAPPING_SCHEDULE` when the new number matches an overlapping schedule
- **schedules/remove-gallery**
  - once started: finishes this season, leaves from the next, its season stays archived, and lists show its own number of seasons
  - before the start: taken out and deleted
  - refuses `LAST_ITEM` and `NO_LATER_RUN`
- **schedules/cancel**
  - cancels an upcoming schedule, deleting its galleries
  - refuses `ALREADY_STARTED`
- **nominations/round**
  - a finished round ranked by votes, newest first on ties, with chosen flags; `NO_SUCH_ROUND` while running and for a round that doesn't exist

### Public.test.ts
- **groups/list**
  - each group with its cycle and current run; blank for a group with no cycle
- **groups/archive**
  - a finished season shows its posts with final votes, most first and newest first on ties
  - refuses `NO_SUCH_SEASON` for the season still running, a season the cycle doesn't have, and a group with no cycle
  - the last season is archived once the whole cycle has ended
- **archive/galleries** (archive pagination, done by Grouping's `_page`)
  - pages through galleries oldest first, each with its cycle, blank without one; empty past the end
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
| Grouping | create, createMany, delete, deleteMany, addItem, removeItem | NO_NAMES, INVALID_NAME, DUPLICATE_NAME, NO_SUCH_GROUP, ALREADY_IN_GROUP, NOT_IN_GROUP |
| Cycling | create, addItem, addItems, removeItem, setRuns, delete | INVALID_CYCLE, START_PASSED, NO_SUCH_CYCLE, ALREADY_CYCLING, NOT_IN_CYCLE, NO_LATER_RUN, LAST_ITEM, RUN_UNDERWAY |
| Nominating | createCategory, nominate, withdraw, choose | NAME_TAKEN, NO_SUCH_CATEGORY, INVALID_NAME, TOO_SOON, NO_SUCH_NOMINATION, NOT_NOMINATOR, CHOSEN |
| Uploading | requestUpload, verify, remove, link | NO_SUCH_UPLOAD, NOT_YOUR_UPLOAD, NOT_UPLOADED, INVALID_FILE |

Every endpoint (36) is called at least once in the composition tests, and every
composition-authored error (GROUP_CLOSED, OWN_POST, NOT_IN_SEASON, ADMIN_ONLY,
OWNER_ONLY, CATEGORY_CLOSED, ALREADY_NOMINATED, OWN_NOMINATION, NOT_ACTIVE,
UNSUPPORTED_TYPE, NO_SUCH_USER, OVERLAPPING_SCHEDULE, NOMINATION_UNAVAILABLE,
ALREADY_STARTED, NO_SUCH_ROUND) is triggered at least once.

## Frontend tests

Run with `bun run test:web` (Vitest, simulated browser, fake backend, no services needed) and
`bun run test:e2e` (Playwright, real browser and server; needs `bun run db:up`). The e2e server
(e2e/server.ts) wipes and uses its own `themoment_e2e` database and the test bucket, and seeds the
owner `curator`. `bun run test:all` runs backend, frontend, and e2e.

### web/tests/helpers.spec.ts
- `normalizeName` trims, collapses spaces, lowercases
- `finishedSeasons`: only ended seasons with dates; finished exactly at its end; never past the last run; none without a cycle
- `refreshMe`: owner admin; non-admin; signed out without asking for admins
- `rooms`: walking order with wings before galleries, closed ones left out; fixed rooms when the list fails
- `rooms` tags galleries "new" and "ending soon"
- `roomAt`: home, galleries, future galleries, and the whole archive are rooms; other pages aren't
- `neighbours`: before and after, ends, unknown room
- **season notices**: the window is 20% of the season, at most a day; new / open / ending / ended at the exact edges, for short and long seasons; none without a season; `span` wording
- **explain**: the endpoint's message; a page's tie wins; category then general fallbacks; network failure

### web/tests/components.spec.ts
- **AuthForm**: log in sends what was typed, learns who you are, goes home; refusals (wrong password, taken, bad username vs bad password told apart by what was typed) show their message and stay put
- **ErrorNote**: a message, or a problem only at its own spot; an ended session links to log in
- **routes**: the site's address always opens at the entrance; old addresses redirect
- **entrance**: wide screens enter through the doorway only (page clicks do nothing); narrow screens have no doorway and an enter button; either way you land home; pointing at either half of the figure lights that side and its blurb, and the last side holds

### web/tests/pages.spec.ts
- **gallery view**: artwork with caption, owner, votes, image; signed out has no buttons and posting goes to log in; closed gallery offers no posting; empty wall; upvote → "unvote" filled in → back; no voting on your own post, delete after confirming; admin removes someone's post after confirming; non-admins never see removal; a refusal shows next to its post; a post already gone leaves with the message above; an ended session links to log in
- **gallery season notices**: new season says when it started; ending soon counts down; none mid-season and the last season is marked final; a season ending with the page open points to the archive, hides posting, and a vote then says votes are final without reloading the wall
- **future galleries**: counts down to the close; an idea already nominated is caught before the server; a refusal in an open round means once a day; voting after the round closed says votes are final
- **chosen ideas**: Future galleries strikes a chosen idea and its nominator can't withdraw it; my nominations says "chosen" instead of withdraw

- **archive**: each room with finished seasons by name and the dates its seasons span, opening into "season n" links to each season's wall; the search narrows by name as you type (ignoring case and spacing), says when nothing matches, and first loads the pages not loaded yet

### web/tests/floorplan.spec.ts
- **plan**, for 0–30 galleries and 0–5 wings: every room placed once, nothing overlapping, all inside the bounds; every room has a doorway; the entrance is lowest under a home that never moves; future galleries sit at the last row's end with the archive above; rows of four slots wind back and forth with a turning rotunda between; a wing is two slots by a whole row and galleries pair across the corridor; the same rooms give the same plan and more galleries leave earlier ones in place
- **wrap**: fits words to two lines, cut short with …
- **ringPath**: a full circle, or one arc per gap
- **the map** (an overlay over the page, opened from its mini map): every room a link in walking order, named with its kind and notice; pins the room you're in "you are here" and opens on it; choosing a room goes there and closes the map; × and a click on the dimmed page close it, the mini map opens it again; dragging moves the view (only past a few pixels) and the click ending a drag enters nothing; scrolling zooms, capped at 3×, and the buttons zoom and recenter; arrow keys pan and +/− zoom
- **the little person**: waits in the corner, follows a hovering pointer over the map, and goes back when it leaves; a touch doesn't summon them; clicking a room drops them in, then enters; a keyboard press enters at once
- **where you are, on every room's page**: a gallery's mini map marks it "you are here" with a pin under a MAP label, and Enter on it opens the map; the mini map pans when dragged, a click outside its rooms expands it, a click on a room goes there, and its rooms stay out of the tab order; home, future galleries, the archive, and galleries each have the mini map and the rooms before and after; non-room pages have neither; the top bar's name goes to the entrance

### web/tests/admin.spec.ts
- **home**: an admin gets a red admin button apart from sign out; others get none
- **admin sections**: sidebar shows one section at a time, new schedule first; each section has its own address; non-admins turned away
- **new schedule**: starts at the next 12 AM by default; 30+ day seasons say they make wings; last week's round first, older rounds by arrow, chosen ideas struck and unpickable; creates with typed and picked galleries and lands on schedules; no galleries, duplicate names, and a past start caught before the server; overlap explained; nothing to pick before any round finishes
- **schedules**: read only until edited (edit / done); an upcoming one gains typed and picked galleries; a name already in it is caught before the server; a running one can't gain galleries; a running schedule's season, and removing says it stays this season; no removing in the final season, of a gallery already leaving, or of the last one staying; cancelling an upcoming one after confirming; a running one can't be cancelled or end before the season underway; finished schedules tucked away; a new one announced
- **people**: adding an unregistered name is explained

### e2e/museum.spec.ts
- the entrance's doorway goes home, and the site's address opens at the entrance every time
- register, post an image with a caption, land on it, and the image loads from storage
- another visitor upvotes, then unvotes
- an artist deletes their own post after confirming
- an admin removes someone's post from a gallery
- the owner schedules a gallery from the admin page (red admin button → new schedule); it's listed as running, opens on the floor plan tagged "new"
- an upcoming schedule shows only "edit" until edited, then gains a gallery
- on the map, dragging from a room pans without entering it, then a click enters
- the map opens over the page, pinning where you are; the little person drops into the room clicked, closing it; Esc closes it; future galleries marks "you are here" with its neighbours
- refusals show their own message: a taken username, adding an admin nobody registered
- signed out, "post here" goes to log in

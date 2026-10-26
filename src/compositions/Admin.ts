import { endpoint, receive, respond } from "@mit-sdg/sync-engine/boundary";
import { each, form, former, is, no, now, reaction, view, when, where } from "@mit-sdg/sync-engine/language";
import { concepts } from "../concepts.ts";
import { RoundRanking } from "./Public.ts";

const { Authenticating, Sessioning, Administrating, Grouping, Cycling, Nominating } = concepts;

// ---------- Who may act ----------
// Every endpoint here resolves the session first (an inactive session is refused with
// UNKNOWN_SESSION), then splits on one of these complementary pairs.

const IsAdmin = view("(session) belongs to an admin", ({ session }, _outputs, { user }) =>
  where(Sessioning._active({ session }).is({ subject: user }), Administrating._isAdmin({ user }).is({ admin: true })),
).holds();

const IsNotAdmin = view("(session) does not belong to an admin", ({ session }, _outputs, { user }) =>
  where(Sessioning._active({ session }).is({ subject: user }), Administrating._isAdmin({ user }).is({ admin: false })),
).holds();

const IsOwner = view("(session) belongs to the owner", ({ session }, _outputs, { user }) =>
  where(Sessioning._active({ session }).is({ subject: user }), Administrating._isOwner({ user }).is({ owner: true })),
).holds();

const IsNotOwner = view("(session) does not belong to the owner", ({ session }, _outputs, { user }) =>
  where(Sessioning._active({ session }).is({ subject: user }), Administrating._isOwner({ user }).is({ owner: false })),
).holds();

// ---------- Admins (owner only, except listing) ----------

const AddAdmin = endpoint(
  "/admin/admins/add",
  ({ session, user }) =>
    receive({ session, user })
      .then(Sessioning.current({ session }).responds({}))
      .then(
        where(IsOwner({ session }), Authenticating._registered({ username: user }).is({ registered: true }))
          .then(Administrating.addAdmin({ user }).responds({}))
          .then(respond({ user }))
          .named("owner"),
        // Only registered accounts can be admins; an unknown name would never be able to sign in.
        where(IsOwner({ session }), Authenticating._registered({ username: user }).is({ registered: false }))
          .then(respond({ error: "NO_SUCH_USER" }))
          .named("not-registered"),
        where(IsNotOwner({ session })).then(respond({ error: "OWNER_ONLY" })).named("not-owner"),
      ),
);

const RemoveAdmin = endpoint(
  "/admin/admins/remove",
  ({ session, user }) =>
    receive({ session, user })
      .then(Sessioning.current({ session }).responds({}))
      .then(
        where(IsOwner({ session }))
          .then(Administrating.removeAdmin({ user }).responds({}))
          .then(respond({ user }))
          .named("owner"),
        where(IsNotOwner({ session })).then(respond({ error: "OWNER_ONLY" })).named("not-owner"),
      ),
);

// Every admin and whether they are the owner.
const AdminList = former("every admin", (_input, { user, owner }) =>
  form({ admins: each(Administrating._admins({}).is({ user, owner })).form({ user, owner }) }),
);

const ListAdmins = endpoint(
  "/admin/admins/list",
  ({ session }) =>
    receive({ session })
      .then(Sessioning.current({ session }).responds({}))
      .then(
        where(IsAdmin({ session })).then(respond({ list: AdminList({}) })).named("admin"),
        where(IsNotAdmin({ session })).then(respond({ error: "ADMIN_ONLY" })).named("not-admin"),
      ),
);

// ---------- Posts on gallery walls ----------

const RemovePostFromGroup = endpoint(
  "/admin/groups/remove-post",
  ({ session, group, post }) =>
    receive({ session, group, post })
      .then(Sessioning.current({ session }).responds({}))
      .then(
        where(IsAdmin({ session }))
          .then(Grouping.removeItem({ group, item: post }).responds({}))
          .then(respond({ group, post }))
          .named("admin"),
        where(IsNotAdmin({ session })).then(respond({ error: "ADMIN_ONLY" })).named("not-admin"),
      ),
);

// ---------- Schedules ----------
// A schedule is a cycle and the galleries (or wings) that run for it. Galleries are only ever
// made for a schedule, so a gallery's name only has to differ from the others
// in its schedule, and a schedule gains galleries only before it starts.

// The cycle that nomination rounds follow is the application's, not a schedule.
const HoldsCategory = view("(cycle) holds a nomination category", ({ cycle }, _outputs, { item }) =>
  where(Cycling._items({ cycle }).is({ item }), Nominating._category({ category: item })),
).holds();

// No two schedules with the same season length and number of seasons may run at once. The
// cycle nomination rounds follow isn't a schedule, so it never counts.
const Overlaps = view("a schedule from (start), (runs) seasons of (period), would overlap another", ({ start, period, runs }, _outputs, { other }) =>
  where(Cycling._overlapping({ start, period, runs, except: "" }).is({ cycle: other }), no(HoldsCategory({ cycle: other }))),
).holds();

const OverlapsAnother = view("(cycle) with (runs) seasons would overlap another schedule", ({ cycle, runs }, _outputs, { start, period, other }) =>
  where(
    Cycling._all({}).is({ cycle, start, period }),
    Cycling._overlapping({ start, period, runs, except: cycle }).is({ cycle: other }),
    no(HoldsCategory({ cycle: other })),
  ),
).holds();

const PicksUnavailable = view("some of (nominations) can't be chosen", ({ nominations }) =>
  where(Nominating._unavailable({ nominations })),
).holds();

const Upcoming = view("(cycle) hasn't started at (now)", ({ cycle, now }, _outputs, { start }) =>
  where(Cycling._all({}).is({ cycle, start }), is.gt(start, now)),
).holds();

const NameTaken = view("one of (names) matches a gallery in (cycle)", ({ cycle, names }, _outputs, { item }) =>
  where(Cycling._items({ cycle }).is({ item }), Grouping._nameAmong({ group: item, names })),
).holds();

// Every schedule with its galleries, each with the number of seasons it runs for (fewer than
// the schedule's when it was removed early).
const ScheduleList = former("every schedule", (_input, { cycle, start, period, runs, group, name, itemRuns }) =>
  form({
    schedules: each(Cycling._all({}).is({ cycle, start, period, runs }))
      .where(no(HoldsCategory({ cycle })))
      .form({
        cycle,
        start,
        period,
        runs,
        galleries: each(Cycling._items({ cycle }).is({ item: group, itemRuns }))
          .where(Grouping._get({ group }).is({ name }))
          .form({ group, name, runs: itemRuns }),
      }),
  }),
);

const ListSchedules = endpoint(
  "/admin/schedules/list",
  ({ session }) =>
    receive({ session })
      .then(Sessioning.current({ session }).responds({}))
      .then(
        where(IsAdmin({ session })).then(respond({ list: ScheduleList({}) })).named("admin"),
        where(IsNotAdmin({ session })).then(respond({ error: "ADMIN_ONLY" })).named("not-admin"),
      ),
);

// Everything that can be checked is checked before anything is made, and the one write that
// can still refuse (the names) goes first, since there is no undoing earlier writes. If the
// cycle is then refused (a past start), the new galleries belong to no schedule and never open.
const CreateSchedule = endpoint(
  "/admin/schedules/create",
  ({ session, period, runs, start, names, nominations, instant, cycle, groups }) =>
    receive({ session, period, runs, start, names, nominations })
      .then(Sessioning.current({ session }).responds({}))
      .then(
        where(now(instant), IsAdmin({ session }), no(Overlaps({ start, period, runs })), no(PicksUnavailable({ nominations })))
          .then(Grouping.createMany({ names, createdAt: instant }).responds({ groups }))
          .then(Cycling.create({ start, period, runs, earliest: instant }).responds({ cycle }))
          .then(Cycling.addItems({ cycle, items: groups }).responds({}))
          .then(Nominating.choose({ nominations, chosenAt: instant }).responds({}))
          .then(respond({ cycle, groups }))
          .named("admin"),
        where(IsAdmin({ session }), Overlaps({ start, period, runs }))
          .then(respond({ error: "OVERLAPPING_SCHEDULE" }))
          .named("overlapping"),
        where(IsAdmin({ session }), no(Overlaps({ start, period, runs })), PicksUnavailable({ nominations }))
          .then(respond({ error: "NOMINATION_UNAVAILABLE" }))
          .named("nomination-unavailable"),
        where(IsNotAdmin({ session })).then(respond({ error: "ADMIN_ONLY" })).named("not-admin"),
      ),
  { input: { required: ["session", "period", "runs", "start", "names"], defaults: { nominations: [] } } },
);

// More galleries for a schedule that hasn't started, checked and made as when creating it.
const AddGalleries = endpoint(
  "/admin/schedules/add-galleries",
  ({ session, cycle, names, nominations, instant, groups }) =>
    receive({ session, cycle, names, nominations })
      .then(Sessioning.current({ session }).responds({}))
      .then(
        where(
          now(instant),
          IsAdmin({ session }),
          Upcoming({ cycle, now: instant }),
          no(NameTaken({ cycle, names })),
          no(PicksUnavailable({ nominations })),
        )
          .then(Grouping.createMany({ names, createdAt: instant }).responds({ groups }))
          .then(Cycling.addItems({ cycle, items: groups }).responds({}))
          .then(Nominating.choose({ nominations, chosenAt: instant }).responds({}))
          .then(respond({ cycle, groups }))
          .named("upcoming"),
        where(now(instant), IsAdmin({ session }), no(Upcoming({ cycle, now: instant })))
          .then(respond({ error: "ALREADY_STARTED" }))
          .named("started"),
        where(now(instant), IsAdmin({ session }), Upcoming({ cycle, now: instant }), NameTaken({ cycle, names }))
          .then(respond({ error: "DUPLICATE_NAME" }))
          .named("name-taken"),
        where(
          now(instant),
          IsAdmin({ session }),
          Upcoming({ cycle, now: instant }),
          no(NameTaken({ cycle, names })),
          PicksUnavailable({ nominations }),
        )
          .then(respond({ error: "NOMINATION_UNAVAILABLE" }))
          .named("nomination-unavailable"),
        where(IsNotAdmin({ session })).then(respond({ error: "ADMIN_ONLY" })).named("not-admin"),
      ),
  { input: { required: ["session", "cycle", "names"], defaults: { nominations: [] } } },
);

// More or fewer seasons; never fewer than the one underway (Cycling refuses that).
const SetScheduleRuns = endpoint(
  "/admin/schedules/set-runs",
  ({ session, cycle, runs, instant }) =>
    receive({ session, cycle, runs })
      .then(Sessioning.current({ session }).responds({}))
      .then(
        where(now(instant), IsAdmin({ session }), no(OverlapsAnother({ cycle, runs })))
          .then(Cycling.setRuns({ cycle, runs, now: instant }).responds({}))
          .then(respond({ cycle, runs }))
          .named("admin"),
        where(IsAdmin({ session }), OverlapsAnother({ cycle, runs }))
          .then(respond({ error: "OVERLAPPING_SCHEDULE" }))
          .named("overlapping"),
        where(IsNotAdmin({ session })).then(respond({ error: "ADMIN_ONLY" })).named("not-admin"),
      ),
);

// Before the schedule starts the gallery is taken out entirely (see UnstartedGalleryIsDeleted);
// once it has started, the gallery finishes the season underway and leaves from the next.
const RemoveGallery = endpoint(
  "/admin/schedules/remove-gallery",
  ({ session, cycle, group, instant }) =>
    receive({ session, cycle, group })
      .then(Sessioning.current({ session }).responds({}))
      .then(
        where(now(instant), IsAdmin({ session }))
          .then(Cycling.removeItem({ cycle, item: group, now: instant }).responds({}))
          .then(respond({ cycle, group }))
          .named("admin"),
        where(IsNotAdmin({ session })).then(respond({ error: "ADMIN_ONLY" })).named("not-admin"),
      ),
);

// A gallery taken out of a schedule before it started never ran, so nothing is lost by deleting it.
const UnstartedGalleryIsDeleted = reaction(({ item }) =>
  when(Cycling.removeItem({ item }).responds({}))
    .where(no(Cycling._cycle({ item })), Grouping._get({ group: item }))
    .then(Grouping.delete({ group: item })),
);

// Only a schedule that hasn't started can be cancelled; its galleries go with it.
const CancelSchedule = endpoint(
  "/admin/schedules/cancel",
  ({ session, cycle, instant, items }) =>
    receive({ session, cycle })
      .then(Sessioning.current({ session }).responds({}))
      .then(
        where(now(instant), IsAdmin({ session }), Upcoming({ cycle, now: instant }))
          .then(Cycling.delete({ cycle }).responds({ items }))
          .then(Grouping.deleteMany({ groups: items }).responds({}))
          .then(respond({ cycle }))
          .named("upcoming"),
        where(now(instant), IsAdmin({ session }), no(Upcoming({ cycle, now: instant })))
          .then(respond({ error: "ALREADY_STARTED" }))
          .named("started"),
        where(IsNotAdmin({ session })).then(respond({ error: "ADMIN_ONLY" })).named("not-admin"),
      ),
);

// ---------- Nomination rounds ----------

// A finished round's ranking, to choose the next galleries from. Rounds count from 0.
const RoundOfNominations = endpoint(
  "/admin/nominations/round",
  ({ session, category, round, instant, start, end }) =>
    receive({ session, category, round })
      .then(Sessioning.current({ session }).responds({}))
      .then(
        where(now(instant), IsAdmin({ session }), Cycling._run({ item: category, run: round }).is({ start, end }), is.le(end, instant))
          .then(respond({ ranking: RoundRanking({ category, start, end }) }))
          .named("finished"),
        where(now(instant), IsAdmin({ session }), Cycling._run({ item: category, run: round }).is({ end }), is.gt(end, instant))
          .then(respond({ error: "NO_SUCH_ROUND" }))
          .named("not-finished"),
        where(IsAdmin({ session }), no(Cycling._run({ item: category, run: round })))
          .then(respond({ error: "NO_SUCH_ROUND" }))
          .named("no-such-round"),
        where(IsNotAdmin({ session })).then(respond({ error: "ADMIN_ONLY" })).named("not-admin"),
      ),
);

export const composition = {
  IsAdmin,
  IsNotAdmin,
  IsOwner,
  IsNotOwner,
  AddAdmin,
  RemoveAdmin,
  AdminList,
  ListAdmins,
  RemovePostFromGroup,
  HoldsCategory,
  Overlaps,
  OverlapsAnother,
  PicksUnavailable,
  Upcoming,
  NameTaken,
  ScheduleList,
  ListSchedules,
  CreateSchedule,
  AddGalleries,
  SetScheduleRuns,
  RemoveGallery,
  UnstartedGalleryIsDeleted,
  CancelSchedule,
  RoundOfNominations,
};

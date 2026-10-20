import { endpoint, receive, respond } from "@mit-sdg/sync-engine/boundary";
import { each, form, former, no, now, reaction, view, when, where } from "@mit-sdg/sync-engine/language";
import { concepts } from "../concepts.ts";
import { RoundRanking } from "./Public.ts";

const { Sessioning, Administrating, Grouping, Cycling, Nominating } = concepts;

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
        where(IsOwner({ session }))
          .then(Administrating.addAdmin({ user }).responds({}))
          .then(respond({ user }))
          .named("owner"),
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

// ---------- Groups ----------

const CreateGroup = endpoint(
  "/admin/groups/create",
  ({ session, name, group, createdAt }) =>
    receive({ session, name })
      .then(Sessioning.current({ session }).responds({}))
      .then(
        where(now(createdAt), IsAdmin({ session }))
          .then(Grouping.create({ name, createdAt }).responds({ group }))
          .then(respond({ group }))
          .named("admin"),
        where(IsNotAdmin({ session })).then(respond({ error: "ADMIN_ONLY" })).named("not-admin"),
      ),
);

const DeleteGroup = endpoint(
  "/admin/groups/delete",
  ({ session, group }) =>
    receive({ session, group })
      .then(Sessioning.current({ session }).responds({}))
      .then(
        where(IsAdmin({ session }))
          .then(Grouping.delete({ group }).responds({}))
          .then(respond({ group }))
          .named("admin"),
        where(IsNotAdmin({ session })).then(respond({ error: "ADMIN_ONLY" })).named("not-admin"),
      ),
);

const AddPostToGroup = endpoint(
  "/admin/groups/add-post",
  ({ session, group, post }) =>
    receive({ session, group, post })
      .then(Sessioning.current({ session }).responds({}))
      .then(
        where(IsAdmin({ session }))
          .then(Grouping.addItem({ group, item: post }).responds({}))
          .then(respond({ group, post }))
          .named("admin"),
        where(IsNotAdmin({ session })).then(respond({ error: "ADMIN_ONLY" })).named("not-admin"),
      ),
);

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

// Cleanup: a deleted group leaves the cycle it belonged to.
const DeletedGroupLeavesCycle = reaction(({ group, cycle }) =>
  when(Grouping.delete({ group }).responds({}))
    .where(Cycling._cycle({ item: group }).is({ cycle }))
    .then(Cycling.removeItem({ cycle, item: group })),
);

// ---------- Nomination categories ----------

// The ranking of the most recent round that has ended; empty when none has.
const PreviousRanking = endpoint(
  "/admin/nominations/previous",
  ({ session, category, instant, start, end }) =>
    receive({ session, category })
      .then(Sessioning.current({ session }).responds({}))
      .then(
        where(
          now(instant),
          IsAdmin({ session }),
          Cycling._previousRun({ item: category, now: instant }).is({ start, end }),
        )
          .then(respond({ ranking: RoundRanking({ category, start, end }) }))
          .named("admin"),
        where(now(instant), IsAdmin({ session }), no(Cycling._previousRun({ item: category, now: instant })))
          .then(respond({ ranking: { nominations: [] } }))
          .named("no-previous-round"),
        where(IsNotAdmin({ session })).then(respond({ error: "ADMIN_ONLY" })).named("not-admin"),
      ),
);

// ---------- Cycles ----------

// Every cycle with the items it holds.
const CycleList = former("every cycle", (_input, { cycle, start, period, runs, item }) =>
  form({
    cycles: each(Cycling._all({}).is({ cycle, start, period, runs })).form({
      cycle,
      start,
      period,
      runs,
      items: each(Cycling._items({ cycle }).is({ item })).form({ item }),
    }),
  }),
);

const ListCycles = endpoint(
  "/admin/cycles/list",
  ({ session }) =>
    receive({ session })
      .then(Sessioning.current({ session }).responds({}))
      .then(
        where(IsAdmin({ session })).then(respond({ list: CycleList({}) })).named("admin"),
        where(IsNotAdmin({ session })).then(respond({ error: "ADMIN_ONLY" })).named("not-admin"),
      ),
);

const CreateCycle = endpoint(
  "/admin/cycles/create",
  ({ session, period, runs, start, cycle }) =>
    receive({ session, period, runs })
      .then(Sessioning.current({ session }).responds({}))
      .then(
        where(now(start), IsAdmin({ session }))
          .then(Cycling.create({ start, period, runs }).responds({ cycle }))
          .then(respond({ cycle }))
          .named("admin"),
        where(IsNotAdmin({ session })).then(respond({ error: "ADMIN_ONLY" })).named("not-admin"),
      ),
);

const DeleteCycle = endpoint(
  "/admin/cycles/delete",
  ({ session, cycle }) =>
    receive({ session, cycle })
      .then(Sessioning.current({ session }).responds({}))
      .then(
        where(IsAdmin({ session }))
          .then(Cycling.delete({ cycle }).responds({}))
          .then(respond({ cycle }))
          .named("admin"),
        where(IsNotAdmin({ session })).then(respond({ error: "ADMIN_ONLY" })).named("not-admin"),
      ),
);

// Only an existing group or nomination category may join a cycle.
const AddItemToCycle = endpoint(
  "/admin/cycles/add-item",
  ({ session, cycle, item }) =>
    receive({ session, cycle, item })
      .then(Sessioning.current({ session }).responds({}))
      .then(
        where(IsAdmin({ session }), Grouping._get({ group: item }))
          .then(Cycling.addItem({ cycle, item }).responds({}))
          .then(respond({ cycle, item }))
          .named("group"),
        where(IsAdmin({ session }), Nominating._category({ category: item }))
          .then(Cycling.addItem({ cycle, item }).responds({}))
          .then(respond({ cycle, item }))
          .named("category"),
        where(IsAdmin({ session }), no(Grouping._get({ group: item })), no(Nominating._category({ category: item })))
          .then(respond({ error: "NO_SUCH_ITEM" }))
          .named("neither"),
        where(IsNotAdmin({ session })).then(respond({ error: "ADMIN_ONLY" })).named("not-admin"),
      ),
);

const RemoveItemFromCycle = endpoint(
  "/admin/cycles/remove-item",
  ({ session, cycle, item }) =>
    receive({ session, cycle, item })
      .then(Sessioning.current({ session }).responds({}))
      .then(
        where(IsAdmin({ session }))
          .then(Cycling.removeItem({ cycle, item }).responds({}))
          .then(respond({ cycle, item }))
          .named("admin"),
        where(IsNotAdmin({ session })).then(respond({ error: "ADMIN_ONLY" })).named("not-admin"),
      ),
);

const SetCycleRuns = endpoint(
  "/admin/cycles/set-runs",
  ({ session, cycle, runs }) =>
    receive({ session, cycle, runs })
      .then(Sessioning.current({ session }).responds({}))
      .then(
        where(IsAdmin({ session }))
          .then(Cycling.setRuns({ cycle, runs }).responds({}))
          .then(respond({ cycle, runs }))
          .named("admin"),
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
  CreateGroup,
  DeleteGroup,
  AddPostToGroup,
  RemovePostFromGroup,
  DeletedGroupLeavesCycle,
  PreviousRanking,
  CycleList,
  ListCycles,
  CreateCycle,
  DeleteCycle,
  AddItemToCycle,
  RemoveItemFromCycle,
  SetCycleRuns,
};

import { endpoint, receive, respond } from "@mit-sdg/sync-engine/boundary";
import { now, reaction, view, when, where } from "@mit-sdg/sync-engine/language";
import { concepts } from "../concepts.ts";

const { Sessioning, Grouping, Cycling } = concepts;

// ponytail: one hard-coded admin; an Administering concept if more admins are needed.
const ADMIN = "milin";

const IsAdmin = view("(session) belongs to the admin", ({ session }, _outputs, _bindings) =>
  where(Sessioning._active({ session }).is({ subject: ADMIN })),
).holds();

const IsNotAdmin = view("(session) does not belong to the admin", ({ session }, _outputs, _bindings) =>
  where(Sessioning._active({ session }).is.not({ subject: ADMIN })),
).holds();

// Every admin endpoint resolves the session first (an inactive session is refused
// with UNKNOWN_SESSION), then splits into an admin branch and an ADMIN_ONLY branch.

const CreateGroup = endpoint(
  "/admin/groups/create",
  ({ session, name, group }) =>
    receive({ session, name })
      .then(Sessioning.current({ session }).responds({}))
      .then(
        where(IsAdmin({ session }))
          .then(Grouping.create({ name }).responds({ group }))
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

const AddGroupToCycle = endpoint(
  "/admin/cycles/add-group",
  ({ session, cycle, group }) =>
    receive({ session, cycle, group })
      .then(Sessioning.current({ session }).responds({}))
      .then(
        where(IsAdmin({ session }))
          .then(Cycling.addItem({ cycle, item: group }).responds({}))
          .then(respond({ cycle, group }))
          .named("admin"),
        where(IsNotAdmin({ session })).then(respond({ error: "ADMIN_ONLY" })).named("not-admin"),
      ),
);

const RemoveGroupFromCycle = endpoint(
  "/admin/cycles/remove-group",
  ({ session, cycle, group }) =>
    receive({ session, cycle, group })
      .then(Sessioning.current({ session }).responds({}))
      .then(
        where(IsAdmin({ session }))
          .then(Cycling.removeItem({ cycle, item: group }).responds({}))
          .then(respond({ cycle, group }))
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

// Cleanup: a deleted group leaves the cycle it belonged to.
const DeletedGroupLeavesCycle = reaction(({ group, cycle }) =>
  when(Grouping.delete({ group }).responds({}))
    .where(Cycling._cycle({ item: group }).is({ cycle }))
    .then(Cycling.removeItem({ cycle, item: group })),
);

export const composition = {
  IsAdmin,
  IsNotAdmin,
  CreateGroup,
  DeleteGroup,
  AddPostToGroup,
  RemovePostFromGroup,
  CreateCycle,
  DeleteCycle,
  AddGroupToCycle,
  RemoveGroupFromCycle,
  SetCycleRuns,
  DeletedGroupLeavesCycle,
};

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
is set once outside the application, for an account that is already registered:
either a setup script, or, when the server starts with an `OWNER` setting naming that
account, the server itself calls Administrating's `setOwner` directly. An unregistered
name is never made owner, so registering that name later grants nothing. Running it again is refused with
`OWNER_EXISTS` and changes nothing. Until it has run there is no owner and no admin,
so every owner-only and admin-only request answers `OWNER_ONLY` or `ADMIN_ONLY`.

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

## Future gallery nominations

The application has exactly one nomination category, Future galleries, which the
server creates when it starts if it does not exist yet; no endpoint creates or changes
categories. It takes nominations only while it belongs to a cycle with a run happening,
so an admin adds it to a cycle like a group.

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
at most one cycle. Only an existing group or nomination category may be added; any
other identifier answers `NO_SUCH_ITEM` and changes nothing. An admin may
[change how many runs a cycle has](reaction:Admin.SetCycleRuns) to extend it or to end
it immediately.

```endpoints
Admin.AddItemToCycle at /admin/cycles/add-item
Admin.RemoveItemFromCycle at /admin/cycles/remove-item
Admin.SetCycleRuns at /admin/cycles/set-runs
```

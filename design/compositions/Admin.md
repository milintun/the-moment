# Admin

Curating groups and their seasons is reserved for one administrator account,
`milin`. Every request resolves its session first, so a request without an active
session is refused. A session [belongs to the admin](view:Admin.IsAdmin) when its
subject is that account; one that
[does not belong to the admin](view:Admin.IsNotAdmin) answers `ADMIN_ONLY` and
changes nothing.

## Groups

The admin may [create a group](reaction:Admin.CreateGroup) with a unique name and
[delete a group](reaction:Admin.DeleteGroup). Deleting a group does not delete its
posts; they simply stop appearing in any feed, because feeds reach posts through a
group. A deleted group also
[leaves the cycle it belonged to](reaction:Admin.DeletedGroupLeavesCycle).

```endpoints
Admin.CreateGroup at /admin/groups/create
Admin.DeleteGroup at /admin/groups/delete
```

The admin may also [add a post to a group](reaction:Admin.AddPostToGroup) or
[remove a post from a group](reaction:Admin.RemovePostFromGroup).

```endpoints
Admin.AddPostToGroup at /admin/groups/add-post
Admin.RemovePostFromGroup at /admin/groups/remove-post
```

## Cycles

A cycle sets the seasons for the groups it holds. The admin may
[create a cycle](reaction:Admin.CreateCycle), which starts at the request's time with
the given period and number of runs, and [delete a cycle](reaction:Admin.DeleteCycle),
which closes every group it held.

```endpoints
Admin.CreateCycle at /admin/cycles/create
Admin.DeleteCycle at /admin/cycles/delete
```

A group is closed until it belongs to a cycle. The admin may
[add a group to a cycle](reaction:Admin.AddGroupToCycle) or
[remove a group from a cycle](reaction:Admin.RemoveGroupFromCycle); a group
belongs to at most one cycle. The admin may
[change how many runs a cycle has](reaction:Admin.SetCycleRuns) to extend it or to end
it immediately.

```endpoints
Admin.AddGroupToCycle at /admin/cycles/add-group
Admin.RemoveGroupFromCycle at /admin/cycles/remove-group
Admin.SetCycleRuns at /admin/cycles/set-runs
```

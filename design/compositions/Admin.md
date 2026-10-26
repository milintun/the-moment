# Admin

Scheduling galleries and moderating their walls is reserved for admins, and only
the owner decides who the admins are. Every request resolves its session first, so a
request without an active session is refused. A session
[belongs to an admin](view:Admin.IsAdmin) when Administrating says its account is an
admin, which includes the owner; one that
[does not belong to an admin](view:Admin.IsNotAdmin) answers `ADMIN_ONLY` and changes
nothing. Likewise a session [belongs to the owner](view:Admin.IsOwner) or
[does not belong to the owner](view:Admin.IsNotOwner), which answers `OWNER_ONLY`.

## Admins

The owner may [add an admin](reaction:Admin.AddAdmin), who must be a registered
account (any other name answers `NO_SUCH_USER`), and
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

## Posts on gallery walls

An admin may [remove a post from a gallery](reaction:Admin.RemovePostFromGroup). The
post itself is kept: its owner still has it, it just no longer hangs there.

```endpoints
Admin.RemovePostFromGroup at /admin/groups/remove-post
```

## Schedules

A schedule is a cycle together with the galleries that run for it: a season length, a
number of seasons, a start, and the galleries (wings, when seasons last 30 days or
more). Galleries are only ever made for a schedule, so the only way to open new
galleries is to schedule them, and a gallery's name only has to differ from the other
names in its schedule. A schedule gains galleries only before it starts.

An admin may [list every schedule](reaction:Admin.ListSchedules) as
[each schedule with its galleries](former:Admin.ScheduleList), each gallery with the
number of seasons it runs for. The cycle nomination rounds follow is not a schedule:
one that [holds a nomination category](view:Admin.HoldsCategory) is left out.

An admin may [create a schedule](reaction:Admin.CreateSchedule) from a season length,
a number of seasons, a start, the gallery names, and the nominations those names were
picked from. Nothing is made unless all of it can be: a schedule that
[would overlap another](view:Admin.Overlaps) with the same season length and number of
seasons answers `OVERLAPPING_SCHEDULE`, and picked nominations that
[can't be chosen](view:Admin.PicksUnavailable) (gone, already chosen, or picked twice)
answer `NOMINATION_UNAVAILABLE`. Then Grouping makes the galleries, refusing an empty
list, an empty name, or two names that match ignoring case and spacing; Cycling makes
the cycle, refusing a start in the past; the galleries join it; and Nominating marks the
picked nominations chosen. The names go first because they are the one step that can
still be refused after the checks, and there is no undoing an earlier step. If the cycle
is refused after them, the new galleries belong to no schedule, so they never open.

```endpoints
Admin.ListSchedules at /admin/schedules/list
Admin.CreateSchedule at /admin/schedules/create
```

Once made, a schedule can be edited in three ways. Before it starts, an admin may
[add galleries](reaction:Admin.AddGalleries) to it, typed or picked from nominations as
when creating it. A schedule that has started answers `ALREADY_STARTED`, a name that
[matches a gallery already in the schedule](view:Admin.NameTaken) answers
`DUPLICATE_NAME`, and unavailable nominations answer `NOMINATION_UNAVAILABLE`; then the
galleries are made, join the cycle, and the picked nominations are marked chosen. An
admin may also
[change its number of seasons](reaction:Admin.SetScheduleRuns), either way, but never
below the season underway (Cycling refuses `RUN_UNDERWAY`), and not to a number that
[would overlap another schedule](view:Admin.OverlapsAnother) with the same season
length. An admin may [remove a gallery](reaction:Admin.RemoveGallery): once the
schedule has started, the gallery finishes the season underway and leaves from the next,
so its past seasons stay in the archive; before it starts, the gallery is taken out
entirely, and since it never ran [it is deleted](reaction:Admin.UnstartedGalleryIsDeleted).
Every season keeps at least one gallery: removing the last one is refused (`LAST_ITEM`),
as is removing one during the final season (`NO_LATER_RUN`).

A schedule that [hasn't started](view:Admin.Upcoming) may be
[cancelled](reaction:Admin.CancelSchedule), deleting it and its galleries; once it has
started it answers `ALREADY_STARTED`.

```endpoints
Admin.AddGalleries at /admin/schedules/add-galleries
Admin.SetScheduleRuns at /admin/schedules/set-runs
Admin.RemoveGallery at /admin/schedules/remove-gallery
Admin.CancelSchedule at /admin/schedules/cancel
```

## Future gallery nominations

The application has exactly one nomination category, Future galleries. When the server
starts it creates the category if missing and makes sure it follows the built-in weekly
cycle (rounds start Mondays at 12 AM US Eastern), which no endpoint lists or changes.
Admins never schedule nominations.

Choosing the next galleries is the admin's decision, informed by the crowd. An admin
may read [a finished round's ranking](reaction:Admin.RoundOfNominations), counting
rounds from 0: [the round's nominations ranked by votes](former:Public.RoundRanking),
each saying whether it has been chosen. A round that hasn't finished, or doesn't exist,
answers `NO_SUCH_ROUND`.

```endpoints
Admin.RoundOfNominations at /admin/nominations/round
```

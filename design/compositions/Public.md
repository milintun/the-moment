# Public

Anyone may browse groups and posts without an account, so these reads take no
session.

## Groups

The [group list](reaction:Public.ListGroups) shows
[every group by name](former:Public.GroupList), each with
[the cycle it belongs to](former:Public.GroupCycle) and
[the run it is in right now](former:Public.GroupRun), either of which is blank when
the group has none. The frontend tells wings from galleries by their cycle's period.

```endpoints
Public.ListGroups at /groups/list
```

A [group's feed](reaction:Public.Feed) shows
[the posts of its current run](former:Public.GroupFeed): the posts in the group
created during the run happening now, most upvoted first, each with its owner,
content, creation time, and vote count. A closed group's feed is empty.

```endpoints
Public.Feed at /groups/feed
```

## Posts

A [single post](reaction:Public.GetPost) shows [its details](former:Public.PostDetails),
including its vote count, even when it no longer appears in any group. A post that
does not exist answers `NO_SUCH_POST`.

```endpoints
Public.GetPost at /posts/get
```

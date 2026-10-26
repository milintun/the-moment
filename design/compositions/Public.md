# Public

Anyone may browse groups and posts without an account, so these reads take no
session.

## Groups

The [group list](reaction:Public.ListGroups) shows
[every group by name](former:Public.GroupList), each with
[the cycle it belongs to](former:Public.GroupCycle) and
[the run it is in right now](former:Public.GroupRun), either of which is blank when
the group has none. The frontend hides groups with no cycle and tells wings from
galleries by their cycle's period: 30 days or longer is a wing. Periods are dynamic,
since a cycle may have any length and its number of runs may change.

```endpoints
Public.ListGroups at /groups/list
```

A [group's feed](reaction:Public.Feed) shows
[the posts of a season](former:Public.SeasonPosts) for the run happening now: the posts
in the group created during that run, each with its owner, content, caption (empty when
it has none), creation time, and vote count. Posts are ranked by votes, most upvoted first, and among posts with the
same number of votes the newest comes first. A closed group's feed is empty.

```endpoints
Public.Feed at /groups/feed
```

Past seasons stay viewable in an [archive](reaction:Public.Archive): for a group and a
season number counted from 0, it shows that season's posts the same way, with their final
votes, once the season has ended. A season that has not ended yet, or that the group's
cycle does not have, answers `NO_SUCH_SEASON`. Nothing in the archive can be voted on.

```endpoints
Public.Archive at /groups/archive
```

The archive lists its galleries [a page at a time](reaction:Public.ArchiveGalleries):
[one page of galleries in the order they were created](former:Public.GroupPage), each
with its cycle, so a reader can tell which seasons have ended. Grouping does the paging
and answers a season's posts by when they were added, so neither the gallery list nor a
season's page grows with the whole history.

```endpoints
Public.ArchiveGalleries at /archive/galleries
```

A post's content is the upload holding its image, and stored images are private. Anyone
may [get a link to an image](reaction:Public.ImageLink), which Uploading creates fresh and
which works for five minutes; an unknown upload answers `NO_SUCH_UPLOAD`. Pages reach it
as a plain web address, `/images/<upload>`, which answers by sending the browser on to
that link, so an image tag can show any post's image without handling storage links.

```endpoints
Public.ImageLink at /images/link
```

## Posts

A [single post](reaction:Public.GetPost) shows [its details](former:Public.PostDetails),
including its caption and vote count, even when it no longer appears in any group. A post that
does not exist answers `NO_SUCH_POST`.

```endpoints
Public.GetPost at /posts/get
```

## Nominations

Anyone may [list the nomination categories](reaction:Public.ListCategories) as
[every category with its current round](former:Public.CategoryList), which is blank
when the category is closed.

```endpoints
Public.ListCategories at /nominations/categories
```

Anyone may [read a category's current ranking](reaction:Public.ListNominations):
[the round's nominations ranked by votes](former:Public.RoundRanking) for the run
happening now, most upvoted first and newest first among ties. A closed category's
ranking is empty. Admins read the previous round's ranking through the same
construction.

```endpoints
Public.ListNominations at /nominations/list
```

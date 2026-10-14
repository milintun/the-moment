# User

Everything a signed-in person does with posts. Every request resolves its session to
an account first, so the account becomes the post's owner or the vote's voter and a
caller cannot act as anyone else. A request without an active session is refused.

## Posting

A person may [create a post in a group](reaction:User.CreatePost) only while that
group's cycle has a run happening. The post is created with the request's time as its
creation time and added to the group. A group that has no cycle, has not started, or
has finished every run answers `GROUP_CLOSED`.

```endpoints
User.CreatePost at /posts/create
```

The owner of a post may [delete it](reaction:User.DeletePost); anyone else is refused
by Posting. A deleted post
[leaves every group it was in](reaction:User.DeletedPostLeavesGroups) and
[loses its votes](reaction:User.DeletedPostLosesVotes).

```endpoints
User.DeletePost at /posts/delete
```

## Voting

A post is [in season](view:User.PostInSeason) when one of its groups has a run
happening now and the post was created during that run. A person may
[upvote](reaction:User.Vote) or [take back an upvote on](reaction:User.Unvote) a post
only when it is in season and they do not own it. Otherwise the request answers
`OWN_POST`, `NOT_IN_SEASON`, or `NO_SUCH_POST` for a post that does not exist.

```endpoints
User.Vote at /posts/vote
User.Unvote at /posts/unvote
```

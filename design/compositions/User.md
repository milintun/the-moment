# User

Everything a person does with their own account: signing in and out, posting art,
voting on posts, and nominating ideas for future galleries. Apart from registering
and signing in, every request resolves its session to an account first, so the account
becomes the post's owner, the vote's voter, or the nomination's nominator, and a caller
cannot act as anyone else. A request without an active session is refused.

## Account

Registration [establishes a new account and starts a session](reaction:User.Register)
for the returned account reference, which is that account's username.
[Sign-in](reaction:User.SignIn) proves an existing account's credentials and starts a
new session for the returned account reference. In both cases callers cannot choose a
different subject.

```endpoints
User.Register at /auth/register
User.SignIn at /auth/sign-in
```

An [active session resolves to its subject username](reaction:User.CurrentUser). An
unknown, ended, or expired session does not identify a current account.
[Signing out ends the presented active session](reaction:User.SignOut); other sessions
for the same account remain independent.

```endpoints
User.CurrentUser at /auth/current
User.SignOut at /auth/sign-out
```

## Posting

A person may [create a post in a group](reaction:User.CreatePost) only when the
identifier names an existing group whose cycle has a run happening. The post is
created with the request's time as its creation time and added to the group. An
identifier that is not a group, or a group that has no cycle, has not started, or has
finished every run, answers `GROUP_CLOSED` before anything is created. If the group is
deleted between that check and the post being added, the request is refused and the
post is left in no group; this rare race is accepted.

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

## Voting on posts

A post is [in season](view:User.PostInSeason) when one of its groups has a run
happening now and the post was created during that run. A person may
[upvote](reaction:User.Vote) or [take back an upvote on](reaction:User.Unvote) a post
only when it is in season and they do not own it. Otherwise the request answers
`OWN_POST`, `NOT_IN_SEASON`, or `NO_SUCH_POST` for a post that does not exist.

```endpoints
User.Vote at /posts/vote
User.Unvote at /posts/unvote
```

A person may [list their own votes in a group](reaction:User.ListMyVotes), which
answers [the posts in the group they have upvoted](former:User.MyVotes), so a page can
show whether each post is upvoted.

```endpoints
User.ListMyVotes at /posts/my-votes
```

## Nominating

A nomination category belongs to a cycle like a group, and a round is the cycle's
current run. A nomination is [active](view:User.NominationActive) while its category's
cycle has a run happening and the nomination was made during that run. When the run
ends, its nominations stop being active without anything changing, and the next round
starts empty.

A person may [nominate an idea](reaction:User.CreateNomination) in a category only
while the category has a round happening; otherwise the request answers
`CATEGORY_CLOSED`. Each round holds one entry per idea: when
[an equivalent name is already active](view:User.EquivalentActive) in the category,
the request answers `ALREADY_NOMINATED` so the person can upvote that entry instead.
Otherwise the nomination is made with the request's time, and Nominating still limits
each person to one nomination a day.

```endpoints
User.CreateNomination at /nominations/create
```

A nominator may [withdraw their nomination](reaction:User.WithdrawNomination); anyone
else is refused by Nominating. A withdrawn nomination
[loses its votes](reaction:User.WithdrawnNominationLosesVotes).

```endpoints
User.WithdrawNomination at /nominations/withdraw
```

## Voting on nominations

A person may [upvote](reaction:User.VoteNomination) or
[take back an upvote on](reaction:User.UnvoteNomination) a nomination only while it is
active and they did not make it. Otherwise the request answers `OWN_NOMINATION`,
`NOT_ACTIVE`, or `NO_SUCH_NOMINATION` for a nomination that does not exist. A person
may also [list their own votes in a category](reaction:User.ListMyNominationVotes),
which answers [the active nominations they have upvoted](former:User.MyNominationVotes).

```endpoints
User.VoteNomination at /nominations/vote
User.UnvoteNomination at /nominations/unvote
User.ListMyNominationVotes at /nominations/my-votes
```

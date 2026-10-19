# Application types

Every person is identified by their account's username, so each concept's user,
voter, owner, or nominator is an Authenticating account. Posts are artwork sources,
galleries and wings are groups of posts, and a cycle sets the seasons for both the
groups and the nomination categories it holds.

```types
concrete ArtworkSource
  The source of an artwork image, such as its URL.

concrete CycledItem
  Something whose seasons a cycle sets: a group of posts or a nomination category.
```

```instances
instantiate Authenticating

instantiate Sessioning with
  Subject is Authenticating.Account

instantiate Administrating with
  User is Authenticating.Account

instantiate Posting with
  User is Authenticating.Account
  Content is ArtworkSource

instantiate Upvoting with
  User is Authenticating.Account
  Item is Posting.Post

instantiate Grouping with
  Item is Posting.Post

instantiate Cycling with
  Item is CycledItem

instantiate Nominating with
  User is Authenticating.Account

instantiate Upvoting as NominationVotes with
  User is Authenticating.Account
  Item is Nominating.Nomination
```

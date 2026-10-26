# Application types

Every person is identified by their account's username, so each concept's user,
voter, owner, uploader, or nominator is an Authenticating account. A post's content is
the image its owner uploaded, galleries and wings are groups of posts, and a cycle sets the seasons for both the
groups and the nomination categories it holds.

```types
concrete CycledItem
  Something whose seasons a cycle sets: a group of posts or a nomination category.

concrete Sequence
  An ordered list of values, sent and stored as an array.
```

```instances
instantiate Authenticating

instantiate Sessioning with
  Subject is Authenticating.Account

instantiate Uploading with
  User is Authenticating.Account

instantiate Administrating with
  User is Authenticating.Account

instantiate Posting with
  User is Authenticating.Account
  Content is Uploading.Upload

instantiate Upvoting with
  User is Authenticating.Account
  Item is Posting.Post

instantiate Grouping with
  Item is Posting.Post
  List is Sequence

instantiate Cycling with
  Item is CycledItem
  List is Sequence

instantiate Nominating with
  User is Authenticating.Account
  List is Sequence

instantiate Upvoting as NominationVotes with
  User is Authenticating.Account
  Item is Nominating.Nomination
```

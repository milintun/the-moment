# Application types

TODO: one or two sentences on what the application's types mean.

TODO: concrete application types go in the `types` fence, e.g. `concrete Name` with an indented explanation.

```types
concrete ArtworkSource
  The source of an artwork image, such as its URL.
```

TODO: add one `instantiate` block per concept instance, e.g. `instantiate Posting with` followed by indented bindings like `User is ...`.

```instances
instantiate Authenticating

instantiate Sessioning with
  Subject is Authenticating.Account

instantiate Posting with
  User is Authenticating.Account
  Content is ArtworkSource

instantiate Upvoting with
  User is Authenticating.Account
  Item is Posting.Post

instantiate Grouping with
  Item is Posting.Post

instantiate Cycling with
  Item is Grouping.Group
```

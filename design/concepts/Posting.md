# Posting

## Purpose

Share content to a public forum to receive feedback from many other users.

## Principle

An author can create and delete a post.

## Types

```types
external User
  The author who owns a post.

external Content
  What a post shares.
```

## State

```state
a set of Posts with
  an owner User
  a content Content
  a caption String
  a createdAt DateTime
  Rule: a post has at most one caption; an empty caption means the post has none
```

## Actions

```actions
create (owner: User, content: Content, caption: String, createdAt: DateTime) : returns (post: Post)
  where true
  then
    create a new post with this owner, content, and createdAt, and with caption trimmed of
    outer spaces, so a caption of only spaces leaves the post with none
    returns post

delete (user: User, post: Post) : returns ()
  where post is not in Posts
  then
    refuses NO_SUCH_POST "There is no such post."
  where user is not the owner of post
  then
    refuses NOT_OWNER "Only the owner of a post can delete it."
  where post exists and user is the owner of post
  then
    delete this post
    returns
```

## Queries

```queries
_get (post: Post) : optional (owner: User, content: Content, caption: String, createdAt: DateTime)
  answers the post's owner, content, caption (empty when it has none), and createdAt, and no row when the post is not in Posts
```

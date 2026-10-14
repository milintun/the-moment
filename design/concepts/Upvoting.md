# Upvoting

## Purpose

Rank items by popularity, so people are not overwhelmed with low quality items.

## Principle

A voter upvotes an item they resonate with and can take the vote back. Items are
ranked by their number of votes.

## Types

```types
external User
  The person who casts a vote.

external Item
  The thing being voted on.
```

## State

```state
a set of Votes with
  a voter User
  a target Item
  unique voter and target
```

## Actions

```actions
upvote (voter: User, target: Item) : returns ()
  where a vote with this voter and target exists
  then
    refuses ALREADY_VOTED "You have already upvoted this."
  where a vote with this voter and target does not exist
  then
    create a new vote with this voter and target
    returns

unvote (voter: User, target: Item) : returns ()
  where a vote with this voter and target does not exist
  then
    refuses NOT_VOTED "You have not upvoted this."
  where a vote with this voter and target exists
  then
    delete the vote with this voter and target
    returns

clear (target: Item) : returns ()
  where true
  then
    delete every vote for target
    returns
```

## Queries

```queries
_count (target: Item) : one (votes: Number)
  answers the number of votes for target, and 0 when it has none

_voted (voter: User, target: Item) : one (voted: Flag)
  answers whether voter has a vote for target, and false when it does not

_counts () : many (target: Item, votes: Number)
  answers every item with at least one vote and its number of votes, ordered by votes from most to fewest, then by target
```
